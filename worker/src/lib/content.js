/** Content normalisation, validation and queries. */

import { clean, toInt } from './http.js';
import { normaliseRightsMode } from '../../../shared/rights.js';
import { CONTENT_TYPES, findKind, resolvePlacement, IMAGE_FIRST_CATEGORIES } from '../../../shared/taxonomy.js';
import {
  PERSON_NAME,
  SITE_NAME,
  buildSeoSlug,
  contentPath,
  contentUrl,
  derivedThumbnail,
  embedUrlFor,
  isDirectVideo,
  isImage
} from '../../../shared/urls.js';

export const CONTENT_COLUMNS = `id, type, kind, title, slug, path, image, video_url, attachment_url,
  media_type, category, subcategory, year, description, seo_title, meta_description, keywords,
  author_name, canonical_url, og_image, body, published_at, modified_at, duration, embed_url,
  thumbnail_url, indexable, rights_mode, published, sort_order, view_count, created_at, updated_at`;

/** Trim a description down to a search-friendly meta description. */
export function toMetaDescription(text, title) {
  const source = clean(text, 600).replace(/\s+/g, ' ');
  if (!source) return clean(`${title} — official update from ${PERSON_NAME}.`, 300);
  if (source.length <= 158) return source;
  const cut = source.slice(0, 158);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:\-\s]+$/, '')}…`;
}

/**
 * Work out where the playable/visible media for an item lives.
 * An item may be backed by a hosted R2 file, a YouTube link, any other
 * embeddable URL, or a plain image.
 */
export function resolveMedia({ type, videoUrl, attachmentUrl, image, embedUrl }) {
  const candidates = [videoUrl, attachmentUrl, embedUrl].filter(Boolean);
  const hostedVideo = candidates.find((url) => isDirectVideo(url)) || '';
  const embeddable = candidates.map((url) => embedUrlFor(url)).find(Boolean) || '';
  const playable = hostedVideo || embeddable;
  const poster =
    image ||
    derivedThumbnail(videoUrl || embedUrl || attachmentUrl) ||
    (isImage(attachmentUrl) ? attachmentUrl : '');

  let mediaType = 'link';
  if (playable) mediaType = hostedVideo ? 'file-video' : 'embed-video';
  else if (isImage(image) || isImage(attachmentUrl)) mediaType = 'image';
  else if (type === 'post') mediaType = 'article';

  return { playable, hostedVideo, embeddable, poster, mediaType };
}

/**
 * Turn an admin payload into a validated row. Returns `{ error }` when the
 * item cannot be published as described.
 *
 * `existing` is passed on update so the slug (and therefore the canonical URL)
 * is never rewritten after first publish.
 */
export function normalizeContent(body, existing = null) {
  const preset = findKind(body.kind);
  const requestedType = clean(body.type, 20).toLowerCase();
  const type = preset?.type || (CONTENT_TYPES.includes(requestedType) ? requestedType : '');

  const title = clean(body.title, 160);
  if (!type) return { error: 'Choose a content type or a preset.' };
  if (!title) return { error: 'A title is required.' };

  const placement = resolvePlacement({
    kind: body.kind,
    category: body.category,
    subcategory: body.subcategory
  });
  if (!placement.ok) return { error: placement.error };

  const slug = existing?.slug || buildSeoSlug(clean(body.slug, 120) || title, { fallback: type });
  if (!slug) return { error: 'Could not build a URL slug from this title. Add a Latin-script slug.' };

  const videoUrl = clean(body.video_url || body.url, 600);
  const attachmentUrl = clean(body.attachment_url || body.media_url, 600);
  const image = clean(body.image, 600);
  const media = resolveMedia({
    type,
    videoUrl,
    attachmentUrl,
    image,
    embedUrl: clean(body.embed_url, 600)
  });

  const description = clean(body.description || body.excerpt, 800);
  const published = body.published === 0 || body.published === false ? 0 : 1;

  const row = {
    type,
    kind: preset?.id || placement.kind || clean(body.kind, 40) || '',
    title,
    slug,
    category: placement.category,
    subcategory: placement.subcategory,
    image: media.poster || image,
    videoUrl,
    attachmentUrl,
    mediaType: media.mediaType,
    year: clean(body.year, 20),
    description,
    seoTitle: clean(body.seo_title, 180) || `${title} | ${SITE_NAME}`,
    metaDescription: clean(body.meta_description, 300) || toMetaDescription(description || body.body, title),
    keywords: clean(body.keywords, 500),
    authorName: clean(body.author_name, 120) || PERSON_NAME,
    ogImage: clean(body.og_image, 600) || media.poster || image,
    body: clean(body.body, 40000),
    publishedAt: clean(body.published_at, 40) || existing?.published_at || new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    duration: clean(body.duration, 40),
    embedUrl: media.embeddable || clean(body.embed_url, 600),
    thumbnailUrl: clean(body.thumbnail_url, 600) || media.poster || image,
    indexable: body.indexable === 0 || body.indexable === false ? 0 : 1,
    rightsMode: normaliseRightsMode(body.rights_mode),
    sortOrder: toInt(body.sort_order, 0),
    published
  };

  row.path = contentPath(row);
  row.canonicalUrl = clean(body.canonical_url, 600) || contentUrl(row);

  if (published) {
    const problems = [];
    if (!row.image) problems.push('a cover image');
    if (!row.metaDescription) problems.push('a meta description');
    const needsPlayer = type === 'video' || (preset?.accepts === 'video');
    if (needsPlayer && !media.playable) {
      problems.push('a video file or a video link (YouTube, Facebook, Vimeo or a hosted .mp4)');
    }
    if (IMAGE_FIRST_CATEGORIES.has(row.category) && !row.image) problems.push('an image');
    if (problems.length) {
      return { error: `Before publishing, add ${problems.join(', ')}. Save as a draft to keep your work.` };
    }
  }

  return row;
}

/** Map a D1 row into the shape the site consumes. */
export function toPublicItem(row) {
  if (!row) return null;
  return {
    ...row,
    published: Number(row.published),
    indexable: Number(row.indexable),
    rights_mode: normaliseRightsMode(row.rights_mode),
    sort_order: Number(row.sort_order || 0),
    view_count: Number(row.view_count || 0),
    path: row.path || contentPath(row),
    url: row.canonical_url || contentUrl(row),
    rating: row.rating_average != null ? Number(row.rating_average) : null,
    rating_count: row.rating_count != null ? Number(row.rating_count) : 0
  };
}

const RATING_JOIN = `LEFT JOIN (
    SELECT content_slug, ROUND(AVG(rating), 1) AS rating_average, COUNT(*) AS rating_count
    FROM reviews WHERE approved = 1 AND content_slug IS NOT NULL GROUP BY content_slug
  ) r ON r.content_slug = c.slug`;

const PUBLISHED_ORDER = 'ORDER BY c.sort_order DESC, COALESCE(c.published_at, c.created_at) DESC, c.id DESC';

/**
 * Match a taxonomy name in either position.
 *
 * Nine names are both a category and someone else's subcategory, so an item
 * filed New Natok / Eid Special belongs on /c/new-natok/ and on
 * /c/eid-special/ alike. Matching `c.category` alone is what left the second
 * page empty after a publish.
 */
const TAGGED = '(c.category = ? OR c.subcategory = ?)';

export async function listPublished(env, { category, subcategory, kind, type, limit = 24, offset = 0 } = {}) {
  const filters = ['c.published = 1'];
  const bindings = [];
  if (category) {
    filters.push(TAGGED);
    bindings.push(category, category);
  }
  if (subcategory) {
    filters.push(TAGGED);
    bindings.push(subcategory, subcategory);
  }
  if (kind) {
    filters.push('c.kind = ?');
    bindings.push(kind);
  }
  if (type) {
    filters.push('c.type = ?');
    bindings.push(type);
  }
  const sql = `SELECT c.*, r.rating_average, r.rating_count FROM content c ${RATING_JOIN}
    WHERE ${filters.join(' AND ')} ${PUBLISHED_ORDER} LIMIT ? OFFSET ?`;
  const result = await env.DB.prepare(sql)
    .bind(...bindings, Math.min(Math.max(limit, 1), 100), Math.max(offset, 0))
    .all();
  return result.results.map(toPublicItem);
}

export async function getPublishedBySlug(env, slug) {
  const row = await env.DB.prepare(
    `SELECT c.*, r.rating_average, r.rating_count FROM content c ${RATING_JOIN}
     WHERE c.slug = ? AND c.published = 1 LIMIT 1`
  )
    .bind(slug)
    .first();
  return toPublicItem(row);
}

/** Sibling items used for the "more like this" rail on a detail page. */
export async function listRelated(env, item, limit = 8) {
  if (!item) return [];
  const result = await env.DB.prepare(
    `SELECT c.*, r.rating_average, r.rating_count FROM content c ${RATING_JOIN}
     WHERE c.published = 1 AND c.slug != ? AND (c.category = ? OR c.subcategory = ?)
     ${PUBLISHED_ORDER} LIMIT ?`
  )
    .bind(item.slug, item.category, item.subcategory || item.category, limit)
    .all();
  return result.results.map(toPublicItem);
}

export const INSERT_SQL = `INSERT INTO content (
    type, kind, title, slug, path, image, video_url, attachment_url, media_type, category,
    subcategory, year, description, seo_title, meta_description, keywords, author_name,
    canonical_url, og_image, body, published_at, modified_at, duration, embed_url,
    thumbnail_url, indexable, rights_mode, sort_order, published, updated_at
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) RETURNING *`;

export const UPDATE_SQL = `UPDATE content SET
    type=?, kind=?, title=?, slug=?, path=?, image=?, video_url=?, attachment_url=?, media_type=?,
    category=?, subcategory=?, year=?, description=?, seo_title=?, meta_description=?, keywords=?,
    author_name=?, canonical_url=?, og_image=?, body=?, published_at=?, modified_at=?, duration=?,
    embed_url=?, thumbnail_url=?, indexable=?, rights_mode=?, sort_order=?, published=?, updated_at=CURRENT_TIMESTAMP
  WHERE id=? RETURNING *`;

export function bindValues(row) {
  return [
    row.type,
    row.kind,
    row.title,
    row.slug,
    row.path,
    row.image,
    row.videoUrl,
    row.attachmentUrl,
    row.mediaType,
    row.category,
    row.subcategory,
    row.year,
    row.description,
    row.seoTitle,
    row.metaDescription,
    row.keywords,
    row.authorName,
    row.canonicalUrl,
    row.ogImage,
    row.body,
    row.publishedAt,
    row.modifiedAt,
    row.duration,
    row.embedUrl,
    row.thumbnailUrl,
    row.indexable,
    row.rightsMode,
    row.sortOrder,
    row.published
  ];
}

/** Append `-2`, `-3`… when a slug is already taken. */
export async function uniqueSlug(env, slug) {
  let candidate = slug;
  for (let attempt = 2; attempt < 50; attempt += 1) {
    const clash = await env.DB.prepare('SELECT id FROM content WHERE slug = ? LIMIT 1').bind(candidate).first();
    if (!clash) return candidate;
    candidate = `${slug}-${attempt}`;
  }
  return `${slug}-${Date.now().toString(36)}`;
}
