import { MODES } from '../../src/theme/modes.js'
import { BOOK_URL, a11yViolations, contentReady, expect, logIn, sidewaysScroll, startIn, test } from './fixtures.js'

// Every style mode must stay readable (WCAG AA), fit every screen, and stop its
// animated background when asked. See app_outline/style_guide.md.

const runningSceneAnimations = (page) =>
  page.evaluate(() => {
    const backdrop = document.querySelector('.backdrop')
    return backdrop.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length
  })

async function ready(page) {
  await contentReady(page)
  await page.evaluate(() => document.fonts.ready)
}

for (const mode of MODES) {
  test.describe(mode.name, () => {
    test.beforeEach(({ page }) => {
      // Several page loads plus an axe scan per test: give them 3x the usual time
      test.slow()
      return startIn(page, mode.key)
    })

    test('passes WCAG AA on Home, Book Details and My Library', async ({ page }) => {
      await page.goto('/')
      await ready(page)
      expect(await a11yViolations(page), 'Home').toEqual([])

      await page.goto(BOOK_URL)
      await ready(page)
      expect(await a11yViolations(page), 'Book Details').toEqual([])

      await page.goto('/login')
      await logIn(page)
      await page.getByRole('link', { name: 'My Library' }).first().click()
      await page.locator('.library-row:not(.is-skeleton)').first().waitFor()
      expect(await a11yViolations(page), 'My Library').toEqual([])
    })

    test('the background scene moves, and stops when asked', async ({ page }) => {
      await page.goto('/')
      await ready(page)
      await expect(page.locator('.backdrop')).toHaveAttribute('data-scene', mode.key)
      await expect(page.locator('.backdrop')).toHaveAttribute('aria-hidden', 'true')
      await expect.poll(() => runningSceneAnimations(page)).toBeGreaterThan(0)

      // A hidden tab pauses the scene
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await expect.poll(() => runningSceneAnimations(page)).toBe(0)
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await expect.poll(() => runningSceneAnimations(page)).toBeGreaterThan(0)

      // The device's reduced-motion setting pauses it
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect.poll(() => runningSceneAnimations(page)).toBe(0)
    })

    test('fits phone, tablet and desktop screens', async ({ page }) => {
      for (const width of [375, 768, 1280]) {
        await page.setViewportSize({ width, height: 800 })
        for (const url of ['/', BOOK_URL, '/genre/sci-fi']) {
          await page.goto(url)
          await ready(page)
          expect(await sidewaysScroll(page), `${url} at ${width}px`).toBe(0)
        }
      }
    })
  })
}

test.describe('Mode picker', () => {
  test('picks a mode and remembers it after a refresh', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Change style mode' }).click()
    const tile = page.getByRole('button', { name: /Neon Arcade/ })
    await tile.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon-arcade')
    await expect(page.getByRole('button', { name: 'Change style mode' })).toBeFocused()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'neon-arcade')
  })

  test('works with the keyboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Change style mode' }).click()
    await expect(page.getByRole('button', { name: /Street Royalty/ })).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(page.locator('html')).toHaveAttribute('data-theme', MODES[1].key)
    await page.getByRole('button', { name: 'Change style mode' }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Style modes' })).toBeHidden()
  })

  test('the animation switch turns the scene off and remembers it', async ({ page }) => {
    await page.goto('/')
    await contentReady(page)
    await page.getByRole('button', { name: 'Change style mode' }).click()
    const toggle = page.getByRole('switch', { name: /Background animation/ })
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
    await expect.poll(() => runningSceneAnimations(page)).toBe(0)
    await page.reload()
    await contentReady(page)
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off')
    await expect.poll(() => runningSceneAnimations(page)).toBe(0)
  })
})

test('Kid Korner hides mature books', async ({ page }) => {
  const count = async () => Number((await page.locator('.browse-count').innerText()).match(/\d+/)[0])
  await page.goto('/genre/horror')
  const everyone = await count()
  await startIn(page, 'kid-korner')
  await page.goto('/genre/horror')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'kid-korner')
  expect(await count()).toBeLessThan(everyone)
})
