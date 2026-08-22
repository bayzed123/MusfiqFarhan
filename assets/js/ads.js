/**
 * Automatic ad placement.
 *
 * Every unit is declared once here and injected at runtime, so a newly
 * published post picks up its ads without anyone touching a template.
 *
 * Two things this has to get right, because the naive approach silently
 * breaks both:
 *
 * 1. Adsterra's iframe banners all read one global, `window.atOptions`. Put
 *    two of them on a page and whichever invoke.js runs last wins — every
 *    slot then renders the same size, or nothing at all. Each banner is
 *    therefore rendered inside its own `<iframe srcdoc>`, which gives it a
 *    private window and its own `atOptions`.
 * 2. The native banner script fills a container whose id must be exactly
 *    `container-<key>`. A generated id means it never renders, so there is
 *    one native unit per page and it uses the exact id.
 *
 * The iframes are sandboxed without `allow-same-origin`, so an ad runs in an
 * opaque origin and cannot reach this document, its cookies or its storage.
 * Clicks still open the advertiser.
 */

/** Banner units, keyed by role. Sizes are the ones the account has enabled. */
const BANNERS = Object.freeze({
  leaderboard: { key: '5eafb0abe297aa165fad81b9d9a6cc5b', width: 728, height: 90 },
  tablet: { key: 'd8c7eedc100db2e87e8220ccb8c86c70', width: 468, height: 60 },
  mobile: { key: 'cc12dcdbe4d4a8991416d88fa8d39fc0', width: 320, height: 50 },
  rectangle: { key: 'dec8e7c5a6013e2a549acf5343f56664', width: 300, height: 250 },
  railTall: { key: '2af700860e9cb041351b895af5acc1a1', width: 160, height: 600 },
  railShort: { key: '526fc12b05e03824b147ab501ebdcc6e', width: 160, height: 300 }
});

const NATIVE_KEY = '95ccad5ad2296df12234714b8e6904cf';
const BANNER_HOST = 'https://www.highrevenueformat.com';
const NATIVE_HOST = 'https://pl30964228.profitableratecpmnetwork.com';

/* Smartlink and SocialBar are deliberately not loaded: the first is an
   interstitial redirect and the second overlays navigation on mobile. */

const EXCLUDED = /^(?:\/admin(?:\/|$)|\/404(?:\.html)?\/?$|\/sitemap[^/]*\.(?:xml|xsl)$|\/robots\.txt$)/i;

const isExcluded = () => EXCLUDED.test(window.location.pathname);

const idle = (callback) =>
  window.requestIdleCallback
    ? window.requestIdleCallback(callback, { timeout: 2000 })
    : window.setTimeout(callback, 400);

/* ------------------------------------------------------------- size picking */

/**
 * Choose the widest banner that actually fits, so a 728x90 is never injected
 * into a 360px phone — that was the source of horizontal overflow.
 */
function bannerFor(role, available) {
  const width = available || document.documentElement.clientWidth;
  if (role === 'rail') return width >= 200 ? BANNERS.railTall : BANNERS.rectangle;
  if (role === 'rail-short') return BANNERS.railShort;
  if (role === 'rectangle') return width >= 320 ? BANNERS.rectangle : BANNERS.mobile;
  // Horizontal banner: step down through the enabled sizes.
  if (width >= 760) return BANNERS.leaderboard;
  if (width >= 500) return BANNERS.tablet;
  return BANNERS.mobile;
}

function availableWidth(node) {
  const width = node?.getBoundingClientRect?.().width || 0;
  return Math.floor(width) || document.documentElement.clientWidth;
}

/* ----------------------------------------------------------------- building */

function slotElement(name, label = 'Advertisement') {
  const slot = document.createElement('aside');
  slot.className = `ad-slot ad-slot--${name}`;
  slot.dataset.adSlot = name;
  slot.setAttribute('aria-label', label);
  slot.innerHTML = '<span class="ad-slot__label">Advertisement</span>';
  return slot;
}

/** The document handed to a banner iframe: one unit, one private atOptions. */
function bannerDocument({ key, width, height }) {
  const options = JSON.stringify({ key, format: 'iframe', height, width, params: {} });
  return `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style>
</head><body>
<script>window.atOptions=${options};<\/script>
<script src="${BANNER_HOST}/${key}/invoke.js"><\/script>
</body></html>`;
}

function fillBanner(slot, config) {
  const frame = document.createElement('iframe');
  frame.className = 'ad-slot__frame';
  frame.width = String(config.width);
  frame.height = String(config.height);
  frame.loading = 'lazy';
  frame.scrolling = 'no';
  frame.title = 'Advertisement';
  frame.setAttribute('frameborder', '0');
  // No allow-same-origin: the ad cannot reach this page or its storage.
  frame.setAttribute(
    'sandbox',
    'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation'
  );
  frame.srcdoc = bannerDocument(config);
  slot.appendChild(frame);
}

function fillNative(slot) {
  const container = document.createElement('div');
  // The vendor script looks up this exact id; a generated one never fills.
  container.id = `container-${NATIVE_KEY}`;
  container.className = 'ad-slot__native';
  slot.appendChild(container);

  const script = document.createElement('script');
  script.async = true;
  script.dataset.cfasync = 'false';
  script.src = `${NATIVE_HOST}/${NATIVE_KEY}/invoke.js`;
  slot.appendChild(script);
}

/**
 * Slots are created empty and only loaded when they come near the viewport,
 * which keeps ad requests off the critical path and improves viewability.
 */
const lazyLoader = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const slot = entry.target;
      lazyLoader.unobserve(slot);
      if (slot.dataset.adLoaded) continue;
      slot.dataset.adLoaded = 'true';

      if (slot.dataset.adRole === 'native') fillNative(slot);
      else fillBanner(slot, bannerFor(slot.dataset.adRole, availableWidth(slot)));
    }
  },
  { rootMargin: '400px 0px' }
);

/**
 * @param {string} name  slot name, used for styling and de-duplication
 * @param {'banner'|'rectangle'|'rail'|'native'} role
 */
function makeSlot(name, role) {
  // One native container per page, checked against the DOM rather than a
  // flag, so a slot removed by a re-render can be recreated.
  if (role === 'native' && document.querySelector('.ad-slot[data-ad-role="native"]')) {
    return null;
  }
  const slot = slotElement(name);
  slot.dataset.adRole = role;
  lazyLoader.observe(slot);
  return slot;
}

function insertAfter(node, slot) {
  if (node?.parentNode && slot) node.parentNode.insertBefore(slot, node.nextSibling);
}

function appendTo(node, slot) {
  if (node && slot) node.appendChild(slot);
}

const has = (scope, name) => Boolean(scope?.querySelector(`[data-ad-slot="${name}"]`));

/* ---------------------------------------------------------------- placements */

/** Article and video detail pages. */
function placeOnEntry() {
  const body = document.querySelector('[data-entry-body]');
  const player = document.querySelector('[data-entry-player]');
  if (!body && !player) return false;

  // Directly under the video, before the article text.
  if (player && !has(player.parentElement, 'under-player')) {
    insertAfter(player, makeSlot('under-player', 'banner'));
  }

  if (body) {
    const blocks = [...body.children].filter(
      (node) =>
        /^(P|H2|H3|H4|UL|OL|BLOCKQUOTE|FIGURE|PRE|TABLE)$/i.test(node.tagName) &&
        !node.classList.contains('ad-slot')
    );

    // The mid-article unit every post must carry. Anchor it to the block
    // nearest the halfway point rather than the first paragraph, so it lands
    // inside the story instead of above it.
    if (blocks.length && !has(body, 'in-article')) {
      const midpoint = blocks[Math.max(0, Math.ceil(blocks.length / 2) - 1)];
      insertAfter(midpoint, makeSlot('in-article', 'rectangle'));
    }

    // A second unit deeper in, but only for genuinely long reads.
    if (blocks.length >= 10 && !has(body, 'in-article-late')) {
      insertAfter(blocks[Math.min(blocks.length - 2, Math.floor(blocks.length * 0.8))],
        makeSlot('in-article-late', 'banner'));
    }

    if (!has(body, 'after-article')) appendTo(body, makeSlot('after-article', 'native'));
  }

  // Sidebar rails, desktop only — the aside stacks under the article on
  // mobile, where a 160-wide rail would just waste a screenful.
  const aside = document.querySelector('.article__aside');
  if (aside && window.innerWidth >= 1080) {
    if (!has(aside, 'rail')) appendTo(aside, makeSlot('rail', 'rail'));
    // A long read leaves the column half empty below the tall rail, so a
    // short one goes underneath — but only when there is room for it.
    const article = document.querySelector('.article');
    const tall = (article?.getBoundingClientRect().height || 0) >= 1600;
    if (tall && !has(aside, 'rail-lower')) {
      appendTo(aside, makeSlot('rail-lower', 'rail-short'));
    }
  }

  return true;
}

/** The watch hub: under the player stage and inside the poster grid. */
function placeOnWatch() {
  const grid = document.querySelector('[data-watch-grid]');
  if (!grid) return false;

  const stage = document.querySelector('[data-watch-stage]');
  if (stage && !has(stage.parentElement, 'under-stage')) {
    insertAfter(stage, makeSlot('under-stage', 'banner'));
  }

  injectIntoGrid(grid, '.vcard', 8, 'in-grid');
  if (!has(document, 'after-grid')) {
    insertAfter(grid.closest('section') || grid, makeSlot('after-grid', 'native'));
  }
  return true;
}

/** The blog hub: between article rows. */
function placeOnBlog() {
  const list = document.querySelector('[data-blog-list]');
  if (!list) return false;
  injectIntoGrid(list, '.post-row', 4, 'in-list');
  if (!has(document, 'after-list')) {
    insertAfter(list.closest('section') || list, makeSlot('after-list', 'banner'));
  }
  return true;
}

/** The gallery: a unit after every few images, plus one under the grid. */
function placeOnGallery() {
  const grid = document.querySelector('[data-gallery-grid]');
  if (!grid) return false;
  injectIntoGrid(grid, '.figure', 6, 'in-gallery');
  if (!has(document, 'under-gallery')) {
    insertAfter(grid.closest('section') || grid, makeSlot('under-gallery', 'native'));
  }
  return true;
}

/** Category listings. */
function placeOnCategory() {
  const grid = document.querySelector('[data-category-items]');
  if (!grid) return false;
  injectIntoGrid(grid, '.card', 8, 'in-category');
  if (!has(document, 'after-category')) {
    insertAfter(grid.closest('section') || grid, makeSlot('after-category', 'banner'));
  }
  return true;
}

/** The love-note wall. */
function placeOnLoveNotes() {
  const wall = document.querySelector('[data-note-wall]');
  if (!wall) return false;
  if (!has(document, 'under-notes')) {
    insertAfter(wall.closest('section') || wall, makeSlot('under-notes', 'banner'));
  }
  return true;
}

/** Home: one native unit below the rails, nothing above the fold. */
function placeOnHome() {
  const rails = document.querySelector('[data-rails]');
  if (!rails) return false;
  if (!has(document, 'home-native')) {
    insertAfter(rails, makeSlot('home-native', 'native'));
  }
  return true;
}

/** About, contact, policies — a single unit after the prose. */
function placeOnStatic() {
  if (document.querySelector('[data-entry-body]')) return false;
  const article = document.querySelector('.article');
  if (!article) return false;
  if (!has(document, 'after-static')) {
    insertAfter(article, makeSlot('after-static', 'banner'));
  }
  return true;
}

/**
 * How many columns a CSS grid is currently showing. A slot dropped mid-row
 * would push the rest of that row down and leave a hole beside it, so the
 * interleave has to land on a row boundary.
 *
 * @returns {number} the track count, or 1 for anything that is not a grid
 */
function columnCount(container) {
  const style = getComputedStyle(container);
  if (!style.display.includes('grid')) return 1;
  const tracks = style.gridTemplateColumns.split(' ').filter(Boolean).length;
  return Math.max(1, tracks);
}

/**
 * Drop a slot after every `every` items in a grid or list, so long pages
 * carry ads throughout instead of only at the end. The gap is rounded up to
 * a whole number of rows so the unit always starts a fresh one.
 */
function injectIntoGrid(container, itemSelector, every, name) {
  const items = [...container.querySelectorAll(`:scope > ${itemSelector}`)];
  const columns = columnCount(container);
  const step = Math.max(columns, Math.ceil(every / columns) * columns);
  if (items.length <= step) return;
  let placed = 0;
  for (let index = step - 1; index < items.length - 1; index += step) {
    const slotName = `${name}-${placed}`;
    if (document.querySelector(`[data-ad-slot="${slotName}"]`)) {
      placed += 1;
      continue;
    }
    const slot = makeSlot(slotName, 'rectangle');
    if (!slot) break;
    slot.classList.add('ad-slot--in-grid');
    insertAfter(items[index], slot);
    placed += 1;
    if (placed >= 4) break; // a sensible ceiling per page
  }
}

/* --------------------------------------------------------------------- init */

function placeAds() {
  if (isExcluded()) return;
  // Run every placer, not just the first that matches. A page can hold more
  // than one structure — a video page has an article body and a related grid —
  // and each placer no-ops when its anchor is absent or already filled.
  placeOnEntry();
  placeOnWatch();
  placeOnBlog();
  placeOnGallery();
  placeOnCategory();
  placeOnLoveNotes();
  placeOnHome();
  placeOnStatic();
}

function start() {
  if (isExcluded()) return;
  idle(placeAds);

  /*
   * Placement has to keep running, not stop at the first success. Pages are
   * pre-rendered and then refreshed from the API: entry.js replaces the whole
   * article body, and the hubs fill their grids after the fetch resolves.
   * A one-shot pass placed a mid-article unit that the refresh then deleted,
   * and never saw the grid items at all. Re-running is safe because every
   * insertion is guarded by slot name.
   */
  let queued = false;
  const rerun = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      placeAds();
    });
  };

  const observer = new MutationObserver(rerun);
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // Content has settled well before this; stop watching so we are not
  // observing the whole document for the life of the page.
  setTimeout(() => {
    observer.disconnect();
    placeAds();
  }, 12000);

  // A resize can cross a breakpoint, which changes nothing already rendered
  // but lets a not-yet-loaded slot pick a better size.
  window.addEventListener('resize', rerun, { passive: true });
}

if (!isExcluded()) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
