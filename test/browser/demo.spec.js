import { test, expect } from '@playwright/test'

/** @param {import('@playwright/test').Page} page */
function collectErrors(page) {
  /** @type {string[]} */
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}

test('the demo fills the window with a canvas and loads without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/demo/')
  const box = await page.locator('canvas#sky').boundingBox()
  expect(box?.width).toBeGreaterThan(100)
  expect(box?.height).toBeGreaterThan(100)
  expect(errors).toEqual([])
})

for (const [button, type] of [
  ['Fireworks', 'rocket'],
  ['Chicken', 'chicken'],
]) {
  test(`the ${button} button launches a ${type} that explodes into particles`, async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/demo/')
    await page.getByRole('button', { name: button }).click()
    await expect.poll(() => page.evaluate(() => window.show.engine.projectiles.length)).toBeGreaterThan(0)
    await expect
      .poll(() => page.evaluate(() => window.show.engine.particles.length), { timeout: 5000 })
      .toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
}

test('the script-tag build exposes a global Xploders class', async ({ page }) => {
  await page.goto('/demo/')
  await page.addScriptTag({ url: '/dist/xploders.min.js' })
  const info = await page.evaluate(() => ({
    isClass: typeof window.Xploders === 'function',
    hasChicken: typeof window.Xploders.Chicken === 'function',
  }))
  expect(info).toEqual({ isClass: true, hasChicken: true })
})
