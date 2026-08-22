/**
 * The blog hub: every written piece in one reading list, kept deliberately
 * separate from the video hub so neither has to compete with the other.
 */

import { api } from './api.js';
import { SITE } from './config.js';
import { $, $$, addJsonLd, attr, esc, formatDate, mediaUrl, on } from './dom.js';

/** Written sections, in chip order. */
const SECTIONS = [
  { label: 'All writing', match: () => true },
  { label: 'Blog', match: (item) => item.category === 'Blog' },
  { label: 'Biography & Journey', match: (item) => item.category === 'Biography & Journey' },
  { label: 'Press', match: (item) => item.category === 'Press' },
  { label: 'Studio Notes', match: (item) => item.category === 'Behind the Scenes' },
  { label: 'Lifestyle & Fashion', match: (item) => item.category === 'Lifestyle & Fashion' }
];

let posts = [];
let activeSection = 0;

/** Rough reading time so a visitor knows what they are committing to. */
function readingMinutes(item) {
  const words = String(item.body || item.description || '').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function postMarkup(item, index) {
  const cover = mediaUrl(item.image || item.og_image, SITE.fallbackImage);
  return `<article class="post-row">
    <a class="post-row__cover" href="${attr(item.path || '/')}" tabindex="-1" aria-hidden="true">
      <img src="${attr(cover)}" alt="" width="420" height="260"
        loading="${index < 4 ? 'eager' : 'lazy'}" decoding="async">
    </a>
    <div class="post-row__body">
      <p class="card__kicker">${esc(item.category)}${
        item.subcategory ? ` · ${esc(item.subcategory)}` : ''
      }</p>
      <h3 class="post-row__title"><a href="${attr(item.path || '/')}">${esc(item.title)}</a></h3>
      ${item.description ? `<p class="post-row__excerpt">${esc(item.description)}</p>` : ''}
      <p class="post-row__meta">
        <time datetime="${attr(item.published_at || '')}">${esc(formatDate(item.published_at))}</time>
        <span>·</span><span>${readingMinutes(item)} min read</span>
        ${item.rating ? `<span>·</span><span>★ ${Number(item.rating).toFixed(1)}</span>` : ''}
      </p>
    </div>
  </article>`;
}

function paint() {
  const list = $('[data-blog-list]');
  const section = SECTIONS[activeSection];
  const matching = posts.filter(section.match);

  list.innerHTML = matching.length
    ? matching.map(postMarkup).join('')
    : '<p class="muted">Nothing published in this section yet.</p>';

  const count = $('[data-blog-count]');
  if (count) {
    count.textContent = `${matching.length} ${matching.length === 1 ? 'article' : 'articles'}`;
  }
}

export async function initBlogHub() {
  const list = $('[data-blog-list]');
  if (!list) return;

  try {
    const data = await api.export();
    // Everything readable: posts, minus anything that is really a video.
    posts = (data.items || []).filter((item) => item.type === 'post');
  } catch {
    list.innerHTML = '<p class="muted">Articles could not load right now. Please refresh in a moment.</p>';
    return;
  }

  if (!posts.length) {
    list.innerHTML = '<p class="muted">No articles have been published yet.</p>';
    return;
  }

  const chips = $('[data-blog-filters]');
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

  paint();

  addJsonLd(
    {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Musfiq R. Farhan — Blog',
      url: `${SITE.origin}/blog/`,
      isPartOf: { '@id': `${SITE.origin}/#website` },
      author: { '@id': `${SITE.origin}/#person` },
      blogPost: posts.slice(0, 30).map((item) => ({
        '@type': 'BlogPosting',
        headline: item.title,
        url: `${SITE.origin}${item.path}`,
        datePublished: item.published_at,
        image: mediaUrl(item.image, SITE.fallbackImage),
        author: { '@id': `${SITE.origin}/#person` }
      }))
    },
    'blog-schema'
  );
}

initBlogHub();
