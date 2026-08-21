/**
 * The publish screen.
 *
 * Picking a content kind fills in the type, category and subcategory, and the
 * SEO fields write themselves from the title and summary unless an editor
 * types over them. The panel on the right scores the entry and previews how
 * it will read in search results, so SEO is finished before publish rather
 * than chased afterwards.
 */

import { CATEGORIES, KINDS, findCategory, findKind } from '../../../shared/taxonomy.js';
import { SITE } from '../config.js';
import { adminApi } from './api.js';
import { $, esc, makeDropzone, slugify, toast, uploadRow } from './ui.js';

const AUTO = { seoTitle: true, metaDescription: true, slug: true };

let current = null;
let autoState = { ...AUTO };
let onSaved = () => {};

function categoryOptions(selected) {
  return CATEGORIES.map(
    (category) =>
      `<option value="${esc(category.name)}"${category.name === selected ? ' selected' : ''}>${esc(
        category.name
      )}</option>`
  ).join('');
}

function subcategoryOptions(categoryName, selected) {
  const category = findCategory(categoryName);
  if (!category) return '';
  return category.subcategories
    .map(
      (sub) => `<option value="${esc(sub)}"${sub === selected ? ' selected' : ''}>${esc(sub)}</option>`
    )
    .join('');
}

export function composerMarkup() {
  return `<div class="composer">
    <div>
      <div class="panel">
        <div class="panel__head">
          <h2 data-composer-heading>New item</h2>
          <button class="btn btn--ghost btn--sm" type="button" data-composer-reset>Start a new one</button>
        </div>

        <p class="field-label" style="margin-bottom:.5rem">What are you publishing?</p>
        <div class="kind-grid" data-kind-grid>
          ${KINDS.map(
            (kind) => `<button class="kind" type="button" data-kind="${esc(kind.id)}">
              <strong>${esc(kind.label)}</strong><span>${esc(kind.hint)}</span>
            </button>`
          ).join('')}
        </div>

        <form data-composer-form novalidate>
          <input type="hidden" name="id">

          <div class="field">
            <label for="c-title">Title</label>
            <input id="c-title" name="title" type="text" maxlength="160" required
              placeholder="Tor Preme Pagol — Eid Natok 2026">
          </div>

          <div class="field">
            <label for="c-description">Short summary <small>shown on cards and used for the meta description</small></label>
            <textarea id="c-description" name="description" maxlength="800" rows="3"
              placeholder="One or two sentences describing this release."></textarea>
          </div>

          <div class="field--row">
            <div class="field">
              <label for="c-category">Category</label>
              <select id="c-category" name="category" data-category>${categoryOptions()}</select>
            </div>
            <div class="field">
              <label for="c-subcategory">Subcategory</label>
              <select id="c-subcategory" name="subcategory" data-subcategory></select>
            </div>
            <div class="field">
              <label for="c-type">Stored as</label>
              <select id="c-type" name="type">
                <option value="video">Video</option>
                <option value="post">Post / article</option>
                <option value="gallery">Gallery item</option>
                <option value="featured">Hero banner</option>
              </select>
            </div>
          </div>

          <div class="panel" style="margin:1rem 0;background:var(--bg-input)">
            <p class="field-label" style="margin-bottom:.6rem">Media</p>
            <div class="dropzone" data-media-drop tabindex="0" role="button"
              aria-label="Upload a video or image">
              <strong>Drop a video or image here, or click to choose</strong>
              <span>MP4, WebM, MOV, JPG, PNG or WebP — large videos upload in chunks automatically</span>
            </div>
            <div data-upload-list></div>

            <div class="field" style="margin-top:.9rem">
              <label for="c-video">Video link or file URL <small>YouTube, Facebook, Vimeo or a hosted .mp4</small></label>
              <input id="c-video" name="video_url" type="text" inputmode="url" maxlength="600" placeholder="https://youtu.be/… or /media/clip.mp4">
            </div>
            <div class="field">
              <label for="c-image">Cover image URL</label>
              <input id="c-image" name="image" type="text" inputmode="url" maxlength="600" placeholder="https://… or /assets/poster.webp">
            </div>
            <div class="field" style="margin-bottom:0">
              <label for="c-attachment">Extra file URL <small>poster download, PDF, anything else</small></label>
              <input id="c-attachment" name="attachment_url" type="text" inputmode="url" maxlength="600" placeholder="https://… or /assets/file.pdf">
            </div>
          </div>

          <div class="field">
            <label for="c-body">Full article <small>optional — supports ## headings, - lists, **bold** and links</small></label>
            <textarea id="c-body" name="body" rows="10" maxlength="40000"
              placeholder="Write the full story here."></textarea>
          </div>

          <div class="field--row">
            <div class="field">
              <label for="c-published-at">Publish date</label>
              <input id="c-published-at" name="published_at" type="datetime-local">
            </div>
            <div class="field">
              <label for="c-duration">Duration <small>videos only</small></label>
              <input id="c-duration" name="duration" type="text" maxlength="40" placeholder="42:10">
            </div>
            <div class="field">
              <label for="c-sort">Priority <small>higher shows first</small></label>
              <input id="c-sort" name="sort_order" type="number" value="0" min="-100" max="100">
            </div>
          </div>

          <div class="panel" style="background:var(--bg-input)">
            <p class="field-label" style="margin-bottom:.7rem">Search engine settings</p>
            <div class="field">
              <label for="c-slug">URL slug <small data-slug-lock></small></label>
              <input id="c-slug" name="slug" type="text" maxlength="120" data-slug>
            </div>
            <div class="field">
              <label for="c-seo-title">SEO title</label>
              <input id="c-seo-title" name="seo_title" type="text" maxlength="180" data-seo-title>
            </div>
            <div class="field">
              <label for="c-meta">Meta description</label>
              <textarea id="c-meta" name="meta_description" rows="2" maxlength="300" data-meta></textarea>
            </div>
            <div class="field" style="margin-bottom:0">
              <label for="c-keywords">Keywords <small>comma separated</small></label>
              <input id="c-keywords" name="keywords" type="text" maxlength="500"
                placeholder="musfiq r farhan, eid natok 2026, bangla natok">
            </div>
          </div>

          <div style="display:flex;gap:1.25rem;flex-wrap:wrap;margin:1.1rem 0">
            <label class="switch"><input type="checkbox" name="published" checked> Published</label>
            <label class="switch"><input type="checkbox" name="indexable" checked> Allow search engines</label>
          </div>

          <div style="display:flex;gap:.6rem;flex-wrap:wrap">
            <button class="btn btn--primary" type="submit">Save and publish</button>
            <button class="btn btn--ghost" type="button" data-save-draft>Save as draft</button>
            <a class="btn btn--ghost" data-view-live target="_blank" rel="noopener" hidden>View live page</a>
          </div>
        </form>
      </div>
    </div>

    <aside>
      <div class="panel">
        <div class="seo-score">
          <div class="seo-score__ring" data-seo-ring><span data-seo-value>0</span></div>
          <div>
            <h2 style="font-size:.95rem">SEO readiness</h2>
            <p style="font-size:.78rem;color:var(--ink-faint)" data-seo-note>Fill in the fields to raise the score.</p>
          </div>
        </div>
        <ul class="checklist" data-seo-checklist></ul>
      </div>

      <div class="panel">
        <h2 style="font-size:.95rem;margin-bottom:.75rem">Google preview</h2>
        <div class="serp">
          <div class="serp__url" data-serp-url>www.musfiqrfarhan.blog › …</div>
          <p class="serp__title" data-serp-title>Your SEO title</p>
          <p class="serp__desc" data-serp-desc>Your meta description will appear here.</p>
        </div>
      </div>

      <div class="panel">
        <h2 style="font-size:.95rem;margin-bottom:.75rem">Card preview</h2>
        <div data-card-preview></div>
      </div>
    </aside>
  </div>`;
}

/* --------------------------------------------------------------- SEO logic */

function metaFromText(text, title) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return `${title} — official update from ${SITE.person}.`.slice(0, 158);
  if (source.length <= 158) return source;
  const cut = source.slice(0, 158);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\-\s]+$/, '')}…`;
}

function checklistFor(values) {
  const title = values.title || '';
  const seoTitle = values.seo_title || '';
  const meta = values.meta_description || '';
  const needsVideo = values.type === 'video';

  return [
    { label: 'Title is 15–70 characters', pass: title.length >= 15 && title.length <= 70 },
    { label: 'SEO title is 30–65 characters', pass: seoTitle.length >= 30 && seoTitle.length <= 65 },
    { label: 'Meta description is 70–158 characters', pass: meta.length >= 70 && meta.length <= 158 },
    { label: 'A cover image is set', pass: Boolean(values.image) },
    {
      label: needsVideo ? 'A playable video source is set' : 'A summary is written',
      pass: needsVideo ? Boolean(values.video_url || values.attachment_url) : Boolean(values.description)
    },
    { label: 'URL slug is short and readable', pass: Boolean(values.slug) && values.slug.length <= 70 },
    { label: 'Keywords added', pass: Boolean(values.keywords) },
    { label: 'Article body has real depth (300+ characters)', pass: (values.body || '').length >= 300 }
  ];
}

function paintSeo(root, values) {
  const checks = checklistFor(values);
  const passed = checks.filter((check) => check.pass).length;
  const score = Math.round((passed / checks.length) * 100);

  const ring = $('[data-seo-ring]', root);
  ring.style.setProperty('--value', score);
  $('[data-seo-value]', root).textContent = score;
  $('[data-seo-note]', root).textContent =
    score >= 85 ? 'Ready to publish.' : score >= 55 ? 'Nearly there.' : 'A few fields still to fill.';

  $('[data-seo-checklist]', root).innerHTML = checks
    .map((check) => `<li class="${check.pass ? 'is-pass' : ''}">${esc(check.label)}</li>`)
    .join('');

  const categorySlug = findCategory(values.category)?.slug || 'archive';
  $('[data-serp-url]', root).textContent = `www.musfiqrfarhan.blog › ${categorySlug} › ${values.slug || '…'}`;
  $('[data-serp-title]', root).textContent = values.seo_title || values.title || 'Your SEO title';
  $('[data-serp-desc]', root).textContent =
    values.meta_description || 'Your meta description will appear here.';

  $('[data-card-preview]', root).innerHTML = `<div class="media-tile">
    <img src="${esc(values.image || '/assets/img/hero_red-1280.webp')}" alt="">
    <div class="media-tile__body">
      <span style="font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:var(--brand-bright)">${esc(
        values.category || 'Category'
      )}</span>
      <strong style="font-size:.85rem">${esc(values.title || 'Untitled')}</strong>
      <span style="font-size:.74rem;color:var(--ink-faint)">${esc(values.description || '')}</span>
    </div>
  </div>`;
}

/* ----------------------------------------------------------------- wiring */

function readForm(form) {
  const values = Object.fromEntries(new FormData(form));
  values.published = form.published.checked ? 1 : 0;
  values.indexable = form.indexable.checked ? 1 : 0;
  values.sort_order = Number(values.sort_order || 0);
  if (values.published_at) values.published_at = new Date(values.published_at).toISOString();
  return values;
}

function applyKind(root, kindId) {
  const kind = findKind(kindId);
  if (!kind) return;
  const form = $('[data-composer-form]', root);
  for (const button of root.querySelectorAll('[data-kind]')) {
    button.classList.toggle('is-active', button.dataset.kind === kindId);
  }
  form.type.value = kind.type;
  form.category.value = kind.category;
  $('[data-subcategory]', root).innerHTML = subcategoryOptions(kind.category, kind.subcategory);
  form.dataset.kind = kindId;
  refresh(root);
}

function refresh(root) {
  const form = $('[data-composer-form]', root);
  const values = readForm(form);

  // The SEO fields track the title until an editor types their own.
  if (autoState.slug && !values.id) {
    form.slug.value = slugify(values.title);
  }
  if (autoState.seoTitle) {
    form.seo_title.value = values.title ? `${values.title} | ${SITE.name}` : '';
  }
  if (autoState.metaDescription) {
    form.meta_description.value = values.title
      ? metaFromText(values.description || values.body, values.title)
      : '';
  }

  paintSeo(root, readForm(form));
}

export function fillComposer(root, item = null) {
  const form = $('[data-composer-form]', root);
  form.reset();
  // A hidden input's value IDL attribute is in "default" mode: assigning to it
  // also sets the content attribute, so form.reset() will not clear it. Left
  // alone, "Start a new one" after a save would keep the previous id and
  // overwrite that item instead of creating a new one.
  form.id.value = item?.id ?? '';
  form.dataset.kind = item?.kind || '';
  current = item;
  autoState = item ? { seoTitle: false, metaDescription: false, slug: false } : { ...AUTO };

  $('[data-composer-heading]', root).textContent = item ? `Editing: ${item.title}` : 'New item';
  $('[data-slug-lock]', root).textContent = item
    ? 'locked — the published URL never changes'
    : 'generated from the title';
  form.slug.readOnly = Boolean(item);

  const viewLive = $('[data-view-live]', root);
  if (item?.path && item.published) {
    viewLive.href = `${SITE.origin}${item.path}`;
    viewLive.hidden = false;
  } else {
    viewLive.hidden = true;
  }

  for (const button of root.querySelectorAll('[data-kind]')) button.classList.remove('is-active');

  if (!item) {
    $('[data-subcategory]', root).innerHTML = subcategoryOptions(CATEGORIES[0].name);
    $('[data-upload-list]', root).innerHTML = '';
    refresh(root);
    return;
  }

  form.title.value = item.title || '';
  form.description.value = item.description || '';
  form.category.value = item.category || CATEGORIES[0].name;
  $('[data-subcategory]', root).innerHTML = subcategoryOptions(item.category, item.subcategory);
  form.type.value = item.type || 'post';
  form.video_url.value = item.video_url || '';
  form.image.value = item.image || '';
  form.attachment_url.value = item.attachment_url || '';
  form.body.value = item.body || '';
  form.published_at.value = item.published_at ? String(item.published_at).slice(0, 16) : '';
  form.duration.value = item.duration || '';
  form.sort_order.value = item.sort_order ?? 0;
  form.slug.value = item.slug || '';
  form.seo_title.value = item.seo_title || '';
  form.meta_description.value = item.meta_description || '';
  form.keywords.value = item.keywords || '';
  form.published.checked = Number(item.published) === 1;
  form.indexable.checked = Number(item.indexable) !== 0;
  if (item.kind) {
    root.querySelector(`[data-kind="${CSS.escape(item.kind)}"]`)?.classList.add('is-active');
  }
  $('[data-upload-list]', root).innerHTML = '';
  refresh(root);
}

async function save(root, { asDraft = false } = {}) {
  const form = $('[data-composer-form]', root);
  const values = readForm(form);
  if (asDraft) values.published = 0;
  values.kind = form.dataset.kind || '';

  if (!values.title.trim()) {
    toast('Add a title first.', 'error');
    form.title.focus();
    return;
  }

  const button = asDraft ? $('[data-save-draft]', root) : form.querySelector('[type="submit"]');
  button.disabled = true;
  try {
    // The id identifies the record in the URL, so it is not part of the body.
    // Form values are strings, and sending a stringly-typed duplicate is an
    // easy way for a caller to end up comparing "91" against 91.
    const { id, ...payload } = values;
    const saved = id
      ? await adminApi.updateContent(id, payload)
      : await adminApi.createContent(payload);
    toast(values.published ? 'Published. It is live now.' : 'Saved as a draft.');
    fillComposer(root, saved);
    onSaved(saved);
  } catch (error) {
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

export function initComposer(root, { onSave } = {}) {
  onSaved = onSave || (() => {});
  const form = $('[data-composer-form]', root);

  root.querySelector('[data-kind-grid]').addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (button) applyKind(root, button.dataset.kind);
  });

  $('[data-category]', root).addEventListener('change', (event) => {
    $('[data-subcategory]', root).innerHTML = subcategoryOptions(event.target.value);
    refresh(root);
  });

  // Any manual edit to an SEO field stops it tracking the title.
  $('[data-seo-title]', root).addEventListener('input', () => {
    autoState.seoTitle = false;
  });
  $('[data-meta]', root).addEventListener('input', () => {
    autoState.metaDescription = false;
  });
  $('[data-slug]', root).addEventListener('input', () => {
    autoState.slug = false;
  });

  form.addEventListener('input', () => refresh(root));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save(root);
  });
  $('[data-save-draft]', root).addEventListener('click', () => save(root, { asDraft: true }));
  $('[data-composer-reset]', root).addEventListener('click', () => fillComposer(root, null));

  makeDropzone($('[data-media-drop]', root), async (files) => {
    const list = $('[data-upload-list]', root);
    for (const file of files) {
      const row = uploadRow(list, file.name);
      try {
        const result = await adminApi.uploadFile(file, row.progress);
        row.done();
        // Route the uploaded file to the right field so it is actually used.
        if (result.media_kind === 'video') form.video_url.value = result.url;
        else if (result.media_kind === 'image') form.image.value = result.url;
        else form.attachment_url.value = result.url;
        refresh(root);
        toast(`${file.name} uploaded.`);
      } catch (error) {
        row.fail(error.message);
        toast(`${file.name}: ${error.message}`, 'error');
      }
    }
  });

  fillComposer(root, null);
}

export function composerCurrent() {
  return current;
}
