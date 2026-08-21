/** Small DOM and formatting helpers used across the site. */

export const $ = (selector, scope = document) => scope.querySelector(selector);
export const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ENTITIES[char]);
}

/** Escape a value for use inside an HTML attribute that we build by hand. */
export const attr = esc;

export function formatDate(value, options = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}

export function relativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (Math.abs(diffDays) > 30) return formatDate(value, { month: 'short', year: 'numeric' });
  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(diffDays, 'day');
}

export function formatCount(value) {
  const number = Number(value || 0);
  if (number < 1000) return String(number);
  if (number < 1_000_000) return `${(number / 1000).toFixed(number < 10_000 ? 1 : 0)}k`;
  return `${(number / 1_000_000).toFixed(1)}M`;
}

export function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();
}

/** Render a template string into an element, replacing its contents. */
export function render(target, html) {
  const node = typeof target === 'string' ? $(target) : target;
  if (node) node.innerHTML = html;
  return node;
}

export function on(target, event, handler, options) {
  const node = typeof target === 'string' ? $(target) : target;
  node?.addEventListener(event, handler, options);
  return node;
}

/** Event delegation: run `handler` when the event hits `selector`. */
export function delegate(root, event, selector, handler) {
  const node = typeof root === 'string' ? $(root) : root;
  node?.addEventListener(event, (nativeEvent) => {
    const match = nativeEvent.target.closest(selector);
    if (match && node.contains(match)) handler(nativeEvent, match);
  });
}

export function debounce(fn, wait = 220) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Absolute URL for an asset that may be stored as a site-relative path. */
export function mediaUrl(value, fallback = '') {
  const url = String(value || '').trim();
  if (!url) return fallback;
  if (/^(https?:|data:|\/\/)/i.test(url)) return url;
  return url.startsWith('/') ? url : `/${url}`;
}

export function starMarkup(rating) {
  const value = Number(rating) || 0;
  if (!value) return '';
  const rounded = Math.round(value);
  return `<span class="stars" aria-label="Rated ${value} out of 5">${'★'.repeat(rounded)}${'☆'.repeat(
    Math.max(0, 5 - rounded)
  )}<span class="stars__value">${value.toFixed(1)}</span></span>`;
}

/** Set or replace a <meta>/<link> tag in the head. */
export function setMeta(selector, attribute, value) {
  if (!value) return;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
    const match = selector.match(/\[(\w+)="([^"]+)"\]/);
    if (match) node.setAttribute(match[1], match[2]);
    document.head.appendChild(node);
  }
  node.setAttribute(attribute, value);
}

/** Append a JSON-LD block. */
export function addJsonLd(data, id = '') {
  if (id) document.getElementById(id)?.remove();
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  if (id) script.id = id;
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/** Article bodies use the shared renderer so the build and the browser agree. */
export { renderMarkdown as renderBody } from '../../shared/markdown.js';
