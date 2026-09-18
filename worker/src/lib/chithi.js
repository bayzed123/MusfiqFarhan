/**
 * Chithi — private letters to Musfiq.
 *
 * The one rule this module exists to enforce: a chithi is never published.
 *
 * Love notes and chithi look similar from a distance — a fan writes, the
 * message lands in the dashboard — and that resemblance is the risk. A love
 * note is written *for* an audience; a chithi is written to one person and
 * carries the sender's email, WhatsApp number and district with it. So the
 * two are kept apart at every level: a table of its own, a module of its own,
 * and, most importantly, no public read route.
 *
 * There is exactly one public entry point here — `submitChithi` — and it
 * returns nothing but an acknowledgement. Every function that can read a
 * message is admin-only and named `admin*`. If a public reader ever appears
 * in this file, something has gone wrong.
 */

import { clean, fail, json, toInt } from './http.js';

const MAX_MESSAGE = 4000;
const MAX_NAME = 80;
const MAX_EMAIL = 160;
const MAX_WHATSAPP = 32;
const MAX_PLACE = 60;
const INBOX_LIMIT = 300;

/**
 * Deliberately permissive. The point is to catch a typo before the reply
 * bounces, not to adjudicate the RFC — a fan whose address this rejects has
 * no way to argue with it.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Digits, spaces and the usual punctuation, with an optional leading +.
 * Bangladesh numbers get written every imaginable way (01712-345678,
 * +8801712 345678, 8801712345678) and all of them should be accepted.
 */
const PHONE = /^\+?[\d\s\-().]{6,}$/;

export async function submitChithi(env, origin, body) {
  // Hidden field: real people leave it empty, most bots fill it in. Answering
  // 201 rather than an error means a bot learns nothing from the response.
  if (clean(body.website, 100)) return json({ ok: true }, { status: 201, origin });

  const name = clean(body.name, MAX_NAME);
  const email = clean(body.email, MAX_EMAIL);
  const whatsapp = clean(body.whatsapp, MAX_WHATSAPP);
  const zila = clean(body.zila, MAX_PLACE);
  const upazila = clean(body.upazila, MAX_PLACE);
  const message = clean(body.message, MAX_MESSAGE);

  if (!name) return fail('Please add your name.', 400, origin);
  if (!email) return fail('Please add your email address.', 400, origin);
  if (!EMAIL.test(email)) return fail('That email address does not look right.', 400, origin);
  if (whatsapp && !PHONE.test(whatsapp)) {
    return fail('That WhatsApp number does not look right.', 400, origin);
  }
  if (!zila) return fail('Please choose your district.', 400, origin);
  if (!message) return fail('Please write your message.', 400, origin);
  if (message.length < 10) return fail('Your message is a little too short.', 400, origin);

  await env.DB.prepare(
    `INSERT INTO chithi(name, email, whatsapp, zila, upazila, message)
     VALUES (?,?,?,?,?,?)`
  )
    .bind(name, email, whatsapp, zila, upazila, message)
    .run();

  return json(
    { ok: true, message: 'Your letter has been sent. It goes straight to Musfiq and no one else.' },
    { status: 201, origin, cache: 'no-store' }
  );
}

/* --------------------------------------------------------------- admin only */

function toAdminChithi(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    whatsapp: row.whatsapp || '',
    zila: row.zila || '',
    upazila: row.upazila || '',
    message: row.message,
    created_at: row.created_at,
    read_at: row.read_at || null,
    archived: Number(row.archived || 0)
  };
}

export async function adminChithi(env, origin, url) {
  const archived = url?.searchParams.get('archived') === '1' ? 1 : 0;
  const rows = await env.DB.prepare(
    'SELECT * FROM chithi WHERE archived = ? ORDER BY created_at DESC, id DESC LIMIT ?'
  )
    .bind(archived, INBOX_LIMIT)
    .all();

  const totals = await env.DB.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) AS unread
     FROM chithi WHERE archived = 0`
  ).first();

  return json(
    {
      messages: rows.results.map(toAdminChithi),
      total: Number(totals?.total || 0),
      unread: Number(totals?.unread || 0)
    },
    { origin, cache: 'no-store' }
  );
}

export async function updateChithi(env, origin, id, body) {
  const fields = [];
  const bindings = [];

  if ('read' in body) {
    // Stamped rather than flagged, so the dashboard can say when it was read.
    fields.push(body.read ? 'read_at = COALESCE(read_at, CURRENT_TIMESTAMP)' : 'read_at = NULL');
  }
  if ('archived' in body) {
    fields.push('archived = ?');
    bindings.push(body.archived ? 1 : 0);
  }
  if (!fields.length) return fail('Nothing to update.', 400, origin);

  const row = await env.DB.prepare(`UPDATE chithi SET ${fields.join(', ')} WHERE id = ? RETURNING *`)
    .bind(...bindings, toInt(id, 0))
    .first();
  return row ? json(toAdminChithi(row), { origin, cache: 'no-store' }) : fail('Letter not found.', 404, origin);
}

export async function deleteChithi(env, origin, id) {
  await env.DB.prepare('DELETE FROM chithi WHERE id = ?').bind(toInt(id, 0)).run();
  return json({ ok: true }, { origin, cache: 'no-store' });
}
