import { defineConfig } from '@playwright/test';

/**
 * By default the suite runs against the built site on a local static server,
 * so a broken build is caught before it is deployed. Set PLAYWRIGHT_BASE_URL
 * to point the same tests at the live site after a deploy.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const usesLocalServer = !process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['line']],
  use: {
    baseURL,
    headless: true,
    // The sandbox ships a newer Chromium than this Playwright version expects.
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {}
  },
  webServer: usesLocalServer
    ? {
        command: 'npx --yes http-server . -p 4173 -c-1 --silent',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000
      }
    : undefined
});
