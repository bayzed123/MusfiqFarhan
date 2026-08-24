/** Thin fetch wrapper around MRF-API with a short-lived in-page cache. */

import { API_BASE } from './config.js';

const cache = new Map();

async function request(path, { method = 'GET', body, token, signal } = {}) {
  const headers = {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    signal,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

/** GET with a per-page-load cache so several widgets can share one response. */
async function cachedGet(path) {
  if (cache.has(path)) return cache.get(path);
  const promise = request(path).catch((error) => {
    cache.delete(path);
    throw error;
  });
  cache.set(path, promise);
  return promise;
}

export const api = {
  request,
  home: () => cachedGet('/api/public/home'),
  // Page views for the whole site in one call, cached — see the Worker.
  views: () => cachedGet('/api/public/views'),
  taxonomy: () => cachedGet('/api/public/taxonomy'),
  export: () => cachedGet('/api/public/export'),
  gallery: (category = '') =>
    cachedGet(`/api/public/gallery${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  category: (category, subcategory = '') =>
    cachedGet(
      `/api/public/category?category=${encodeURIComponent(category)}${
        subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : ''
      }`
    ),
  content: (slug) => cachedGet(`/api/public/content/${encodeURIComponent(slug)}`),
  reviews: (slug = '') =>
    request(`/api/public/reviews${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`),
  submitReview: (payload) => request('/api/public/reviews', { method: 'POST', body: payload }),
  loveNotes: (limit = 24, offset = 0) =>
    request(`/api/public/love-notes?limit=${limit}&offset=${offset}`),
  loveMarquee: () => cachedGet('/api/public/love-notes/marquee'),
  submitLoveNote: (payload) => request('/api/public/love-notes', { method: 'POST', body: payload }),
  uploadLoveNoteAvatar: (file) => {
    const body = new FormData();
    body.append('file', file);
    return request('/api/public/love-notes/avatar', { method: 'POST', body });
  },
  heartNote: (id) => request(`/api/public/love-notes/${id}/heart`, { method: 'POST' })
};
