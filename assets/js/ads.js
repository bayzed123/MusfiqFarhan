/*
 * Automatic ad placement for eligible public pages.
 * The homepage, navigation, header, footer, sitemap, admin and 404 pages
 * deliberately never instantiate an advertising tag.
 */
const ADS = {
  mediumRail: { key: '526fc12b05e03824b147ab501ebdcc6e', width: 160, height: 300 },
  tallRail: { key: '2af700860e9cb041351b895af5acc1a1', width: 160, height: 600 },
  inline: { key: 'dec8e7c5a6013e2a549acf5343f56664', width: 300, height: 250 },
  mobile: { key: 'cc12dcdbe4d4a8991416d88fa8d39fc0', width: 320, height: 50 },
  tablet: { key: 'd8c7eedc100db2e87e8220ccb8c86c70', width: 468, height: 60 },
  leaderboard: { key: '5eafb0abe297aa165fad81b9d9a6cc5b', width: 728, height: 90 },
  native: { key: '95ccad5ad2296df12234714b8e6904cf' }
};

const EXCLUDED = /^(?:\/$|\/404(?:\.html)?\/?$|\/admin(?:\/|$)|\/sitemap[^/]*\.xml$|\/robots\.txt$)/i;
const isExcluded = () => EXCLUDED.test(window.location.pathname);
const idle = (callback) => (window.requestIdleCallback ? window.requestIdleCallback(callback, { timeout: 1800 }) : window.setTimeout(callback, 500));

function frameAd(config, name) {
  const slot = document.createElement('aside');
  slot.className = `ad-slot ad-slot--${name}`;
  slot.dataset.adFormat = `${config.width}x${config.height}`;
  slot.setAttribute('aria-label', 'Advertisement');
  slot.innerHTML = `<span class="ad-slot__label">Advertisement</span>`;

  const options = document.createElement('script');
  options.textContent = `window.atOptions = ${JSON.stringify({ key: config.key, format: 'iframe', height: config.height, width: config.width, params: {} })};`;
  const invoke = document.createElement('script');
  invoke.src = `https://www.highrevenueformat.com/${config.key}/invoke.js`;
  invoke.async = false;
  invoke.dataset.adNetwork = 'highrevenueformat';
  slot.append(options, invoke);
  return slot;
}

function nativeAd() {
  const slot = document.createElement('aside');
  slot.className = 'ad-slot ad-slot--native';
  slot.dataset.adFormat = 'native';
  slot.setAttribute('aria-label', 'Advertisement');
  slot.innerHTML = `<span class="ad-slot__label">Advertisement</span><div id="ad-native-${Math.random().toString(36).slice(2)}"></div>`;
  const container = slot.querySelector('div');
  const script = document.createElement('script');
  script.async = true;
  script.dataset.cfasync = 'false';
  script.src = `https://pl30964228.profitableratecpmnetwork.com/${ADS.native.key}/invoke.js`;
  container.appendChild(script);
  return slot;
}

function insertAfter(node, ad) {
  if (node?.parentNode) node.parentNode.insertBefore(ad, node.nextSibling);
}

function insertBefore(node, ad) {
  if (node?.parentNode) node.parentNode.insertBefore(ad, node);
}

function setupEntry() {
  const body = document.querySelector('[data-entry-body]');
  if (!body) return false;
  const firstBreak = body.querySelector('p, h2, h3');
  if (!body.querySelector('.ad-slot--inline')) {
    insertAfter(firstBreak || body.firstElementChild || body, frameAd(ADS.inline, 'inline'));
  }
  const aside = document.querySelector('.article__aside');
  if (aside && !aside.querySelector('.ad-slot--tall-rail')) aside.append(frameAd(ADS.tallRail, 'tall-rail'));
  if (aside && !aside.querySelector('.ad-slot--medium-rail')) aside.append(frameAd(ADS.mediumRail, 'medium-rail'));
  if (!body.querySelector('.ad-slot--mobile')) body.append(frameAd(ADS.mobile, 'mobile'));
  if (!body.querySelector('.ad-slot--tablet')) body.append(frameAd(ADS.tablet, 'tablet'));
  if (!body.querySelector('.ad-slot--native')) body.append(nativeAd());
  return Boolean(body.querySelector('.ad-slot') || aside?.querySelector('.ad-slot'));
}

function setupListing() {
  const grid = document.querySelector('[data-category-items], [data-gallery-grid]');
  if (!grid) return false;
  if (grid.closest('section')?.parentElement?.querySelector('.ad-slot')) return true;
  const section = grid.closest('section') || grid.parentElement;
  insertAfter(section, frameAd(ADS.leaderboard, 'leaderboard'));
  insertAfter(section?.nextElementSibling || section, frameAd(ADS.tablet, 'tablet'));
  insertAfter(section?.nextElementSibling?.nextElementSibling || section, frameAd(ADS.mobile, 'mobile'));
  insertAfter(section?.nextElementSibling?.nextElementSibling?.nextElementSibling || section, nativeAd());
  return true;
}

function setupStaticPage() {
  const article = document.querySelector('.article');
  const main = document.querySelector('main');
  if (!main || !article) return false;
  if (article.parentElement?.querySelector('.ad-slot')) return true;
  insertAfter(article, frameAd(ADS.tablet, 'tablet'));
  insertAfter(article.nextElementSibling || article, frameAd(ADS.mobile, 'mobile'));
  insertAfter(article.nextElementSibling?.nextElementSibling || article, nativeAd());
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
