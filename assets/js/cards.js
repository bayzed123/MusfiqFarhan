/** Card, rail and grid renderers shared by the home, category and detail pages. */

import { SITE } from './config.js';
import { $$, attr, esc, formatDate, mediaUrl, starMarkup } from './dom.js';

const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
const ARROW_LEFT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="20" height="20" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
const ARROW_RIGHT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" width="20" height="20" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';

function isVideo(item) {
  return item.type === 'video' || String(item.media_type || '').includes('video');
}

/**
 * @param {object} item
 * @param {{ variant?: 'wide'|'poster', eager?: boolean }} [options]
 */
export function cardMarkup(item, { variant = 'wide', eager = false } = {}) {
  const href = item.path || item.url || '/';
  const image = mediaUrl(item.image || item.thumbnail_url, SITE.fallbackImage);
  const video = isVideo(item);
  const width = variant === 'poster' ? 300 : 480;
  const height = variant === 'poster' ? 450 : 270;

  return `<article class="card${variant === 'poster' ? ' card--poster' : ''}">
    <div class="card__media">
      <img src="${attr(image)}" alt="${attr(item.title)}" width="${width}" height="${height}"
        loading="${eager ? 'eager' : 'lazy'}" decoding="async" ${eager ? 'fetchpriority="high"' : ''}>
      ${item.subcategory ? `<span class="card__badge">${esc(item.subcategory)}</span>` : ''}
      ${video ? `<span class="card__play" aria-hidden="true"><span>${PLAY_ICON}</span></span>` : ''}
      ${item.duration ? `<span class="card__duration">${esc(item.duration)}</span>` : ''}
    </div>
    <div class="card__body">
      <p class="card__kicker">${esc(item.category || 'Official')}</p>
      <h3 class="card__title">${esc(item.title)}</h3>
      ${item.description ? `<p class="card__excerpt">${esc(item.description)}</p>` : ''}
      <div class="card__foot">
        <time datetime="${attr(item.published_at || '')}">${esc(
          formatDate(item.published_at || item.year, { month: 'short', year: 'numeric' })
        )}</time>
        ${item.rating ? starMarkup(item.rating) : `<span>${video ? 'Watch' : 'Read'} →</span>`}
      </div>
    </div>
    <a class="card__link" href="${attr(href)}">
      <span class="visually-hidden">${video ? 'Watch' : 'Read'} ${esc(item.title)}</span>
    </a>
  </article>`;
}

export function gridMarkup(items, options = {}) {
  if (!items?.length) return '';
  return items.map((item, index) => cardMarkup(item, { ...options, eager: index < 3 && options.eager })).join('');
}

/**
 * A horizontally scrolling row of cards with keyboard-reachable arrows.
 */
export function railMarkup({ id, title, blurb, href, items, variant = 'wide' }) {
  if (!items?.length) return '';
  return `<section class="section" aria-labelledby="${attr(id)}-title">
    <div class="section__head">
      <div>
        <h2 class="section__title" id="${attr(id)}-title">${esc(title)}</h2>
        ${blurb ? `<p class="section__blurb">${esc(blurb)}</p>` : ''}
      </div>
      ${href ? `<a class="section__link" href="${attr(href)}">See all →</a>` : ''}
    </div>
    <div class="rail${variant === 'poster' ? ' rail--posters' : ''}" data-rail>
      <button class="rail__arrow rail__arrow--prev" type="button" data-rail-prev aria-label="Scroll ${esc(
        title
      )} left">${ARROW_LEFT}</button>
      <div class="rail__track" data-rail-track tabindex="0" role="group" aria-label="${esc(title)}">
        ${items.map((item) => cardMarkup(item, { variant })).join('')}
      </div>
      <button class="rail__arrow rail__arrow--next" type="button" data-rail-next aria-label="Scroll ${esc(
        title
      )} right">${ARROW_RIGHT}</button>
    </div>
  </section>`;
}

/** Wire up arrow buttons for every rail currently in the document. */
export function initRails(scope = document) {
  for (const rail of $$('[data-rail]', scope)) {
    const track = rail.querySelector('[data-rail-track]');
    const prev = rail.querySelector('[data-rail-prev]');
    const next = rail.querySelector('[data-rail-next]');
    if (!track) continue;

    const step = () => Math.max(track.clientWidth * 0.82, 240);
    const sync = () => {
      const max = track.scrollWidth - track.clientWidth - 4;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max;
    };

    prev?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    next?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync, { passive: true });
    sync();
  }
}

export function skeletonRail(count = 5) {
  return `<div class="rail"><div class="rail__track">${Array.from(
    { length: count },
    () => '<div class="skeleton card-skeleton"></div>'
  ).join('')}</div></div>`;
}
