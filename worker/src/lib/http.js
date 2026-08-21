/** Request/response helpers shared by every route. */

const ALLOWED_ORIGINS = new Set([
  'https://www.musfiqrfarhan.blog',
  'https://musfiqrfarhan.blog',
  'https://bayzed123.github.io',
  'http://localhost:4173',
  'http://localhost:8788',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:8788'
]);

const DEFAULT_ORIGIN = 'https://www.musfiqrfarhan.blog';

export function originFor(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.has(origin) ? origin : DEFAULT_ORIGIN;
}

function corsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

export function preflight(origin) {
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

/**
 * @param {unknown} body
 * @param {{ status?: number, origin?: string, cache?: string }} [options]
 */
export function json(body, options = {}) {
  const { status = 200, origin = DEFAULT_ORIGIN, cache } = options;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache || (status >= 400 ? 'no-store' : 'public, max-age=30, s-maxage=120'),
      ...corsHeaders(origin)
    }
  });
}

export function fail(message, status = 400, origin = DEFAULT_ORIGIN) {
  return json({ error: message }, { status, origin });
}

export function xml(body, origin = DEFAULT_ORIGIN) {
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=3600',
      ...corsHeaders(origin)
    }
  });
}

export function plain(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

/** Trim, coerce to string and bound the length of any caller-supplied value. */
export function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

export function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function escapeXml(value) {
  return String(value ?? '').replace(/[<>&'"]/g, (char) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]
  );
}
