/**
 * URL and SEO-slug rules shared by the Worker, the static build and the admin.
 *
 * Every published item gets one permanent, human-readable URL of the shape
 *   /<category-slug>/<item-slug>/
 * and category listings live at
 *   /c/<category-slug>/            and  /c/<category-slug>/<subcategory-slug>/
 *
 * The slug is written once, on first publish, and is never regenerated — that
 * keeps canonical URLs and search rankings stable when a title is edited.
 */

import { categorySlug, subcategorySlug } from './taxonomy.js';

export const SITE_ORIGIN = 'https://www.musfiqrfarhan.blog';
export const SITE_NAME = 'Musfiq R. Farhan Official';
export const PERSON_NAME = 'Musfiq R. Farhan';
export const WHATSAPP_CHANNEL = 'https://whatsapp.com/channel/0029VbBdG03HQbS1bTrVHF1X';
export const X_PROFILE = 'https://x.com/musfiqrofficial';

/** Reserved top-level paths that a category slug must never collide with. */
export const RESERVED_PATHS = new Set([
  'assets',
  'admin',
  'api',
  'c',
  'watch',
  'gallery',
  'love-notes',
  'wiki',
  'wikipedia',
  'search',
  'about',
  'contact',
  'privacy-policy',
  'terms-of-service',
  'editorial-standards',
  'media'
]);

export function slugify(value, max = 96) {
  return (
    String(value ?? '')
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[ঀ-৿]+/g, ' ') // drop Bengali glyphs; the title keeps them
      .replace(/['’"]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, max)
      .replace(/-$/, '') || ''
  );
}

/**
 * Build the SEO slug for a new item. Keeps it descriptive but bounded, and
 * appends a short suffix only when the caller reports a collision.
 */
export function buildSeoSlug(title, { fallback = 'story', suffix = '' } = {}) {
  const base = slugify(title) || fallback;
  return suffix ? `${base}-${slugify(suffix, 24)}` : base;
}

export function contentPath(item) {
  const category = categorySlug(item?.category) || 'archive';
  const slug = String(item?.slug || '').trim();
  if (!slug) return '/';
  return `/${category}/${slug}/`;
}

export function contentUrl(item, origin = SITE_ORIGIN) {
  return `${origin}${contentPath(item)}`;
}

/**
 * Two categories have a richer hub of their own — /gallery/ and /blog/ — and
 * the header links those. Left alone, the Categories menu would send people
 * to /c/gallery/ instead: one section, two URLs, two pages competing for the
 * same query. The hub wins; the /c/ listing stays reachable but points at it.
 */
const CATEGORY_HUBS = new Map([
  ['gallery', '/gallery/'],
  ['blog', '/blog/']
]);

/** Where the /c/ listing for a category is written. Always under /c/. */
export function categoryListingPath(category, subcategory = '') {
  const cat = categorySlug(category);
  if (!cat) return '/';
  const sub = subcategory ? subcategorySlug(subcategory) : '';
  return sub ? `/c/${cat}/${sub}/` : `/c/${cat}/`;
}

/** The URL to link to and to index for a category — its hub where it has one. */
export function categoryPath(category, subcategory = '') {
  const cat = categorySlug(category);
  if (!cat) return '/';
  if (!subcategory && CATEGORY_HUBS.has(cat)) return CATEGORY_HUBS.get(cat);
  return categoryListingPath(category, subcategory);
}

/** True when this category's canonical home is a hub rather than /c/<slug>/. */
export function hasCategoryHub(category) {
  return CATEGORY_HUBS.has(categorySlug(category));
}

export function categoryUrl(category, subcategory = '', origin = SITE_ORIGIN) {
  return `${origin}${categoryPath(category, subcategory)}`;
}

export const STATIC_PATHS = {
  home: '/',
  watch: '/watch/',
  blog: '/blog/',
  gallery: '/gallery/',
  loveNotes: '/love-notes/',
  wiki: '/wikipedia/',
  about: '/about.html',
  contact: '/contact.html',
  privacy: '/privacy-policy.html',
  terms: '/terms-of-service.html',
  editorial: '/editorial-standards.html'
};

/**
 * The platforms a shared link can come from.
 *
 * Recognising the host is what lets the site tell its own uploads apart from
 * someone else's video, and credit the second properly instead of claiming it.
 */
const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', url: 'https://www.youtube.com', match: /(?:^|\.)(?:youtube\.com|youtu\.be|youtube-nocookie\.com)$/i },
  { id: 'facebook', name: 'Facebook', url: 'https://www.facebook.com', match: /(?:^|\.)(?:facebook\.com|fb\.watch)$/i },
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com', match: /(?:^|\.)instagram\.com$/i },
  { id: 'vimeo', name: 'Vimeo', url: 'https://vimeo.com', match: /(?:^|\.)(?:vimeo\.com|player\.vimeo\.com)$/i },
  { id: 'tiktok', name: 'TikTok', url: 'https://www.tiktok.com', match: /(?:^|\.)tiktok\.com$/i },
  { id: 'x', name: 'X', url: 'https://x.com', match: /(?:^|\.)(?:x\.com|twitter\.com)$/i },
  { id: 'dailymotion', name: 'Dailymotion', url: 'https://www.dailymotion.com', match: /(?:^|\.)(?:dailymotion\.com|dai\.ly)$/i }
];

/**
 * The platform a URL belongs to, or null when it is ours or unrecognised.
 * A relative path is always ours, so it never reaches the host test.
 */
export function mediaSource(rawUrl) {
  const value = String(rawUrl || '').trim();
  if (!value || !/^https?:\/\//i.test(value)) return null;
  let host = '';
  try {
    host = new URL(value).hostname;
  } catch {
    return null;
  }
  return PLATFORMS.find((platform) => platform.match.test(host)) || null;
}

/**
 * True when a URL points at storage this site controls — the R2 bucket the
 * dashboard uploads to, or the site's own domain. Everything a phone uploads
 * lands in one of the two; a pasted link does not.
 */
export function isOwnMedia(rawUrl, origin = SITE_ORIGIN) {
  const value = String(rawUrl || '').trim();
  if (!value) return false;
  if (!/^https?:\/\//i.test(value)) return true; // a site-relative path
  try {
    const host = new URL(value).hostname;
    const ours = new URL(origin).hostname;
    return (
      host === ours ||
      host.endsWith(`.${ours.replace(/^www\./, '')}`) ||
      host === ours.replace(/^www\./, '') ||
      // The Worker serves R2 media, so uploads carry its hostname.
      /\.workers\.dev$/i.test(host)
    );
  } catch {
    return false;
  }
}

/** Turn any supported media reference into an embeddable player URL. */
export function embedUrlFor(rawUrl) {
  const url = String(rawUrl || '').trim();
  if (!url) return '';
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/
  );
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const facebook = url.match(/facebook\.com\/.+\/videos\/(\d+)/);
  if (facebook) {
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0`;
  }
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return '';
}

/** True when the URL points at a file we can play in a <video> element. */
export function isDirectVideo(rawUrl) {
  return /\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i.test(String(rawUrl || ''));
}

export function isImage(rawUrl) {
  return /\.(jpe?g|png|webp|avif|gif|svg)(\?|#|$)/i.test(String(rawUrl || ''));
}

export function youtubeId(rawUrl) {
  const match = String(rawUrl || '').match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{6,})/
  );
  return match ? match[1] : '';
}

/** Poster image for a video when no thumbnail was uploaded. */
export function derivedThumbnail(rawUrl) {
  const id = youtubeId(rawUrl);
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : '';
}
