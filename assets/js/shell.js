/**
 * Behaviour for the site shell. The markup itself is written into every page
 * at build time (see scripts/lib/shell.mjs), so this file only wires up
 * interaction and swaps live data into the love-note ticker.
 */

import { api } from './api.js';
import { $, $$, attr, debounce, delegate, esc, initials, mediaUrl, on } from './dom.js';
import { SITE } from './config.js';

/* ----------------------------------------------------------------- header */

function initStickyHeader() {
  const header = $('[data-header]');
  if (!header) return;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  header.parentNode.insertBefore(sentinel, header);
  new IntersectionObserver(
    ([entry]) => header.classList.toggle('is-stuck', !entry.isIntersecting),
    { rootMargin: '0px' }
  ).observe(sentinel);
}

function initMegaMenus() {
  const items = $$('[data-nav-item]');
  if (!items.length) return;

  const closeAll = (except) => {
    for (const item of items) {
      if (item === except) continue;
      item.classList.remove('is-open');
      $('.nav-link', item)?.setAttribute('aria-expanded', 'false');
    }
  };

  for (const item of items) {
    const trigger = $('.nav-link', item);
    let hoverTimer;
    let openedByHover = false;

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      // On a mouse the menu is already open by the time the click lands, and
      // toggling here would shut it the instant the user tried to use it.
      if (openedByHover && item.classList.contains('is-open')) {
        openedByHover = false;
        return;
      }
      const open = item.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', String(open));
      closeAll(open ? item : null);
    });

    // Pointer users get hover, with a short delay so the menu is not twitchy.
    item.addEventListener('pointerenter', () => {
      if (!window.matchMedia('(hover: hover)').matches) return;
      clearTimeout(hoverTimer);
      closeAll(item);
      openedByHover = !item.classList.contains('is-open');
      item.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    });

    item.addEventListener('pointerleave', () => {
      if (!window.matchMedia('(hover: hover)').matches) return;
      hoverTimer = setTimeout(() => {
        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        openedByHover = false;
      }, 140);
    });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-nav-item]')) closeAll(null);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll(null);
  });
}

/* ----------------------------------------------------------------- drawer */

function initDrawer() {
  const drawer = $('[data-drawer]');
  const opener = $('[data-drawer-open]');
  if (!drawer || !opener) return;

  const open = () => {
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    opener.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    $('.drawer__panel a, .drawer__panel button', drawer)?.focus();
  };

  const close = () => {
    drawer.classList.remove('is-open');
    opener.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => {
      drawer.hidden = true;
    }, 300);
    opener.focus();
  };

  on(opener, 'click', open);
  for (const button of $$('[data-drawer-close]')) on(button, 'click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });

  delegate(drawer, 'click', '.accordion__trigger', (event, trigger) => {
    if (trigger.tagName === 'A') return;
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (panel) panel.hidden = expanded;
  });
}

/* ----------------------------------------------------------------- search */

function initSearch() {
  const panel = $('[data-search-panel]');
  const input = $('[data-search-input]');
  const results = $('[data-search-results]');
  if (!panel || !input) return;

  let index = null;

  const open = async () => {
    panel.hidden = false;
    input.focus();
    input.select();
    if (!index) {
      try {
        const data = await api.export();
        index = data.items || [];
      } catch {
        index = [];
        results.innerHTML = '<p class="muted" style="padding:1rem">Search is offline. Please try again shortly.</p>';
      }
    }
  };

  const close = () => {
    panel.hidden = true;
  };

  const search = debounce(() => {
    const query = input.value.trim().toLowerCase();
    if (!index) return;
    if (query.length < 2) {
      results.innerHTML = '';
      return;
    }
    const matches = index
      .filter((item) =>
        `${item.title} ${item.category} ${item.subcategory} ${item.description || ''} ${item.keywords || ''}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 12);

    results.innerHTML = matches.length
      ? matches
          .map(
            (item) => `<a class="search-result" href="${attr(item.path || '/')}">
              <img src="${attr(mediaUrl(item.image, SITE.fallbackImage))}" alt="" width="76" height="43" loading="lazy" decoding="async">
              <span>
                <span class="search-result__title">${esc(item.title)}</span>
                <span class="search-result__meta">${esc(item.category)}${
                  item.subcategory ? ` · ${esc(item.subcategory)}` : ''
                }</span>
              </span>
            </a>`
          )
          .join('')
      : '<p class="muted" style="padding:1rem">Nothing matched that search yet.</p>';
  }, 180);

  for (const button of $$('[data-search-open]')) on(button, 'click', open);
  on(input, 'input', search);
  on(panel, 'click', (event) => {
    if (event.target === panel) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) close();
    // "/" is the familiar shortcut for jump-to-search.
    if (event.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) {
      event.preventDefault();
      open();
    }
  });
}

/* ------------------------------------------------------------ love ticker */

function chipMarkup(note) {
  const avatar = note.avatar_url
    ? `<img class="love-chip__avatar" src="${attr(note.avatar_url)}" alt="" width="26" height="26" loading="lazy" decoding="async">`
    : `<span class="love-chip__initial" aria-hidden="true">${esc(initials(note.name))}</span>`;
  return `<span class="love-chip">${avatar}<span class="love-chip__name">${esc(note.name)}</span><span class="love-chip__message">${esc(
    note.message
  )}</span></span>`;
}

async function initLoveTicker() {
  const track = $('[data-love-track]');
  const counter = $('[data-love-count]');
  if (!track) return;

  try {
    const data = await api.loveMarquee();
    if (counter) counter.textContent = new Intl.NumberFormat('en').format(data.count || 0);
    if (!data.notes?.length) {
      track.innerHTML = '<span class="love-chip"><span class="love-chip__message">Be the first to leave a love note.</span></span>';
      return;
    }
    // The track is duplicated so the -50% keyframe loops seamlessly.
    const chips = data.notes.map(chipMarkup).join('');
    track.innerHTML = chips + chips;
    track.style.animationDuration = `${Math.max(30, data.notes.length * 6)}s`;
    track.dataset.ready = 'true';
  } catch {
    track.innerHTML = '<span class="love-chip"><span class="love-chip__message">Fan notes are loading…</span></span>';
  }
}

/* -------------------------------------------------------------------- misc */

function markCurrentNav() {
  const path = window.location.pathname.replace(/\/+$/, '/') || '/';
  for (const link of $$('.primary-nav a[href], .mega__title, .mega__sub')) {
    const href = link.getAttribute('href');
    if (href && href !== '/' && path.startsWith(href)) {
      link.setAttribute('aria-current', 'page');
      link.closest('.nav-item')?.querySelector('.nav-link')?.classList.add('is-active');
    }
  }
}

function initYear() {
  for (const node of $$('[data-year]')) node.textContent = String(new Date().getFullYear());
}

export function initShell() {
  initStickyHeader();
  initMegaMenus();
  initDrawer();
  initSearch();
  markCurrentNav();
  initYear();
  // The ticker is decorative, so let the main content settle first.
  if ('requestIdleCallback' in window) requestIdleCallback(initLoveTicker, { timeout: 2500 });
  else setTimeout(initLoveTicker, 600);
}

initShell();
