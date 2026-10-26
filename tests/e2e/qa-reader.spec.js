// QA audit: signed-in flows that write to the live database, as QuietReader only.
// The `dbUser` fixture snapshots QuietReader before every test and restores it after,
// and the file runs serially so the snapshots never overlap.
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { FEATURED, expect, logIn, sidewaysScroll, test, toast } from './fixtures.js'

// 'default' keeps the tests in order in one worker (no overlapping snapshots) but,
// unlike 'serial', keeps going after a failure.
test.describe.configure({ mode: 'default' })

const QR_ID = '00000000-0000-4000-a000-000000000003'
const QR = { email: 'quietreader@example.com', password: 'quietreader1' }
const OTHER_BOOK = { id: 'hjEFCAAAQBAJ', title: 'The Clean Code Handbook' }
const LOG_BOX = 'What did you read? What do you think?'
test.use({ dbUser: QR_ID })

const env = loadEnv('development', process.cwd(), 'VITE_')
const live = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
async function liveRows(table, filters) {
  let q = live.from(table).select('*').eq('user_id', QR_ID)
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data
}

const dialog = (page) => page.locator('dialog[open]')

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('bookworm-motion') == null) localStorage.setItem('bookworm-motion', 'off')
  })
})

async function logInAsQuietReader(page) {
  await page.goto('/login')
  await logIn(page, QR)
}

/** Opens a book through in-app links (a page.goto would log out). */
async function openBook(page, book) {
  const form = page.getByRole('search').first()
  await form.getByLabel('Search books').fill(book.title)
  await form.getByLabel('Search by').selectOption('title')
  await form.getByRole('button', { name: 'Search' }).click()
  await page.locator('.book-grid .book-card:not(.is-skeleton)', { hasText: book.title }).first().click()
  await expect(page.locator('#book-title')).toHaveText(book.title)
}

async function openOwnedBook(page) {
  await logInAsQuietReader(page)
  await openBook(page, FEATURED)
  await expect(page.locator('.status-control')).toBeVisible()
  await expect(page.locator('.log-total')).toBeVisible() // logs loaded (see the race test below)
}

test('a guest deep link to a filtered library returns there, filter included, after Log In', async ({ page }) => {
  await page.goto('/library?status=reading')
  await expect(page).toHaveURL(/\/login/)
  await logIn(page, QR)
  await expect(page).toHaveURL(/\/library\?status=reading$/)
  await expect(page.getByRole('button', { name: /Reading/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.state-message-title')).toHaveText('No books marked Reading yet.')
})

test('double-clicking Add to Library saves the book exactly once', async ({ page }) => {
  await logInAsQuietReader(page)
  await openBook(page, OTHER_BOOK)
  await page.getByRole('button', { name: '+ Add to Library' }).dblclick()
  await expect(page.locator('.status-control')).toHaveValue('want_to_read')
  await page.waitForTimeout(1500) // let any second insert land
  expect(await liveRows('library_items', { volume_id: OTHER_BOOK.id })).toHaveLength(1)
  await expect(toast(page, 'Already in your library.')).toHaveCount(0)
})

test('rapid status changes end on the last choice, in the UI and the database', async ({ page }) => {
  await openOwnedBook(page)
  const select = page.locator('.status-control')
  for (const s of ['reading', 'finished', 'want_to_read', 'reading', 'finished']) await select.selectOption(s)
  await expect(page.locator('.status-note', { hasText: 'Saved' })).toBeVisible()
  await expect(select).toHaveValue('finished')
  await expect.poll(async () => (await liveRows('library_items', { volume_id: FEATURED.id }))[0].status).toBe('finished')
  await page.getByRole('link', { name: 'My Library' }).first().click()
  await expect(page.locator('.library-row:not(.is-skeleton) .status-control')).toHaveValue('finished')
})

test('a whitespace-only log is refused and nothing is saved', async ({ page }) => {
  await openOwnedBook(page)
  const before = (await liveRows('logs', { volume_id: FEATURED.id })).length
  await page.getByLabel(LOG_BOX).fill('   \n\t  ')
  await page.getByRole('button', { name: 'Post Log' }).click()
  await expect(page.locator('.book-write .field-error')).toHaveText("Log can't be empty.")
  await expect(page.getByLabel(LOG_BOX)).toBeFocused()
  expect(await liveRows('logs', { volume_id: FEATURED.id })).toHaveLength(before)
})

test('a log is capped at 5000 characters and the full 5000 saves', async ({ page }) => {
  await openOwnedBook(page)
  const box = page.getByLabel(LOG_BOX)
  await box.fill('a'.repeat(4999))
  await box.press('End')
  await page.keyboard.type('bc') // the 5001st character is refused by the textarea
  await expect(box).toHaveValue(`${'a'.repeat(4999)}b`)
  await expect(page.locator('.book-write .log-count')).toHaveText('5000/5000')
  await page.getByRole('button', { name: 'Post Log' }).click()
  await expect(toast(page, 'Log posted.')).toBeVisible()
  const saved = await liveRows('logs', { volume_id: FEATURED.id })
  expect(saved.some((l) => l.body.length === 5000 && l.body.endsWith('ab'))).toBe(true)
})

test('a picked rating can be cleared before posting', async ({ page }) => {
  await openOwnedBook(page)
  await page.getByLabel(LOG_BOX).fill('QA: rating cleared')
  await page.locator('.book-write .star-option').nth(2).click()
  await page.locator('.book-write').getByRole('button', { name: 'Clear' }).click()
  await expect(page.locator('.book-write .star-none')).toHaveText('No rating')
  await page.getByRole('button', { name: 'Post Log' }).click()
  const newest = page.locator('.log-item').first()
  await expect(newest.locator('.log-body')).toHaveText('QA: rating cleared')
  await expect(newest.locator('.log-norating')).toBeVisible()
  const row = (await liveRows('logs', { volume_id: FEATURED.id })).find((l) => l.body === 'QA: rating cleared')
  expect(row.rating).toBeNull()
})

test('HTML in a log body is shown as text, never run', async ({ page }) => {
  let dialogs = 0
  page.on('dialog', (d) => {
    dialogs += 1
    return d.dismiss()
  })
  await openOwnedBook(page)
  const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>'
  await page.getByLabel(LOG_BOX).fill(evil)
  await page.getByRole('button', { name: 'Post Log' }).click()
  const body = page.locator('.log-item').first().locator('.log-body')
  await expect(body).toHaveText(evil)
  await expect(body.locator('img, script')).toHaveCount(0)
  await page.waitForTimeout(500)
  expect(dialogs).toBe(0)
})

test('unicode and emoji survive a save and an edit unchanged', async ({ page }) => {
  await openOwnedBook(page)
  const text = '📚 Café — naïve 東京 “quotes” ‘and’ &amp;'
  await page.getByLabel(LOG_BOX).fill(text)
  await page.getByRole('button', { name: 'Post Log' }).click()
  const newest = page.locator('.log-item').first()
  await expect(newest.locator('.log-body')).toHaveText(text)
  await newest.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Edit your log')).toHaveValue(text)
  await page.getByLabel('Edit your log').fill('changed but cancelled')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(newest.locator('.log-body')).toHaveText(text)
  expect((await liveRows('logs', { volume_id: FEATURED.id })).some((l) => l.body === text)).toBe(true)
})

test('Esc closes the delete and remove dialogs, changes nothing, and returns focus', async ({ page }) => {
  await openOwnedBook(page)
  const mine = page.locator('.log-item.is-mine').first()
  const del = mine.getByRole('button', { name: 'Delete' })
  await del.click()
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  await expect(del).toBeFocused()

  const remove = page.getByRole('button', { name: 'Remove from Library' })
  await remove.click()
  await expect(dialog(page).locator('.confirm-text')).not.toHaveText('Checking your logs…')
  await page.keyboard.press('Escape')
  await expect(dialog(page)).toHaveCount(0)
  await expect(remove).toBeFocused()
  expect(await liveRows('library_items', {})).toHaveLength(1)
  expect(await liveRows('logs', {})).toHaveLength(1)
})

test.describe('320px wide', () => {
  test.use({ viewport: { width: 320, height: 640 } })
  test('My Library and the reader’s book page fit without sideways scroll', async ({ page }) => {
    await page.goto('/login')
    // logIn() waits for the desktop Log Out button, which lives in the menu on a phone
    await page.getByLabel('Email').fill(QR.email)
    await page.getByLabel('Password', { exact: true }).fill(QR.password)
    await page.getByRole('button', { name: 'Log In', exact: true }).click()
    await expect(page).not.toHaveURL(/\/login/)
    await page.getByRole('button', { name: 'Open menu' }).click()
    await page.locator('#mobile-menu').getByRole('link', { name: 'My Library' }).click()
    await expect(page.locator('.library-row:not(.is-skeleton)')).toHaveCount(1)
    expect(await sidewaysScroll(page)).toBe(0)
    await page.locator('.library-book').first().click()
    await expect(page.locator('.status-control')).toBeVisible()
    await expect(page.locator('.log-item').first()).toBeVisible()
    expect(await sidewaysScroll(page)).toBe(0)
  })
})

// QA-BUG: posting a log while "Loading logs…" is still showing loses it from the list.
// BookDetailsPage.jsx:158 prepends the new log with logs.setData(), but the in-flight
// load in useLoad.js:115 resolves afterwards and replaces the list with the older
// snapshot. The log IS saved (201), so the reader thinks it failed and may post it twice.
// The Post Log form is enabled as soon as the library item loads (BookDetailsPage.jsx:283),
// independent of the logs load, and listLogsForVolume always waits 180-400 ms on memoryDb.
test('a log posted while the log list is still loading stays visible', async ({ page }) => {
  await logInAsQuietReader(page)
  await page.route(
    (url) => url.pathname.endsWith('/rest/v1/logs') && url.searchParams.has('volume_id'),
    async (route) => {
      if (route.request().method() !== 'GET') return route.continue()
      // Read the list now, deliver it late: a snapshot taken before the post
      const response = await route.fetch()
      await new Promise((r) => setTimeout(r, 2500))
      await route.fulfill({ response })
    },
  )
  await openBook(page, FEATURED)
  await expect(page.getByText('Loading logs…')).toBeVisible()
  await page.getByLabel(LOG_BOX).fill('QA: posted during load')
  await page.getByRole('button', { name: 'Post Log' }).click()
  await expect(toast(page, 'Log posted.')).toBeVisible()
  await expect(page.locator('.log-total')).toBeVisible() // the slow load has now finished
  await expect(page.locator('.log-item.is-mine .log-body', { hasText: 'QA: posted during load' })).toBeVisible()
})
