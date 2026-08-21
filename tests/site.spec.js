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

  test('the desktop mega menu opens on click', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('.primary-nav .nav-link').first().click();
    await expect(page.locator('.nav-item.is-open .mega')).toBeVisible();
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
    for (const path of ['/', '/c/new-natok/', '/gallery/', '/love-notes/', '/about.html']) {
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
      '/gallery/',
      '/love-notes/',
      '/robots.txt',
      '/sitemap.xml',
      '/sitemap-pages.xml',
      '/sitemap-categories.xml',
      '/sitemap-content.xml',
      '/sitemap-images.xml'
    ];
    for (const route of routes) {
      const response = await request.get(route);
      expect(response.ok(), route).toBeTruthy();
    }
  });

  test('the sitemap index points at the individual sitemaps', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    for (const file of ['sitemap-pages.xml', 'sitemap-categories.xml', 'sitemap-content.xml']) {
      expect(xml).toContain(file);
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
    for (const path of ['/', '/c/new-natok/', '/gallery/', '/love-notes/', '/404.html']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
    }
    expect(errors).toEqual([]);
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
    await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    await page.fill('#login-user', 'admin');
    await page.fill('#login-pass', 'secret');
    await page.click('[data-login] button[type=submit]');

    await expect(page.locator('.nav-btn[data-view="dashboard"]')).toBeVisible();
    for (const view of ['content', 'media', 'gallery', 'notes', 'reviews', 'seo', 'compose']) {
      await page.click(`.nav-btn[data-view="${view}"]`);
      await expect(page.locator(`[data-panel="${view}"]`)).toBeVisible();
    }
  });

  test('a content kind fills in placement and SEO', async ({ page }) => {
    await mockAdminApi(page);
    await page.goto('/admin/', { waitUntil: 'domcontentloaded' });
    await page.fill('#login-user', 'admin');
    await page.fill('#login-pass', 'secret');
    await page.click('[data-login] button[type=submit]');
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

/** Serve predictable dashboard data so the UI can be tested without the API. */
async function mockAdminApi(page) {
  await page.route('**/api/admin/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith('/login')
      ? { token: 'test-token' }
      : path.endsWith('/metrics')
        ? {
            content_total: 1,
            content_published: 1,
            content_drafts: 0,
            gallery_total: 1,
            media_total: 1,
            reviews_pending: 1,
            notes_pending: 1,
            notes_live: 3,
            rating_average: 4.6,
            seo_incomplete: 0
          }
        : path.endsWith('/reviews')
          ? { reviews: [] }
          : path.endsWith('/love-notes')
            ? { notes: [] }
            : { items: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
