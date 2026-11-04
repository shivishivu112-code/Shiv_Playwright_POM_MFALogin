import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: ['.env.local', '.env'] });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0, // keep low: retries hide real flakiness
  workers: process.env.CI ? 2 : undefined,
  timeout: 90_000,                  // MFA tests may wait for email / TOTP window
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.APP_BASE_URL ?? 'https://your-app.example.com',
    testIdAttribute: 'data-testid',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Gate: if admin API credentials/tenant are wrong, every UI test is SKIPPED instead of failing noisily.
    { name: 'api-health', testMatch: /api-health\.setup\.ts/ },
    {
      name: 'chromium',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['api-health'],
    },
  ],
});
