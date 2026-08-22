/**
 * MRF-API — the content, media and community API behind musfiqrfarhan.blog.
 *
 * Routes are grouped as:
 *   /api/public/*   read-only data for the site (plus fan submissions)
 *   /api/admin/*    dashboard operations, HMAC bearer token required
 *   /media/*        R2 objects with Range support
 *   /sitemap.xml    generated from live data
 */

import { clean, fail, json, originFor, plain, preflight, readJson, toInt, xml } from './lib/http.js';
import { createToken, credentialsMatch, isAdmin } from './lib/auth.js';
import {
  CONTENT_COLUMNS,
  INSERT_SQL,
  UPDATE_SQL,
  bindValues,
  getPublishedBySlug,
  listPublished,
  listRelated,
  normalizeContent,
  toPublicItem,
  uniqueSlug
} from './lib/content.js';
import {
  abortMultipart,
  completeMultipart,
  deleteMedia,
  listMedia,
  serveMedia,
  startMultipart,
  uploadPart,
  uploadSingle,
  uploadLoveNoteAvatar
} from './lib/media.js';
import { adminNotes, deleteNote, heartNote, marqueeNotes, publicNotes, submitNote, updateNote } from './lib/notes.js';
import { adminReviews, deleteReview, publicReviews, submitReview, updateReview } from './lib/reviews.js';
import { CATEGORIES, HOME_RAILS, KINDS, findCategory, findSubcategory } from '../../shared/taxonomy.js';
import { fullSitemap } from '../../shared/sitemap.js';

const HOME_RAIL_SIZE = 12;

async function publicHome(env) {
  const featured = await env.DB.prepare(
    "SELECT * FROM content WHERE type='featured' AND published=1 ORDER BY sort_order DESC, updated_at DESC LIMIT 1"
  ).first();

  // The poster strip sits directly under the hero, ahead of every other rail.
  const posters = await listPublished(env, { category: 'Poster Release', limit: 12 });

  const rails = [];
  for (const name of HOME_RAILS) {
    const items = await listPublished(env, { category: name, limit: HOME_RAIL_SIZE });
    if (items.length) {
      rails.push({ category: name, slug: findCategory(name)?.slug || '', items });
    }
  }

  const latest = await listPublished(env, { limit: 18 });

  return {
    featured: toPublicItem(featured),
    posters,
    rails,
    latest,
    generated_at: new Date().toISOString()
  };
}

async function publicGallery(env, url) {
  const category = clean(url.searchParams.get('category'), 80);
  const rows = category
    ? await env.DB.prepare(
        'SELECT * FROM gallery WHERE published=1 AND category=? ORDER BY sort_order ASC, updated_at DESC LIMIT 300'
      )
        .bind(category)
        .all()
    : await env.DB.prepare(
        'SELECT * FROM gallery WHERE published=1 ORDER BY sort_order ASC, updated_at DESC LIMIT 300'
      ).all();
  return { items: rows.results };
}

async function exportAll(env) {
  const content = await env.DB.prepare(
    `SELECT ${CONTENT_COLUMNS} FROM content WHERE published = 1 ORDER BY published_at DESC`
  ).all();
  const gallery = await env.DB.prepare(
    'SELECT * FROM gallery WHERE published=1 ORDER BY sort_order ASC, updated_at DESC'
  ).all();
  const ratings = await env.DB.prepare(
    `SELECT content_slug, ROUND(AVG(rating),1) AS average, COUNT(*) AS count
     FROM reviews WHERE approved=1 AND content_slug IS NOT NULL GROUP BY content_slug`
  ).all();
  const notes = await env.DB.prepare(
    'SELECT id, name, message, city, avatar_url, hearts FROM love_notes WHERE approved=1 ORDER BY pinned DESC, created_at DESC LIMIT 60'
  ).all();

  const ratingBySlug = new Map(ratings.results.map((row) => [row.content_slug, row]));
  const items = content.results.map((row) => {
    const rating = ratingBySlug.get(row.slug);
    return toPublicItem({
      ...row,
      rating_average: rating?.average ?? null,
      rating_count: rating?.count ?? 0
    });
  });

  return {
    items,
    gallery: gallery.results,
    notes: notes.results,
    note_count: notes.results.length,
    generated_at: new Date().toISOString()
  };
}

async function adminMetrics(env) {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM content) AS content_total,
       (SELECT COUNT(*) FROM content WHERE published=1) AS content_published,
       (SELECT COUNT(*) FROM content WHERE published=0) AS content_drafts,
       (SELECT COUNT(*) FROM gallery) AS gallery_total,
       (SELECT COUNT(*) FROM media) AS media_total,
       (SELECT COUNT(*) FROM reviews WHERE approved=0) AS reviews_pending,
       (SELECT COUNT(*) FROM love_notes WHERE approved=0) AS notes_pending,
       (SELECT COUNT(*) FROM love_notes WHERE approved=1) AS notes_live,
       (SELECT AVG(rating) FROM reviews WHERE approved=1) AS rating_average`
  ).first();

  const missingSeo = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM content
     WHERE published=1 AND (meta_description IS NULL OR meta_description='' OR image IS NULL OR image='')`
  ).first();

  return {
    content_total: Number(row?.content_total || 0),
    content_published: Number(row?.content_published || 0),
    content_drafts: Number(row?.content_drafts || 0),
    gallery_total: Number(row?.gallery_total || 0),
    media_total: Number(row?.media_total || 0),
    reviews_pending: Number(row?.reviews_pending || 0),
    notes_pending: Number(row?.notes_pending || 0),
    notes_live: Number(row?.notes_live || 0),
    rating_average: Number(Number(row?.rating_average || 0).toFixed(1)),
    seo_incomplete: Number(missingSeo?.count || 0)
  };
}

async function adminContentList(env, url) {
  const search = clean(url.searchParams.get('q'), 120);
  const category = clean(url.searchParams.get('category'), 80);
  const kind = clean(url.searchParams.get('kind'), 40);
  const status = clean(url.searchParams.get('status'), 20);

  const filters = ['1=1'];
  const bindings = [];
  if (search) {
    filters.push('(title LIKE ? OR slug LIKE ? OR description LIKE ?)');
    bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) {
    filters.push('category = ?');
    bindings.push(category);
  }
  if (kind) {
    filters.push('kind = ?');
    bindings.push(kind);
  }
  if (status === 'published') filters.push('published = 1');
  if (status === 'draft') filters.push('published = 0');

  const rows = await env.DB.prepare(
    `SELECT ${CONTENT_COLUMNS} FROM content WHERE ${filters.join(' AND ')}
     ORDER BY updated_at DESC, id DESC LIMIT 400`
  )
    .bind(...bindings)
    .all();
  return { items: rows.results.map(toPublicItem) };
}

function galleryPayload(body) {
  const title = clean(body.title, 160);
  const image = clean(body.image_url || body.image, 600);
  const alt = clean(body.alt_text || body.alt, 240);
  if (!title || !image) return { error: 'A title and an image are required.' };
  const category = findCategory(body.category)?.name || 'Gallery';
  return {
    title,
    slug:
      clean(body.slug, 160)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      `image-${Date.now()}`,
    image,
    // Alt text matters for accessibility and image SEO, so fall back to the
    // title rather than storing an empty string.
    alt: alt || `${title} — Musfiq R. Farhan official gallery`,
    category,
    subcategory: findSubcategory(category, body.subcategory) || '',
    caption: clean(body.caption, 240),
    published: body.published === 0 || body.published === false ? 0 : 1,
    sortOrder: toInt(body.sort_order, 0)
  };
}

export default {
  async fetch(request, env) {
    const origin = originFor(request);
    const url = new URL(request.url);
    const { pathname: path } = url;
    const method = request.method;

    if (method === 'OPTIONS') return preflight(origin);

    try {
      // ---------------------------------------------------------------- public
      if (path === '/health') {
        return json({ ok: true, service: 'MRF-API', time: new Date().toISOString() }, { origin });
      }

      if (path === '/api/public/taxonomy' && method === 'GET') {
        return json({ categories: CATEGORIES, kinds: KINDS, rails: HOME_RAILS }, {
          origin,
          cache: 'public, max-age=3600'
        });
      }

      if (path === '/api/public/home' && method === 'GET') {
        return json(await publicHome(env), { origin });
      }

      if (path === '/api/public/export' && method === 'GET') {
        return json(await exportAll(env), { origin, cache: 'public, max-age=60' });
      }

      if (path === '/api/public/gallery' && method === 'GET') {
        return json(await publicGallery(env, url), { origin });
      }

      if (path === '/api/public/category' && method === 'GET') {
        const category = findCategory(url.searchParams.get('category'));
        if (!category) return fail('Unknown category.', 404, origin);
        const subcategory = findSubcategory(category.name, url.searchParams.get('subcategory'));
        const items = await listPublished(env, {
          category: category.name,
          subcategory: subcategory || undefined,
          limit: Math.min(toInt(url.searchParams.get('limit'), 48), 100),
          offset: toInt(url.searchParams.get('offset'), 0)
        });
        const gallery = await env.DB.prepare(
          'SELECT * FROM gallery WHERE published=1 AND category=? ORDER BY sort_order ASC, updated_at DESC LIMIT 60'
        )
          .bind(category.name)
          .all();
        return json(
          {
            category: category.name,
            category_slug: category.slug,
            subcategory,
            subcategories: category.subcategories,
            blurb: category.blurb,
            items,
            gallery: gallery.results
          },
          { origin }
        );
      }

      const publicContent = path.match(/^\/api\/public\/content\/([a-z0-9-]+)$/);
      if (publicContent && method === 'GET') {
        const item = await getPublishedBySlug(env, publicContent[1]);
        if (!item) return fail('Content not found.', 404, origin);
        const related = await listRelated(env, item);
        return json({ item, related }, { origin });
      }

      if (path === '/api/public/reviews' && method === 'GET') return publicReviews(env, origin, url);
      if (path === '/api/public/reviews' && method === 'POST') {
        return submitReview(env, origin, await readJson(request));
      }

      if (path === '/api/public/love-notes' && method === 'GET') return publicNotes(env, origin, url);
      if (path === '/api/public/love-notes' && method === 'POST') {
        return submitNote(request, env, origin, await readJson(request));
      }
      if (path === '/api/public/love-notes/avatar' && method === 'POST') {
        return uploadLoveNoteAvatar(request, env, origin);
      }
      if (path === '/api/public/love-notes/marquee' && method === 'GET') return marqueeNotes(env, origin);

      const heartMatch = path.match(/^\/api\/public\/love-notes\/(\d+)\/heart$/);
      if (heartMatch && method === 'POST') return heartNote(env, origin, Number(heartMatch[1]));

      if (path === '/sitemap.xml' && method === 'GET') {
        const data = await exportAll(env);
        return xml(fullSitemap({ items: data.items, gallery: data.gallery }), origin);
      }

      if (path.startsWith('/media/') && method === 'GET') {
        return serveMedia(request, env, decodeURIComponent(path.slice('/media/'.length)));
      }

      // ----------------------------------------------------------------- auth
      if (path === '/api/admin/login' && method === 'POST') {
        const body = await readJson(request);
        if (!credentialsMatch(env, body)) return fail('Invalid credentials.', 401, origin);
        return json({ token: await createToken(env, env.ADMIN_USER_NAME) }, { origin, cache: 'no-store' });
      }

      if (path.startsWith('/api/admin/') && !(await isAdmin(request, env))) {
        return fail('Unauthorized.', 401, origin);
      }

      // ---------------------------------------------------------------- admin
      if (path === '/api/admin/metrics' && method === 'GET') {
        return json(await adminMetrics(env), { origin, cache: 'no-store' });
      }

      if (path === '/api/admin/content' && method === 'GET') {
        return json(await adminContentList(env, url), { origin, cache: 'no-store' });
      }

      if (path === '/api/admin/content' && method === 'POST') {
        const row = normalizeContent(await readJson(request));
        if (row.error) return fail(row.error, 400, origin);
        row.slug = await uniqueSlug(env, row.slug);
        row.path = `/${findCategory(row.category)?.slug || 'archive'}/${row.slug}/`;
        row.canonicalUrl = `https://www.musfiqrfarhan.blog${row.path}`;
        const created = await env.DB.prepare(INSERT_SQL).bind(...bindValues(row)).first();
        return json(toPublicItem(created), { status: 201, origin, cache: 'no-store' });
      }

      const contentId = path.match(/^\/api\/admin\/content\/(\d+)$/);
      if (contentId) {
        const id = Number(contentId[1]);
        if (method === 'DELETE') {
          await env.DB.prepare('DELETE FROM content WHERE id = ?').bind(id).run();
          return json({ ok: true }, { origin, cache: 'no-store' });
        }
        if (method === 'PUT') {
          const existing = await env.DB.prepare('SELECT * FROM content WHERE id = ?').bind(id).first();
          if (!existing) return fail('Content not found.', 404, origin);
          const row = normalizeContent(await readJson(request), existing);
          if (row.error) return fail(row.error, 400, origin);
          const updated = await env.DB.prepare(UPDATE_SQL).bind(...bindValues(row), id).first();
          return json(toPublicItem(updated), { origin, cache: 'no-store' });
        }
        if (method === 'PATCH') {
          // Quick toggles from the content list: publish / hide / reorder.
          const body = await readJson(request);
          const fields = [];
          const bindings = [];
          if ('published' in body) {
            fields.push('published = ?');
            bindings.push(body.published ? 1 : 0);
          }
          if ('indexable' in body) {
            fields.push('indexable = ?');
            bindings.push(body.indexable ? 1 : 0);
          }
          if ('sort_order' in body) {
            fields.push('sort_order = ?');
            bindings.push(toInt(body.sort_order, 0));
          }
          if (!fields.length) return fail('Nothing to update.', 400, origin);
          fields.push('updated_at = CURRENT_TIMESTAMP');
          const updated = await env.DB.prepare(
            `UPDATE content SET ${fields.join(', ')} WHERE id = ? RETURNING *`
          )
            .bind(...bindings, id)
            .first();
          return updated
            ? json(toPublicItem(updated), { origin, cache: 'no-store' })
            : fail('Content not found.', 404, origin);
        }
      }

      if (path === '/api/admin/gallery' && method === 'GET') {
        const rows = await env.DB.prepare(
          'SELECT * FROM gallery ORDER BY sort_order ASC, updated_at DESC LIMIT 400'
        ).all();
        return json({ items: rows.results }, { origin, cache: 'no-store' });
      }

      if (path === '/api/admin/gallery' && method === 'POST') {
        const payload = galleryPayload(await readJson(request));
        if (payload.error) return fail(payload.error, 400, origin);
        const row = await env.DB.prepare(
          `INSERT INTO gallery(title, slug, image_url, alt_text, category, caption, published, sort_order, updated_at)
           VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) RETURNING *`
        )
          .bind(
            payload.title,
            payload.slug,
            payload.image,
            payload.alt,
            payload.category,
            payload.caption,
            payload.published,
            payload.sortOrder
          )
          .first();
        return json(row, { status: 201, origin, cache: 'no-store' });
      }

      const galleryId = path.match(/^\/api\/admin\/gallery\/(\d+)$/);
      if (galleryId) {
        const id = Number(galleryId[1]);
        if (method === 'DELETE') {
          await env.DB.prepare('DELETE FROM gallery WHERE id = ?').bind(id).run();
          return json({ ok: true }, { origin, cache: 'no-store' });
        }
        if (method === 'PATCH') {
          const payload = galleryPayload(await readJson(request));
          if (payload.error) return fail(payload.error, 400, origin);
          const row = await env.DB.prepare(
            `UPDATE gallery SET title=?, slug=?, image_url=?, alt_text=?, category=?, caption=?,
             published=?, sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=? RETURNING *`
          )
            .bind(
              payload.title,
              payload.slug,
              payload.image,
              payload.alt,
              payload.category,
              payload.caption,
              payload.published,
              payload.sortOrder,
              id
            )
            .first();
          return row ? json(row, { origin, cache: 'no-store' }) : fail('Gallery item not found.', 404, origin);
        }
      }

      if (path === '/api/admin/media' && method === 'GET') return listMedia(env, origin, url);
      if (path === '/api/admin/media' && method === 'POST') return uploadSingle(request, env, origin);
      if (path === '/api/admin/media/multipart/start' && method === 'POST') {
        return startMultipart(request, env, origin, await readJson(request));
      }
      if (path === '/api/admin/media/multipart/part' && method === 'PUT') {
        return uploadPart(request, env, origin, url);
      }
      if (path === '/api/admin/media/multipart/complete' && method === 'POST') {
        return completeMultipart(request, env, origin, await readJson(request));
      }
      if (path === '/api/admin/media/multipart/abort' && method === 'POST') {
        return abortMultipart(env, origin, await readJson(request));
      }
      const mediaId = path.match(/^\/api\/admin\/media\/(\d+)$/);
      if (mediaId && method === 'DELETE') return deleteMedia(env, origin, Number(mediaId[1]));

      if (path === '/api/admin/reviews' && method === 'GET') return adminReviews(env, origin);
      const reviewId = path.match(/^\/api\/admin\/reviews\/(\d+)$/);
      if (reviewId && method === 'PATCH') {
        return updateReview(env, origin, Number(reviewId[1]), await readJson(request));
      }
      if (reviewId && method === 'DELETE') return deleteReview(env, origin, Number(reviewId[1]));

      if (path === '/api/admin/love-notes' && method === 'GET') return adminNotes(env, origin);
      const noteId = path.match(/^\/api\/admin\/love-notes\/(\d+)$/);
      if (noteId && method === 'PATCH') {
        return updateNote(env, origin, Number(noteId[1]), await readJson(request));
      }
      if (noteId && method === 'DELETE') return deleteNote(env, origin, Number(noteId[1]));

      if (path === '/robots.txt') {
        return plain('User-agent: *\nAllow: /\nSitemap: https://www.musfiqrfarhan.blog/sitemap.xml\n');
      }

      return fail('Not found.', 404, origin);
    } catch (error) {
      console.error('MRF-API error', error);
      return fail('Unexpected API error.', 500, origin);
    }
  }
};
