import { defineConfig, devices } from '@playwright/test'

/**
 * Pins the whole test run to the dev branch, and refuses to start against
 * production.
 *
 * This must not be `dotenv/config`. That loads `.env`, which is production, and
 * Playwright spawns the webServer as a child of this process — so `next dev`
 * would inherit DATABASE_URI=production and ignore `.env.local`, which only
 * applies to variables Next.js does not already see set.
 */
import './tests/helpers/env.js'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    // npm, not pnpm: package.json's test scripts say pnpm but this project has
    // never used it, and `pnpm dev` fails with command-not-found.
    command: 'npm run dev',
    reuseExistingServer: true,
    url: 'http://localhost:3000',
  },
})
