/** HMAC-signed admin session tokens. */

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function base64url(input) {
  let binary = '';
  if (typeof input === 'string') {
    binary = input;
  } else {
    for (const byte of input) binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unbase64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return atob(padded);
}

async function sign(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createToken(env, username) {
  const payload = base64url(JSON.stringify({ sub: username, exp: Date.now() + TOKEN_TTL_MS }));
  return `${payload}.${base64url(await sign(env.ADMIN_PASSWORD, payload))}`;
}

export async function isAdmin(request, env) {
  if (!env.ADMIN_USER_NAME || !env.ADMIN_PASSWORD) return false;
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  try {
    const data = JSON.parse(unbase64url(payload));
    if (!data.exp || data.exp < Date.now()) return false;
    if (data.sub !== env.ADMIN_USER_NAME) return false;
    const expected = await sign(env.ADMIN_PASSWORD, payload);
    const actual = Uint8Array.from(unbase64url(signature), (char) => char.charCodeAt(0));
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function credentialsMatch(env, body) {
  return (
    Boolean(env.ADMIN_USER_NAME) &&
    Boolean(env.ADMIN_PASSWORD) &&
    body?.username === env.ADMIN_USER_NAME &&
    body?.password === env.ADMIN_PASSWORD
  );
}
