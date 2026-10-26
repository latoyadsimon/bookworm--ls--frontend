# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-guest.spec.js >> 320px wide screens >> /search?q=Supercalifragilistic…ype=featured has no sideways scroll
- Location: tests/e2e/qa-guest.spec.js:178:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1213
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main"
    - banner [ref=e5]:
      - navigation "Main" [ref=e6]:
        - link "BookWorm home" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e11]: BookWorm
        - generic [ref=e12]:
          - button "Open search" [ref=e13] [cursor=pointer]
          - button "Change style mode" [ref=e18] [cursor=pointer]
          - button "Open menu" [ref=e24] [cursor=pointer]
    - main [ref=e27]:
      - generic [ref=e28]:
        - search [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]: Search books
            - searchbox "Search books" [ref=e35]: SupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidocious
            - generic [ref=e36]: Search by
            - combobox "Search by" [ref=e37] [cursor=pointer]:
              - option "All"
              - option "Title"
              - option "Author"
              - option "ISBN"
              - option "Featured" [selected]
            - button "Search" [ref=e38] [cursor=pointer]
        - heading "Results for “SupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidocious”" [level=1] [ref=e42]
        - generic [ref=e43]:
          - paragraph [ref=e44]: No featured picks found for “SupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidocious”.
          - generic [ref=e45]:
            - paragraph [ref=e46]: Try a different search or search type.
            - link "See all featured picks" [ref=e47] [cursor=pointer]:
              - /url: /featured
  - status
```

# Test source

```ts
  82  |     })
  83  |     await page.goto('/search?q=Neural&type=title')
  84  |     await expect(page.locator('.book-card.is-skeleton').first()).toBeVisible()
  85  |     await navSearch(page, 'Starship', 'title')
  86  |     await expect(page).toHaveURL(/q=Starship/)
  87  |     await expect(bookCards(page).first()).toBeVisible()
  88  |     // Wait past the slow response, then make sure it did not overwrite the newer results
  89  |     await page.waitForTimeout(3500)
  90  |     const titles = await page.locator('.book-grid .book-card-title').allTextContents()
  91  |     expect(titles.length).toBeGreaterThan(0)
  92  |     expect(titles.every((t) => t.includes('Starship'))).toBe(true)
  93  |     await expect(page.locator('h1')).toHaveText('Results for “Starship”')
  94  |   })
  95  | })
  96  | 
  97  | test.describe('History', () => {
  98  |   test('Back and Forward keep a genre list with every loaded page', async ({ page }) => {
  99  |     await page.goto('/genre/adventure')
  100 |     await bookCards(page).first().waitFor()
  101 |     await page.getByRole('button', { name: 'Load More' }).click()
  102 |     await expect.poll(() => bookCards(page).count()).toBeGreaterThan(20)
  103 |     const loaded = await bookCards(page).count()
  104 |     const firstTitle = await page.locator('.book-grid .book-card-title').first().textContent()
  105 | 
  106 |     await bookCards(page).nth(25).click()
  107 |     await expect(page).toHaveURL(/\/books\//)
  108 |     await expect(page.locator('#book-title')).toBeVisible()
  109 |     await page.goBack()
  110 |     await expect(bookCards(page)).toHaveCount(loaded)
  111 |     await page.goForward()
  112 |     await expect(page).toHaveURL(/\/books\//)
  113 |     await expect(page.locator('#book-title')).toBeVisible()
  114 |     await page.goBack()
  115 |     await expect(bookCards(page)).toHaveCount(loaded)
  116 |     await expect(page.locator('.book-grid .book-card-title').first()).toHaveText(firstTitle)
  117 |   })
  118 | })
  119 | 
  120 | test.describe('Keyboard', () => {
  121 |   test('Esc closes the Genres menu and returns focus to its button', async ({ page }) => {
  122 |     await page.goto('/')
  123 |     const button = page.getByRole('button', { name: 'Genres' })
  124 |     await button.click()
  125 |     await page.locator('.genres-menu a').first().focus()
  126 |     await page.keyboard.press('Escape')
  127 |     await expect(page.locator('.genres-menu')).toHaveCount(0)
  128 |     await expect(button).toBeFocused()
  129 |   })
  130 | 
  131 |   test('Esc closes the style-mode picker and returns focus to its button', async ({ page }) => {
  132 |     await page.goto('/')
  133 |     const button = page.getByRole('button', { name: 'Change style mode' })
  134 |     await button.click()
  135 |     await expect(page.getByRole('dialog', { name: 'Style modes' })).toBeVisible()
  136 |     await page.keyboard.press('Escape')
  137 |     await expect(page.getByRole('dialog', { name: 'Style modes' })).toHaveCount(0)
  138 |     await expect(button).toBeFocused()
  139 |   })
  140 | 
  141 |   test.describe('phone menu', () => {
  142 |     test.use({ viewport: { width: 375, height: 800 } })
  143 | 
  144 |     // QA-BUG: NavBar.jsx:31 closes the mobile menu on Escape but never moves focus
  145 |     // back to the "Open menu" button. Focus was inside the removed panel, so it falls
  146 |     // to <body> and keyboard users lose their place (WCAG 2.4.3 Focus Order).
  147 |     test('Esc closes the phone menu and returns focus to the menu button', async ({ page }) => {
  148 |       await page.goto('/')
  149 |       await page.getByRole('button', { name: 'Open menu' }).click()
  150 |       await page.locator('#mobile-menu a').first().focus()
  151 |       await page.keyboard.press('Escape')
  152 |       await expect(page.locator('#mobile-menu')).toHaveCount(0)
  153 |       await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused()
  154 |     })
  155 |   })
  156 | })
  157 | 
  158 | // QA-BUG (the two long-word cases): a query that is one long unbroken word (a pasted URL,
  159 | // a run of characters) overflows the page sideways, by 1213px at 320 wide and still 269px
  160 | // at 1280. `.state-message-title` (components/books.css:244) has no overflow-wrap, so
  161 | // "No books found for “…”" sets the min-content width of the `.browse` grid
  162 | // (routes/browse.css:2), which also stops the h1 and the search box from wrapping.
  163 | test.describe('320px wide screens', () => {
  164 |   test.use({ viewport: { width: 320, height: 640 } })
  165 |   const long = 'Supercalifragilisticexpialidocious'.repeat(5) // one 170-char word
  166 |   for (const url of [
  167 |     '/',
  168 |     '/search?q=the&type=title',
  169 |     `/search?q=${long}&type=all`,
  170 |     `/search?q=${long}&type=featured`,
  171 |     '/genre/horror',
  172 |     '/featured',
  173 |     BOOK_URL,
  174 |     '/login',
  175 |     '/signup',
  176 |     '/this/page/does/not/exist',
  177 |   ]) {
  178 |     test(`${url.length > 60 ? `${url.slice(0, 30)}…${url.slice(-12)}` : url} has no sideways scroll`, async ({ page }) => {
  179 |       await page.goto(url)
  180 |       await page.locator('main').waitFor()
  181 |       await page.waitForLoadState('networkidle')
> 182 |       expect(await sidewaysScroll(page)).toBe(0)
      |                                          ^ Error: expect(received).toBe(expected) // Object.is equality
  183 |     })
  184 |   }
  185 | })
  186 | 
  187 | test.describe('Navigation through every guest route', () => {
  188 |   test('in-app links reach every page with no console errors', async ({ page }) => {
  189 |     await page.goto('/')
  190 |     await contentReady(page)
  191 |     for (const genre of ['Adventure', 'Technology', 'Horror', 'Sci-Fi', 'Fiction', 'Non-Fiction']) {
  192 |       await page.getByRole('button', { name: 'Genres' }).click()
  193 |       await page.locator('.genres-menu').getByRole('link', { name: genre, exact: true }).click()
  194 |       await expect(page).toHaveURL(/\/genre\//)
  195 |       await bookCards(page).first().waitFor()
  196 |     }
  197 |     await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Featured' }).click()
  198 |     await expect(page).toHaveURL(/\/featured$/)
  199 |     await bookCards(page).first().click()
  200 |     await expect(page.locator('#book-title')).toBeVisible()
  201 |     await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Log In' }).click()
  202 |     await expect(page).toHaveURL(/\/login$/)
  203 |     await page.getByRole('link', { name: 'Sign up', exact: true }).click()
  204 |     await expect(page).toHaveURL(/\/signup$/)
  205 |     await page.getByRole('link', { name: 'BookWorm home' }).click()
  206 |     await expect(page).toHaveURL(/\/$/)
  207 |     await contentReady(page)
  208 |     // the console-error check runs in the fixture after the test
  209 |   })
  210 | })
  211 | 
  212 | test.describe('Saved preferences', () => {
  213 |   test('a corrupted saved mode falls back to the default and is repaired', async ({ page }) => {
  214 |     await page.addInitScript(() => {
  215 |       if (!sessionStorage.getItem('qa-seeded')) {
  216 |         localStorage.setItem('bookworm-theme', '"><img src=x onerror=alert(1)>')
  217 |         localStorage.setItem('bookworm-motion', 'sideways')
  218 |         sessionStorage.setItem('qa-seeded', '1')
  219 |       }
  220 |     })
  221 |     await page.goto('/')
  222 |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'street-royalty')
  223 |     await expect(page.locator('html')).toHaveAttribute('data-motion', 'on')
  224 |     expect(await page.evaluate(() => localStorage.getItem('bookworm-theme'))).toBe('street-royalty')
  225 |   })
  226 | 
  227 |   test('a picked mode survives a reload on a deep link', async ({ page }) => {
  228 |     await page.goto(BOOK_URL)
  229 |     await page.getByRole('button', { name: 'Change style mode' }).click()
  230 |     await page.getByRole('dialog', { name: 'Style modes' }).getByRole('button', { name: /Neon Arcade/ }).click()
  231 |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon-arcade')
  232 |     await page.reload()
  233 |     await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon-arcade')
  234 |     await expect(page.locator('#book-title')).toHaveText(FEATURED.title)
  235 |   })
  236 | })
  237 | 
  238 | test.describe('Sign Up display names (sign-up is mocked: no account is saved to the database)', () => {
  239 |   const fill = async (page, name, email) => {
  240 |     await page.getByLabel('Display name').fill(name)
  241 |     await page.getByLabel('Email').fill(email)
  242 |     await page.getByLabel(/^Password/).fill('secret123')
  243 |     await page.getByRole('button', { name: /Create Account|Creating/ }).click()
  244 |   }
  245 | 
  246 |   test('a saved reader’s name in another case is refused', async ({ page }) => {
  247 |     await page.goto('/signup')
  248 |     await fill(page, 'qUIETrEADER', `qa-case-${Date.now()}@example.com`)
  249 |     await expect(page.locator('.field-error')).toHaveText('That display name is taken. Try another one.')
  250 |     await expect(page.getByLabel('Display name')).toBeFocused()
  251 |     await expect(page).toHaveURL(/\/signup$/)
  252 |   })
  253 | 
  254 |   test('a name with SQL LIKE wildcards (_ and %) is not treated as a pattern', async ({ page }) => {
  255 |     await mockSignUp(page, { email: 'qa-like@example.com', display_name: 'Q_ietReader' })
  256 |     await page.goto('/signup')
  257 |     await fill(page, 'Q_ietReader', `qa-like-${Date.now()}@example.com`)
  258 |     await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
  259 |   })
  260 | 
  261 |   // QA-BUG: PostgREST reads `*` in an ilike filter as `%`, and db.js escapeLike does
  262 |   // not escape it, so "Book*" matches the saved reader "BookLover42" and the new
  263 |   // reader is told the name is taken.
  264 |   test('a name containing * is not treated as a wildcard', async ({ page }) => {
  265 |     await mockSignUp(page, { email: 'qa-star@example.com', display_name: 'Book*' })
  266 |     await page.goto('/signup')
  267 |     await fill(page, 'Book*', `qa-star-${Date.now()}@example.com`)
  268 |     await expect(page.getByRole('button', { name: 'Log Out' }).or(page.locator('.field-error'))).toBeVisible()
  269 |     await expect(page.locator('.field-error')).toHaveCount(0)
  270 |     await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
  271 |   })
  272 | })
  273 | 
```