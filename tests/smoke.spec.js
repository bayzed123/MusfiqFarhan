const { test, expect } = require('@playwright/test');

test('homepage renders the publishing taxonomy and trust sections', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Musfiq R\. Farhan/);
  await expect(page.getByRole('button', { name: 'New natok' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Poster release' })).toBeVisible();
  await expect(page.getByText('Stories with')).toBeVisible();
  await expect(page.getByText('Fan Love Notes')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sitemap' })).toBeVisible();
});

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

test('admin remains a private noindex login gate', async ({ page }) => {
  await page.goto('/admin.html');
  await expect(page).toHaveTitle(/MRF Studio \/ Admin/);
  await expect(page.locator('input#username')).toBeVisible();
  await expect(page.locator('input#password')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
