import { BOOK_URL, DEMO_LOGIN, NEON_ID, expect, logIn, mockSignUp, test } from './fixtures.js'

const submit = (page) => page.getByRole('button', { name: 'Log In', exact: true }).click()
const createAccount = (page) => page.getByRole('button', { name: /Create Account|Creating/ }).click()
const alertBox = (page) => page.locator('.auth-alert')
const fieldErrors = (page) => page.locator('.field-error')

test.describe('Log In', () => {
  test('My Library sends guests to Log In, then back', async ({ page }) => {
    await page.goto('/library')
    await expect(page).toHaveURL(/\/login/)
    await logIn(page)
    await expect(page).toHaveURL(/\/library/)
  })

  test('checks the fields before sending', async ({ page }) => {
    await page.goto('/login')
    await submit(page)
    await expect(fieldErrors(page)).not.toHaveCount(0)
    await expect(page.getByLabel('Email')).toBeFocused()
  })

  test('wrong password and unknown email get the same message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(DEMO_LOGIN.email)
    await page.getByLabel('Password', { exact: true }).fill('wrongpass')
    await submit(page)
    await expect(page.locator('.auth-submit')).toBeDisabled()
    await expect(alertBox(page)).toHaveText('Email or password is incorrect.')
    await page.getByLabel('Email').fill('nobody@example.com')
    await submit(page)
    await expect(page.locator('.auth-submit')).toBeEnabled()
    await expect(alertBox(page)).toHaveText('Email or password is incorrect.')
  })

  test('explains a rate limit from Supabase Auth', async ({ page }) => {
    await page.route('**/auth/v1/token*', (route) =>
      route.fulfill({ status: 429, json: { code: 429, error_code: 'over_request_rate_limit', msg: 'Request rate limit reached' } }),
    )
    await page.goto('/login')
    await page.getByLabel('Email').fill(DEMO_LOGIN.email)
    await page.getByLabel('Password', { exact: true }).fill('wrongpass')
    await submit(page)
    await expect(alertBox(page)).toHaveText('Too many attempts. Please wait a minute and try again.')
  })

  test('stays signed in after a refresh and a deep link', async ({ page }) => {
    await page.goto('/login')
    await logIn(page)
    await page.reload()
    await expect(page.getByRole('button', { name: 'Log Out' })).toBeVisible()
    await page.goto('/library')
    await expect(page).toHaveURL(/\/library/)
    await expect(page.locator('.nav-user')).toHaveText('BookLover42')
  })

  test('signed-in readers are sent away from Log In', async ({ page }) => {
    await page.goto('/login')
    await logIn(page)
    await page.evaluate(() => {
      history.pushState({}, '', '/login')
      dispatchEvent(new PopStateEvent('popstate'))
    })
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('Log Out returns to Home as a guest', async ({ page }) => {
    await page.goto('/login')
    await logIn(page)
    await page.getByRole('button', { name: 'Log Out' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: 'Log In' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'My Library' })).toHaveCount(0)
  })

  test('Add to Library as a guest logs in and comes back to the book', async ({ page }) => {
    await page.goto(BOOK_URL)
    await page.getByRole('button', { name: '+ Add to Library' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.getByRole('button', { name: 'Fill in demo login' }).click()
    await expect(page.getByLabel('Email')).toHaveValue(DEMO_LOGIN.email)
    await submit(page)
    await expect(page).toHaveURL(BOOK_URL)
  })

  test('explains when the server cannot be reached', async ({ page }) => {
    await page.goto('/login?simulate=offline')
    await page.getByLabel('Email').fill(DEMO_LOGIN.email)
    await page.getByLabel('Password', { exact: true }).fill(DEMO_LOGIN.password)
    await submit(page)
    await expect(alertBox(page)).toHaveText("Can't reach the server. Check your connection and try again.")
  })
})

test.describe('Sign Up', () => {
  test('checks every field, the display name and the email', async ({ page }) => {
    await page.goto('/signup')
    await createAccount(page)
    await expect(fieldErrors(page)).not.toHaveCount(0)

    await page.getByLabel(/Display name/).fill('booklover42')
    await page.getByLabel('Email').fill('new@reader.dev')
    await page.getByLabel(/^Password/).fill('abc')
    await createAccount(page)
    await expect(fieldErrors(page)).toContainText(['That display name is taken. Try another one.', 'Password must be at least 6 characters.'])

    await page.getByLabel(/Display name/).fill('Fresh Reader')
    await page.getByLabel('Email').fill('PageTurner@example.com')
    await page.getByLabel(/^Password/).fill('secret12')
    await createAccount(page)
    await expect(fieldErrors(page)).toContainText(['An account with this email already exists.'])
  })

  test('creates an account and signs in', async ({ page }) => {
    await mockSignUp(page, { email: 'fresh@reader.dev', display_name: 'Fresh Reader' })
    await page.goto('/signup')
    await page.getByLabel(/Display name/).fill('Fresh Reader')
    await page.getByLabel('Email').fill('fresh@reader.dev')
    await page.getByLabel(/^Password/).fill('secret12')
    await createAccount(page)
    await expect(page).toHaveURL('/')
    await expect(page.locator('.nav-user')).toContainText('Fresh Reader')
  })

  test('explains a rate limit', async ({ page }) => {
    await page.goto('/signup?simulate=429')
    await page.getByLabel(/Display name/).fill('Someone New')
    await page.getByLabel('Email').fill('s@n.dev')
    await page.getByLabel(/^Password/).fill('secret12')
    await createAccount(page)
    await expect(alertBox(page)).toHaveText('Too many attempts. Please wait a minute and try again.')
  })
})

test.describe('saved style mode', () => {
  // Writes the theme in the live database: snapshotted first and restored after
  test.use({ dbUser: NEON_ID })

  test('a reader’s style mode is saved to their profile', async ({ page }) => {
    await page.goto('/login')
    await logIn(page, { email: 'neonnovelist@example.com', password: 'neonnovelist1' })
    await page.getByRole('button', { name: 'Change style mode' }).click()
    const saved = page.waitForResponse((r) => r.url().includes('/rest/v1/profiles') && r.request().method() === 'PATCH')
    await page.getByRole('button', { name: /Little Cafe/ }).click()
    await saved
    await page.getByRole('button', { name: 'Log Out' }).click()

    // As a guest, switch back to the default mode
    await page.getByRole('button', { name: 'Change style mode' }).click()
    await page.getByRole('button', { name: /Street Royalty/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'street-royalty')

    // Logging back in brings the reader's saved mode back
    await page.getByRole('link', { name: 'Log In' }).click()
    await logIn(page, { email: 'neonnovelist@example.com', password: 'neonnovelist1' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'little-cafe')
  })
})
