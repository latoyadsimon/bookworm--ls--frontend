import { BOOK_URL, expect, logIn, test, toast } from './fixtures.js'

// The ?simulate= switches force the failure states from the error playbook
// (app_outline/user_stories.md). Messages must match the playbook exactly.

test.describe('Book service failures', () => {
  for (const [sim, detail] of [
    ['429', 'Too many requests'],
    ['timeout', 'The book service took too long to respond.'],
    ['error', 'The book service is having trouble.'],
  ]) {
    test(`simulate=${sim} shows an error with Retry`, async ({ page }) => {
      await page.goto(`/genre/fiction?simulate=${sim}`)
      const message = page.locator('.state-message.is-error')
      await expect(message.locator('.state-message-title')).toHaveText("We couldn't load these books right now.")
      await expect(message.locator('.state-message-body')).toContainText(detail)
      await expect(message.getByRole('button', { name: 'Retry' })).toBeVisible()
    })
  }

  // The browser logs any 429 response as a console error, so this one test allows it
  test.describe('a real 429', () => {
  test.use({ allowConsoleErrors: true })
  test('from the function shows the same error state', async ({ page }) => {
    await page.route('**/functions/v1/books*', (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } })
        : route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: { 'access-control-allow-origin': '*' },
            body: JSON.stringify({ error: 'Too many requests right now. Try again in a moment.' }),
          }),
    )
    await page.goto('/genre/fiction')
    const message = page.locator('.state-message.is-error')
    await expect(message.locator('.state-message-title')).toHaveText("We couldn't load these books right now.")
    await expect(message.locator('.state-message-body')).toContainText('Too many requests')
  })
  })

  test('every Home row shows its own error', async ({ page }) => {
    await page.goto('/?simulate=error')
    await expect(page.locator('.book-row .state-message.is-error')).toHaveCount(await page.locator('.book-row').count())
  })

  test('slow responses show skeleton cards', async ({ page }) => {
    await page.goto('/genre/adventure?simulate=slow')
    await expect(page.locator('.book-card.is-skeleton').first()).toBeVisible()
  })
})

test.describe('Database failures', () => {
  test('logs failing still shows the book', async ({ page }) => {
    await page.goto(`${BOOK_URL}?simulate=logs`)
    await expect(page.locator('.book-readers .state-message')).toBeVisible()
    await expect(page.locator('h1')).not.toBeEmpty()
  })

  test('the library explains when the database is down', async ({ page }) => {
    await page.goto('/login?simulate=db')
    await logIn(page)
    await page.getByRole('link', { name: 'My Library' }).first().click()
    await expect(page.locator('.state-message-title')).toHaveText("Couldn't load your library.")
  })

  test('an expired session sends the reader to Log In', async ({ page }) => {
    await page.goto('/login?simulate=expired')
    await logIn(page)
    await page.getByRole('link', { name: 'My Library' }).first().click()
    await page.locator('.library-row:not(.is-skeleton) .status-control').first().selectOption('finished')
    await expect(page).toHaveURL(/\/login/)
    await expect(toast(page, 'Your session expired. Please log in again.')).toBeVisible()
  })
})

test.describe('Broken pages', () => {
  test('an unknown address shows the 404 page with the nav', async ({ page }) => {
    await page.goto('/no/such/page')
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'BookWorm home' })).toBeVisible()
  })

  test.describe('a page that crashes', () => {
    test.use({ allowConsoleErrors: true })

    test('shows the crash screen and keeps the nav', async ({ page }) => {
      await page.goto('/dev/crash')
      await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible()
      await page.getByRole('link', { name: 'BookWorm home' }).click()
      await expect(page.locator('.hero-title')).toBeVisible()
    })
  })
})
