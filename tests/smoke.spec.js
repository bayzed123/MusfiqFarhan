const { test, expect } = require('@playwright/test');

test('homepage renders the publishing taxonomy and trust sections', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Musfiq R\. Farhan/);
  await expect(page.getByRole('button', { name: 'New natok' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Poster release' })).toBeVisible();
  await expect(page.getByText('Stories with')).toBeVisible();
  await expect(page.locator('#fan-notes-track')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sitemap' })).toBeVisible();
});

test('every taxonomy category has a crawlable landing page', async ({ page }) => { const categories=['Premium','Gallery','Poster Release','Behind the Scenes','New Teaser','New Natok','Short Clips','Blog','Press','Lifestyle & Fashion','Wallpapers','Biography & Journey','Natok & Telefilm','Recent Releases','Popular','Eid Special']; for(const category of categories){await page.goto(`/category.html?category=${encodeURIComponent(category)}`);await expect(page.locator('#category-title')).not.toContainText('Archive unavailable');await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',new RegExp('category.html'))} });

test('managed blog page renders metadata surface and page review form', async ({ page }) => {
  await page.goto('/post.html?slug=doob-new-story');
  await expect(page).toHaveTitle(/Doob/);
  await expect(page.locator('#article-title')).toContainText('Doob');
  await expect(page.locator('#page-review-form')).toBeVisible();
  await expect(page.locator('#page-review-rating')).toBeVisible();
});

test('managed watch page renders player and page review form', async ({ page }) => {
  await page.goto('/watch.html?slug=eta-golpo-noi-dear-valentine');
  await expect(page).toHaveTitle(/Eta Golpo Noi/);
  await expect(page.locator('#video-player')).toHaveAttribute('src', /youtube-nocookie/);
  await expect(page.locator('#page-review-form')).toBeVisible();
});

test('legal and crawl routes are available', async ({ page, request }) => {
  for (const route of ['/about.html', '/contact.html', '/privacy-policy.html', '/editorial-standards.html', '/sitemap.xml', '/robots.txt']) {
    const response = await request.get(route);
    expect(response.ok(), route).toBeTruthy();
  }
});

test('admin exposes category navigation and direct device upload controls', async ({ page }) => { await page.goto('/admin.html'); await expect(page.locator('#admin-category-nav')).toBeVisible(); await expect(page.locator('#content-image-file')).toHaveAttribute('accept', /image/); await expect(page.locator('#content-video-file')).toHaveAttribute('accept', /video/); await expect(page.locator('#content-attachment-file')).toHaveAttribute('accept', /pdf/); await expect(page.locator('#content-preview')).toBeVisible(); });

test('admin remains a private noindex login gate', async ({ page }) => {
  await page.goto('/admin.html');
  await expect(page).toHaveTitle(/MRF Studio \/ Admin/);
  await expect(page.locator('input#username')).toBeVisible();
  await expect(page.locator('input#password')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('authenticated dashboard category room controls work', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('mrf_admin_token', 'test-token'));
  await page.route('https://mrf-api.gadget02030.workers.dev/api/admin/**', async route => {
    const url = new URL(route.request().url());
    const body = url.pathname.endsWith('/content') ? { items: [] } : url.pathname.endsWith('/reviews') ? { reviews: [] } : url.pathname.endsWith('/gallery') ? { items: [] } : url.pathname.endsWith('/metrics') ? { content: 0, media: 0, pending_reviews: 0, average_rating: 0, media_items: [] } : { ok: true };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/admin.html');
  await expect(page.locator('#dashboard')).toBeVisible();
  await page.locator('#admin-category-nav button[data-category="Blog"]').click();
  await expect(page.locator('#workspace-label')).toHaveText('Blog');
  await page.locator('#new-content').click();
  await expect(page.locator('#content-category')).toHaveValue('Blog');
  await expect(page.locator('#content-image-file')).toBeVisible();
  await expect(page.locator('#content-video-file')).toBeVisible();
  await expect(page.locator('#content-attachment-file')).toBeVisible();
  await expect(page.locator('#content-preview')).toBeVisible();
});
