# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: qa-reader.spec.js >> a log posted while the log list is still loading stays visible
- Location: tests/e2e/qa-reader.spec.js:202:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.log-item.is-mine .log-body').filter({ hasText: 'QA: posted during load' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.log-item.is-mine .log-body').filter({ hasText: 'QA: posted during load' }) with timeout 5000ms
  - waiting for locator('.log-item.is-mine .log-body').filter({ hasText: 'QA: posted during load' })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - navigation "Main":
    - link "BookWorm home":
      - /url: /
      - text: BookWorm
    - list:
      - listitem:
        - link "Home":
          - /url: /
      - listitem:
        - button "Genres"
      - listitem:
        - link "Featured":
          - /url: /featured
    - search:
      - text: Search books
      - searchbox "Search books"
      - text: Search by
      - combobox "Search by":
        - option "All" [selected]
        - option "Title"
        - option "Author"
        - option "ISBN"
        - option "Featured"
      - button "Search"
    - button "Change style mode"
    - link "My Library":
      - /url: /library
    - text: QuietReader
    - button "Log Out"
- main:
  - article "The Pragmatic Programmer":
    - img "Cover of The Pragmatic Programmer"
    - heading "The Pragmatic Programmer" [level=1]
    - paragraph: by Author 1
    - term: Publisher
    - definition: Fixture Press
    - term: Published
    - definition: "2001"
    - term: Pages
    - definition: "101"
    - term: Categories
    - definition: Fixture
    - term: Google rating
    - definition: 4 / 5
    - text: Reading status
    - combobox "Reading status":
      - option "🧁 Want to Read" [selected]
      - option "☕ Reading"
      - option "🍰 Finished"
    - button "Remove from Library"
    - region "About this book":
      - heading "About this book" [level=2]
      - paragraph: Your journey to mastery & beyond. Second paragraph.
    - region "Write a log":
      - heading "Write a log" [level=2]
      - text: What did you read? What do you think?
      - textbox "What did you read? What do you think?"
      - text: 0/5000
      - group "Rating (optional)":
        - text: Rating (optional)
        - radio "1 star"
        - text: 1 star
        - radio "2 stars"
        - text: 2 stars
        - radio "3 stars"
        - text: 3 stars
        - radio "4 stars"
        - text: 4 stars
        - radio "5 stars"
        - text: 5 stars No rating
      - button "Post Log"
    - region "Reader Logs":
      - heading "Reader Logs" [level=2]
      - paragraph: 6 logs, newest first
      - list:
        - listitem:
          - paragraph: BookLover42
          - paragraph:
            - time: Oct 25, 2026
          - img "Rated 5 out of 5"
          - paragraph: this is sooo super cool
        - listitem:
          - paragraph: BookLover42
          - paragraph:
            - time: Oct 23, 2026
            - text: · edited
          - text: No rating
          - paragraph: Chapter 7 on reading other people's code is the best part so far. Bookmarking it for my team.
        - listitem:
          - paragraph: QuietReader (you)
          - paragraph:
            - time: Oct 20, 2026
          - text: No rating
          - paragraph: Saving this one for my holiday. Everyone in my study group keeps quoting it.
          - button "Edit"
          - button "Delete"
        - listitem:
          - paragraph: BookLover42
          - paragraph:
            - time: Oct 14, 2026
            - text: · edited
          - img "Rated 4 out of 5"
          - paragraph: Three chapters in and the "small habits" framing already changed how I name things. The exercises at the end of each chapter are short enough to actually do.
        - listitem:
          - paragraph: PageTurner
          - paragraph:
            - time: Oct 11, 2026
          - img "Rated 5 out of 5"
          - paragraph: Wish I had read this when I started my first job. Practical, kind and very funny in places.
        - listitem:
          - paragraph: NeonNovelist
          - paragraph:
            - time: Oct 7, 2026
            - text: · edited
          - img "Rated 3 out of 5"
          - paragraph: Solid advice, though the examples lean heavily on one language. Still taking notes.
- status
```

# Test source

```ts
  120 |   const row = (await liveRows('logs', { volume_id: FEATURED.id })).find((l) => l.body === 'QA: rating cleared')
  121 |   expect(row.rating).toBeNull()
  122 | })
  123 | 
  124 | test('HTML in a log body is shown as text, never run', async ({ page }) => {
  125 |   let dialogs = 0
  126 |   page.on('dialog', (d) => {
  127 |     dialogs += 1
  128 |     return d.dismiss()
  129 |   })
  130 |   await openOwnedBook(page)
  131 |   const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>'
  132 |   await page.getByLabel(LOG_BOX).fill(evil)
  133 |   await page.getByRole('button', { name: 'Post Log' }).click()
  134 |   const body = page.locator('.log-item').first().locator('.log-body')
  135 |   await expect(body).toHaveText(evil)
  136 |   await expect(body.locator('img, script')).toHaveCount(0)
  137 |   await page.waitForTimeout(500)
  138 |   expect(dialogs).toBe(0)
  139 | })
  140 | 
  141 | test('unicode and emoji survive a save and an edit unchanged', async ({ page }) => {
  142 |   await openOwnedBook(page)
  143 |   const text = '📚 Café — naïve 東京 “quotes” ‘and’ &amp;'
  144 |   await page.getByLabel(LOG_BOX).fill(text)
  145 |   await page.getByRole('button', { name: 'Post Log' }).click()
  146 |   const newest = page.locator('.log-item').first()
  147 |   await expect(newest.locator('.log-body')).toHaveText(text)
  148 |   await newest.getByRole('button', { name: 'Edit' }).click()
  149 |   await expect(page.getByLabel('Edit your log')).toHaveValue(text)
  150 |   await page.getByLabel('Edit your log').fill('changed but cancelled')
  151 |   await page.getByRole('button', { name: 'Cancel' }).click()
  152 |   await expect(newest.locator('.log-body')).toHaveText(text)
  153 |   expect((await liveRows('logs', { volume_id: FEATURED.id })).some((l) => l.body === text)).toBe(true)
  154 | })
  155 | 
  156 | test('Esc closes the delete and remove dialogs, changes nothing, and returns focus', async ({ page }) => {
  157 |   await openOwnedBook(page)
  158 |   const mine = page.locator('.log-item.is-mine').first()
  159 |   const del = mine.getByRole('button', { name: 'Delete' })
  160 |   await del.click()
  161 |   await expect(dialog(page)).toBeVisible()
  162 |   await page.keyboard.press('Escape')
  163 |   await expect(dialog(page)).toHaveCount(0)
  164 |   await expect(del).toBeFocused()
  165 | 
  166 |   const remove = page.getByRole('button', { name: 'Remove from Library' })
  167 |   await remove.click()
  168 |   await expect(dialog(page).locator('.confirm-text')).not.toHaveText('Checking your logs…')
  169 |   await page.keyboard.press('Escape')
  170 |   await expect(dialog(page)).toHaveCount(0)
  171 |   await expect(remove).toBeFocused()
  172 |   expect(await liveRows('library_items', {})).toHaveLength(1)
  173 |   expect(await liveRows('logs', {})).toHaveLength(1)
  174 | })
  175 | 
  176 | test.describe('320px wide', () => {
  177 |   test.use({ viewport: { width: 320, height: 640 } })
  178 |   test('My Library and the reader’s book page fit without sideways scroll', async ({ page }) => {
  179 |     await page.goto('/login')
  180 |     // logIn() waits for the desktop Log Out button, which lives in the menu on a phone
  181 |     await page.getByLabel('Email').fill(QR.email)
  182 |     await page.getByLabel('Password', { exact: true }).fill(QR.password)
  183 |     await page.getByRole('button', { name: 'Log In', exact: true }).click()
  184 |     await expect(page).not.toHaveURL(/\/login/)
  185 |     await page.getByRole('button', { name: 'Open menu' }).click()
  186 |     await page.locator('#mobile-menu').getByRole('link', { name: 'My Library' }).click()
  187 |     await expect(page.locator('.library-row:not(.is-skeleton)')).toHaveCount(1)
  188 |     expect(await sidewaysScroll(page)).toBe(0)
  189 |     await page.locator('.library-book').first().click()
  190 |     await expect(page.locator('.status-control')).toBeVisible()
  191 |     await expect(page.locator('.log-item').first()).toBeVisible()
  192 |     expect(await sidewaysScroll(page)).toBe(0)
  193 |   })
  194 | })
  195 | 
  196 | // QA-BUG: posting a log while "Loading logs…" is still showing loses it from the list.
  197 | // BookDetailsPage.jsx:158 prepends the new log with logs.setData(), but the in-flight
  198 | // load in useLoad.js:115 resolves afterwards and replaces the list with the older
  199 | // snapshot. The log IS saved (201), so the reader thinks it failed and may post it twice.
  200 | // The Post Log form is enabled as soon as the library item loads (BookDetailsPage.jsx:283),
  201 | // independent of the logs load, and listLogsForVolume always waits 180-400 ms on memoryDb.
  202 | test('a log posted while the log list is still loading stays visible', async ({ page }) => {
  203 |   await logInAsQuietReader(page)
  204 |   await page.route(
  205 |     (url) => url.pathname.endsWith('/rest/v1/logs') && url.searchParams.has('volume_id'),
  206 |     async (route) => {
  207 |       if (route.request().method() !== 'GET') return route.continue()
  208 |       // Read the list now, deliver it late: a snapshot taken before the post
  209 |       const response = await route.fetch()
  210 |       await new Promise((r) => setTimeout(r, 2500))
  211 |       await route.fulfill({ response })
  212 |     },
  213 |   )
  214 |   await openBook(page, FEATURED)
  215 |   await expect(page.getByText('Loading logs…')).toBeVisible()
  216 |   await page.getByLabel(LOG_BOX).fill('QA: posted during load')
  217 |   await page.getByRole('button', { name: 'Post Log' }).click()
  218 |   await expect(toast(page, 'Log posted.')).toBeVisible()
  219 |   await expect(page.locator('.log-total')).toBeVisible() // the slow load has now finished
> 220 |   await expect(page.locator('.log-item.is-mine .log-body', { hasText: 'QA: posted during load' })).toBeVisible()
      |                                                                                                    ^ Error: expect(locator).toBeVisible() failed
  221 | })
  222 | 
```