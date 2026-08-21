const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { baseURL: 'https://www.musfiqrfarhan.blog', headless: true },
  reporter: [['line']]
});
