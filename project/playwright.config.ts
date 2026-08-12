import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://founder-env-sigma.vercel.app',
    trace: 'retain-on-failure',
  },
  reporter: 'line',
});
