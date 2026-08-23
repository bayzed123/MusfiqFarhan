import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { CATEGORIES, canonicalPair, categorySlug, isMirrorPair } from '../shared/taxonomy.js';
import { categoryListingPath, categoryPath, categoryUrl, STATIC_PATHS } from '../shared/urls.js';
/**
 * Item pages, picked out of the sitemap. The hand-written pages are excluded
 * by consulting STATIC_PATHS rather than a list kept here — adding a page
 * used to make it look like a published post to every item-page test.
 */
const STATIC_PAGE_PATHS = new Set(Object.values(STATIC_PATHS));

function itemPathsFrom(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].replace('https://www.musfiqrfarhan.blog', ''))
    .filter((path) => path.endsWith('/') && path !== '/')
    .filter((path) => !path.startsWith('/c/'))
    .filter((path) => !STATIC_PAGE_PATHS.has(path));
}


const CATEGORY_SLUGS = [
  'premium',
  'gallery',
  'poster-release',
  'behind-the-scenes',
  'new-teaser',
  'new-natok',
  'short-clips',
  'blog',
  'press',
  'lifestyle-fashion',
  'wallpapers',
  'biography-journey',
  'natok-telefilm',
  'recent-releases',
  'popular',
  'eid-special'
];

/**
 * Keep the suite hermetic: nothing here depends on a third-party host, and a
 * slow or unreachable font CDN must not be able to stall a navigation.
 * Route handlers registered later take precedence, so per-test API mocks
 * still win over this catch-all.
 */
test.beforeEach(async ({ page, baseURL }) => {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    const isLocal = url.startsWith(baseURL) || url.startsWith('data:') || url.startsWith('blob:');
    return isLocal ? route.continue() : route.abort();
  });
});

test.describe('public site', () => {
  test('homepage carries the hero, poster strip and full navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/Musfiq R\. Farhan/);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('[data-hero]')).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://www.musfiqrfarhan.blog/'
    );

    // The poster strip must sit between the hero and the first category rail.
    const order = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('[data-hero], [data-posters], [data-rails]')];
      return nodes.map((node) =>
        node.hasAttribute('data-hero') ? 'hero' : node.hasAttribute('data-posters') ? 'posters' : 'rails'
      );
    });
    expect(order).toEqual(['hero', 'posters', 'rails']);
  });

  test('navigation is in the HTML source, not injected by script', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain('class="primary-nav"');
    for (const category of CATEGORIES) {
      // Gallery and Blog link to their hubs, every other category to its
      // /c/ listing — one destination per section, whichever menu you use.
      const href = categoryPath(category.name);
      expect(html, `nav is missing ${href}`).toContain(`href="${href}"`);
    }
  });

  test('every category and subcategory has its own landing page', async ({ request }) => {
    for (const slug of CATEGORY_SLUGS) {
      const response = await request.get(`/c/${slug}/`);
      expect(response.ok(), `/c/${slug}/`).toBeTruthy();
      const html = await response.text();
      // Gallery and Blog have hubs, so their /c/ listing names the hub as
      // canonical instead of itself.
      const canonical = categoryUrl(slug);
      expect(html).toContain(`<link rel="canonical" href="${canonical}">`);
    }
    for (const path of ['/c/new-natok/eid-special/', '/c/gallery/portraits/', '/c/blog/biography-journey/']) {
      const response = await request.get(path);
      expect(response.ok(), path).toBeTruthy();
    }
  });

  /**
   * Every page the taxonomy promises has to be a real page, not a 404 and not
   * an empty shell. This walks all sixteen categories and each of their
   * subcategories rather than spot-checking three of them.
   */
  test('every taxonomy page renders a heading, its chips and an item grid', async ({ request }) => {
    for (const category of CATEGORIES) {
      const targets = ['', ...category.subcategories];
      for (const sub of targets) {
        // Always exercise the generated /c/ listing; the hub pages for
        // Gallery and Blog are covered by their own tests.
        const path = categoryListingPath(category.name, sub);
        const response = await request.get(path);
        expect(response.ok(), `${path} must resolve`).toBeTruthy();

        const html = await response.text();
        expect(html, `${path} heading`).toContain(`<h1>${sub || category.name}`.replace('&', '&amp;'));
        expect(html, `${path} item grid`).toContain('data-category-items');
        expect(html, `${path} subcategory chips`).toContain('chip-row');
        expect(html, `${path} loads the category controller`).toContain('/assets/js/category.js');
      }
    }
  });

  /**
   * Nine of the sixteen names are both a category and someone else's
   * subcategory. A post filed New Natok / Eid Special belongs on both
   * listings; matching only the primary category left the second one empty.
   */
  test('a cross-tagged post appears on both of its sections', async ({ request }) => {
    const natok = await (await request.get('/c/new-natok/')).text();
    const eid = await (await request.get('/c/eid-special/')).text();
    test.skip(!natok.includes('Tor Preme Pagol'), 'the fixture natok is not part of this build');

    expect(eid, 'the Eid Special listing must carry the natok filed under it').toContain(
      'Tor Preme Pagol'
    );
    expect(eid).not.toContain('Nothing published in this category yet');
  });

  /**
   * Where two categories list each other, both URLs describe the same set.
   * Both stay reachable, but only one is indexed.
   */
  test('mirrored category urls point at one canonical page', async ({ request }) => {
    let checked = 0;
    for (const category of CATEGORIES) {
      for (const sub of category.subcategories) {
        const path = categoryListingPath(category.name, sub);
        const html = await (await request.get(path)).text();
        const owner = canonicalPair(category.name, sub);

        if (isMirrorPair(category.name, sub)) {
          const target = `https://www.musfiqrfarhan.blog${categoryPath(owner.category, owner.subcategory)}`;
          expect(html, `${path} must not be indexed`).toContain('content="noindex,follow"');
          expect(html, `${path} canonical`).toContain(`<link rel="canonical" href="${target}">`);
          checked += 1;
        } else {
          expect(html, `${path} must be indexable`).toContain('content="index,follow');
        }
      }
    }
    expect(checked, 'five pairs list each other').toBe(5);
  });

  test('the four hubs are plain links and Categories is the only menu', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The destinations people actually want should navigate on one tap.
    for (const [label, href] of [
      ['Watch', '/watch/'],
      ['Blog', '/blog/'],
      ['Gallery', '/gallery/'],
      ['Love notes', '/love-notes/']
    ]) {
      await expect(page.locator(`.primary-nav a.nav-link:text-is("${label}")`)).toHaveAttribute(
        'href',
        href
      );
    }
    // Exactly one dropdown, so nothing is named twice in the bar.
    await expect(page.locator('.primary-nav [data-nav-item]')).toHaveCount(1);
    await page.locator('.primary-nav button.nav-link').click();
    await expect(page.locator('.nav-item.is-open .mega')).toBeVisible();
  });

  test('the watch hub lists videos and plays one without leaving the page', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/watch/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Watch');
    await expect(page.locator('[data-watch-filters] .chip')).not.toHaveCount(0);
    const cards = page.locator('.vcard');
    await expect(cards).not.toHaveCount(0);

    // The player is closed until a poster is tapped: no third-party frame on load.
    await expect(page.locator('[data-watch-stage]')).toBeHidden();
    await page.locator('[data-play]').first().click();
    await expect(page.locator('[data-watch-stage]')).toBeVisible();
    await expect(page.locator('.stage__frame video, .stage__frame iframe')).toHaveCount(1);
    await expect(page).toHaveURL(/\/watch\/$/);

    await page.locator('[data-stage-close]').click();
    await expect(page.locator('[data-watch-stage]')).toBeHidden();
  });

  test('a watch filter narrows the grid', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/watch/', { waitUntil: 'domcontentloaded' });
    const all = await page.locator('.vcard').count();
    await page.locator('[data-watch-filters] .chip', { hasText: 'Teasers' }).click();
    await expect(page.locator('[data-watch-filters] .chip.is-active')).toHaveText('Teasers');
    expect(await page.locator('.vcard').count()).toBeLessThanOrEqual(all);
  });

  test('the blog hub lists articles separately from video', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/blog/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Blog');
    await expect(page.locator('[data-blog-filters] .chip')).not.toHaveCount(0);
    await expect(page.locator('.post-row')).not.toHaveCount(0);
    // Every row links to its own page.
    await expect(page.locator('.post-row__title a').first()).toHaveAttribute('href', /^\/.+\/$/);
    await expect(page.locator('.vcard')).toHaveCount(0);
  });

  test('the mobile drawer opens and expands a category', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 780 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-drawer-open]').click();
    await expect(page.locator('[data-drawer]')).toHaveClass(/is-open/);
    await page.locator('.accordion__trigger').first().click();
    await expect(page.locator('.accordion__panel').first()).toBeVisible();
  });

  test('no page scrolls sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    for (const path of ['/', '/watch/', '/blog/', '/c/new-natok/', '/gallery/', '/love-notes/']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 2
      );
      expect(overflows, `${path} overflows horizontally`).toBeFalsy();
    }
  });

  test('the love-note page offers the form and the wall', async ({ page }) => {
    await page.goto('/love-notes/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-note-form]')).toBeVisible();
    await expect(page.locator('#note-name')).toBeVisible();
    await expect(page.locator('#note-message')).toBeVisible();
    await expect(page.locator('[data-note-wall]')).toBeVisible();
    await expect(page.locator('[data-note-total]')).toBeVisible();
  });

  test('the home page carries the fan love notes, not just the ticker', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const section = page.locator('[data-home-notes]');
    await expect(section).toBeVisible();
    await expect(section.locator('.note')).not.toHaveCount(0);
    // The count and the way through to the wall both have to be there.
    await expect(section.getByRole('link', { name: /read them all/i })).toHaveAttribute(
      'href',
      '/love-notes/'
    );
    await expect(section.getByRole('link', { name: /write your own love note/i })).toBeVisible();
  });

  test('the love-note ticker is present on every page', async ({ page }) => {
    for (const path of ['/', '/c/blog/', '/gallery/', '/about.html']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-love-strip]'), path).toBeVisible();
    }
  });

  /**
   * The reference profile borrows the encyclopedia layout readers know, but
   * must never read as an encyclopedia's own article about him — it is his
   * site writing about him.
   */
  test('the profile page reads as a reference page and says whose it is', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/wikipedia/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('h1.wiki__title')).toHaveText('Musfiq R. Farhan');
    await expect(page.locator('.infobox')).toBeVisible();
    await expect(page.locator('.wiki-toc')).toBeVisible();
    await expect(page.locator('#references')).toBeVisible();

    // It says plainly who maintains it, and carries no borrowed identity.
    await expect(page.locator('.wiki__tagline')).toContainText(/official Musfiq R. Farhan website/i);
    const html = await page.content();
    expect(html, 'no encyclopedia branding').not.toMatch(/wikipedia\.org|wikimedia|free encyclopedia/i);

    // The works table is generated from the site's own archive.
    await expect(page.locator('[data-wiki-works] tbody tr')).not.toHaveCount(0);
    await expect(page.locator('[data-wiki-works]')).not.toContainText('Loading the published archive');
  });

  /**
   * This one page is deliberately standalone — no site navigation, no site
   * footer, and none of the site stylesheet — so it reads as a reference
   * page rather than as another screen of the site.
   */
  test('the profile page carries no site chrome', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/wikipedia/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('.site-header')).toHaveCount(0);
    await expect(page.locator('.primary-nav')).toHaveCount(0);
    await expect(page.locator('.site-footer')).toHaveCount(0);
    await expect(page.locator('.love-strip')).toHaveCount(0);
    await expect(page.locator('.cta-band')).toHaveCount(0);
    await expect(page.locator('link[href="/assets/css/site.css"]')).toHaveCount(0);

    // A page with no way back to the site it belongs to is a dead end.
    await expect(page.locator('.wiki-colophon a[href="/"]')).toBeVisible();
  });

  /**
   * Search Console reported the profile page as "available to Google, but has
   * issues": its works list typed every video row as a VideoObject with no
   * description, thumbnail or upload date, for videos that play on their own
   * pages and not on this one. The ProfilePage also still named the /wiki/
   * address the page was drafted at.
   */
  test('the profile schema names this url and claims no video of its own', async ({ page }) => {
    await mockPublicApi(page);
    await page.goto('/wikipedia/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-wiki-works] tbody tr').first()).toBeVisible();

    const blocks = await page.$$eval('script[type="application/ld+json"]', (nodes) =>
      nodes.map((node) => node.textContent)
    );
    const profile = blocks.map((block) => JSON.parse(block)).find((json) => json['@type'] === 'ProfilePage');
    expect(profile, 'the profile page emits ProfilePage schema').toBeTruthy();

    const canonical = 'https://www.musfiqrfarhan.blog/wikipedia/';
    expect(profile.url).toBe(canonical);
    expect(profile['@id']).toBe(`${canonical}#profile`);

    // The fixture holds two video titles, so this would catch the old typing.
    const works = profile.mainEntity.performerIn;
    expect(works.length).toBeGreaterThan(1);
    expect(works.map((work) => work['@type'])).toEqual(works.map(() => 'CreativeWork'));
    expect(JSON.stringify(blocks), 'no video is declared on a page with no video').not.toContain(
      'VideoObject'
    );
  });

  test('the profile page is linked from the footer and listed in the sitemap', async ({
    page,
    request
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.site-footer a[href="/wikipedia/"]')).toBeVisible();

    const xml = await (await request.get('/sitemap.xml')).text();
    expect(xml).toContain('https://www.musfiqrfarhan.blog/wikipedia/');
  });

  test('the capitalised url reaches the same page', async ({ page, request }) => {
    // URLs here are case-sensitive, so /Wikipedia/ is a separate address and
    // would otherwise 404. It redirects, and stays out of the index.
    const response = await request.get('/Wikipedia/');
    expect(response.ok(), '/Wikipedia/ must resolve').toBeTruthy();
    const html = await response.text();
    expect(html).toContain('<link rel="canonical" href="https://www.musfiqrfarhan.blog/wikipedia/">');
    expect(html).toMatch(/content="noindex/);

    await page.goto('/Wikipedia/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/wikipedia/');
    await expect(page.locator('h1.wiki__title')).toHaveText('Musfiq R. Farhan');
  });

  test('the WhatsApp channel call to action is in the footer area', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const cta = page.locator('.cta-band a[href*="whatsapp.com/channel"]');
    await expect(cta).toBeVisible();
    await expect(page.locator('.site-footer a[href*="whatsapp.com/channel"]')).toHaveCount(1);
  });

  test('site-wide structured data describes the person, org and site', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent || '').join(' '));
    for (const type of ['"Person"', '"Organization"', '"WebSite"', 'musfiqrfarhan.blog/#person']) {
      expect(blocks).toContain(type);
    }
  });

  test('legal, crawl and feed routes all resolve', async ({ request }) => {
    const routes = [
      '/about.html',
      '/contact.html',
      '/privacy-policy.html',
      '/editorial-standards.html',
      '/terms-of-service.html',
      '/watch/',
      '/blog/',
      '/gallery/',
      '/love-notes/',
      '/robots.txt',
      '/sitemap.xml'
    ];
    for (const route of routes) {
      const response = await request.get(route);
      expect(response.ok(), route).toBeTruthy();
    }
  });

  test('one sitemap at the root holds every url', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    // A single <urlset>, not an index that farms the URLs out to other files.
    expect(xml).toContain('<urlset');
    expect(xml).not.toContain('<sitemapindex');
    expect(xml).toContain('https://www.musfiqrfarhan.blog/');
    expect(xml).toContain('https://www.musfiqrfarhan.blog/watch/');
    expect(xml).toContain('https://www.musfiqrfarhan.blog/blog/');
    expect(xml).toContain('https://www.musfiqrfarhan.blog/c/new-natok/');
    // Images and videos ride along in the same document.
    expect(xml).toContain('sitemap-image/1.1');
    expect(xml).toContain('sitemap-video/1.1');
    expect(xml).toContain('<image:loc>');
    expect(xml).toContain('<video:content_loc>');

    // The split files a previous build wrote must be gone, so Search Console
    // is not left following dead references.
    for (const stale of [
      '/sitemap-pages.xml',
      '/sitemap-categories.xml',
      '/sitemap-content.xml',
      '/sitemap-images.xml'
    ]) {
      expect((await request.get(stale)).status(), stale).toBe(404);
    }
  });

  test('robots.txt keeps the dashboard out of the index and names the sitemap', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toContain('Disallow: /admin/');
    expect(body).toContain('Sitemap: https://www.musfiqrfarhan.blog/sitemap.xml');
  });

  test('the mark and the full name open and close every page', async ({ page }) => {
    await page.goto('/');

    const header = page.locator('.site-header .brand__mark');
    const footer = page.locator('.site-footer .footer-brand img');
    for (const mark of [header, footer]) {
      await expect(mark).toHaveAttribute('src', '/assets/mrf-mark.svg');
      // A missing file still lays out at the width/height attributes, so the
      // only way to know the mark actually arrived is to ask the decoder.
      expect(await mark.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
    }

    await expect(page.locator('.site-header .brand__name')).toHaveText('MUSFIQ R. FARHAN');
    await expect(page.locator('.site-footer .footer-brand__name')).toHaveText('MUSFIQ R. FARHAN');
  });

  test('images declare dimensions so the layout does not jump', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const missing = await page.$$eval('main img, header img', (nodes) =>
      nodes
        .filter((node) => !node.getAttribute('width') || !node.getAttribute('height'))
        .map((node) => node.getAttribute('src'))
    );
    expect(missing, `images without width/height: ${missing.join(', ')}`).toHaveLength(0);
  });

  test('no page reports a script error', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const path of ['/', '/watch/', '/blog/', '/c/new-natok/', '/gallery/', '/404.html']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
    }
    expect(errors).toEqual([]);
  });
});

/**
 * Item pages are discovered from the generated sitemap rather than hardcoded,
 * so these run against the fixture build locally and against real published
 * content in CI without changing.
 */
test.describe('published item pages', () => {
  /** @returns {Promise<string[]>} site-relative paths of every indexed item */
  async function itemPaths(request) {
    return itemPathsFrom(await (await request.get('/sitemap.xml')).text());
  }

  test('every item page carries its own canonical, meta and social tags', async ({ request }) => {
    const paths = await itemPaths(request);
    expect(
      paths.length,
      'No item pages were built. In CI this means the API returned no published content; ' +
        'locally, run `npm run verify` to build from scripts/fixtures/sample-export.json.'
    ).toBeGreaterThan(0);

    const seenCanonicals = new Set();
    for (const path of paths) {
      const response = await request.get(path);
      expect(response.ok(), `${path} did not resolve`).toBeTruthy();
      const html = await response.text();

      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(canonical, `${path} has no canonical tag`).toBe(
        `https://www.musfiqrfarhan.blog${path}`
      );
      // A canonical repeated across pages would collapse them in search.
      expect(seenCanonicals.has(canonical), `${canonical} is used by more than one page`).toBeFalsy();
      seenCanonicals.add(canonical);

      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
      expect(description.length, `${path} has no meta description`).toBeGreaterThan(20);

      for (const tag of ['og:title', 'og:description', 'og:image', 'og:url']) {
        expect(html, `${path} is missing ${tag}`).toContain(`property="${tag}"`);
      }
      expect(html, `${path} is missing a Twitter card`).toContain('name="twitter:card"');
      expect(html, `${path} is missing an author`).toContain('name="author"');
    }
  });

  test('every item page mounts the rating and note form', async ({ page, request }) => {
    for (const path of await itemPaths(request)) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const mount = page.locator('[data-rating]');
      await expect(mount, `${path} has no rating widget`).toHaveCount(1);
      // The widget renders its own form, so the name and note inputs must
      // exist on the page a visitor actually lands on.
      await expect(page.locator('[data-rating-form]'), `${path} has no rating form`).toBeVisible();
      await expect(page.locator('[data-rating-form] input[name="name"]')).toBeVisible();
      await expect(page.locator('[data-rating-form] textarea[name="body"]')).toBeVisible();
      await expect(page.locator('[data-rating-form] .star-input input[name="rating"]')).toHaveCount(5);
    }
  });

  test('item pages sit under their category and link back to it', async ({ page, request }) => {
    for (const path of await itemPaths(request)) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const category = await page.evaluate(() => document.body.dataset.category);
      expect(category, `${path} declares no category`).toBeTruthy();

      // The breadcrumb points at the category's canonical URL, which is the
      // hub for Gallery and Blog and the /c/ listing for the rest — the same
      // destination every other link on the site uses.
      const expected = categoryPath(category);
      const crumb = page.locator(`.breadcrumb a[href="${expected}"]`);
      await expect(crumb, `${path} has no breadcrumb to ${expected}`).toHaveCount(1);

      // The URL's first segment is the category slug, so the two must agree.
      expect(categorySlug(category), `${path} sits outside its category`).toBe(
        path.split('/').filter(Boolean)[0]
      );
    }
  });

  test('article bodies render as HTML, not raw markdown', async ({ request }) => {
    for (const path of await itemPaths(request)) {
      const html = await (await request.get(path)).text();
      const body = html.match(/<div class="article__body"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
      // A heading written directly above its paragraph must still become a
      // heading; leaving "##" visible is the symptom when it does not.
      expect(body, `${path} shows a raw markdown heading`).not.toMatch(/^\s*#{2,}\s/m);
      expect(body, `${path} shows a raw markdown list item`).not.toMatch(/^\s*-\s\w/m);
    }
  });

  test('the rating form still mounts when the content API is unavailable', async ({ page, request }) => {
    const [first] = await itemPaths(request);
    test.skip(!first, 'no item pages in this build');
    // The page is pre-rendered, so a failing content fetch must not cost the
    // visitor the rating form — it reads a separate endpoint.
    await page.route('**/api/public/content/**', (route) => route.abort());
    await page.goto(first, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-rating-form]')).toBeVisible();
  });

  test('a non-indexable item says noindex in the HTML, not just from script', async ({ request }) => {
    const response = await request.get('/press/press-feature-noindex/');
    test.skip(!response.ok(), 'the non-indexable fixture item is not part of this build');
    const html = await response.text();
    expect(html).toMatch(/<meta name="robots" content="noindex/);
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap, 'a noindex page must stay out of the sitemap').not.toContain(
      'press-feature-noindex'
    );
  });

  /**
   * Every post carries a share button; the sheet behind it must hand out the
   * page's canonical URL, not whatever address the visitor arrived on.
   */
  test('every item page can be shared to the networks people use', async ({ page, request }) => {
    const paths = await itemPaths(request);
    test.skip(!paths.length, 'this build has no published posts');

    const path = paths[0];
    await page.goto(path, { waitUntil: 'domcontentloaded' });

    // The host is in the HTML source; the button is filled in by the module.
    const button = page.locator('[data-share] [data-share-open]');
    await expect(button).toBeVisible();

    // navigator.share exists in some browsers and would swallow the click,
    // so make sure the in-page sheet is what this exercises.
    await page.evaluate(() => {
      delete Object.getPrototypeOf(navigator).share;
      // eslint-disable-next-line no-param-reassign
      navigator.share = undefined;
    });
    await button.click();

    const sheet = page.locator('[data-share-sheet]');
    await expect(sheet).toBeVisible();

    const canonical = `https://www.musfiqrfarhan.blog${path}`;
    const encoded = encodeURIComponent(canonical);

    for (const [network, pattern] of [
      ['facebook', `facebook.com/sharer/sharer.php?u=${encoded}`],
      ['whatsapp', `api.whatsapp.com/send?text=`],
      ['telegram', `t.me/share/url?url=${encoded}`],
      ['x', `twitter.com/intent/tweet?url=${encoded}`],
      ['linkedin', `linkedin.com/sharing/share-offsite/?url=${encoded}`],
      ['reddit', `reddit.com/submit?url=${encoded}`],
      ['pinterest', `pinterest.com/pin/create/button/?url=${encoded}`],
      ['email', 'mailto:?subject=']
    ]) {
      const link = sheet.locator(`[data-share-to="${network}"]`);
      await expect(link, `${network} is offered`).toBeVisible();
      expect(await link.getAttribute('href'), `${network} link`).toContain(pattern);
    }

    // Each one opens away from the site rather than replacing the post.
    await expect(sheet.locator('[data-share-to="facebook"]')).toHaveAttribute('target', '_blank');
    await expect(sheet.locator('[data-share-to="facebook"]')).toHaveAttribute(
      'rel',
      /noopener/
    );

    // The copy field carries the canonical URL too.
    await expect(sheet.locator('[data-share-url]')).toHaveValue(canonical);

    // Escape closes it.
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
  });

  test('the share links carry the canonical url even with tracking params', async ({
    page,
    request
  }) => {
    const paths = await itemPaths(request);
    test.skip(!paths.length, 'this build has no published posts');

    // Arriving from Facebook appends ?fbclid=…; sharing on must not pass that
    // along, or the link that spreads is a tracking URL rather than the post.
    await page.goto(`${paths[0]}?fbclid=abc123`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      navigator.share = undefined;
    });
    await page.locator('[data-share] [data-share-open]').click();

    const href = await page
      .locator('[data-share-to="facebook"]')
      .getAttribute('href');
    expect(href).not.toContain('fbclid');
    expect(href).toContain(encodeURIComponent(`https://www.musfiqrfarhan.blog${paths[0]}`));
  });

  test('a hosted video page offers a real player source', async ({ request }) => {
    const response = await request.get('/new-natok/tor-preme-pagol/');
    test.skip(!response.ok(), 'the hosted-video fixture item is not part of this build');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    // The R2-hosted natok must reach the video sitemap as a content_loc,
    // which is the case that used to fail validation entirely.
    expect(sitemap).toContain('<video:content_loc>');
    expect(sitemap).toContain('<video:thumbnail_loc>');
  });

  /**
   * Google drops a video from the index outright when a required field is
   * missing, and its report names the field. Every one of these was reported
   * missing at some point, so every one is asserted rather than sampled.
   */
  test('every video declares the fields Google requires to index it', async ({ request }) => {
    const paths = await itemPaths(request);
    test.skip(!paths.length, 'this build has no published posts');

    let checked = 0;
    for (const path of paths) {
      const html = await (await request.get(path)).text();
      const videos = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
        .flatMap((match) => {
          const parsed = JSON.parse(match[1]);
          return parsed['@graph'] || [parsed];
        })
        .filter((node) => node['@type'] === 'VideoObject');

      for (const video of videos) {
        checked += 1;
        for (const field of ['name', 'description', 'uploadDate']) {
          expect(String(video[field] || ''), `${path} · ${field}`).not.toBe('');
        }
        expect(video.thumbnailUrl?.[0], `${path} · thumbnailUrl`).toMatch(/^https:\/\//);
        expect(new Date(video.uploadDate).toString(), `${path} · uploadDate parses`).not.toBe(
          'Invalid Date'
        );

        // A watch page is not a media file. Sending one as contentUrl is the
        // kind of wrong that reads as valid until the crawler fetches it.
        if (video.contentUrl) {
          expect(video.contentUrl, `${path} · contentUrl is a media file`).toMatch(
            /\.(mp4|webm|m4v|mov|ogv)(\?|#|$)/i
          );
        }
        expect(
          Boolean(video.contentUrl || video.embedUrl),
          `${path} · has somewhere to play`
        ).toBe(true);

        // "42:10" is what an editor types and what Google rejects.
        if (video.duration) expect(video.duration, `${path} · duration`).toMatch(/^PT\d/);

        // Originally published here, and the markup says so.
        expect(video.license, `${path} · license`).toContain('/terms-of-service.html');
        expect(video.acquireLicensePage, `${path} · acquireLicensePage`).toContain('/contact.html');
        expect(video.copyrightHolder, `${path} · copyrightHolder`).toBeTruthy();
        expect(video.creator, `${path} · creator`).toBeTruthy();
        expect(video.publisher, `${path} · publisher`).toBeTruthy();
      }
    }
    expect(checked, 'at least one video page was checked').toBeGreaterThan(0);
  });

  test('the video sitemap entries are complete and point at a real player', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const blocks = [...xml.matchAll(/<video:video>(.*?)<\/video:video>/gs)].map((match) => match[1]);
    test.skip(!blocks.length, 'this build has no published videos');

    for (const block of blocks) {
      const value = (tag) => block.match(new RegExp(`<video:${tag}>([^<]*)</video:${tag}>`))?.[1] || '';
      expect(value('thumbnail_loc'), 'thumbnail_loc').toMatch(/^https:\/\//);
      expect(value('title'), 'title').not.toBe('');
      expect(value('description'), 'description').not.toBe('');
      expect(
        Boolean(value('content_loc') || value('player_loc')),
        'content_loc or player_loc'
      ).toBe(true);
      expect(value('publication_date'), 'publication_date').not.toBe('');
      expect(block, 'uploader').toContain('<video:uploader');
    }
  });

  /**
   * The page is served pre-rendered and then re-rendered from the API. If the
   * two disagree about a video, whichever Google saw last is the one it keeps.
   */
  test('the rendered video schema matches the pre-rendered one', async ({ page, request }) => {
    const path = '/new-teaser/doob-official-teaser/';
    const response = await request.get(path);
    test.skip(!response.ok(), 'the embed-video fixture item is not part of this build');

    const readVideo = (html) =>
      [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
        .flatMap((match) => {
          const parsed = JSON.parse(match[1]);
          return parsed['@graph'] || [parsed];
        })
        .find((node) => node['@type'] === 'VideoObject');

    const prerendered = readVideo(await response.text());

    await mockPublicApi(page);
    await page.goto(path, { waitUntil: 'networkidle' });
    const rendered = readVideo(
      await page.evaluate(() =>
        [...document.querySelectorAll('script[type="application/ld+json"]')]
          .map((node) => `<script type="application/ld+json">${node.textContent}</script>`)
          .join('')
      )
    );

    expect(rendered).toBeTruthy();
    for (const field of ['@id', 'thumbnailUrl', 'uploadDate', 'duration', 'embedUrl', 'license']) {
      expect(rendered[field], field).toEqual(prerendered[field]);
    }
  });
});

/**
 * Ad units are injected by assets/js/ads.js rather than written into any
 * page, so new posts pick them up with no extra work. These guard the two
 * things that silently break: the units not appearing where they should, and
 * a unit appearing where it must not.
 */
test.describe('advertising', () => {
  /** Stub the two Adsterra hosts so nothing leaves the machine. */
  async function stubAdHosts(page) {
    await page.route('**://*.highrevenueformat.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    );
    await page.route('**://*.profitableratecpmnetwork.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    );
  }

  /** Load a page with ads live, scroll it, and report the slots that mounted. */
  async function slotsOn(page, path) {
    await mockPublicApi(page);
    await stubAdHosts(page);
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    });
    await page.waitForTimeout(600);
    return page.$$eval('.ad-slot', (nodes) => nodes.map((node) => node.dataset.adSlot));
  }

  /**
   * A real published post, taken from the sitemap. CI builds from the live
   * API, so a hardcoded slug is a page that may not exist there — and every
   * ad assertion then passes vacuously against a 404.
   */
  async function somePost(request) {
    return itemPathsFrom(await (await request.get('/sitemap.xml')).text())[0];
  }

  test('every post gets a middle unit without the post asking for one', async ({
    page,
    request
  }) => {
    const post = await somePost(request);
    test.skip(!post, 'this build has no published posts');
    const response = await request.get(post);
    expect(await response.text(), 'no ad markup is baked into the page').not.toContain('ad-slot');

    const slots = await slotsOn(page, post);
    expect(slots, 'a unit above the article').toContain('under-player');
    expect(slots, 'a unit in the middle of the article').toContain('in-article');
    expect(slots, 'a unit after the article').toContain('after-article');
  });

  test('the hubs, gallery and category pages carry units too', async ({ page }) => {
    expect(await slotsOn(page, '/watch/')).toEqual(
      expect.arrayContaining(['under-stage', 'after-grid'])
    );
    expect(await slotsOn(page, '/blog/')).toEqual(expect.arrayContaining(['after-list']));
    // The interleaved gallery unit only appears once there are enough images
    // to space it out, so the guaranteed one is the unit under the grid.
    expect(await slotsOn(page, '/gallery/')).toEqual(
      expect.arrayContaining(['under-gallery'])
    );
    expect(await slotsOn(page, '/c/new-natok/')).toEqual(
      expect.arrayContaining(['after-category'])
    );
  });

  test('each banner runs in its own sandboxed frame and there is one native container', async ({
    page
  }) => {
    // The watch hub is served from the fixture, so it carries both a banner
    // and a native unit whatever content the build happens to hold.
    await slotsOn(page, '/watch/');
    const frames = await page.$$eval('.ad-slot__frame', (nodes) =>
      nodes.map((node) => ({ src: node.getAttribute('src'), sandbox: node.getAttribute('sandbox') }))
    );
    expect(frames.length, 'banners are rendered').toBeGreaterThan(0);
    for (const frame of frames) {
      // Every banner reads one global window.atOptions, so each needs its own
      // document — and that document has to be on this origin. An opaque
      // srcdoc frame sends no hostname and no referrer, and the ad server
      // then has nothing to match the site against, so the slot stays blank.
      expect(frame.src, 'the banner frame is served from this site').toContain('/ads/unit.html');
      expect(frame.src, 'the frame names which unit to load').toMatch(/[?&]key=[a-f0-9]{32}/);
      expect(frame.sandbox, 'an opaque frame never fills').toContain('allow-same-origin');
    }
    // The native unit's script looks the container up by an exact id, so a
    // second one on the page would never fill.
    await expect(page.locator('#container-95ccad5ad2296df12234714b8e6904cf')).toHaveCount(1);
  });

  /**
   * The frame is the whole fix, so it gets its own test. A banner that loads
   * with no origin behind it is exactly what produced empty white boxes on
   * the live site.
   */
  test('the banner frame runs the right unit at its own size', async ({ page }) => {
    const requested = [];
    await page.route('**://*.highrevenueformat.com/**', (route) => {
      requested.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });

    // 300x250 — one of the six units this account owns.
    await page.goto('/ads/unit.html?key=dec8e7c5a6013e2a549acf5343f56664', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(400);

    // The size comes from the unit, never from the URL: Adsterra fills at the
    // dimensions the unit was created with, so any other size returns empty.
    expect(await page.evaluate(() => window.atOptions)).toEqual({
      key: 'dec8e7c5a6013e2a549acf5343f56664',
      format: 'iframe',
      width: 300,
      height: 250,
      params: {}
    });
    expect(requested.at(-1)).toBe(
      'https://www.highrevenueformat.com/dec8e7c5a6013e2a549acf5343f56664/invoke.js'
    );
  });

  test('the banner frame ignores a key this account does not own', async ({ page }) => {
    const requested = [];
    await page.route('**://*.highrevenueformat.com/**', (route) => {
      requested.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
    await page.route('**://evil.example.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    );

    // Otherwise the page would run any script a query string named, from our
    // own domain.
    await page.goto('/ads/unit.html?key=../../evil.example.com/x', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.atOptions)).toBeUndefined();
    expect(requested).toHaveLength(0);
  });

  test('the dashboard and error page stay ad-free', async ({ page }) => {
    for (const path of ['/admin/', '/404.html']) {
      await stubAdHosts(page);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      await expect(page.locator('.ad-slot'), path).toHaveCount(0);
    }
  });

  /**
   * Every post, not just the first: the body is hand-written and one long URL
   * in one article is enough to push that page sideways on a phone.
   */
  test('no ad-filled post page scrolls sideways on a phone', async ({ page, request }) => {
    const posts = itemPathsFrom(await (await request.get('/sitemap.xml')).text());
    test.skip(!posts.length, 'this build has no published posts');

    await page.setViewportSize({ width: 390, height: 780 });
    for (const post of posts) {
      await slotsOn(page, post);
      const widest = await page.evaluate(() => {
        if (document.documentElement.scrollWidth <= window.innerWidth + 2) return null;
        // Name the culprit rather than just failing, so the next person does
        // not have to go hunting for which element is too wide.
        const over = [...document.querySelectorAll('body *')]
          .filter((node) => node.getBoundingClientRect().right > window.innerWidth + 2)
          .map((node) => node.tagName.toLowerCase() + (node.className ? `.${node.className}` : ''));
        return over[0] || 'unknown element';
      });
      expect(widest, `${post} scrolls sideways (${widest})`).toBeNull();
    }
  });
});

test.describe('dashboard', () => {
  test('stays behind a noindex login gate', async ({ page }) => {
    await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('#login-user')).toBeVisible();
    await expect(page.locator('#login-pass')).toBeVisible();
    await expect(page.locator('[data-panel]')).toHaveCount(0);
  });

  test('signs in and renders every section', async ({ page }) => {
    await mockAdminApi(page);
    await signIn(page);
    for (const view of ['content', 'media', 'gallery', 'notes', 'reviews', 'seo', 'compose']) {
      await page.click(`.nav-btn[data-view="${view}"]`);
      await expect(page.locator(`[data-panel="${view}"]`)).toBeVisible();
    }
  });

  test('content can be created, edited, hidden and deleted', async ({ page }) => {
    const sent = [];
    await mockAdminApi(page, sent);
    await signIn(page);
    await page.click('.nav-btn[data-view="compose"]');

    // Create. A site-relative cover path must be accepted: type="url" would
    // fail browser validation silently and the form would never submit.
    await page.click('[data-kind="natok-teaser"]');
    await page.fill('#c-title', 'Doob Official Teaser 2026');
    await page.fill('#c-description', 'The first look at Doob, arriving this Eid with Keya Payel.');
    await page.fill('#c-image', '/assets/img/hero_red-1280.webp');
    await page.click('[data-composer-form] button[type=submit]');

    await expect
      .poll(() => sent.filter((call) => call.method === 'POST' && call.path === '/api/admin/content').length)
      .toBe(1);
    const created = sent.find((call) => call.method === 'POST' && call.path === '/api/admin/content');
    expect(created.body.category).toBe('New Teaser');
    expect(created.body.image).toBe('/assets/img/hero_red-1280.webp');
    expect(created.body.published).toBe(1);

    // "Start a new one" must clear the record id. A hidden input keeps its
    // assigned value through form.reset(), so without an explicit clear the
    // next save would overwrite the item just created.
    await page.click('[data-composer-reset]');
    await expect(page.locator('[data-composer-heading]')).toHaveText('New item');
    await page.fill('#c-title', 'A different item');
    await page.click('[data-save-draft]');
    await expect
      .poll(() => sent.filter((call) => call.method === 'POST' && call.path === '/api/admin/content').length)
      .toBe(2);
    const draft = sent
      .filter((call) => call.method === 'POST' && call.path === '/api/admin/content')
      .at(-1);
    expect(draft.body.published, 'save as draft must not publish').toBe(0);
    expect(draft.body.title).toBe('A different item');

    // Edit an existing item.
    await page.click('.nav-btn[data-view="content"]');
    await expect(page.locator('.row')).not.toHaveCount(0);
    await page.locator('.row [data-edit]').first().click();
    await expect(page.locator('[data-composer-heading]')).toContainText('Editing:');
    await expect(page.locator('#c-slug')).toHaveAttribute('readonly', '');
    await page.fill('#c-description', 'Edited from the dashboard.');
    await page.click('[data-composer-form] button[type=submit]');
    await expect.poll(() => sent.some((call) => call.method === 'PUT')).toBeTruthy();
    const updated = sent.find((call) => call.method === 'PUT');
    expect(updated.body.description).toBe('Edited from the dashboard.');
    // The id belongs in the URL only; a stringly-typed duplicate in the body
    // invites "91" !== 91 comparisons downstream.
    expect(updated.body).not.toHaveProperty('id');

    // Hide a live item, publish a draft.
    await page.click('.nav-btn[data-view="content"]');
    await expect(page.locator('.row')).not.toHaveCount(0);
    await page.locator('.row [data-toggle][data-published="1"]').first().click();
    await expect.poll(() => sent.some((call) => call.method === 'PATCH')).toBeTruthy();
    expect(sent.find((call) => call.method === 'PATCH').body.published).toBe(0);

    // Delete, and confirm that specific row leaves the list. Asserting on the
    // title rather than a row count keeps this independent of how many other
    // items the fixture happens to hold.
    await expect(page.locator('.row')).not.toHaveCount(0);
    const doomed = (await page.locator('.row .row__title').first().textContent()).trim();
    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.row [data-delete]').first().click();
    await expect.poll(() => sent.some((call) => call.method === 'DELETE')).toBeTruthy();
    await expect(page.locator('.row')).not.toHaveCount(0);
    await expect(page.locator('[data-content-rows]')).not.toContainText(doomed);
  });

  /**
   * Changing a post's picture used to mean: open the media library, copy a
   * URL, come back to the post, paste it into a text box — with nothing on
   * screen confirming which image was set.
   */
  test('a post cover image can be swapped from the post itself', async ({ page }) => {
    const sent = [];
    await mockAdminApi(page, sent);
    await signIn(page);

    await page.click('.nav-btn[data-view="content"]');
    await expect(page.locator('.row')).not.toHaveCount(0);
    await page.locator('.row [data-edit]').first().click();
    await expect(page.locator('[data-composer-heading]')).toContainText('Editing:');

    // The cover the post already has is shown, not just its URL in a box.
    const preview = page.locator('[data-cover-preview]');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('src', '/assets/img/doob-poster-828.webp');
    await expect(page.locator('[data-cover-empty]')).toBeHidden();

    // Swap it for another file already in the library.
    await page.click('[data-cover-library]');
    await expect(page.locator('.picker')).toBeVisible();
    await page.locator('[data-picker-choose="/assets/img/musfiq-profile-1-960.webp"]').click();
    await expect(page.locator('.picker')).toHaveCount(0);

    await expect(page.locator('#c-image')).toHaveValue('/assets/img/musfiq-profile-1-960.webp');
    await expect(preview).toHaveAttribute('src', '/assets/img/musfiq-profile-1-960.webp');

    // And it is the new image that gets saved.
    await page.click('[data-composer-form] button[type=submit]');
    await expect.poll(() => sent.some((call) => call.method === 'PUT')).toBeTruthy();
    expect(sent.find((call) => call.method === 'PUT').body.image).toBe(
      '/assets/img/musfiq-profile-1-960.webp'
    );
  });

  test('the cover image can be removed and the picker dismissed', async ({ page }) => {
    await mockAdminApi(page);
    await signIn(page);

    await page.click('.nav-btn[data-view="content"]');
    await expect(page.locator('.row')).not.toHaveCount(0);
    await page.locator('.row [data-edit]').first().click();

    // Escape closes the picker without changing anything.
    await page.click('[data-cover-library]');
    await expect(page.locator('.picker')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.picker')).toHaveCount(0);
    await expect(page.locator('#c-image')).toHaveValue('/assets/img/doob-poster-828.webp');

    await page.click('[data-cover-clear]');
    await expect(page.locator('#c-image')).toHaveValue('');
    await expect(page.locator('[data-cover-preview]')).toBeHidden();
    await expect(page.locator('[data-cover-empty]')).toBeVisible();
  });

  test('approving a note flips the button to Unapprove', async ({ page }) => {
    await mockAdminApi(page);
    await signIn(page);
    await page.click('.nav-btn[data-view="notes"]');

    const button = page.locator('[data-note-approve]').first();
    await expect(button).toHaveText(/Approve/);
    await expect(page.locator('.note-card .tag--draft')).toBeVisible();

    await button.click();

    // The list reloads from the API, so this only passes if the moderation
    // endpoint actually returns the approved flag it just wrote.
    await expect(page.locator('[data-note-approve]').first()).toHaveText(/Unapprove/);
    await expect(page.locator('.note-card .tag--live')).toBeVisible();
    await expect(page.locator('.note-card .tag--draft')).toHaveCount(0);
  });

  test('love notes and ratings can be moderated', async ({ page }) => {
    const sent = [];
    await mockAdminApi(page, sent);
    await signIn(page);

    await page.click('.nav-btn[data-view="notes"]');
    await expect(page.locator('.note-card')).not.toHaveCount(0);
    await page.locator('[data-note-approve]').first().click();
    await expect.poll(() => sent.some((call) => call.path.includes('/love-notes/'))).toBeTruthy();
    expect(sent.find((call) => call.path.includes('/love-notes/')).body.approved).toBe(true);

    await page.locator('[data-note-pin]').first().click();
    await expect
      .poll(() => sent.filter((call) => call.path.includes('/love-notes/')).length)
      .toBeGreaterThan(1);

    await page.click('.nav-btn[data-view="reviews"]');
    await expect(page.locator('.note-card')).not.toHaveCount(0);
    // A rating must show who left it and which page it belongs to.
    await expect(page.locator('[data-review-rows]')).toContainText('Sadia');
    await expect(page.locator('[data-review-rows]')).toContainText('tor-preme-pagol');
    await page.locator('[data-review-approve]').first().click();
    await expect.poll(() => sent.some((call) => call.path.includes('/reviews/'))).toBeTruthy();
    expect(sent.find((call) => call.path.includes('/reviews/')).body.approved).toBe(true);
  });

  test('a content kind fills in placement and SEO', async ({ page }) => {
    await mockAdminApi(page);
    await signIn(page);
    await page.click('.nav-btn[data-view="compose"]');

    await page.click('[data-kind="natok-teaser"]');
    await page.fill('#c-title', 'Doob Official Teaser 2026');
    await page.fill('#c-description', 'The first look at Doob, arriving this Eid.');

    await expect(page.locator('#c-category')).toHaveValue('New Teaser');
    await expect(page.locator('#c-subcategory')).toHaveValue('Recent Releases');
    await expect(page.locator('#c-type')).toHaveValue('video');
    await expect(page.locator('#c-slug')).toHaveValue('doob-official-teaser-2026');
    await expect(page.locator('#c-seo-title')).toHaveValue(/Doob Official Teaser 2026/);
    await expect(page.locator('#c-meta')).toHaveValue(/first look at Doob/);
    await expect(page.locator('[data-serp-url]')).toContainText('new-teaser');

    // Typing an SEO title by hand must stop the auto-fill overwriting it.
    await page.fill('#c-seo-title', 'My own title');
    await page.fill('#c-title', 'Doob Official Teaser 2026 (updated)');
    await expect(page.locator('#c-seo-title')).toHaveValue('My own title');
  });
});

/**
 * The hubs read /api/public/export. The hermetic beforeEach blocks every
 * off-origin request, so serve that one endpoint from the same fixture the
 * static build uses — the page and the build then agree on the content.
 */
async function mockPublicApi(page) {
  const fixture = JSON.parse(
    readFileSync(new URL('../scripts/fixtures/sample-export.json', import.meta.url), 'utf8')
  );
  await page.route('**/api/public/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    const slug = path.split('/').filter(Boolean).pop();
    const body = path.endsWith('/marquee')
      ? { notes: fixture.notes, count: fixture.notes.length }
      : path.endsWith('/love-notes')
        ? { notes: fixture.notes, count: fixture.notes.length, hearts: 0 }
        : path.includes('/reviews')
          ? { reviews: [], count: 0, average: 0 }
          : path.includes('/content/')
            ? {
                item: fixture.items.find((entry) => entry.slug === slug) || fixture.items[0],
                related: fixture.items.slice(0, 4)
              }
            : { items: fixture.items, gallery: fixture.gallery };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });
  });
}

/** Sign in to the dashboard. Assumes mockAdminApi() is already installed. */
async function signIn(page) {
  await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
  await page.fill('#login-user', 'admin');
  await page.fill('#login-pass', 'secret');
  await page.click('[data-login] button[type=submit]');
  await expect(page.locator('.nav-btn[data-view="dashboard"]')).toBeVisible();
}

/**
 * A small in-memory stand-in for MRF-API, so dashboard behaviour can be
 * tested without the Worker. Pass `sent` to record what the UI actually
 * requested — that is what the management tests assert against.
 */
async function mockAdminApi(page, sent = []) {
  let nextId = 90;
  let content = [
    {
      id: 1, type: 'video', kind: 'full-natok', title: 'Tor Preme Pagol', slug: 'tor-preme-pagol',
      path: '/new-natok/tor-preme-pagol/', category: 'New Natok', subcategory: 'Eid Special',
      image: '/assets/img/doob-poster-828.webp', published: 1, indexable: 1,
      published_at: '2026-05-14T00:00:00Z', meta_description: 'A romantic natok released for Eid.',
      keywords: 'natok', rating: 4.6, rating_count: 12, sort_order: 10
    },
    {
      id: 2, type: 'post', kind: 'blog', title: 'Studio notes', slug: 'studio-notes',
      path: '/behind-the-scenes/studio-notes/', category: 'Behind the Scenes',
      subcategory: 'Studio Notes', image: '', published: 0, indexable: 1,
      published_at: '2026-04-01T00:00:00Z', meta_description: '', keywords: '', sort_order: 0
    }
  ];
  let media = [
    {
      id: 1, original_name: 'doob-poster.webp', media_kind: 'image',
      public_url: '/assets/img/doob-poster-828.webp', size: 41000
    },
    {
      id: 2, original_name: 'eid-portrait.webp', media_kind: 'image',
      public_url: '/assets/img/musfiq-profile-1-960.webp', size: 73000
    }
  ];
  let notes = [
    { id: 1, name: 'Nusrat', message: 'Every natok feels like it was written for us.',
      city: 'Dhaka', avatar_url: '', hearts: 12, approved: 0, pinned: 0,
      created_at: '2026-08-10T00:00:00Z' }
  ];
  let reviews = [
    { id: 1, name: 'Sadia', rating: 5, body: 'Best natok of the year.',
      content_slug: 'tor-preme-pagol', approved: 0, created_at: '2026-08-11T00:00:00Z' }
  ];

  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let body = null;
    try {
      body = route.request().postDataJSON();
    } catch {
      /* multipart upload or form data */
    }
    sent.push({ method, path, body });

    const reply = (data, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

    if (path.endsWith('/login')) return reply({ token: 'test-token' });
    if (path.endsWith('/metrics')) {
      return reply({
        content_total: content.length,
        content_published: content.filter((item) => item.published).length,
        content_drafts: content.filter((item) => !item.published).length,
        gallery_total: 1,
        media_total: 1,
        reviews_pending: reviews.filter((review) => !review.approved).length,
        notes_pending: notes.filter((note) => !note.approved).length,
        notes_live: notes.filter((note) => note.approved).length,
        rating_average: 4.6,
        seo_incomplete: 1
      });
    }

    if (path === '/api/admin/content' && method === 'GET') return reply({ items: content });
    if (path === '/api/admin/content' && method === 'POST') {
      const created = { ...body, id: nextId++, path: `/new-teaser/${body.slug}/` };
      content = [created, ...content];
      return reply(created, 201);
    }
    const contentId = path.match(/\/content\/(\d+)$/);
    if (contentId) {
      const id = Number(contentId[1]);
      if (method === 'DELETE') {
        content = content.filter((item) => item.id !== id);
        return reply({ ok: true });
      }
      content = content.map((item) => (item.id === id ? { ...item, ...body } : item));
      return reply(content.find((item) => item.id === id));
    }

    if (path.endsWith('/reviews') && method === 'GET') return reply({ reviews });
    const reviewId = path.match(/\/reviews\/(\d+)$/);
    if (reviewId) {
      const id = Number(reviewId[1]);
      reviews = reviews.map((review) =>
        review.id === id ? { ...review, approved: body?.approved ? 1 : 0 } : review
      );
      return reply({ ok: true });
    }

    if (path === '/api/admin/media' && method === 'GET') return reply({ items: media });
    if (path === '/api/admin/media' && method === 'POST') {
      const uploaded = {
        id: nextId++, original_name: 'uploaded-cover.webp', media_kind: 'image',
        public_url: '/assets/img/hero_red-828.webp', size: 12000
      };
      media = [uploaded, ...media];
      return reply({ ...uploaded, url: uploaded.public_url }, 201);
    }

    if (path.endsWith('/love-notes') && method === 'GET') return reply({ notes });
    const noteId = path.match(/\/love-notes\/(\d+)$/);
    if (noteId) {
      const id = Number(noteId[1]);
      notes = notes.map((note) => (note.id === id ? { ...note, ...body } : note));
      return reply(notes.find((note) => note.id === id));
    }

    return reply({ items: [] });
  });
}
