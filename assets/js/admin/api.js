/**
 * Authenticated client for the dashboard.
 *
 * Uploads pick their route by size: small files go in a single request, and
 * anything larger is split into parts and sent through R2's multipart API.
 * That is what lets a full-length natok upload finish instead of hitting the
 * Worker's request-body limit.
 */

import { API_BASE } from '../config.js';

const TOKEN_KEY = 'mrf_admin_token';
/** Files at or below this go up in one request; larger ones are chunked. */
const SINGLE_LIMIT = 80 * 1024 * 1024;
const CHUNK_SIZE = 10 * 1024 * 1024;

export const token = {
  get: () => sessionStorage.getItem(TOKEN_KEY) || '',
  set: (value) => sessionStorage.setItem(TOKEN_KEY, value),
  clear: () => sessionStorage.removeItem(TOKEN_KEY)
};

class AuthError extends Error {}

async function request(path, { method = 'GET', body, raw, query } = {}) {
  const headers = {};
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const auth = token.get();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query || {})) {
    if (value !== '' && value != null) url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method,
    headers,
    body: raw ?? (body instanceof FormData ? body : body ? JSON.stringify(body) : undefined)
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    token.clear();
    throw new AuthError(data.error || 'Your session expired. Please sign in again.');
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

/** Upload one part, retrying a couple of times before giving up on it. */
async function uploadPartWithRetry(key, uploadId, partNumber, blob, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await request('/api/admin/media/multipart/part', {
        method: 'PUT',
        raw: blob,
        query: { key, upload_id: uploadId, part_number: partNumber }
      });
    } catch (error) {
      if (error instanceof AuthError) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    }
  }
  throw lastError;
}

/**
 * @param {File} file
 * @param {(progress: number) => void} [onProgress] 0–100
 */
async function uploadFile(file, onProgress = () => {}) {
  if (file.size <= SINGLE_LIMIT) {
    const form = new FormData();
    form.append('file', file);
    onProgress(5);
    const result = await request('/api/admin/media', { method: 'POST', body: form });
    onProgress(100);
    return result;
  }

  const start = await request('/api/admin/media/multipart/start', {
    method: 'POST',
    body: { name: file.name, content_type: file.type, size: file.size }
  });

  const chunkSize = Math.max(start.part_size || CHUNK_SIZE, CHUNK_SIZE);
  const total = Math.ceil(file.size / chunkSize);
  const parts = [];

  try {
    for (let index = 0; index < total; index += 1) {
      const blob = file.slice(index * chunkSize, Math.min((index + 1) * chunkSize, file.size));
      const part = await uploadPartWithRetry(start.key, start.upload_id, index + 1, blob);
      parts.push({ part_number: part.part_number, etag: part.etag });
      onProgress(Math.round(((index + 1) / total) * 96));
    }
  } catch (error) {
    // Leave no half-finished multipart upload behind in the bucket.
    await request('/api/admin/media/multipart/abort', {
      method: 'POST',
      body: { key: start.key, upload_id: start.upload_id }
    }).catch(() => {});
    throw error;
  }

  const result = await request('/api/admin/media/multipart/complete', {
    method: 'POST',
    body: {
      key: start.key,
      upload_id: start.upload_id,
      parts,
      name: file.name,
      content_type: file.type,
      size: file.size
    }
  });
  onProgress(100);
  return result;
}

export const adminApi = {
  AuthError,
  login: (username, password) => request('/api/admin/login', { method: 'POST', body: { username, password } }),
  metrics: () => request('/api/admin/metrics'),

  listContent: (filters = {}) => request('/api/admin/content', { query: filters }),
  createContent: (payload) => request('/api/admin/content', { method: 'POST', body: payload }),
  updateContent: (id, payload) => request(`/api/admin/content/${id}`, { method: 'PUT', body: payload }),
  patchContent: (id, payload) => request(`/api/admin/content/${id}`, { method: 'PATCH', body: payload }),
  deleteContent: (id) => request(`/api/admin/content/${id}`, { method: 'DELETE' }),

  listGallery: () => request('/api/admin/gallery'),
  createGalleryItem: (payload) => request('/api/admin/gallery', { method: 'POST', body: payload }),
  updateGalleryItem: (id, payload) => request(`/api/admin/gallery/${id}`, { method: 'PATCH', body: payload }),
  deleteGalleryItem: (id) => request(`/api/admin/gallery/${id}`, { method: 'DELETE' }),

  listMedia: () => request('/api/admin/media'),
  deleteMedia: (id) => request(`/api/admin/media/${id}`, { method: 'DELETE' }),
  uploadFile,

  listReviews: () => request('/api/admin/reviews'),
  setReviewApproved: (id, approved) =>
    request(`/api/admin/reviews/${id}`, { method: 'PATCH', body: { approved } }),
  deleteReview: (id) => request(`/api/admin/reviews/${id}`, { method: 'DELETE' }),

  listNotes: () => request('/api/admin/love-notes'),
  updateNote: (id, payload) => request(`/api/admin/love-notes/${id}`, { method: 'PATCH', body: payload }),
  deleteNote: (id) => request(`/api/admin/love-notes/${id}`, { method: 'DELETE' })
};
