/** Content list, media library and gallery manager. */

import { CATEGORIES, KINDS } from '../../../shared/taxonomy.js';
import { SITE } from '../config.js';
import { adminApi } from './api.js';
import { $, confirmAction, esc, formatBytes, formatDate, makeDropzone, toast, uploadRow } from './ui.js';

/* -------------------------------------------------------------- content */

export function contentMarkup() {
  return `<div class="panel">
    <div class="filters">
      <input type="search" data-filter-q placeholder="Search by title, slug or summary…" aria-label="Search content">
      <select data-filter-category aria-label="Filter by category">
        <option value="">All categories</option>
        ${CATEGORIES.map((category) => `<option value="${esc(category.name)}">${esc(category.name)}</option>`).join('')}
      </select>
      <select data-filter-kind aria-label="Filter by kind">
        <option value="">All kinds</option>
        ${KINDS.map((kind) => `<option value="${esc(kind.id)}">${esc(kind.label)}</option>`).join('')}
      </select>
      <select data-filter-status aria-label="Filter by status">
        <option value="">Published and drafts</option>
        <option value="published">Published only</option>
        <option value="draft">Drafts only</option>
      </select>
      <button class="btn btn--ghost btn--sm" type="button" data-filter-clear>Clear</button>
    </div>
    <div class="rows" data-content-rows><p class="empty">Loading…</p></div>
  </div>`;
}

function contentRow(item) {
  const live = Number(item.published) === 1;
  return `<article class="row" data-id="${item.id}">
    <img class="row__thumb" src="${esc(item.image || '/assets/img/hero_red-1280.webp')}" alt="" loading="lazy" decoding="async">
    <div>
      <p class="row__title">${esc(item.title)}</p>
      <div class="row__meta">
        <span class="tag ${live ? 'tag--live' : 'tag--draft'}">${live ? 'Live' : 'Draft'}</span>
        ${Number(item.indexable) === 0 ? '<span class="tag tag--hidden">Hidden from search</span>' : ''}
        <span>${esc(item.category)}${item.subcategory ? ` · ${esc(item.subcategory)}` : ''}</span>
        <span>${esc(item.type)}</span>
        <span>${esc(formatDate(item.published_at))}</span>
        ${item.rating ? `<span>★ ${Number(item.rating).toFixed(1)} (${item.rating_count})</span>` : ''}
        <code style="font-size:.7rem;color:var(--ink-faint)">${esc(item.path || '')}</code>
      </div>
    </div>
    <div class="row__actions">
      <button class="btn btn--ghost btn--sm" type="button" data-edit="${item.id}">Edit</button>
      <button class="btn btn--ghost btn--sm" type="button" data-toggle="${item.id}">${live ? 'Hide' : 'Publish'}</button>
      ${
        live && item.path
          ? `<a class="btn btn--ghost btn--sm" href="${SITE.origin}${esc(item.path)}" target="_blank" rel="noopener">View</a>`
          : ''
      }
      <button class="btn btn--danger btn--sm" type="button" data-delete="${item.id}">Delete</button>
    </div>
  </article>`;
}

export function initContentList(root, { onEdit }) {
  const rows = $('[data-content-rows]', root);
  let timer;

  const filters = () => ({
    q: $('[data-filter-q]', root).value.trim(),
    category: $('[data-filter-category]', root).value,
    kind: $('[data-filter-kind]', root).value,
    status: $('[data-filter-status]', root).value
  });

  async function load() {
    rows.innerHTML = '<p class="empty">Loading…</p>';
    try {
      const data = await adminApi.listContent(filters());
      rows.innerHTML = data.items.length
        ? data.items.map(contentRow).join('')
        : '<p class="empty">Nothing matches those filters yet.</p>';
    } catch (error) {
      rows.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    }
  }

  for (const selector of ['[data-filter-category]', '[data-filter-kind]', '[data-filter-status]']) {
    $(selector, root).addEventListener('change', load);
  }
  $('[data-filter-q]', root).addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(load, 250);
  });
  $('[data-filter-clear]', root).addEventListener('click', () => {
    $('[data-filter-q]', root).value = '';
    for (const selector of ['[data-filter-category]', '[data-filter-kind]', '[data-filter-status]']) {
      $(selector, root).value = '';
    }
    load();
  });

  rows.addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit]');
    const toggleButton = event.target.closest('[data-toggle]');
    const deleteButton = event.target.closest('[data-delete]');

    if (editButton) {
      const data = await adminApi.listContent({});
      const item = data.items.find((row) => String(row.id) === editButton.dataset.edit);
      if (item) onEdit(item);
      return;
    }

    if (toggleButton) {
      const row = toggleButton.closest('.row');
      const isLive = toggleButton.textContent.trim() === 'Hide';
      toggleButton.disabled = true;
      try {
        await adminApi.patchContent(toggleButton.dataset.toggle, { published: isLive ? 0 : 1 });
        toast(isLive ? 'Hidden from the site.' : 'Published.');
        load();
      } catch (error) {
        toast(error.message, 'error');
        toggleButton.disabled = false;
      }
      row?.classList.add('is-busy');
      return;
    }

    if (deleteButton) {
      if (!confirmAction('Delete this item permanently? This cannot be undone.')) return;
      try {
        await adminApi.deleteContent(deleteButton.dataset.delete);
        toast('Deleted.');
        load();
      } catch (error) {
        toast(error.message, 'error');
      }
    }
  });

  load();
  return { reload: load };
}

/* ---------------------------------------------------------------- media */

export function mediaMarkup() {
  return `<div class="panel">
    <div class="panel__head"><h2>Upload files</h2></div>
    <div class="dropzone" data-media-library-drop tabindex="0" role="button" aria-label="Upload files">
      <strong>Drop files here, or click to choose</strong>
      <span>Videos are chunked automatically, so full-length uploads complete reliably</span>
    </div>
    <div data-library-uploads></div>
  </div>
  <div class="panel">
    <div class="panel__head">
      <h2>Library</h2>
      <button class="btn btn--ghost btn--sm" type="button" data-media-refresh>Refresh</button>
    </div>
    <div class="media-grid" data-media-grid><p class="empty">Loading…</p></div>
  </div>`;
}

function mediaTile(item) {
  const preview =
    item.media_kind === 'video'
      ? `<video src="${esc(item.public_url)}#t=1" preload="metadata" muted playsinline></video>`
      : `<img src="${esc(item.public_url)}" alt="" loading="lazy" decoding="async">`;
  return `<div class="media-tile">
    ${preview}
    <div class="media-tile__body">
      <span class="media-tile__name" title="${esc(item.original_name)}">${esc(item.original_name)}</span>
      <span style="font-size:.68rem;color:var(--ink-faint)">${esc(item.media_kind)} · ${esc(
        formatBytes(item.size)
      )}</span>
      <div class="media-tile__row">
        <button class="btn btn--ghost btn--sm" type="button" data-copy="${esc(item.public_url)}">Copy URL</button>
        <button class="btn btn--danger btn--sm" type="button" data-delete-media="${item.id}">Delete</button>
      </div>
    </div>
  </div>`;
}

export function initMedia(root) {
  const grid = $('[data-media-grid]', root);

  async function load() {
    grid.innerHTML = '<p class="empty">Loading…</p>';
    try {
      const data = await adminApi.listMedia();
      grid.innerHTML = data.items.length
        ? data.items.map(mediaTile).join('')
        : '<p class="empty">No files uploaded yet.</p>';
    } catch (error) {
      grid.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    }
  }

  makeDropzone($('[data-media-library-drop]', root), async (files) => {
    const list = $('[data-library-uploads]', root);
    for (const file of files) {
      const row = uploadRow(list, file.name);
      try {
        await adminApi.uploadFile(file, row.progress);
        row.done();
        toast(`${file.name} uploaded.`);
        load();
      } catch (error) {
        row.fail(error.message);
        toast(`${file.name}: ${error.message}`, 'error');
      }
    }
  });

  $('[data-media-refresh]', root).addEventListener('click', load);

  grid.addEventListener('click', async (event) => {
    const copyButton = event.target.closest('[data-copy]');
    if (copyButton) {
      await navigator.clipboard.writeText(copyButton.dataset.copy).catch(() => {});
      toast('URL copied.');
      return;
    }
    const deleteButton = event.target.closest('[data-delete-media]');
    if (deleteButton) {
      if (!confirmAction('Delete this file from storage? Pages using it will lose the media.')) return;
      try {
        await adminApi.deleteMedia(deleteButton.dataset.deleteMedia);
        toast('File deleted.');
        load();
      } catch (error) {
        toast(error.message, 'error');
      }
    }
  });

  load();
  return { reload: load };
}

/* --------------------------------------------------------------- gallery */

export function galleryMarkup() {
  return `<div class="panel">
    <div class="panel__head"><h2>Add a gallery image</h2></div>
    <form data-gallery-form>
      <div class="field--row">
        <div class="field">
          <label for="g-title">Title</label>
          <input id="g-title" name="title" type="text" maxlength="160" required>
        </div>
        <div class="field">
          <label for="g-category">Category</label>
          <select id="g-category" name="category">
            ${CATEGORIES.map((category) => `<option value="${esc(category.name)}">${esc(category.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="g-sort">Order</label>
          <input id="g-sort" name="sort_order" type="number" value="0">
        </div>
      </div>
      <div class="field">
        <label for="g-image">Image URL</label>
        <input id="g-image" name="image_url" type="url" required data-gallery-image>
      </div>
      <div class="dropzone" data-gallery-drop tabindex="0" role="button" aria-label="Upload an image">
        <strong>Or drop an image here to upload it</strong>
        <span>The URL fills in automatically once the upload finishes</span>
      </div>
      <div data-gallery-uploads></div>
      <div class="field" style="margin-top:.9rem">
        <label for="g-alt">Alt text <small>describes the image for screen readers and image search</small></label>
        <input id="g-alt" name="alt_text" type="text" maxlength="240">
      </div>
      <div class="field">
        <label for="g-caption">Caption</label>
        <input id="g-caption" name="caption" type="text" maxlength="240">
      </div>
      <button class="btn btn--primary" type="submit">Add to gallery</button>
    </form>
  </div>
  <div class="panel">
    <div class="panel__head"><h2>Gallery images</h2></div>
    <div class="media-grid" data-gallery-grid><p class="empty">Loading…</p></div>
  </div>`;
}

export function initGallery(root) {
  const grid = $('[data-gallery-grid]', root);
  const form = $('[data-gallery-form]', root);

  async function load() {
    try {
      const data = await adminApi.listGallery();
      grid.innerHTML = data.items.length
        ? data.items
            .map(
              (item) => `<div class="media-tile">
                <img src="${esc(item.image_url)}" alt="${esc(item.alt_text)}" loading="lazy" decoding="async">
                <div class="media-tile__body">
                  <span class="media-tile__name">${esc(item.title)}</span>
                  <span style="font-size:.68rem;color:var(--ink-faint)">${esc(item.category)} · order ${
                    item.sort_order
                  }</span>
                  <div class="media-tile__row">
                    <button class="btn btn--ghost btn--sm" type="button" data-gallery-toggle="${item.id}"
                      data-published="${item.published}">${Number(item.published) ? 'Hide' : 'Show'}</button>
                    <button class="btn btn--danger btn--sm" type="button" data-gallery-delete="${item.id}">Delete</button>
                  </div>
                </div>
              </div>`
            )
            .join('')
        : '<p class="empty">No gallery images yet.</p>';
    } catch (error) {
      grid.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    }
  }

  makeDropzone(
    $('[data-gallery-drop]', root),
    async (files) => {
      const list = $('[data-gallery-uploads]', root);
      for (const file of files) {
        const row = uploadRow(list, file.name);
        try {
          const result = await adminApi.uploadFile(file, row.progress);
          row.done();
          form.image_url.value = result.url;
          if (!form.title.value) form.title.value = file.name.replace(/\.[^.]+$/, '');
        } catch (error) {
          row.fail(error.message);
        }
      }
    },
    { accept: 'image/*' }
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      await adminApi.createGalleryItem(values);
      toast('Added to the gallery.');
      form.reset();
      load();
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  grid.addEventListener('click', async (event) => {
    const toggle = event.target.closest('[data-gallery-toggle]');
    const remove = event.target.closest('[data-gallery-delete]');
    if (toggle) {
      // PATCH replaces the whole row, so send the current values back with it.
      const data = await adminApi.listGallery();
      const item = data.items.find((row) => String(row.id) === toggle.dataset.galleryToggle);
      if (!item) return;
      try {
        await adminApi.updateGalleryItem(item.id, { ...item, published: Number(item.published) ? 0 : 1 });
        load();
      } catch (error) {
        toast(error.message, 'error');
      }
      return;
    }
    if (remove) {
      if (!confirmAction('Remove this image from the gallery?')) return;
      try {
        await adminApi.deleteGalleryItem(remove.dataset.galleryDelete);
        toast('Removed.');
        load();
      } catch (error) {
        toast(error.message, 'error');
      }
    }
  });

  load();
  return { reload: load };
}
