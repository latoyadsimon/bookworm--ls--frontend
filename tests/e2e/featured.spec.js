import { MODES } from '../../src/theme/modes.js'
import { FEATURED_ROWS, mockFeatured } from './booksFixture.js'
import { a11yViolations, bookCards, expect, sidewaysScroll, startIn, test } from './fixtures.js'

const WIDTHS = [320, 375, 768, 1024, 1280]

// Every word of the hero title must sit on one line (no mid-word breaks)
const brokenWords = (page) =>
  page.evaluate(() => {
    const node = document.querySelector('.hero-title').firstChild
    const broken = []
    for (const m of node.textContent.matchAll(/\S+/g)) {
      const r = document.createRange()
      r.setStart(node, m.index)
      r.setEnd(node, m.index + m[0].length)
      if (new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size > 1) broken.push(m[0])
    }
    return broken
  })

// The hero title is shown in full: nothing hides overflow and the text fits its own box
const titleClipping = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('.hero-title')
    return {
      overflow: getComputedStyle(el).overflow,
      cut: el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth,
    }
  })

for (const mode of MODES) {
  test(`${mode.name}: the hero fits every width`, async ({ page }) => {
    test.slow()
    await startIn(page, mode.key)
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const title = page.locator('.hero-title')
      await expect(title).toHaveText('The Pragmatic Programmer')
      await page.evaluate(() => document.fonts.ready)
      expect(await sidewaysScroll(page), `sideways scroll at ${width}px`).toBe(0)
      expect(await brokenWords(page), `split words at ${width}px`).toEqual([])
      const box = await title.boundingBox()
      expect(box.x, `title left edge at ${width}px`).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width, `title right edge at ${width}px`).toBeLessThanOrEqual(width)
      expect(await titleClipping(page), `title clipped at ${width}px`).toEqual({ overflow: 'visible', cut: false })
      for (const control of await page.locator('.hero-actions').getByRole('link').all()) {
        expect((await control.boundingBox()).height, `tap target at ${width}px`).toBeGreaterThanOrEqual(44)
      }
      expect(await a11yViolations(page), `axe at ${width}px`).toEqual([])
    }
  })
}

test.describe('Hero content', () => {
  test.use({ allowConsoleErrors: true }) // the failing-request tests log the browser's own network error
  test('shows the month, the author and the Starter pick label, and links to the history', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.hero-badge')).toContainText(/ · \w+ \d{4}$/)
    await expect(page.locator('.hero-meta')).toHaveText('by Fixture Author')
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.locator('.hero-nyt')).toHaveText('Starter pick')
    await page.getByRole('link', { name: /See past picks/ }).click()
    await expect(page).toHaveURL(/\/featured$/)
  })

  test('labels an NYT pick with its rank and list', async ({ page }) => {
    await mockFeatured(page, { current: { ...FEATURED_ROWS[1], month: FEATURED_ROWS[0].month } })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await expect(page.locator('.hero-nyt')).toHaveText('#1 NYT Hardcover Fiction')
  })

  test('a failed pick shows an error with Retry, and Retry recovers', async ({ page }) => {
    let fail = true
    await mockFeatured(page)
    await page.route('**/functions/v1/featured*', (route) => {
      if (route.request().method() === 'POST' && fail) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ error: 'No featured pick yet.' }),
        })
      }
      return route.fallback()
    })
    await page.goto('/')
    await expect(page.getByText("We couldn't load the featured book.")).toBeVisible()
    fail = false
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.locator('.hero-title')).toBeVisible()
  })

  test('Kid Korner skips a MATURE pick and shows the newest suitable one', async ({ page }) => {
    await mockFeatured(page, {
      rows: [{ ...FEATURED_ROWS[0], maturity_rating: 'MATURE' }, ...FEATURED_ROWS.slice(1)],
    })
    await startIn(page, 'kid-korner')
    await page.goto('/')
    await expect(page.locator('.hero-title')).toHaveText('The Fixture Chronicle')
  })
})

test.describe('Featured Picks page', () => {
  test.use({ allowConsoleErrors: true }) // the failing-request test logs the browser's own network error
  test('lists every pick newest first, marks this month, and opens a book', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Featured' }).click()
    await expect(page).toHaveURL(/\/featured$/)
    await expect(page.getByRole('heading', { name: 'Featured Picks' })).toBeVisible()
    await expect(bookCards(page)).toHaveCount(3)
    await expect(bookCards(page).first().locator('.book-card-title')).toHaveText('The Pragmatic Programmer')
    await expect(page.locator('.featured-now')).toHaveCount(1)
    await expect(page.locator('.featured-label').nth(1)).toHaveText('#1 NYT Hardcover Fiction')
    await expect(page.getByText('Best-seller data provided by The New York Times.')).toBeVisible()
    expect(await a11yViolations(page)).toEqual([])
    await bookCards(page).nth(1).click()
    await expect(page).toHaveURL(/\/books\//)
  })

  test('uses a phone grid without sideways scroll', async ({ page }) => {
    for (const width of [320, 375, 768, 1280]) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/featured')
      await expect(bookCards(page)).toHaveCount(3)
      expect(await sidewaysScroll(page), `${width}px`).toBe(0)
    }
  })

  test('shows an error with Retry when the history cannot load', async ({ page }) => {
    await page.route('**/rest/v1/featured_books**', (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
        : route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"message":"boom"}' }),
    )
    await page.goto('/featured')
    await expect(page.getByText("We couldn't load the featured picks.")).toBeVisible()
  })

  test('the mobile menu has a Featured link', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.locator('#mobile-menu').getByRole('link', { name: 'Featured' }).click()
    await expect(page).toHaveURL(/\/featured$/)
  })
})

test.describe('Featured search', () => {
  async function search(page, q, type) {
    await page.goto('/')
    const form = page.getByRole('search').first()
    await form.getByLabel('Search books').fill(q)
    await form.getByLabel('Search by').selectOption(type)
    await form.getByRole('button', { name: 'Search' }).click()
  }

  test('finds picks by title or author', async ({ page }) => {
    await search(page, 'chronicle', 'featured')
    await expect(page).toHaveURL(/\/search\?q=chronicle&type=featured/)
    await expect(bookCards(page)).toHaveCount(1)
    await expect(page.locator('.browse-count')).toHaveText('1 book found · searching by featured')
    await search(page, 'fixture author', 'featured')
    await expect(bookCards(page)).toHaveCount(3)
  })

  test('shows the empty state when nothing matches', async ({ page }) => {
    await search(page, 'zzzz', 'featured')
    await expect(page.getByText('No featured picks found for “zzzz”.')).toBeVisible()
  })

  test('an empty query goes to the Featured Picks page', async ({ page }) => {
    await search(page, '', 'featured')
    await expect(page).toHaveURL(/\/featured$/)
  })

  test('other types still need a search term', async ({ page }) => {
    await search(page, '', 'title')
    await expect(page.getByRole('alert')).toHaveText('Please enter a search term.')
  })
})

test('a pick without a description shows no description block', async ({ page }) => {
  await mockFeatured(page, { current: { ...FEATURED_ROWS[0], description: null } })
  await page.goto('/')
  await expect(page.locator('.hero-title')).toBeVisible()
  await expect(page.locator('.hero-description')).toHaveCount(0)
  await expect(page.getByText('No description available.')).toHaveCount(0)
})
