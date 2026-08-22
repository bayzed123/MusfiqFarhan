/** Shared dashboard UI helpers: escaping, toasts, confirms, drop zones. */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
export const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ENTITIES[char]);

export function toast(message, kind = 'ok') {
  const host = $('[data-toasts]') || document.body;
  const node = document.createElement('div');
  node.className = `toast toast--${kind}`;
  node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  node.textContent = message;
  host.appendChild(node);
  setTimeout(() => node.remove(), kind === 'error' ? 7000 : 4000);
}

export function confirmAction(message) {
  return window.confirm(message);
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Turn an element into a click-or-drop upload target.
 * @param {HTMLElement} zone
 * @param {(files: File[]) => void} onFiles
 * @param {{ accept?: string, multiple?: boolean }} [options]
 */
export function makeDropzone(zone, onFiles, { accept = '', multiple = true } = {}) {
  if (!zone) return;
  const input = document.createElement('input');
  input.type = 'file';
  input.hidden = true;
  if (accept) input.accept = accept;
  input.multiple = multiple;
  zone.appendChild(input);

  zone.addEventListener('click', (event) => {
    if (event.target !== input) input.click();
  });
  zone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', () => {
    if (input.files?.length) onFiles([...input.files]);
    input.value = '';
  });

  for (const type of ['dragenter', 'dragover']) {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add('is-dragging');
    });
  }
  for (const type of ['dragleave', 'drop']) {
    zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.remove('is-dragging');
    });
  }
  zone.addEventListener('drop', (event) => {
    const files = [...(event.dataTransfer?.files || [])];
    if (files.length) onFiles(files);
  });
}

/** Progress row for one in-flight upload. */
export function uploadRow(host, name) {
  const node = document.createElement('div');
  node.className = 'upload-item';
  node.innerHTML = `<div class="upload-item__head">
      <span class="upload-item__name">${esc(name)}</span>
      <span data-pct>0%</span>
    </div>
    <div class="progress"><div class="progress__bar" data-bar></div></div>`;
  host.appendChild(node);

  const bar = $('[data-bar]', node);
  const pct = $('[data-pct]', node);

  return {
    progress(value) {
      bar.style.width = `${value}%`;
      pct.textContent = `${value}%`;
    },
    done(label = 'Uploaded') {
      bar.classList.add('is-done');
      bar.style.width = '100%';
      pct.textContent = label;
      setTimeout(() => node.remove(), 3500);
    },
    fail(message) {
      bar.classList.add('is-error');
      pct.textContent = 'Failed';
      node.insertAdjacentHTML('beforeend', `<span style="color:var(--danger)">${esc(message)}</span>`);
    }
  };
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[ঀ-৿]+/g, ' ')
    .replace(/['’"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96)
    .replace(/-$/, '');
}

/**
 * Pick a file that is already in the media library.
 *
 * Copying a URL out of the library and pasting it into a text field is the
 * long way round to change a post's picture. This shows the library as a grid
 * and resolves with the chosen URL, or with '' if the dialog is dismissed.
 *
 * @param {{ title?: string, kind?: 'image' | 'video' | '', load: () => Promise<{items: any[]}> }} options
 * @returns {Promise<string>} the chosen public URL, empty when cancelled
 */
export function pickFromLibrary({ title = 'Choose a file', kind = '', load }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'picker';
    overlay.innerHTML = `<div class="picker__panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="picker__head">
        <h2>${esc(title)}</h2>
        <button class="btn btn--ghost btn--sm" type="button" data-picker-close>Close</button>
      </div>
      <div class="picker__body" data-picker-grid><p class="empty">Loading…</p></div>
    </div>`;
    document.body.appendChild(overlay);

    let settled = false;
    const finish = (url) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      resolve(url);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') finish('');
    };
    document.addEventListener('keydown', onKey);

    overlay.addEventListener('click', (event) => {
      // Clicking the backdrop, or Close, cancels without choosing.
      if (event.target === overlay || event.target.closest('[data-picker-close]')) return finish('');
      const choice = event.target.closest('[data-picker-choose]');
      if (choice) finish(choice.dataset.pickerChoose);
    });

    const grid = overlay.querySelector('[data-picker-grid]');
    load()
      .then((data) => {
        const items = (data.items || []).filter((item) => !kind || item.media_kind === kind);
        if (!items.length) {
          grid.innerHTML = '<p class="empty">Nothing in the library yet. Upload a file first.</p>';
          return;
        }
        grid.innerHTML = `<div class="media-grid">${items
          .map(
            (item) => `<button class="media-tile media-tile--pick" type="button"
              data-picker-choose="${esc(item.public_url)}" title="${esc(item.original_name)}">
              ${
                item.media_kind === 'video'
                  ? `<video src="${esc(item.public_url)}" muted playsinline preload="metadata"></video>`
                  : `<img src="${esc(item.public_url)}" alt="" loading="lazy" decoding="async">`
              }
              <span class="media-tile__name">${esc(item.original_name)}</span>
            </button>`
          )
          .join('')}</div>`;
      })
      .catch((error) => {
        grid.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
      });
  });
}
