/**
 * Dashboard shell: login, sidebar navigation and view routing.
 *
 * Each view is mounted once, on first visit, and kept in the DOM afterwards so
 * switching between them is instant and an in-progress draft in the composer
 * survives a trip to the media library.
 */

import { SITE } from '../config.js';
import { adminApi, token } from './api.js';
import { $, esc, toast } from './ui.js';
import { composerMarkup, fillComposer, initComposer } from './composer.js';
import {
  contentMarkup,
  galleryMarkup,
  initContentList,
  initGallery,
  initMedia,
  mediaMarkup
} from './library.js';
import { initNotes, initReviews, notesMarkup, reviewsMarkup } from './community.js';

const ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  compose: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20h16M6 16l10-10 3 3-10 10H6z"/></svg>',
  content: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="m4 16 4.5-4.5 3 3L15 11l5 5" stroke-linecap="round"/><circle cx="9" cy="9" r="1.5"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.6 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13z"/></svg>',
  reviews: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8z"/></svg>',
  seo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
};

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', group: 'Overview' },
  { id: 'compose', label: 'Publish something', icon: 'compose', group: 'Create' },
  { id: 'content', label: 'All content', icon: 'content', group: 'Create' },
  { id: 'media', label: 'Media library', icon: 'media', group: 'Create' },
  { id: 'gallery', label: 'Gallery', icon: 'gallery', group: 'Create' },
  { id: 'notes', label: 'Love notes', icon: 'notes', group: 'Community', badge: 'notes_pending' },
  { id: 'reviews', label: 'Ratings', icon: 'reviews', group: 'Community', badge: 'reviews_pending' },
  { id: 'seo', label: 'SEO health', icon: 'seo', group: 'Community' }
];

const TITLES = {
  dashboard: ['Dashboard', 'Everything at a glance.'],
  compose: ['Publish something', 'Pick what it is, drop the file in, and the rest fills itself.'],
  content: ['All content', 'Search, edit, hide or delete anything on the site.'],
  media: ['Media library', 'Every uploaded video and image, with its public URL.'],
  gallery: ['Gallery', 'The image grid shown on the gallery page.'],
  notes: ['Love notes', 'Approve the messages fans send.'],
  reviews: ['Ratings', 'Approve the star ratings left on each page.'],
  seo: ['SEO health', 'What still needs attention before it ranks.']
};

const mounted = new Map();
const controllers = {};
let metricsCache = {};

/* ------------------------------------------------------------------ login */

function showLogin(message = '') {
  document.body.innerHTML = `<div class="login">
    <form class="login__card" data-login>
      <h1>MRF studio</h1>
      <p>Sign in to publish and moderate.</p>
      <div class="field">
        <label for="login-user">Username</label>
        <input id="login-user" name="username" type="text" autocomplete="username" required>
      </div>
      <div class="field">
        <label for="login-pass">Password</label>
        <input id="login-pass" name="password" type="password" autocomplete="current-password" required>
      </div>
      <button class="btn btn--primary btn--block" type="submit">Sign in</button>
      <p style="margin-top:.8rem;font-size:.82rem;color:var(--danger)" data-login-error>${esc(message)}</p>
    </form>
  </div>
  <div class="toasts" data-toasts></div>`;

  $('[data-login]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const result = await adminApi.login(form.username.value, form.password.value);
      token.set(result.token);
      boot();
    } catch (error) {
      $('[data-login-error]').textContent = error.message;
      button.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ shell */

function shellMarkup() {
  const groups = [...new Set(VIEWS.map((view) => view.group))];
  return `<div class="mobile-nav">
    <button class="btn btn--ghost btn--sm" type="button" data-sidebar-toggle aria-label="Open navigation">☰ Menu</button>
    <strong data-mobile-title>Dashboard</strong>
  </div>
  <div class="scrim" data-scrim hidden></div>
  <div class="shell">
    <nav class="sidebar" data-sidebar aria-label="Dashboard sections">
      <div class="sidebar__brand">
        <img src="/assets/mrf-mark.svg" alt="" width="30" height="30">
        <span><strong>MRF STUDIO</strong><span>DASHBOARD</span></span>
      </div>
      ${groups
        .map(
          (group) => `<p class="sidebar__group">${esc(group)}</p>
          ${VIEWS.filter((view) => view.group === group)
            .map(
              (view) => `<button class="nav-btn" type="button" data-view="${view.id}">
                ${ICONS[view.icon]}<span>${esc(view.label)}</span>
                ${view.badge ? `<span class="nav-btn__badge" data-badge="${view.badge}" hidden>0</span>` : ''}
              </button>`
            )
            .join('')}`
        )
        .join('')}
      <div class="sidebar__foot">
        <a class="btn btn--ghost btn--sm btn--block" href="${SITE.origin}" target="_blank" rel="noopener">Open the site</a>
        <button class="btn btn--ghost btn--sm btn--block" type="button" data-logout>Sign out</button>
      </div>
    </nav>

    <div class="workspace">
      <div class="topbar">
        <div>
          <h1 data-view-title>Dashboard</h1>
          <p data-view-subtitle>Everything at a glance.</p>
        </div>
        <div class="topbar__actions">
          <button class="btn btn--primary btn--sm" type="button" data-view="compose">+ Publish something</button>
        </div>
      </div>
      ${VIEWS.map((view) => `<section data-panel="${view.id}" hidden></section>`).join('')}
    </div>
  </div>
  <div class="toasts" data-toasts></div>`;
}

/* -------------------------------------------------------------- dashboard */

function dashboardMarkup(metrics) {
  const stat = (value, label, alert = false) =>
    `<div class="stat${alert && value > 0 ? ' stat--alert' : ''}">
      <span class="stat__value">${value}</span><span class="stat__label">${esc(label)}</span>
    </div>`;

  return `<div class="stat-grid">
      ${stat(metrics.content_published ?? 0, 'Published')}
      ${stat(metrics.content_drafts ?? 0, 'Drafts')}
      ${stat(metrics.gallery_total ?? 0, 'Gallery images')}
      ${stat(metrics.media_total ?? 0, 'Files stored')}
      ${stat(metrics.notes_live ?? 0, 'Live love notes')}
      ${stat(metrics.rating_average ?? 0, 'Average rating')}
    </div>
    <div class="stat-grid">
      ${stat(metrics.notes_pending ?? 0, 'Notes waiting', true)}
      ${stat(metrics.reviews_pending ?? 0, 'Ratings waiting', true)}
      ${stat(metrics.seo_incomplete ?? 0, 'Published items missing SEO', true)}
    </div>
    <div class="panel">
      <div class="panel__head"><h2>Quick actions</h2></div>
      <div style="display:flex;gap:.6rem;flex-wrap:wrap">
        <button class="btn btn--primary btn--sm" type="button" data-view="compose">Publish something</button>
        <button class="btn btn--ghost btn--sm" type="button" data-view="media">Upload a video</button>
        <button class="btn btn--ghost btn--sm" type="button" data-view="notes">Review love notes</button>
        <button class="btn btn--ghost btn--sm" type="button" data-view="reviews">Review ratings</button>
      </div>
    </div>`;
}

function seoMarkup() {
  return `<div class="panel">
    <div class="panel__head">
      <h2>Items that need attention</h2>
      <button class="btn btn--ghost btn--sm" type="button" data-seo-refresh>Refresh</button>
    </div>
    <p style="font-size:.82rem;color:var(--ink-faint);margin-bottom:1rem">
      Published items missing a meta description, a cover image or a video source.
      Each one is a page search engines will struggle with.
    </p>
    <div class="rows" data-seo-rows><p class="empty">Loading…</p></div>
  </div>
  <div class="panel">
    <div class="panel__head"><h2>Sitemaps</h2></div>
    <p style="font-size:.85rem;color:var(--ink-soft)">
      The sitemap set regenerates on every deploy and covers pages, categories, posts,
      videos and gallery images. Submit the index once in Search Console:
    </p>
    <p style="margin-top:.6rem"><code>${SITE.origin}/sitemap.xml</code></p>
  </div>`;
}

function initSeoView(root) {
  const rows = $('[data-seo-rows]', root);

  async function load() {
    rows.innerHTML = '<p class="empty">Loading…</p>';
    try {
      const data = await adminApi.listContent({ status: 'published' });
      const problems = data.items
        .map((item) => {
          const missing = [];
          if (!item.meta_description) missing.push('meta description');
          if (!item.image) missing.push('cover image');
          if (item.type === 'video' && !item.video_url && !item.attachment_url && !item.embed_url) {
            missing.push('video source');
          }
          if (!item.keywords) missing.push('keywords');
          return { item, missing };
        })
        .filter((entry) => entry.missing.length);

      rows.innerHTML = problems.length
        ? problems
            .map(
              ({ item, missing }) => `<article class="row">
                <img class="row__thumb" src="${esc(item.image || '/assets/img/hero_red-1280.webp')}" alt="" loading="lazy">
                <div>
                  <p class="row__title">${esc(item.title)}</p>
                  <div class="row__meta"><span class="tag tag--draft">Missing ${esc(missing.join(', '))}</span></div>
                </div>
                <div class="row__actions">
                  <button class="btn btn--ghost btn--sm" type="button" data-seo-edit="${item.id}">Fix it</button>
                </div>
              </article>`
            )
            .join('')
        : '<p class="empty">Every published item has its SEO fields filled in.</p>';
    } catch (error) {
      rows.innerHTML = `<p class="empty">${esc(error.message)}</p>`;
    }
  }

  $('[data-seo-refresh]', root).addEventListener('click', load);
  rows.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-seo-edit]');
    if (!button) return;
    const data = await adminApi.listContent({});
    const item = data.items.find((row) => String(row.id) === button.dataset.seoEdit);
    if (item) openInComposer(item);
  });

  load();
  return { reload: load };
}

/* ----------------------------------------------------------------- router */

function openInComposer(item) {
  show('compose');
  fillComposer($('[data-panel="compose"]'), item);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function mount(id) {
  if (mounted.has(id)) return;
  const panel = $(`[data-panel="${id}"]`);

  switch (id) {
    case 'dashboard':
      panel.innerHTML = dashboardMarkup(metricsCache);
      break;
    case 'compose':
      panel.innerHTML = composerMarkup();
      initComposer(panel, { onSave: () => refreshMetrics() });
      break;
    case 'content':
      panel.innerHTML = contentMarkup();
      controllers.content = initContentList(panel, { onEdit: openInComposer });
      break;
    case 'media':
      panel.innerHTML = mediaMarkup();
      controllers.media = initMedia(panel);
      break;
    case 'gallery':
      panel.innerHTML = galleryMarkup();
      controllers.gallery = initGallery(panel);
      break;
    case 'notes':
      panel.innerHTML = notesMarkup();
      controllers.notes = initNotes(panel, { onChange: refreshMetrics });
      break;
    case 'reviews':
      panel.innerHTML = reviewsMarkup();
      controllers.reviews = initReviews(panel, { onChange: refreshMetrics });
      break;
    case 'seo':
      panel.innerHTML = seoMarkup();
      controllers.seo = initSeoView(panel);
      break;
    default:
      return;
  }
  mounted.set(id, true);
}

function show(id) {
  const view = VIEWS.find((entry) => entry.id === id) ? id : 'dashboard';
  mount(view);

  for (const panel of document.querySelectorAll('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== view;
  }
  for (const button of document.querySelectorAll('.nav-btn[data-view]')) {
    button.classList.toggle('is-active', button.dataset.view === view);
  }

  const [title, subtitle] = TITLES[view] || TITLES.dashboard;
  $('[data-view-title]').textContent = title;
  $('[data-view-subtitle]').textContent = subtitle;
  $('[data-mobile-title]').textContent = title;
  if (window.location.hash.slice(1) !== view) window.location.hash = view;

  // Views that show moderation queues should be current when reopened.
  if (view === 'content') controllers.content?.reload();
  if (view === 'notes') controllers.notes?.reload();
  if (view === 'reviews') controllers.reviews?.reload();

  closeSidebar();
}

function openSidebar() {
  $('[data-sidebar]').classList.add('is-open');
  $('[data-scrim]').hidden = false;
}

function closeSidebar() {
  $('[data-sidebar]')?.classList.remove('is-open');
  const scrim = $('[data-scrim]');
  if (scrim) scrim.hidden = true;
}

async function refreshMetrics() {
  try {
    metricsCache = await adminApi.metrics();
  } catch {
    return;
  }
  for (const badge of document.querySelectorAll('[data-badge]')) {
    const value = Number(metricsCache[badge.dataset.badge] || 0);
    badge.textContent = value;
    badge.hidden = value === 0;
  }
  const dashboard = $('[data-panel="dashboard"]');
  if (mounted.has('dashboard') && dashboard) dashboard.innerHTML = dashboardMarkup(metricsCache);
}

/* ------------------------------------------------------------------- boot */

async function boot() {
  if (!token.get()) {
    showLogin();
    return;
  }

  try {
    metricsCache = await adminApi.metrics();
  } catch (error) {
    showLogin(error instanceof adminApi.AuthError ? '' : error.message);
    return;
  }

  document.body.innerHTML = shellMarkup();

  document.addEventListener('click', (event) => {
    const navButton = event.target.closest('[data-view]');
    if (navButton) show(navButton.dataset.view);
    if (event.target.closest('[data-sidebar-toggle]')) openSidebar();
    if (event.target.closest('[data-scrim]')) closeSidebar();
    if (event.target.closest('[data-logout]')) {
      token.clear();
      showLogin('Signed out.');
    }
  });

  window.addEventListener('hashchange', () => show(window.location.hash.slice(1) || 'dashboard'));
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof adminApi.AuthError) {
      showLogin(event.reason.message);
      event.preventDefault();
    }
  });

  await refreshMetrics();
  show(window.location.hash.slice(1) || 'dashboard');
  toast('Signed in.');
}

boot();
