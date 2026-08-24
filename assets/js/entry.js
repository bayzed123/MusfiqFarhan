/**
 * Detail page controller for a single post or video.
 *
 * The player is click-to-play: the poster image paints immediately and the
 * iframe is only created on interaction, which keeps the largest contentful
 * paint fast and avoids third-party scripts on load.
 */

import { rightsBlock } from '../../shared/rights.js';
import { isVideoItem, videoSchema } from '../../shared/video.js';
import { api } from './api.js';
import { SITE } from './config.js';
import { $, addJsonLd, attr, esc, formatDate, mediaUrl, renderBody, setMeta } from './dom.js';
import { initRails, railMarkup } from './cards.js';
import { initRatings } from './rating.js';

const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" width="34" height="34" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';

function isDirectVideo(url) {
  return /\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i.test(String(url || ''));
}

function playerMarkup(item) {
  const source = item.embed_url || item.video_url || item.attachment_url;
  if (!source) return '';
  const poster = mediaUrl(item.thumbnail_url || item.image, SITE.fallbackImage);

  if (isDirectVideo(source)) {
    return `<div class="player">
      <video controls preload="none" playsinline poster="${attr(poster)}"
        width="1280" height="720" data-player-video>
        <source src="${attr(mediaUrl(source))}" type="video/mp4">
        Your browser cannot play this video. <a href="${attr(mediaUrl(source))}">Download it instead.</a>
      </video>
    </div>`;
  }

  return `<div class="player" data-player-embed="${attr(source)}">
    <img class="player__poster" src="${attr(poster)}" alt="" width="1280" height="720" fetchpriority="high" decoding="async">
    <button class="player__start" type="button" data-player-start>
      <span>${PLAY}</span>
      <span class="visually-hidden">Play ${esc(item.title)}</span>
    </button>
  </div>`;
}

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
    item.rating ? `<span class="stars">★ ${Number(item.rating).toFixed(1)} (${item.rating_count})</span>` : ''
  ]
    .filter(Boolean)
    .join('');
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
    playerHost.innerHTML = playerMarkup(item);
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
}

initEntry();
