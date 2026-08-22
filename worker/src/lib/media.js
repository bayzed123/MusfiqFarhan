/**
 * R2 media storage.
 *
 * Single-shot uploads cover images and small clips. Anything larger goes
 * through the multipart endpoints, which is what makes full-length natok
 * uploads succeed instead of dying against the Worker request-body limit.
 */

import { clean, fail, json, toInt } from './http.js';

/** Single-request uploads are held well under the Worker body limit. */
export const SINGLE_UPLOAD_LIMIT = 90 * 1024 * 1024;
/** R2 requires every part except the last to be at least 5 MiB. */
export const MIN_PART_SIZE = 5 * 1024 * 1024;
export const MAX_OBJECT_SIZE = 5 * 1024 * 1024 * 1024;

const VIDEO_TYPES = /^video\//i;
const IMAGE_TYPES = /^image\//i;

export function mediaKeyFor(name) {
  const safe = clean(name, 120).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  const day = new Date().toISOString().slice(0, 10);
  return `${day}/${crypto.randomUUID()}-${safe || 'upload'}`;
}

export function mediaKindFor(contentType, name = '') {
  if (VIDEO_TYPES.test(contentType)) return 'video';
  if (IMAGE_TYPES.test(contentType)) return 'image';
  if (/\.(mp4|webm|mov|m4v)$/i.test(name)) return 'video';
  if (/\.(jpe?g|png|webp|avif|gif|svg)$/i.test(name)) return 'image';
  return 'file';
}

export function publicUrlFor(env, requestUrl, key) {
  const base = clean(env.MEDIA_PUBLIC_BASE, 200).replace(/\/$/, '');
  if (base) return `${base}/${key}`;
  return `${new URL(requestUrl).origin}/media/${key}`;
}

async function recordMedia(env, { key, name, contentType, size, url }) {
  await env.DB.prepare(
    'INSERT OR REPLACE INTO media(object_key, original_name, content_type, size, public_url) VALUES (?,?,?,?,?)'
  )
    .bind(key, clean(name, 180), contentType, size, url)
    .run();
}

export async function uploadSingle(request, env, origin) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return fail('Choose a file to upload.', 400, origin);
  if (file.size > SINGLE_UPLOAD_LIMIT) {
    return fail(
      'This file is too large for a direct upload. The dashboard will retry it in chunks automatically.',
      413,
      origin
    );
  }

  const key = mediaKeyFor(file.name);
  const contentType = file.type || 'application/octet-stream';
  await env.MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      contentDisposition: `inline; filename="${clean(file.name, 120)}"`
    }
  });

  const url = publicUrlFor(env, request.url, key);
  await recordMedia(env, { key, name: file.name, contentType, size: file.size, url });
  return json({ ok: true, key, url, size: file.size, media_kind: mediaKindFor(contentType, file.name) }, {
    status: 201,
    origin
  });
}

export async function startMultipart(request, env, origin, body) {
  const name = clean(body.name, 180);
  if (!name) return fail('A file name is required.', 400, origin);
  const size = toInt(body.size, 0);
  if (size > MAX_OBJECT_SIZE) return fail('Files must be 5 GB or smaller.', 413, origin);

  const key = mediaKeyFor(name);
  const contentType = clean(body.content_type, 120) || 'application/octet-stream';
  const upload = await env.MEDIA.createMultipartUpload(key, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      contentDisposition: `inline; filename="${clean(name, 120)}"`
    }
  });

  return json(
    { ok: true, key, upload_id: upload.uploadId, part_size: MIN_PART_SIZE * 2 },
    { status: 201, origin }
  );
}

export async function uploadPart(request, env, origin, url) {
  const key = clean(url.searchParams.get('key'), 300);
  const uploadId = clean(url.searchParams.get('upload_id'), 300);
  const partNumber = toInt(url.searchParams.get('part_number'), 0);
  if (!key || !uploadId || partNumber < 1) return fail('Missing multipart upload details.', 400, origin);
  if (!request.body) return fail('This part carried no data.', 400, origin);

  const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
  const part = await upload.uploadPart(partNumber, request.body);
  return json({ ok: true, part_number: part.partNumber, etag: part.etag }, { origin });
}

export async function completeMultipart(request, env, origin, body) {
  const key = clean(body.key, 300);
  const uploadId = clean(body.upload_id, 300);
  const parts = Array.isArray(body.parts) ? body.parts : [];
  if (!key || !uploadId || !parts.length) return fail('Missing multipart upload details.', 400, origin);

  const upload = env.MEDIA.resumeMultipartUpload(key, uploadId);
  const object = await upload.complete(
    parts
      .map((part) => ({ partNumber: toInt(part.part_number ?? part.partNumber, 0), etag: clean(part.etag, 200) }))
      .sort((a, b) => a.partNumber - b.partNumber)
  );

  const url = publicUrlFor(env, request.url, key);
  const contentType = clean(body.content_type, 120) || 'application/octet-stream';
  await recordMedia(env, {
    key,
    name: clean(body.name, 180) || key,
    contentType,
    size: object.size ?? toInt(body.size, 0),
    url
  });

  return json(
    { ok: true, key, url, size: object.size ?? 0, media_kind: mediaKindFor(contentType, body.name) },
    { status: 201, origin }
  );
}

export async function abortMultipart(env, origin, body) {
  const key = clean(body.key, 300);
  const uploadId = clean(body.upload_id, 300);
  if (!key || !uploadId) return fail('Missing multipart upload details.', 400, origin);
  await env.MEDIA.resumeMultipartUpload(key, uploadId).abort();
  return json({ ok: true }, { origin });
}

export async function listMedia(env, origin, url) {
  const limit = Math.min(toInt(url.searchParams.get('limit'), 60), 200);
  const result = await env.DB.prepare(
    'SELECT id, object_key, original_name, content_type, size, public_url, created_at FROM media ORDER BY created_at DESC, id DESC LIMIT ?'
  )
    .bind(limit)
    .all();
  const items = result.results.map((row) => ({
    ...row,
    media_kind: mediaKindFor(row.content_type, row.original_name)
  }));
  return json({ items }, { origin });
}

export async function deleteMedia(env, origin, id) {
  const row = await env.DB.prepare('SELECT object_key FROM media WHERE id = ?').bind(id).first();
  if (!row) return fail('That file is no longer in the library.', 404, origin);
  await env.MEDIA.delete(row.object_key);
  await env.DB.prepare('DELETE FROM media WHERE id = ?').bind(id).run();
  return json({ ok: true }, { origin });
}

/**
 * Serve an object from R2 with Range support, so browsers can seek inside a
 * video instead of downloading the whole file before playback starts.
 */
export async function serveMedia(request, env, key) {
  const rangeHeader = request.headers.get('Range');
  const range = parseRange(rangeHeader);
  const object = await env.MEDIA.get(key, range ? { range, onlyIf: request.headers } : undefined);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('access-control-allow-origin', '*');

  if (!object.body) return new Response(null, { status: 304, headers });

  if (range && object.range) {
    const offset = object.range.offset ?? 0;
    const length = object.range.length ?? object.size - offset;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set('content-length', String(object.size));
  return new Response(object.body, { status: 200, headers });
}

function parseRange(header) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header || ''));
  if (!match) return null;
  const [, startText, endText] = match;
  if (startText === '' && endText === '') return null;
  if (startText === '') return { suffix: Number(endText) };
  const offset = Number(startText);
  if (endText === '') return { offset };
  return { offset, length: Number(endText) - offset + 1 };
}
