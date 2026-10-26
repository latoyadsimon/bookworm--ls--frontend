// QA audit: guest-only (read-only) browser checks. No login, no database writes.
// Books and featured picks come from the fixtures, so Google is never called.
import { BOOK_URL, FEATURED, bookCards, contentReady, expect, sidewaysScroll, test } from './fixtures.js'
import { CATALOG } from './booksFixture.js'

const searchForm = (page) => page.getByRole('search').first()
async function navSearch(page, q, type) {
  const form = searchForm(page)
  await form.getByLabel('Search books').fill(q)
  await form.getByLabel('Search by').selectOption(type)
  await form.getByRole('button', { name: 'Search' }).click()
}

test.beforeEach(async ({ page }) => {
  // Motion off keeps two parallel browsers light; nothing here depends on the scene.
  // Only seeded when unset, so tests that reload keep what the page saved.
  await page.addInitScript(() => {
    if (localStorage.getItem('bookworm-motion') == null) localStorage.setItem('bookworm-motion', 'off')
  })
})

test.describe('Search URL tampering', () => {
  test('an unknown type falls back to "all" and still searches', async ({ page }) => {
    await page.goto('/search?type=evil&q=Clean%20Code')
    await expect(page.locator('.browse-count')).toContainText('searching by all')
    await expect(bookCards(page).first()).toBeVisible()
    await expect(searchForm(page).getByLabel('Search by')).toHaveValue('all')
  })

  test('a script tag in q renders as plain text', async ({ page }) => {
    let dialogs = 0
    page.on('dialog', (d) => {
      dialogs += 1
      return d.dismiss()
    })
    const q = '<img src=x onerror=alert(1)><script>alert(2)</script>'
    await page.goto(`/search?q=${encodeURIComponent(q)}&type=title`)
    await expect(page.locator('h1')).toHaveText(`Results for “${q}”`)
    await expect(page.locator('main img[src="x"], main script')).toHaveCount(0)
    expect(dialogs).toBe(0)
  })

  test('a 5000-character q shows the length message without breaking the page', async ({ page }) => {
    await page.goto(`/search?q=${'a'.repeat(5000)}&type=all`)
    await expect(page.locator('.state-message-title')).toHaveText('Search is too long (max 200 characters).')
    expect(await sidewaysScroll(page)).toBe(0)
  })

  test('ISBN typed with spaces and dashes in the search bar finds the book', async ({ page }) => {
    const book = CATALOG[0]
    await page.goto('/')
    const spaced = `${book.isbn13.slice(0, 3)} ${book.isbn13.slice(3, 4)}-${book.isbn13.slice(4)}`
    await navSearch(page, spaced, 'isbn')
    await expect(bookCards(page)).toHaveCount(1)
    await expect(page.locator('.book-card-title')).toHaveText(book.title)
  })
})

test.describe('Featured search with special characters', () => {
  for (const q of ['(.*', '[a-z', '100%', '\\', '?']) {
    test(`"${q}" shows the empty state instead of crashing`, async ({ page }) => {
      await page.goto('/')
      await navSearch(page, q, 'featured')
      await expect(page.getByText(`No featured picks found for “${q}”.`)).toBeVisible()
    })
  }
})

test.describe('Slow network race', () => {
  test.use({ allowConsoleErrors: true }) // the abandoned request may be logged as a failed fetch

  test('only the last search’s results are shown', async ({ page }) => {
    // Hold the first search's response back for 3 s
    await page.route('**/functions/v1/books*', async (route) => {
      const body = route.request().postDataJSON?.() ?? null
      if (body?.q === 'Neural') await new Promise((r) => setTimeout(r, 3000))
      try {
        await route.fallback()
      } catch {
        // the browser already cancelled it
      }
    })
    await page.goto('/search?q=Neural&type=title')
    await expect(page.locator('.book-card.is-skeleton').first()).toBeVisible()
    await navSearch(page, 'Starship', 'title')
    await expect(page).toHaveURL(/q=Starship/)
    await expect(bookCards(page).first()).toBeVisible()
    // Wait past the slow response, then make sure it did not overwrite the newer results
    await page.waitForTimeout(3500)
    const titles = await page.locator('.book-grid .book-card-title').allTextContents()
    expect(titles.length).toBeGreaterThan(0)
    expect(titles.every((t) => t.includes('Starship'))).toBe(true)
    await expect(page.locator('h1')).toHaveText('Results for “Starship”')
  })
})

test.describe('History', () => {
  test('Back and Forward keep a genre list with every loaded page', async ({ page }) => {
    await page.goto('/genre/adventure')
    await bookCards(page).first().waitFor()
    await page.getByRole('button', { name: 'Load More' }).click()
    await expect.poll(() => bookCards(page).count()).toBeGreaterThan(20)
    const loaded = await bookCards(page).count()
    const firstTitle = await page.locator('.book-grid .book-card-title').first().textContent()

    await bookCards(page).nth(25).click()
    await expect(page).toHaveURL(/\/books\//)
    await expect(page.locator('#book-title')).toBeVisible()
    await page.goBack()
    await expect(bookCards(page)).toHaveCount(loaded)
    await page.goForward()
    await expect(page).toHaveURL(/\/books\//)
    await expect(page.locator('#book-title')).toBeVisible()
    await page.goBack()
    await expect(bookCards(page)).toHaveCount(loaded)
    await expect(page.locator('.book-grid .book-card-title').first()).toHaveText(firstTitle)
  })
})

test.describe('Keyboard', () => {
  test('Esc closes the Genres menu and returns focus to its button', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Genres' })
    await button.click()
    await page.locator('.genres-menu a').first().focus()
    await page.keyboard.press('Escape')
    await expect(page.locator('.genres-menu')).toHaveCount(0)
    await expect(button).toBeFocused()
  })

  test('Esc closes the style-mode picker and returns focus to its button', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: 'Change style mode' })
    await button.click()
    await expect(page.getByRole('dialog', { name: 'Style modes' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Style modes' })).toHaveCount(0)
    await expect(button).toBeFocused()
  })

  test.describe('phone menu', () => {
    test.use({ viewport: { width: 375, height: 800 } })

    // QA-BUG: NavBar.jsx:31 closes the mobile menu on Escape but never moves focus
    // back to the "Open menu" button. Focus was inside the removed panel, so it falls
    // to <body> and keyboard users lose their place (WCAG 2.4.3 Focus Order).
    test('Esc closes the phone menu and returns focus to the menu button', async ({ page }) => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Open menu' }).click()
      await page.locator('#mobile-menu a').first().focus()
      await page.keyboard.press('Escape')
      await expect(page.locator('#mobile-menu')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused()
    })
  })
})

// QA-BUG (the two long-word cases): a query that is one long unbroken word (a pasted URL,
// a run of characters) overflows the page sideways, by 1213px at 320 wide and still 269px
// at 1280. `.state-message-title` (components/books.css:244) has no overflow-wrap, so
// "No books found for “…”" sets the min-content width of the `.browse` grid
// (routes/browse.css:2), which also stops the h1 and the search box from wrapping.
test.describe('320px wide screens', () => {
  test.use({ viewport: { width: 320, height: 640 } })
  const long = 'Supercalifragilisticexpialidocious'.repeat(5) // one 170-char word
  for (const url of [
    '/',
    '/search?q=the&type=title',
    `/search?q=${long}&type=all`,
    `/search?q=${long}&type=featured`,
    '/genre/horror',
    '/featured',
    BOOK_URL,
    '/login',
    '/signup',
    '/this/page/does/not/exist',
  ]) {
    test(`${url.length > 60 ? `${url.slice(0, 30)}…${url.slice(-12)}` : url} has no sideways scroll`, async ({ page }) => {
      await page.goto(url)
      await page.locator('main').waitFor()
      await page.waitForLoadState('networkidle')
      expect(await sidewaysScroll(page)).toBe(0)
    })
  }
})

test.describe('Navigation through every guest route', () => {
  test('in-app links reach every page with no console errors', async ({ page }) => {
    await page.goto('/')
    await contentReady(page)
    for (const genre of ['Adventure', 'Technology', 'Horror', 'Sci-Fi', 'Fiction', 'Non-Fiction']) {
      await page.getByRole('button', { name: 'Genres' }).click()
      await page.locator('.genres-menu').getByRole('link', { name: genre, exact: true }).click()
      await expect(page).toHaveURL(/\/genre\//)
      await bookCards(page).first().waitFor()
    }
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Featured' }).click()
    await expect(page).toHaveURL(/\/featured$/)
    await bookCards(page).first().click()
    await expect(page.locator('#book-title')).toBeVisible()
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log In' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.getByRole('link', { name: 'Sign up' }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await page.getByRole('link', { name: 'BookWorm home' }).click()
    await expect(page).toHaveURL(/\/$/)
    await contentReady(page)
    // the console-error check runs in the fixture after the test
  })
})

test.describe('Saved preferences', () => {
  test('a corrupted saved mode falls back to the default and is repaired', async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('qa-seeded')) {
        localStorage.setItem('bookworm-theme', '"><img src=x onerror=alert(1)>')
        localStorage.setItem('bookworm-motion', 'sideways')
        sessionStorage.setItem('qa-seeded', '1')
      }
    })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'street-royalty')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on')
    expect(await page.evaluate(() => localStorage.getItem('bookworm-theme'))).toBe('street-royalty')
  })

  test('a picked mode survives a reload on a deep link', async ({ page }) => {
    await page.goto(BOOK_URL)
    await page.getByRole('button', { name: 'Change style mode' }).click()
    await page.getByRole('dialog', { name: 'Style modes' }).getByRole('button', { name: /Neon Arcade/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon-arcade')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon-arcade')
    await expect(page.locator('#book-title')).toHaveText(FEATURED.title)
  })
})

test.describe('Sign Up display names (no account is saved to the database)', () => {
  const fill = async (page, name, email) => {
    await page.getByLabel('Display name').fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel(/^Password/).fill('secret123')
    await page.getByRole('button', { name: /Create Account|Creating/ }).click()
  }

  test('a saved reader’s name in another case is refused', async ({ page }) => {
    await page.goto('/signup')
    await fill(page, 'qUIETrEADER', `qa-case-${Date.now()}@example.com`)
    await expect(page.locator('.field-error')).toHaveText('That display name is taken. Try another one.')
    await expect(page.getByLabel('Display name')).toBeFocused()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('a name with SQL LIKE wildcards (_ and %) is not treated as a pattern', async ({ page }) => {
    await page.goto('/signup')
    await fill(page, 'Q_ietReader', `qa-like-${Date.now()}@example.com`)
    await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
  })

  // QA-BUG: PostgREST reads `*` in an ilike filter as `%`, and db.js escapeLike does
  // not escape it, so "Book*" matches the saved reader "BookLover42" and the new
  // reader is told the name is taken. (Session sign-ups live in memory only.)
  test('a name containing * is not treated as a wildcard', async ({ page }) => {
    await page.goto('/signup')
    await fill(page, 'Book*', `qa-star-${Date.now()}@example.com`)
    await expect(page.getByRole('button', { name: 'Log Out' }).or(page.locator('.field-error'))).toBeVisible()
    await expect(page.locator('.field-error')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
  })
})
