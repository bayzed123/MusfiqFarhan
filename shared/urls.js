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

export function categoryPath(category, subcategory = '') {
  const cat = categorySlug(category);
  if (!cat) return '/';
  const sub = subcategory ? subcategorySlug(subcategory) : '';
  return sub ? `/c/${cat}/${sub}/` : `/c/${cat}/`;
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
  about: '/about.html',
  contact: '/contact.html',
  privacy: '/privacy-policy.html',
  terms: '/terms-of-service.html',
  editorial: '/editorial-standards.html'
};

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
