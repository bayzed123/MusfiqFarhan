/** Gallery page: filter chips plus a lightbox for full-size viewing. */

import { rightsBlock } from '../../shared/rights.js';
import { SITE } from './config.js';
import { api } from './api.js';
import { $, $$, addJsonLd, attr, esc, on } from './dom.js';

let allItems = [];

/**
 * An ImageObject per photograph, so image search knows who owns them.
 *
 * Google's licence badge needs `license` and `acquireLicensePage` on the
 * image itself; the sitemap cannot carry either. Only the images the editor
 * marked original get that block — a still supplied by a production company
 * is published here with permission, not ours to license.
 */
function describeImages(items) {
  if (!items.length) return;
  addJsonLd(
    {
      '@context': 'https://schema.org',
      '@type': 'ImageGallery',
      '@id': `${SITE.origin}/gallery/#gallery`,
      name: 'Musfiq R. Farhan — official gallery',
      isPartOf: { '@id': `${SITE.origin}/#website` },
      about: { '@id': `${SITE.origin}/#person` },
      image: items.slice(0, 60).map((item) => ({
        '@type': 'ImageObject',
        contentUrl: absolute(item.image_url),
        name: item.title,
        caption: item.caption || item.alt_text || item.title,
        ...rightsBlock(item, SITE.origin)
      }))
    },
    'gallery-schema'
  );
}

function absolute(url) {
  const value = String(url || '').trim();
  return /^https?:\/\//i.test(value) ? value : `${SITE.origin}/${value.replace(/^\//, '')}`;
}

function figureMarkup(item, index) {
  return `<figure class="figure">
    <img src="${attr(item.image_url)}" alt="${attr(item.alt_text || item.title)}"
      width="460" height="613" loading="${index < 6 ? 'eager' : 'lazy'}" decoding="async">
    <figcaption>${esc(item.caption || item.title)}</figcaption>
    <button class="card__link" type="button" data-lightbox="${index}">
      <span class="visually-hidden">Open ${esc(item.title)} full size</span>
    </button>
  </figure>`;
}

function paint(items) {
  const grid = $('[data-gallery-grid]');
  if (!grid) return;
  grid.innerHTML = items.length
    ? items.map(figureMarkup).join('')
    : '<p class="muted">No images in this set yet.</p>';
  const count = $('[data-gallery-count]');
  if (count) count.textContent = `${items.length} ${items.length === 1 ? 'image' : 'images'}`;
}

function initFilters() {
  on('[data-gallery-filters]', 'click', (event) => {
    const chip = event.target.closest('[data-filter]');
    if (!chip) return;
    for (const other of $$('[data-filter]')) other.classList.toggle('is-active', other === chip);
    const value = chip.dataset.filter;
    paint(value === 'all' ? allItems : allItems.filter((item) => item.category === value));
  });
}

function initLightbox() {
  const dialog = $('[data-lightbox-dialog]');
  if (!dialog) return;

  on('[data-gallery-grid]', 'click', (event) => {
    const trigger = event.target.closest('[data-lightbox]');
    if (!trigger) return;
    const item = allItems[Number(trigger.dataset.lightbox)];
    if (!item) return;
    dialog.innerHTML = `<button class="icon-button" type="button" data-lightbox-close aria-label="Close"
        style="position:absolute;top:1rem;right:1rem;z-index:2">✕</button>
      <img src="${attr(item.image_url)}" alt="${attr(item.alt_text || item.title)}"
        style="max-height:86vh;width:auto;margin:auto;border-radius:14px">
      <p style="text-align:center;margin-top:1rem;color:var(--ink-soft)">${esc(item.caption || item.title)}</p>`;
    dialog.showModal();
  });

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || event.target.closest('[data-lightbox-close]')) dialog.close();
  });
}

export async function initGallery() {
  const grid = $('[data-gallery-grid]');
  if (!grid) return;
  try {
    const data = await api.gallery();
    allItems = data.items || [];
    paint(allItems);
    describeImages(allItems);
  } catch {
    grid.innerHTML = '<p class="muted">The gallery could not load. Please refresh in a moment.</p>';
  }
  initFilters();
  initLightbox();
}

initGallery();
