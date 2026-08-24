/**
 * Detail page controller for a single post or video.
 *
 * A third-party embed is click-to-play: the poster paints immediately and the
 * iframe is only created on interaction, which keeps the largest contentful
 * paint fast and avoids third-party scripts on load. The player markup itself
 * lives in shared/video.js so the build writes the same thing.
 */

import { rightsBlock } from '../../shared/rights.js';
import { isVideoItem, playerHtml, videoSchema } from '../../shared/video.js';
import { api } from './api.js';
import { SITE } from './config.js';
import { $, addJsonLd, attr, esc, formatDate, mediaUrl, renderBody, setMeta } from './dom.js';
import { initRails, railMarkup } from './cards.js';
import { initRatings } from './rating.js';

function initPlayer(scope) {
  const embed = $('[data-player-embed]', scope);
  if (!embed) return;
  const start = $('[data-player-start]', embed);
  start?.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `${embed.dataset.playerEmbed}${embed.dataset.playerEmbed.includes('?') ? '&' : '?'}autoplay=1`;
    iframe.title = document.title;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.loading = 'eager';
    embed.replaceChildren(iframe);
  });
}

function metaRow(item) {
  return [
    item.published_at
      ? `<time datetime="${attr(item.published_at)}">${esc(formatDate(item.published_at))}</time>`
      : '',
    item.author_name ? `<span>By <strong>${esc(item.author_name)}</strong></span>` : '',
    item.duration ? `<span>${esc(item.duration)}</span>` : '',
    // Filled in separately: the reading count comes from a second request that
    // must not hold up the page, and is simply absent when GA4 is not wired up.
    '<span class="views" data-entry-views hidden></span>',
    item.rating ? `<span class="stars">★ ${Number(item.rating).toFixed(1)} (${item.rating_count})</span>` : ''
  ]
    .filter(Boolean)
    .join('');
}

/**
 * How many people have read this page, from Google Analytics by way of the
 * Worker. Deliberately last and deliberately quiet: it is the least important
 * thing on the page, the numbers are cached for half an hour anyway, and a
 * site with no analytics configured should show nothing rather than a zero.
 */
async function paintViews(path) {
  const host = $('[data-entry-views]');
  if (!host) return;
  try {
    const data = await api.views();
    const key = String(path || '').replace(/\/+$/, '') || '/';
    const count = Number(data?.views?.[key] || 0);
    if (!count) return;
    // The exact number, not the site's usual "12k" shorthand: a reading
    // count is one of the few figures people want precisely.
    host.textContent = `${count.toLocaleString('en-GB')} ${count === 1 ? 'view' : 'views'}`;
    host.hidden = false;
  } catch {
    /* analytics is never worth an error on the page */
  }
}

/** The category slug is the first segment of the item's permanent path. */
function categorySlugOf(item) {
  return String(item.path || '').split('/').filter(Boolean)[0] || '';
}

function structuredData(item) {
  const url = `${SITE.origin}${item.path}`;
  const image = mediaUrl(item.og_image || item.image, SITE.fallbackImage);
  const absoluteImage = image.startsWith('http') ? image : `${SITE.origin}${image}`;

  const graph = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.origin}/` },
        {
          '@type': 'ListItem',
          position: 2,
          name: item.category,
          item: `${SITE.origin}/c/${categorySlugOf(item)}/`
        },
        { '@type': 'ListItem', position: 3, name: item.title, item: url }
      ]
    }
  ];

  if (isVideoItem(item)) {
    // Same helper the build uses, so the pre-rendered markup and the markup
    // this replaces it with cannot disagree about the same video.
    graph.push(videoSchema(item, SITE.origin));
  } else {
    graph.push({
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: item.seo_title || item.title,
      description: item.meta_description || item.description,
      image: [absoluteImage],
      datePublished: item.published_at,
      dateModified: item.modified_at || item.published_at,
      author: { '@id': `${SITE.origin}/#person` },
      publisher: { '@id': `${SITE.origin}/#organization` },
      ...rightsBlock(item, SITE.origin),
      mainEntityOfPage: url,
      inLanguage: 'en'
    });
  }

  addJsonLd({ '@context': 'https://schema.org', '@graph': graph }, 'entry-schema');
}

export async function initEntry() {
  const slug = document.body.dataset.slug;
  if (!slug) return;

  // The page is already server-rendered, so a failed or empty content fetch
  // must not cost the visitor the rating form: it reads a different endpoint
  // and works on its own.
  let payload;
  try {
    payload = await api.content(slug);
  } catch {
    initRails();
    initRatings();
    return;
  }

  const { item, related } = payload || {};
  if (!item) {
    initRails();
    initRatings();
    return;
  }

  // Keep the head in step with the live record, in case the item was edited
  // after the page was generated.
  document.title = item.seo_title || `${item.title} | ${SITE.name}`;
  setMeta('meta[name="description"]', 'content', item.meta_description || item.description);
  const canonical = `${SITE.origin}${item.path}`;
  const absoluteImage = mediaUrl(item.og_image || item.image, SITE.fallbackImage);
  const imageUrl = absoluteImage.startsWith('http') ? absoluteImage : `${SITE.origin}${absoluteImage}`;
  setMeta('link[rel="canonical"]', 'href', canonical);
  setMeta('meta[property="og:url"]', 'content', canonical);
  setMeta('meta[property="og:title"]', 'content', item.seo_title || item.title);
  setMeta('meta[property="og:description"]', 'content', item.meta_description || item.description);
  setMeta('meta[property="og:image"]', 'content', imageUrl);
  setMeta('meta[property="og:image:alt"]', 'content', item.seo_title || item.title);
  setMeta('meta[name="twitter:title"]', 'content', item.seo_title || item.title);
  setMeta('meta[name="twitter:description"]', 'content', item.meta_description || item.description);
  setMeta('meta[name="twitter:image"]', 'content', imageUrl);
  setMeta('meta[name="twitter:image:alt"]', 'content', item.seo_title || item.title);
  if (item.indexable === 0) setMeta('meta[name="robots"]', 'content', 'noindex,follow');

  const playerHost = $('[data-entry-player]');
  if (playerHost) {
    playerHost.innerHTML = playerHtml(item, { fallbackPoster: SITE.fallbackImage });
    initPlayer(playerHost);
  }

  const titleNode = $('[data-entry-title]');
  if (titleNode) titleNode.textContent = item.title;

  const metaNode = $('[data-entry-meta]');
  if (metaNode) metaNode.innerHTML = metaRow(item);

  const leadNode = $('[data-entry-lead]');
  if (leadNode && item.description) leadNode.textContent = item.description;

  const bodyNode = $('[data-entry-body]');
  if (bodyNode) {
    const html = renderBody(item.body);
    if (html) bodyNode.innerHTML = html;
    else if (!bodyNode.textContent.trim() && item.description) {
      bodyNode.innerHTML = `<p>${esc(item.description)}</p>`;
    }
  }

  const crumbNode = $('[data-entry-crumb]');
  if (crumbNode) crumbNode.textContent = item.category;

  const relatedHost = $('[data-entry-related]');
  if (relatedHost && related?.length) {
    relatedHost.innerHTML = railMarkup({
      id: 'related',
      title: `More from ${item.category}`,
      href: `/c/${categorySlugOf(item)}/`,
      items: related
    });
  }

  structuredData(item);
  initRails();
  initRatings({ title: item.title });
  paintViews(item.path);
}

initEntry();
