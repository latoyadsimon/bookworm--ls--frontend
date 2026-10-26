import { BOOK_URL, DEMO_ID, contentReady, expect, logIn, sidewaysScroll, test, toast } from './fixtures.js'

// These tests write to the live database as the demo reader. The `dbUser`
// fixture snapshots that reader first and restores it after every test, and
// the file runs one test at a time so they never trip over each other.
test.describe.configure({ mode: 'serial' })
test.use({ dbUser: DEMO_ID })

const LOG_BOX = 'What did you read? What do you think?'
const rows = (page) => page.locator('.library-row:not(.is-skeleton)')
const dialog = (page) => page.locator('dialog[open]')

// Sessions live in memory, so a full page load (page.goto) logs out.
// After logging in, move around with in-app links only.
async function openBookAsDemo(page) {
  await page.goto('/login')
  await logIn(page)
  await page.getByRole('link', { name: 'View Details' }).click()
  await expect(page).toHaveURL(BOOK_URL)
  await contentReady(page)
}

test.describe('Book details', () => {
  test('guests can read logs but not write or edit', async ({ page }) => {
    await page.goto(BOOK_URL)
    await contentReady(page)
    await expect(page.locator('.log-item').first()).toBeVisible()
    await expect(page.locator('.log-author').first()).not.toContainText('@')
    // Google's HTML is shown as clean text
    await expect(page.getByText('Your journey to mastery & beyond.')).toBeVisible()
    await expect(page.getByRole('button', { name: /^(Edit|Delete)$/ })).toHaveCount(0)
    await expect(page.locator('.book-write .state-message-title')).toHaveText('Log in to write about this book.')
  })

  test('a reader changes status, then posts, edits and deletes a log', async ({ page }) => {
    await openBookAsDemo(page)

    await page.locator('.status-control').selectOption('finished')
    await expect(page.locator('.status-note', { hasText: 'Saved' })).toBeVisible()

    await page.getByRole('button', { name: 'Post Log' }).click()
    await expect(page.locator('.book-write .field-error')).toBeVisible()

    const body = 'Finished it tonight. The last chapter ties every habit together.'
    await page.getByLabel(LOG_BOX).fill(body)
    await page.locator('.book-write .star-option').nth(3).click()
    await page.getByRole('button', { name: 'Post Log' }).click()
    const newest = page.locator('.log-item').first()
    await expect(newest.locator('.log-body')).toHaveText(body)
    await expect(page.getByLabel(LOG_BOX)).toHaveValue('')

    await newest.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Edit your log').fill('Edited: the last chapter is the best one.')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(newest.locator('.log-meta')).toContainText('edited')
    await expect(newest.locator('.log-body')).toHaveText('Edited: the last chapter is the best one.')

    const mine = await page.locator('.log-item.is-mine').count()
    await newest.getByRole('button', { name: 'Delete' }).click()
    await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused()
    await dialog(page).getByRole('button', { name: 'Delete' }).click()
    await expect(toast(page, 'Log deleted.')).toBeVisible()
    await expect(page.locator('.log-item.is-mine')).toHaveCount(mine - 1)
  })

  test('removing a book warns about its logs and deletes them', async ({ page }) => {
    await openBookAsDemo(page)
    await expect(page.locator('.log-item.is-mine')).not.toHaveCount(0)
    await page.getByRole('button', { name: 'Remove from Library' }).click()
    await expect(dialog(page).locator('.confirm-text')).toContainText('delete')
    await dialog(page).getByRole('button', { name: 'Remove' }).click()
    await expect(toast(page, 'Removed from your library.')).toBeVisible()
    await expect(page.locator('.log-item.is-mine')).toHaveCount(0)

    await page.getByRole('button', { name: '+ Add to Library' }).click()
    await expect(toast(page, 'Added to your library')).toBeVisible()
    await expect(page.locator('.status-control')).toHaveValue('want_to_read')
  })

  // The browser logs the function's 404 as a console error
  test.describe('unknown id', () => {
    test.use({ allowConsoleErrors: true })
    test('an unknown book id shows a not-found message', async ({ page }) => {
    await page.goto('/books/doesNotExist1')
    await expect(page.locator('h1')).toHaveText("We couldn't find that book")
    })
  })
})

test.describe('My Library', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await logIn(page)
    await page.getByRole('link', { name: 'My Library' }).first().click()
    await rows(page).first().waitFor()
  })

  test('filters by status tab', async ({ page }) => {
    const all = await rows(page).count()
    await page.getByRole('button', { name: /^Finished/ }).click()
    await expect.poll(() => rows(page).count()).toBeLessThan(all)
    for (const select of await page.locator('.library-row .status-control').all()) {
      await expect(select).toHaveValue('finished')
    }
  })

  test('changing status inside a tab moves the book out', async ({ page }) => {
    await page.getByRole('button', { name: /^Want to Read/ }).click()
    await expect(page.locator('.library-tab.is-current')).toContainText('Want')
    const before = await rows(page).count()
    await rows(page).first().locator('.status-control').selectOption('finished')
    await expect(toast(page, 'to Finished.')).toBeVisible()
    await expect(rows(page)).toHaveCount(before - 1)
  })

  test('removes a book after confirming', async ({ page }) => {
    const before = await rows(page).count()
    await rows(page).first().getByRole('button', { name: /^Remove/ }).click()
    await dialog(page).getByRole('button', { name: 'Remove' }).click()
    await expect(rows(page)).toHaveCount(before - 1)
  })

  test('fits a phone screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    expect(await sidewaysScroll(page)).toBe(0)
  })
})

test('a new reader sees an empty library with a way to browse', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel(/Display name/).fill('Newbie')
  await page.getByLabel('Email').fill('newbie@reader.dev')
  await page.getByLabel(/^Password/).fill('secret12')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.getByRole('button', { name: 'Log Out' }).waitFor()
  await page.getByRole('link', { name: 'My Library' }).first().click()
  await expect(page.locator('.state-message-title')).toHaveText('Your library is empty')
  await expect(page.getByRole('link', { name: 'Browse Books' })).toBeVisible()
})
