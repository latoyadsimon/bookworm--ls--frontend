# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-guest.spec.js >> Sign Up display names (sign-up is mocked: no account is saved to the database) >> a name containing * is not treated as a wildcard
- Location: tests/e2e/qa-guest.spec.js:264:3

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('.field-error')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" locator('.field-error') with timeout 5000ms
  - waiting for locator('.field-error')
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [aria-hidden]:
    - img:
      - generic: QUEEN
    - img:
      - generic: READ
  - generic [ref=e3]:
    - link "Skip to content" [ref=e4] [cursor=pointer]:
      - /url: "#main"
    - banner [ref=e5]:
      - navigation "Main" [ref=e6]:
        - link "BookWorm home" [ref=e7] [cursor=pointer]:
          - /url: /
          - generic [ref=e11]: BookWorm
        - list [ref=e12]:
          - listitem [ref=e13]:
            - link "Home" [ref=e14] [cursor=pointer]:
              - /url: /
          - listitem [ref=e15]:
            - button "Genres" [ref=e17] [cursor=pointer]
          - listitem [ref=e20]:
            - link "Featured" [ref=e21] [cursor=pointer]:
              - /url: /featured
        - search [ref=e22]:
          - generic [ref=e23]:
            - generic [ref=e24]: Search books
            - searchbox "Search books" [ref=e28]
            - generic [ref=e29]: Search by
            - combobox "Search by" [ref=e30] [cursor=pointer]:
              - option "All" [selected]
              - option "Title"
              - option "Author"
              - option "ISBN"
              - option "Featured"
            - button "Search" [ref=e31] [cursor=pointer]
        - generic [ref=e35]:
          - button "Change style mode" [ref=e37] [cursor=pointer]
          - generic [ref=e43]:
            - link "Log In" [ref=e44] [cursor=pointer]:
              - /url: /login
            - link "Sign Up" [ref=e45] [cursor=pointer]:
              - /url: /signup
    - main [ref=e46]:
      - form [ref=e48]:
        - heading "Join BookWorm" [level=1] [ref=e49]
        - paragraph [ref=e50]: Save books, track your reading and write logs.
        - generic [ref=e51]:
          - generic [ref=e52]:
            - text: Display name
            - generic [ref=e53]: (shown on your logs)
          - textbox "Display name (shown on your logs)" [active] [invalid] [ref=e55]: Book*
          - paragraph [ref=e56]: That display name is taken. Try another one.
        - generic [ref=e57]:
          - generic [ref=e58]: Email
          - textbox "Email" [ref=e60]: qa-star-1792989919053@example.com
        - generic [ref=e61]:
          - generic [ref=e62]:
            - text: Password
            - generic [ref=e63]: (at least 6 characters)
          - generic [ref=e64]:
            - textbox "Password (at least 6 characters)" [ref=e65]: secret123
            - button "Show password" [ref=e66] [cursor=pointer]: Show
        - button "Create Account" [ref=e67] [cursor=pointer]
        - paragraph [ref=e68]:
          - text: Have an account?
          - link "Log in" [ref=e69] [cursor=pointer]:
            - /url: /login
  - status
```

# Test source

```ts
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
  182 |       expect(await sidewaysScroll(page)).toBe(0)
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
> 269 |     await expect(page.locator('.field-error')).toHaveCount(0)
      |                                                ^ Error: expect(locator).toHaveCount(expected) failed
  270 |     await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
  271 |   })
  272 | })
  273 | 
```