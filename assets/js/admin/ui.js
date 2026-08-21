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
