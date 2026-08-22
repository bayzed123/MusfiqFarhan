import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

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
    for (const slug of CATEGORY_SLUGS) {
      expect(html, `nav is missing /c/${slug}/`).toContain(`href="/c/${slug}/"`);
    }
  });

  test('every category and subcategory has its own landing page', async ({ request }) => {
    for (const slug of CATEGORY_SLUGS) {
      const response = await request.get(`/c/${slug}/`);
      expect(response.ok(), `/c/${slug}/`).toBeTruthy();
      const html = await response.text();
      expect(html).toContain(`<link rel="canonical" href="https://www.musfiqrfarhan.blog/c/${slug}/">`);
    }
    for (const path of ['/c/new-natok/eid-special/', '/c/gallery/portraits/', '/c/blog/biography-journey/']) {
      const response = await request.get(path);
      expect(response.ok(), path).toBeTruthy();
    }
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

  test('the love-note ticker is present on every page', async ({ page }) => {
    for (const path of ['/', '/c/blog/', '/gallery/', '/about.html']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-love-strip]'), path).toBeVisible();
    }
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
    const xml = await (await request.get('/sitemap.xml')).text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => match[1].replace('https://www.musfiqrfarhan.blog', ''))
      .filter((path) => path.endsWith('/') && path !== '/')
      .filter((path) => !path.startsWith('/c/'))
      .filter((path) => !['/watch/', '/blog/', '/gallery/', '/love-notes/'].includes(path));
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
      const crumb = page.locator('.breadcrumb a[href^="/c/"]');
      await expect(crumb, `${path} has no category breadcrumb`).toHaveCount(1);
      const href = await crumb.getAttribute('href');
      // The URL's first segment is the category, so the breadcrumb must agree.
      expect(href.replace('/c/', '').replace(/\/$/, '')).toBe(path.split('/').filter(Boolean)[0]);
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

  test('a hosted video page offers a real player source', async ({ request }) => {
    const response = await request.get('/new-natok/tor-preme-pagol/');
    test.skip(!response.ok(), 'the hosted-video fixture item is not part of this build');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    // The R2-hosted natok must reach the video sitemap as a content_loc,
    // which is the case that used to fail validation entirely.
    expect(sitemap).toContain('<video:content_loc>');
    expect(sitemap).toContain('<video:thumbnail_loc>');
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
    const xml = await (await request.get('/sitemap.xml')).text();
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((match) => match[1].replace('https://www.musfiqrfarhan.blog', ''))
      .filter((path) => path.endsWith('/') && path !== '/')
      .filter((path) => !path.startsWith('/c/'))
      .find((path) => !['/watch/', '/blog/', '/gallery/', '/love-notes/'].includes(path));
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
      nodes.map((node) => node.getAttribute('sandbox') || '')
    );
    expect(frames.length, 'banners are rendered').toBeGreaterThan(0);
    for (const sandbox of frames) {
      // Adsterra sets a global window.atOptions, so two banners in one
      // document overwrite each other; and without this the frame could
      // reach back into the page.
      expect(sandbox).not.toContain('allow-same-origin');
    }
    // The native unit's script looks the container up by an exact id, so a
    // second one on the page would never fill.
    await expect(page.locator('#container-95ccad5ad2296df12234714b8e6904cf')).toHaveCount(1);
  });

  test('the dashboard and error page stay ad-free', async ({ page }) => {
    for (const path of ['/admin/', '/404.html']) {
      await stubAdHosts(page);
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
      await expect(page.locator('.ad-slot'), path).toHaveCount(0);
    }
  });

  test('an ad-filled post page still does not scroll sideways on a phone', async ({
    page,
    request
  }) => {
    const post = await somePost(request);
    test.skip(!post, 'this build has no published posts');
    await page.setViewportSize({ width: 390, height: 780 });
    await slotsOn(page, post);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(overflows, 'the post page overflows horizontally').toBeFalsy();
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
