/** Per-page star ratings. Every post, video and gallery page carries one. */

import { clean, fail, json, toInt } from './http.js';

function toPublicReview(row) {
  return {
    id: row.id,
    name: row.name,
    rating: Number(row.rating),
    body: row.body,
    content_slug: row.content_slug || '',
    created_at: row.created_at
  };
}

export async function publicReviews(env, origin, url) {
  const slug = clean(url.searchParams.get('slug'), 180);
  const limit = Math.min(toInt(url.searchParams.get('limit'), 12), 50);

  const rows = slug
    ? await env.DB.prepare(
        `SELECT * FROM reviews WHERE approved = 1 AND content_slug = ?
         ORDER BY created_at DESC LIMIT ?`
      )
        .bind(slug, limit)
        .all()
    : await env.DB.prepare(
        'SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT ?'
      )
        .bind(limit)
        .all();

  // Average over every approved rating for the page, not just the page of
  // reviews being displayed, so the aggregate matches the schema.org value.
  const totals = slug
    ? await env.DB.prepare(
        'SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE approved = 1 AND content_slug = ?'
      )
        .bind(slug)
        .first()
    : await env.DB.prepare(
        'SELECT COUNT(*) AS count, AVG(rating) AS average FROM reviews WHERE approved = 1'
      ).first();

  return json(
    {
      reviews: rows.results.map(toPublicReview),
      count: Number(totals?.count || 0),
      average: Number(Number(totals?.average || 0).toFixed(1))
    },
    { origin }
  );
}

export async function submitReview(env, origin, body) {
  if (clean(body.website, 100)) return json({ ok: true }, { status: 201, origin });

  const name = clean(body.name, 80);
  const note = clean(body.body || body.note, 500);
  const rating = Number(body.rating);
  const contentSlug = clean(body.content_slug, 180) || null;

  if (!name || !note) return fail('Add your name and a short note.', 400, origin);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail('Choose a rating between 1 and 5 stars.', 400, origin);
  }
  if (contentSlug) {
    const exists = await env.DB.prepare('SELECT id FROM content WHERE slug = ? AND published = 1 LIMIT 1')
      .bind(contentSlug)
      .first();
    if (!exists) return fail('That page is not available.', 404, origin);
  }

  await env.DB.prepare(
    'INSERT INTO reviews(name, rating, body, content_slug, approved) VALUES (?,?,?,?,0)'
  )
    .bind(name, rating, note, contentSlug)
    .run();

  return json({ ok: true, message: 'Thank you. Your rating is waiting for approval.' }, { status: 201, origin });
}

export async function adminReviews(env, origin) {
  const rows = await env.DB.prepare(
    'SELECT * FROM reviews ORDER BY approved ASC, created_at DESC LIMIT 300'
  ).all();
  return json({ reviews: rows.results.map(toPublicReview) }, { origin, cache: 'no-store' });
}

export async function updateReview(env, origin, id, body) {
  await env.DB.prepare('UPDATE reviews SET approved = ? WHERE id = ?')
    .bind(body.approved ? 1 : 0, id)
    .run();
  return json({ ok: true }, { origin });
}

export async function deleteReview(env, origin, id) {
  await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
  return json({ ok: true }, { origin });
}
