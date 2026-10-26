import { test as base, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { DEMO_LOGIN } from '../../src/services/mock/seed.js'
import { FEATURED_BOOK_ID } from '../../src/data/featured.js'
import { mockBooks, mockFeatured, FEATURED } from './booksFixture.js'
import { restore, snapshot } from './liveDb.js'

export { expect, DEMO_LOGIN, FEATURED }
export const DEMO_ID = '00000000-0000-4000-a000-000000000001'
export const NEON_ID = '00000000-0000-4000-a000-000000000004'
export const BOOK_URL = `/books/${FEATURED_BOOK_ID}`

// Every test fails if the page logs a console error or throws.
// Tests that crash on purpose opt out with test.use({ allowConsoleErrors: true }).
export const test = base.extend({
  allowConsoleErrors: [false, { option: true }],
  // A seed reader whose live rows this test may change: snapshotted first, restored after
  dbUser: [null, { option: true }],
  restoreDb: [
    async ({ dbUser }, use) => {
      if (!dbUser) return use()
      const before = await snapshot(dbUser)
      try {
        await use()
      } finally {
        await restore(before)
      }
    },
    { auto: true },
  ],
  page: async ({ page, allowConsoleErrors }, use) => {
    await mockBooks(page) // deterministic books; a test can page.route over it
    await mockFeatured(page) // and the monthly pick + its history
    const errors = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await use(page)
    if (!allowConsoleErrors) expect(errors, 'console errors').toEqual([])
  },
})

/** Start every page load in a style mode (and motion setting), as if the reader picked it before. */
export function startIn(page, mode, motion = 'on') {
  return page.addInitScript(
    ([m, mo]) => {
      localStorage.setItem('bookworm-theme', m)
      localStorage.setItem('bookworm-motion', mo)
    },
    [mode, motion],
  )
}

/** Fill in the Log In form (the page must already be on /login) and wait until signed in. */
export async function logIn(page, { email, password } = DEMO_LOGIN) {
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Log In', exact: true }).click()
  await page.getByRole('button', { name: 'Log Out' }).waitFor()
}

/** Wait until real content (not skeletons) is on screen. */
export const contentReady = (page) => page.locator('.book-card:not(.is-skeleton), .log-item').first().waitFor()

export const bookCards = (page) => page.locator('.book-grid .book-card:not(.is-skeleton)')

/** Pixels the page can scroll sideways (0 means it fits the screen). */
export const sidewaysScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

/** WCAG 2 A + AA violations on the current page, as "rule (count)" strings. */
export async function a11yViolations(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  return violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`)
}

export const toast = (page, text) => page.locator('.toast-message', { hasText: text })
