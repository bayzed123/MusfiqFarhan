/**
 * Homepage controller.
 *
 * The page ships pre-rendered by the static build, so this refreshes it with
 * live data (a publish from the dashboard shows up without waiting for a
 * rebuild) and then wires the rails up.
 */

import { api } from './api.js';
import { SITE } from './config.js';
import { $, attr, esc, formatDate, mediaUrl, render, starMarkup } from './dom.js';
import { cardMarkup, initRails, railMarkup } from './cards.js';
import { initRatings } from './rating.js';

function heroMarkup(item) {
  if (!item) return '';
  const image = mediaUrl(item.image || item.og_image, SITE.fallbackImage);
  const href = item.path || '/';
  const watchable = item.type === 'video' || String(item.media_type || '').includes('video');

  return `<div class="hero__media">
      <img src="${attr(image)}" alt="" width="1920" height="1080" fetchpriority="high" decoding="async">
    </div>
    <div class="hero__inner">
      <p class="hero__eyebrow">${esc(item.subcategory || item.category || 'Now showing')}</p>
      <h1>${esc(item.title)}${
        item.year ? `<em>${esc(item.year)}</em>` : ''
      }</h1>
      <div class="hero__meta">
        ${item.published_at ? `<time datetime="${attr(item.published_at)}">${esc(formatDate(item.published_at))}</time>` : ''}
        ${item.rating ? starMarkup(item.rating) : ''}
        <span>${esc(item.category || '')}</span>
      </div>
      ${item.description ? `<p class="hero__lede">${esc(item.description)}</p>` : ''}
      <div class="hero__actions">
        <a class="button button--primary" href="${attr(href)}">${watchable ? '▶ Watch now' : 'Read the story'}</a>
        <a class="button button--ghost" href="/c/recent-releases/">Browse recent releases</a>
      </div>
    </div>`;
}

function posterStripMarkup(items) {
  if (!items?.length) return '';
  return `<div class="section__head">
      <div>
        <h2 class="section__title" id="posters-title">Poster release</h2>
        <p class="section__blurb">First-look posters, straight after the banner.</p>
      </div>
      <a class="section__link" href="/c/poster-release/">See all posters →</a>
    </div>
    <div class="rail rail--posters" data-rail>
      <button class="rail__arrow rail__arrow--prev" type="button" data-rail-prev aria-label="Scroll posters left">‹</button>
      <div class="rail__track" data-rail-track tabindex="0" role="group" aria-label="Poster releases">
        ${items.map((item) => cardMarkup(item, { variant: 'poster' })).join('')}
      </div>
      <button class="rail__arrow rail__arrow--next" type="button" data-rail-next aria-label="Scroll posters right">›</button>
    </div>`;
}

export async function initHome() {
  let data;
  try {
    data = await api.home();
  } catch {
    // Keep whatever the static build rendered rather than blanking the page.
    initRails();
    return;
  }

  if (data.featured) render('[data-hero]', heroMarkup(data.featured));

  const posterSection = $('[data-posters]');
  if (posterSection) {
    const markup = posterStripMarkup(data.posters);
    if (markup) posterSection.innerHTML = markup;
    else posterSection.remove();
  }

  const railsHost = $('[data-rails]');
  if (railsHost) {
    railsHost.innerHTML = (data.rails || [])
      // Posters already have their own strip directly under the hero.
      .filter((rail) => rail.category !== 'Poster Release')
      .map((rail) =>
        railMarkup({
          id: `rail-${rail.slug}`,
          title: rail.category,
          href: `/c/${rail.slug}/`,
          items: rail.items,
          variant: ['Gallery', 'Wallpapers', 'Poster Release', 'Lifestyle & Fashion'].includes(rail.category)
            ? 'poster'
            : 'wide'
        })
      )
      .join('');
  }

  initRails();
  initRatings();
}

initHome();
