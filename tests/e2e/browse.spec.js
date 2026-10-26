import { CATALOG } from './booksFixture.js'
import { FEATURED, bookCards, contentReady, expect, sidewaysScroll, test } from './fixtures.js'

test.describe('Home', () => {
  test('shows the featured book and rows that load more', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.hero-title')).toHaveText(FEATURED.title)
    const row = page.locator('.book-row').first()
    await row.locator('.book-card:not(.is-skeleton)').first().waitFor()
    const before = await row.locator('.book-card:not(.is-skeleton)').count()
    await row.locator('.load-more-card').click()
    await expect.poll(() => row.locator('.book-card:not(.is-skeleton)').count()).toBeGreaterThan(before)
  })

  test('a book card opens its details page', async ({ page }) => {
    await page.goto('/')
    const card = page.locator('.book-row').first().locator('.book-card:not(.is-skeleton)').first()
    await card.waitFor()
    const title = await card.locator('.book-card-title').innerText()
    await card.click()
    await expect(page).toHaveURL(/\/books\//)
    await expect(page.locator('h1')).toHaveText(title)
  })
})

test.describe('Search', () => {
  test('the nav search box runs a search by type', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByRole('navigation').first()
    const form = page.getByRole('search').first()
    await form.getByLabel('Search books').fill('the')
    await form.getByLabel('Search by').selectOption('title')
    await form.getByRole('button', { name: 'Search' }).click()
    await expect(page).toHaveURL(/\/search\?q=the&type=title/)
    await expect(page.locator('h1')).toHaveText('Results for “the”')
    await expect(bookCards(page).first()).toBeVisible()
    await expect(nav).toBeVisible()
  })

  test('Load More goes to the end of the results', async ({ page }) => {
    await page.goto('/search?q=the&type=title')
    await bookCards(page).first().waitFor()
    const loadMore = page.getByRole('button', { name: 'Load More' })
    while (await loadMore.isVisible()) {
      const before = await bookCards(page).count()
      await loadMore.click()
      await expect.poll(() => bookCards(page).count()).toBeGreaterThan(before)
    }
    await expect(page.locator('.grid-end')).toBeVisible()
  })

  test('finds a book by ISBN', async ({ page }) => {
    const book = CATALOG[5]
    await page.goto(`/search?q=${book.isbn13.slice(0, 3)}-${book.isbn13.slice(3)}&type=isbn`)
    await expect(bookCards(page)).toHaveCount(1)
    await expect(page.locator('.book-card-title')).toHaveText(book.title)
  })

  test('explains searches with no results', async ({ page }) => {
    await page.goto('/search?q=xyzzy&type=all')
    await expect(page.locator('.state-message-title')).toHaveText('No books found for “xyzzy”.')
  })

  for (const [query, message] of [
    ['q=12345&type=isbn', 'ISBN must be 10 or 13 digits.'],
    [`q=${'a'.repeat(201)}&type=all`, 'Search is too long (max 200 characters).'],
    ['q=', 'Please enter a search term.'],
  ]) {
    test(`validates a typed-in URL: ${message}`, async ({ page }) => {
      await page.goto(`/search?${query}`)
      await expect(page.locator('.state-message-title')).toHaveText(message)
    })
  }

  test('Back restores every loaded page of results', async ({ page }) => {
    await page.goto('/search?q=the&type=title')
    await bookCards(page).first().waitFor()
    await page.getByRole('button', { name: 'Load More' }).click()
    await expect.poll(() => bookCards(page).count()).toBeGreaterThan(20)
    const loaded = await bookCards(page).count()
    await page.getByRole('link', { name: 'BookWorm home' }).click()
    await contentReady(page)
    await page.goBack()
    await expect(page).toHaveURL(/\/search/)
    await expect(bookCards(page)).toHaveCount(loaded)
  })
})

test.describe('Genres', () => {
  test('marks the current genre and switches genres', async ({ page }) => {
    await page.goto('/genre/sci-fi')
    const active = page.locator('.chip.active')
    await expect(active).toHaveAttribute('aria-current', 'page')
    await expect(bookCards(page).first()).toBeVisible()
    await page.locator('.chip', { hasText: 'Horror' }).click()
    await expect(page).toHaveURL(/\/genre\/horror/)
    await expect(page.locator('h1')).toHaveText('Horror')
  })

  test('explains an unknown genre', async ({ page }) => {
    await page.goto('/genre/cooking')
    await expect(page.locator('h1')).toHaveText('Genre not found')
    await expect(page.locator('.state-message-title')).toHaveText("We don't have a “cooking” genre.")
  })
})

test.describe('Phone layout', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('the menu button opens the nav', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('link', { name: 'Log In' }).first()).toBeVisible()
  })

  for (const url of ['/', '/search?q=the&type=title', '/genre/sci-fi']) {
    test(`${url} fits the screen`, async ({ page }) => {
      await page.goto(url)
      await contentReady(page)
      expect(await sidewaysScroll(page)).toBe(0)
    })
  }
})
