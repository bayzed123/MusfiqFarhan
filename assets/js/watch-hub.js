/**
 * The watch hub: every video in one place.
 *
 * Netflix behaviour without leaving the page — pick a filter, tap a poster,
 * the player opens over the grid and starts. Nothing loads from a third party
 * until a visitor actually presses play.
 */

import { api } from './api.js';
import { SITE } from './config.js';
import { $, $$, addJsonLd, attr, esc, formatDate, mediaUrl, on } from './dom.js';

const PLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';

/** Sections a video can belong to, in the order the chips appear. */
const SECTIONS = [
  { label: 'All videos', match: () => true },
  { label: 'New Natok', match: (item) => item.category === 'New Natok' },
  { label: 'Teasers', match: (item) => item.category === 'New Teaser' },
  { label: 'Short Clips', match: (item) => item.category === 'Short Clips' },
  { label: 'Behind the Scenes', match: (item) => item.category === 'Behind the Scenes' },
  { label: 'Friends Adda', match: (item) => item.kind === 'friends-adda' },
  { label: 'Eid Special', match: (item) => item.subcategory === 'Eid Special' }
];

let videos = [];
let activeSection = 0;

function isPlayable(item) {
  return Boolean(item.embed_url || item.video_url || item.attachment_url);
}

function isDirectFile(url) {
  return /\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i.test(String(url || ''));
}

function cardMarkup(item, index) {
  const poster = mediaUrl(item.thumbnail_url || item.image, SITE.fallbackImage);
  return `<article class="vcard">
    <button class="vcard__play" type="button" data-play="${index}"
      aria-label="Play ${attr(item.title)}">
      <img src="${attr(poster)}" alt="" width="480" height="270"
        loading="${index < 6 ? 'eager' : 'lazy'}" decoding="async">
      <span class="vcard__badge">${esc(item.subcategory || item.category)}</span>
      ${item.duration ? `<span class="vcard__time">${esc(item.duration)}</span>` : ''}
      <span class="vcard__icon">${PLAY_ICON}</span>
    </button>
    <div class="vcard__body">
      <h3 class="vcard__title">${esc(item.title)}</h3>
      <p class="vcard__meta">
        <time datetime="${attr(item.published_at || '')}">${esc(
          formatDate(item.published_at, { month: 'short', year: 'numeric' })
        )}</time>
        ${item.rating ? ` · ★ ${Number(item.rating).toFixed(1)}` : ''}
      </p>
      <a class="vcard__link" href="${attr(item.path || '/')}">Open full page →</a>
    </div>
  </article>`;
}

function paint() {
  const grid = $('[data-watch-grid]');
  const section = SECTIONS[activeSection];
  const list = videos.filter(section.match);

  grid.innerHTML = list.length
    ? list.map((item, index) => cardMarkup(item, videos.indexOf(item))).join('')
    : '<p class="muted">Nothing published in this section yet.</p>';

  const count = $('[data-watch-count]');
  if (count) count.textContent = `${list.length} ${list.length === 1 ? 'video' : 'videos'}`;
}

/* ------------------------------------------------------------------ player */

function openPlayer(item) {
  const stage = $('[data-watch-stage]');
  const source = item.embed_url || item.video_url || item.attachment_url;
  if (!stage || !source) return;

  const player = isDirectFile(source)
    ? `<video controls autoplay playsinline preload="metadata"
         poster="${attr(mediaUrl(item.thumbnail_url || item.image, SITE.fallbackImage))}">
         <source src="${attr(mediaUrl(source))}" type="video/mp4">
       </video>`
    : `<iframe src="${attr(source)}${source.includes('?') ? '&' : '?'}autoplay=1"
         title="${attr(item.title)}" allowfullscreen
         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`;

  stage.innerHTML = `<div class="stage__frame">${player}</div>
    <div class="stage__meta">
      <p class="card__kicker">${esc(item.category)}${
        item.subcategory ? ` · ${esc(item.subcategory)}` : ''
      }</p>
      <h2 class="stage__title">${esc(item.title)}</h2>
      ${item.description ? `<p class="stage__lede">${esc(item.description)}</p>` : ''}
      <div class="stage__actions">
        <a class="button button--primary" href="${attr(item.path || '/')}">Full page &amp; rating</a>
        <button class="button button--ghost" type="button" data-stage-close>Close player</button>
      </div>
    </div>`;
  stage.hidden = false;
  stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Announce the change for anyone using a screen reader.
  stage.setAttribute('aria-label', `Now playing: ${item.title}`);
}

function closePlayer() {
  const stage = $('[data-watch-stage]');
  if (!stage) return;
  stage.innerHTML = '';
  stage.hidden = true;
}

/* -------------------------------------------------------------------- init */

export async function initWatchHub() {
  const grid = $('[data-watch-grid]');
  if (!grid) return;

  try {
    const data = await api.export();
    videos = (data.items || []).filter((item) => item.type === 'video' && isPlayable(item));
  } catch {
    grid.innerHTML = '<p class="muted">Videos could not load right now. Please refresh in a moment.</p>';
    return;
  }

  if (!videos.length) {
    grid.innerHTML = '<p class="muted">No videos have been published yet.</p>';
    return;
  }

  const chips = $('[data-watch-filters]');
  if (chips) {
    chips.innerHTML = SECTIONS.map(
      (section, index) =>
        `<button class="chip${index === 0 ? ' is-active' : ''}" type="button" data-section="${index}">${esc(
          section.label
        )}</button>`
    ).join('');
    on(chips, 'click', (event) => {
      const chip = event.target.closest('[data-section]');
      if (!chip) return;
      activeSection = Number(chip.dataset.section);
      for (const other of $$('[data-section]', chips)) {
        other.classList.toggle('is-active', other === chip);
      }
      paint();
    });
  }

  on(grid, 'click', (event) => {
    const button = event.target.closest('[data-play]');
    if (button) openPlayer(videos[Number(button.dataset.play)]);
  });

  on($('[data-watch-stage]'), 'click', (event) => {
    if (event.target.closest('[data-stage-close]')) closePlayer();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePlayer();
  });

  paint();

  addJsonLd(
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Watch — every video from Musfiq R. Farhan',
      url: `${SITE.origin}/watch/`,
      isPartOf: { '@id': `${SITE.origin}/#website` },
      about: { '@id': `${SITE.origin}/#person` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: videos.length,
        itemListElement: videos.slice(0, 40).map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE.origin}${item.path}`,
          name: item.title
        }))
      }
    },
    'watch-schema'
  );
}

initWatchHub();
