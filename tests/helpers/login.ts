import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface LoginOptions {
  page: Page
  serverURL?: string
  user: {
    email: string
    password: string
  }
}

/**
 * Logs the user into the admin panel via the login page.
 */
export async function login({
  page,
  serverURL = 'http://localhost:3000',
  user,
}: LoginOptions): Promise<void> {
  await page.goto(`${serverURL}/admin/login`, { waitUntil: 'networkidle' })

  await page.fill('#field-email', user.email)
  await page.fill('#field-password', user.password)

  // On a cold `next dev` compile the form renders before React attaches its
  // submit handler, so the first click can land on inert markup and do nothing
  // at all. Retry until the navigation actually starts rather than waiting out
  // the timeout on a click that was swallowed.
  await expect(async () => {
    await page.click('button[type="submit"]')
    await page.waitForURL(`${serverURL}/admin`, { timeout: 15_000 })
  }).toPass({ timeout: 120_000 })

  const dashboardArtifact = page.locator('span[title="Dashboard"]')
  await expect(dashboardArtifact).toBeVisible()
}
