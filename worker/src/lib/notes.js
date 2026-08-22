/**
 * Love notes — messages fans leave for Musfiq.
 *
 * Kept separate from `reviews`: a review rates one page, a love note is a
 * public message that runs in the sitewide marquee and on the fan page.
 */

import { clean, fail, json, toInt } from './http.js';

const MAX_MESSAGE = 280;
const MARQUEE_LIMIT = 40;

function toPublicNote(row) {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    city: row.city || '',
    avatar_url: row.avatar_url || '',
    hearts: Number(row.hearts || 0),
    pinned: Number(row.pinned || 0),
    created_at: row.created_at
  };
}

export async function publicNotes(env, origin, url) {
  const limit = Math.min(toInt(url.searchParams.get('limit'), 24), 100);
  const offset = Math.max(toInt(url.searchParams.get('offset'), 0), 0);
  const rows = await env.DB.prepare(
    `SELECT * FROM love_notes WHERE approved = 1
     ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(limit, offset)
    .all();
  const totals = await env.DB.prepare(
    'SELECT COUNT(*) AS count, COALESCE(SUM(hearts), 0) AS hearts FROM love_notes WHERE approved = 1'
  ).first();

  return json(
    {
      notes: rows.results.map(toPublicNote),
      count: Number(totals?.count || 0),
      hearts: Number(totals?.hearts || 0)
    },
    { origin }
  );
}

/** Compact payload for the always-running marquee. */
export async function marqueeNotes(env, origin) {
  const rows = await env.DB.prepare(
    `SELECT id, name, message, city, avatar_url FROM love_notes WHERE approved = 1
     ORDER BY pinned DESC, created_at DESC LIMIT ?`
  )
    .bind(MARQUEE_LIMIT)
    .all();
  const totals = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM love_notes WHERE approved = 1'
  ).first();
  return json(
    { notes: rows.results.map(toPublicNote), count: Number(totals?.count || 0) },
    { origin, cache: 'public, max-age=60, s-maxage=300' }
  );
}

export async function submitNote(request, env, origin, body) {
  // Hidden field: real people leave it empty, most bots fill it in.
  if (clean(body.website, 100)) return json({ ok: true }, { status: 201, origin });

  const name = clean(body.name, 60);
  const message = clean(body.message, MAX_MESSAGE);
  const city = clean(body.city, 60);
  const avatarUrl = clean(body.avatar_url, 600);

  if (!name || !message) return fail('Add your name and your message.', 400, origin);
  if (message.length < 4) return fail('Your message is a little too short.', 400, origin);
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) return fail('The photo link must be a full URL.', 400, origin);

  await env.DB.prepare(
    'INSERT INTO love_notes(name, message, city, avatar_url, approved) VALUES (?,?,?,?,0)'
  )
    .bind(name, message, city, avatarUrl)
    .run();

  return json(
    { ok: true, message: 'Thank you. Your note will appear once it is approved.' },
    { status: 201, origin }
  );
}

export async function heartNote(env, origin, id) {
  const row = await env.DB.prepare(
    'UPDATE love_notes SET hearts = hearts + 1 WHERE id = ? AND approved = 1 RETURNING hearts'
  )
    .bind(id)
    .first();
  if (!row) return fail('That note is not available.', 404, origin);
  return json({ ok: true, hearts: Number(row.hearts) }, { origin, cache: 'no-store' });
}

/**
 * The moderation shape. `toPublicNote` deliberately omits `approved` — a
 * visitor is only ever sent approved notes — but the dashboard needs it to
 * draw the Approved/Waiting badge and to label the button Approve or
 * Unapprove. Without it every note read as unapproved, so the button never
 * changed after a successful approve.
 */
function toAdminNote(row) {
  return { ...toPublicNote(row), approved: Number(row.approved || 0) };
}

export async function adminNotes(env, origin) {
  const rows = await env.DB.prepare(
    'SELECT * FROM love_notes ORDER BY approved ASC, pinned DESC, created_at DESC LIMIT 300'
  ).all();
  return json({ notes: rows.results.map(toAdminNote) }, { origin, cache: 'no-store' });
}

export async function updateNote(env, origin, id, body) {
  const fields = [];
  const bindings = [];
  if ('approved' in body) {
    fields.push('approved = ?');
    bindings.push(body.approved ? 1 : 0);
  }
  if ('pinned' in body) {
    fields.push('pinned = ?');
    bindings.push(body.pinned ? 1 : 0);
  }
  if ('message' in body) {
    fields.push('message = ?');
    bindings.push(clean(body.message, MAX_MESSAGE));
  }
  if (!fields.length) return fail('Nothing to update.', 400, origin);

  const row = await env.DB.prepare(`UPDATE love_notes SET ${fields.join(', ')} WHERE id = ? RETURNING *`)
    .bind(...bindings, id)
    .first();
  return row ? json(toAdminNote(row), { origin }) : fail('Note not found.', 404, origin);
}

export async function deleteNote(env, origin, id) {
  await env.DB.prepare('DELETE FROM love_notes WHERE id = ?').bind(id).run();
  return json({ ok: true }, { origin });
}
