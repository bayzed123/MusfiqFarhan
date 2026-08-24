/**
 * Read-only access to the Google APIs this site owns data in.
 *
 * A service account cannot be used from the browser — its private key would
 * be handed to every visitor — so the Worker holds the key and the page asks
 * the Worker. The key arrives as one JSON secret, `GOOGLE_SERVICE_ACCOUNT`,
 * and the Worker signs its own OAuth assertion with WebCrypto rather than
 * pulling in googleapis, which does not run on Workers anyway.
 *
 * Three APIs, all read-only:
 *
 *   GA4 Data API          how many people read a page
 *   Search Console        which queries brought them
 *   URL Inspection        whether Google has the page indexed at all
 *
 * Every one of them is optional. With no secret set, each helper reports that
 * it is not configured and the callers fall back to what the site already
 * knows — the site must not depend on Google being reachable.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** One access token per isolate, reused until a minute before it expires. */
let cachedToken = null;

function base64url(bytes) {
  const binary = typeof bytes === 'string' ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** PEM → the ArrayBuffer WebCrypto wants. */
function pemToBuffer(pem) {
  const body = String(pem || '')
    .replace(/-----BEGIN [^-]+-----/, '')
    .replace(/-----END [^-]+-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function serviceAccount(env) {
  const raw = env?.GOOGLE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed?.client_email && parsed?.private_key ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * An OAuth access token for the given scopes, via the JWT bearer grant.
 * Returns '' when no service account is configured, which every caller
 * treats as "this feature is switched off" rather than as an error.
 */
export async function accessToken(env, scope) {
  const account = serviceAccount(env);
  if (!account) return '';

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.scope === scope && cachedToken.expires > now + 60) {
    return cachedToken.value;
  }

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600
    })
  );

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(account.private_key.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claim}`)
  );
  const assertion = `${header}.${claim}.${base64url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) return '';

  const payload = await response.json();
  if (!payload.access_token) return '';
  cachedToken = { value: payload.access_token, scope, expires: now + Number(payload.expires_in || 3600) };
  return cachedToken.value;
}

async function callGoogle(env, { url, scope, body }) {
  const token = await accessToken(env, scope);
  if (!token) return null;
  const response = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) return null;
  return response.json();
}

/* --------------------------------------------------------------- analytics */

const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

/**
 * Lifetime page views per path, as a Map.
 *
 * One request covers the whole site rather than one per page: the report is
 * cached and read by every post, so asking per-post would multiply the quota
 * by the size of the archive for no extra information.
 */
export async function pageViews(env, { days = 365 } = {}) {
  const property = String(env?.GA4_PROPERTY_ID || '').replace(/^properties\//, '');
  if (!property) return null;

  const report = await callGoogle(env, {
    url: `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
    scope: ANALYTICS_SCOPE,
    body: {
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 5000
    }
  });
  if (!report) return null;

  const views = new Map();
  for (const row of report.rows || []) {
    const path = String(row.dimensionValues?.[0]?.value || '');
    const count = Number(row.metricValues?.[0]?.value || 0);
    if (!path || !count) continue;
    // GA4 reports the path with any query string attached, and both with and
    // without the trailing slash. Fold them onto one key so a post's total is
    // its real total rather than whichever variant happened to be biggest.
    const key = normalisePath(path);
    views.set(key, (views.get(key) || 0) + count);
  }
  return views;
}

export function normalisePath(value) {
  const path = String(value || '').split('?')[0].split('#')[0];
  if (!path.startsWith('/')) return `/${path}`;
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : '/';
}

/* ----------------------------------------------------------- search console */

const SEARCH_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function siteUrl(env) {
  return String(env?.SEARCH_CONSOLE_SITE || 'https://www.musfiqrfarhan.blog/');
}

/**
 * The queries people actually used to reach this site.
 *
 * Google Trends has no official API, and the endpoints that get scraped for
 * it are neither stable nor permitted. Search Console is the supported one,
 * and it is the better data anyway: real queries this site already ranks for,
 * with the impressions and the position, rather than what is popular in
 * general. That is what tells an editor which post to write next.
 */
export async function searchQueries(env, { days = 28, limit = 40 } = {}) {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  const iso = (date) => date.toISOString().slice(0, 10);

  const report = await callGoogle(env, {
    url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl(env)
    )}/searchAnalytics/query`,
    scope: SEARCH_SCOPE,
    body: {
      startDate: iso(start),
      endDate: iso(end),
      dimensions: ['query'],
      rowLimit: limit,
      dataState: 'all'
    }
  });
  if (!report) return null;

  return (report.rows || []).map((row) => ({
    query: row.keys?.[0] || '',
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0)
  }));
}

/**
 * What Google says about one URL.
 *
 * This is the URL Inspection API, and it only reads. There is no supported
 * way to submit an ordinary page for indexing from code: the Indexing API
 * accepts JobPosting and BroadcastEvent only, and using it for anything else
 * is against its terms and does not work. Pages get indexed from the sitemap,
 * and this is how we see whether that has happened.
 */
export async function inspectUrl(env, pageUrl) {
  const token = await accessToken(env, SEARCH_SCOPE);
  if (!token) return null;

  const response = await fetch(
    'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: pageUrl, siteUrl: siteUrl(env) })
    }
  );
  if (!response.ok) return null;

  const payload = await response.json();
  const result = payload?.inspectionResult?.indexStatusResult || {};
  return {
    url: pageUrl,
    verdict: result.verdict || 'VERDICT_UNSPECIFIED',
    coverage: result.coverageState || '',
    lastCrawled: result.lastCrawlTime || '',
    canonical: result.googleCanonical || '',
    robots: result.robotsTxtState || ''
  };
}
