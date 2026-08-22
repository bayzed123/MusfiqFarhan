/**
 * Automatic advertising for eligible public pages.
 *
 * Placement contract:
 * - Home, admin, sitemap, robots and 404 never instantiate an ad.
 * - Content pages receive a real inline unit in the article midpoint, not after
 *   the first paragraph, plus responsive fallbacks and a sidebar rail.
 * - Listing/static pages receive below-content units.
 * - SocialBar is intentionally not loaded because it disrupts navigation and
 *   mobile layout.
 */
const ADS = Object.freeze({
  mediumRail: { key: '526fc12b05e03824b147ab501ebdcc6e', width: 160, height: 300 },
  tallRail: { key: '2af700860e9cb041351b895af5acc1a1', width: 160, height: 600 },
  inline: { key: 'dec8e7c5a6013e2a549acf5343f56664', width: 300, height: 250 },
  mobile: { key: 'cc12dcdbe4d4a8991416d88fa8d39fc0', width: 320, height: 50 },
  tablet: { key: 'd8c7eedc100db2e87e8220ccb8c86c70', width: 468, height: 60 },
  leaderboard: { key: '5eafb0abe297aa165fad81b9d9a6cc5b', width: 728, height: 90 },
  native: { key: '95ccad5ad2296df12234714b8e6904cf' },
  smartlink: 'https://www.profitableratecpmnetwork.com/xa8a37s0?key=0e7aa375f5512a9454e96375b8613458'
});

const EXCLUDED = /^(?:\/$|\/404(?:\.html)?\/?$|\/admin(?:\/|$)|\/sitemap[^/]*\.xml$|\/robots\.txt$)/i;
const isExcluded = () => EXCLUDED.test(window.location.pathname);
const idle = (callback) =>
  window.requestIdleCallback
    ? window.requestIdleCallback(callback, { timeout: 1800 })
    : window.setTimeout(callback, 500);

function createSlot(name, format) {
  const slot = document.createElement('aside');
  slot.className = `ad-slot ad-slot--${name}`;
  slot.dataset.adFormat = format;
  slot.dataset.adSlot = name;
  slot.setAttribute('aria-label', 'Advertisement');
  slot.innerHTML = '<span class="ad-slot__label">Advertisement</span>';
  return slot;
}

function frameAd(config, name) {
  const slot = createSlot(name, `${config.width}x${config.height}`);
  const options = document.createElement('script');
  options.textContent = `window.atOptions = ${JSON.stringify({
    key: config.key,
    format: 'iframe',
    height: config.height,
    width: config.width,
    params: {}
  })};`;

  const invoke = document.createElement('script');
  invoke.src = `https://www.highrevenueformat.com/${config.key}/invoke.js`;
  invoke.async = false;
  invoke.dataset.adNetwork = 'highrevenueformat';
  slot.append(options, invoke);
  return slot;
}

function nativeAd() {
  const id = `ad-native-${Math.random().toString(36).slice(2)}`;
  const slot = createSlot('native', 'native');
  const container = document.createElement('div');
  container.id = id;
  container.className = 'ad-slot__native-container';
  slot.appendChild(container);
  const script = document.createElement('script');
  script.async = true;
  script.dataset.cfasync = 'false';
  script.src = `https://pl30964228.profitableratecpmnetwork.com/${ADS.native.key}/invoke.js`;
  container.appendChild(script);
  return slot;
}

function smartlinkAd() {
  const slot = createSlot('smartlink', 'smartlink');
  slot.innerHTML += `<a class="ad-smartlink" href="${ADS.smartlink}" target="_blank" rel="sponsored noopener noreferrer">Sponsored recommendation</a>`;
  return slot;
}

function insertAfter(node, ad) {
  if (node?.parentNode) node.parentNode.insertBefore(ad, node.nextSibling);
}

function insertBefore(node, ad) {
  if (node?.parentNode) node.parentNode.insertBefore(ad, node);
}

function articleBlocks(body) {
  return [...body.children].filter((node) =>
    /^(P|H2|H3|H4|UL|OL|BLOCKQUOTE|FIGURE|PRE|TABLE|DIV)$/i.test(node.tagName) &&
    !node.classList.contains('ad-slot')
  );
}

function setupEntry() {
  const body = document.querySelector('[data-entry-body]');
  if (!body) return false;

  const blocks = articleBlocks(body);
  // Put the primary ad after the midpoint content block. This fixes the old
  // first-paragraph placement, which often appeared above the actual story or
  // was skipped when the lead paragraph was the only early child.
  if (!body.querySelector('[data-ad-slot="inline"]')) {
    const midpoint = blocks[Math.max(0, Math.floor(blocks.length / 2) - 1)] || body.lastElementChild;
    if (midpoint) insertAfter(midpoint, frameAd(ADS.inline, 'inline'));
  }

  const aside = document.querySelector('.article__aside');
  if (aside && !aside.querySelector('[data-ad-slot="tall-rail"]')) {
    aside.append(frameAd(ADS.tallRail, 'tall-rail'));
  }
  if (aside && !aside.querySelector('[data-ad-slot="medium-rail"]')) {
    aside.append(frameAd(ADS.mediumRail, 'medium-rail'));
  }

  if (!body.querySelector('[data-ad-slot="mobile"]')) body.append(frameAd(ADS.mobile, 'mobile'));
  if (!body.querySelector('[data-ad-slot="tablet"]')) body.append(frameAd(ADS.tablet, 'tablet'));
  if (!body.querySelector('[data-ad-slot="native"]')) body.append(nativeAd());
  if (!body.querySelector('[data-ad-slot="smartlink"]')) body.append(smartlinkAd());
  return Boolean(body.querySelector('.ad-slot') || aside?.querySelector('.ad-slot'));
}

function setupListing() {
  const grid = document.querySelector('[data-category-items], [data-gallery-grid]');
  if (!grid) return false;
  const section = grid.closest('section') || grid.parentElement;
  if (!section || section.parentElement?.querySelector(':scope > .ad-slot')) return true;

  insertAfter(section, frameAd(ADS.leaderboard, 'leaderboard'));
  insertAfter(section.nextElementSibling || section, frameAd(ADS.tablet, 'tablet'));
  insertAfter(section.nextElementSibling?.nextElementSibling || section, frameAd(ADS.mobile, 'mobile'));
  insertAfter(section.nextElementSibling?.nextElementSibling?.nextElementSibling || section, nativeAd());
  return true;
}

function setupStaticPage() {
  const article = document.querySelector('.article');
  const main = document.querySelector('main');
  if (!main || !article) return false;
  if (article.parentElement?.querySelector(':scope > .ad-slot')) return true;
  insertAfter(article, frameAd(ADS.tablet, 'tablet'));
  insertAfter(article.nextElementSibling || article, frameAd(ADS.mobile, 'mobile'));
  insertAfter(article.nextElementSibling?.nextElementSibling || article, nativeAd());
  insertAfter(article.nextElementSibling?.nextElementSibling?.nextElementSibling || article, smartlinkAd());
  return true;
}

function initAds() {
  if (isExcluded() || document.documentElement.dataset.adsReady) return true;
  const placed = setupEntry() || setupListing() || setupStaticPage();
  if (placed) document.documentElement.dataset.adsReady = 'true';
  return placed;
}

function scheduleAds() {
  if (isExcluded() || document.documentElement.dataset.adsReady) return;
  idle(initAds);
}

if (!isExcluded()) {
  document.addEventListener('DOMContentLoaded', scheduleAds, { once: true });
  window.addEventListener('load', scheduleAds, { once: true });
  const observer = new MutationObserver(() => {
    if (initAds()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  scheduleAds();
}
