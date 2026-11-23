import { test, expect } from '@playwright/test'

/** @param {import('@playwright/test').Page} page */
function collectErrors(page) {
  /** @type {string[]} */
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}

const count = (page, what) => page.evaluate((w) => window.show.engine[w].length, what)

test('the demo creates a canvas filling its container and auto-launches without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/demo/')
  const size = await page.evaluate(() => {
    const c = document.querySelector('#sky canvas')
    const dpr = devicePixelRatio
    return { css: [c.clientWidth, c.clientHeight], store: [c.width, c.height], win: [innerWidth, innerHeight], dpr }
  })
  expect(size.css).toEqual(size.win)
  expect(size.store).toEqual(size.win.map((v) => Math.round(v * size.dpr)))
  await expect.poll(() => count(page, 'particles'), { timeout: 5000 }).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('the canvas follows its container when the window resizes', async ({ page }) => {
  await page.goto('/demo/')
  await page.setViewportSize({ width: 640, height: 400 })
  await expect.poll(() => page.evaluate(() => window.show.currentOptions.boundaries.width)).toBe(640)
  expect(await page.evaluate(() => window.show.engine.height)).toBe(400)
})

for (const [button, type] of [
  ['Fireworks', 'Rocket'],
  ['Chicken', 'Chicken'],
]) {
  test(`the ${button} button launches a ${type} that explodes into particles`, async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/demo/')
    await page.evaluate(() => window.show.updateOptions({ intensity: 0 }).clear())
    await page.getByRole('button', { name: button }).click()
    expect(await page.evaluate(() => window.show.engine.projectiles.map((p) => p.constructor.name))).toContain(type)
    await expect.poll(() => count(page, 'particles'), { timeout: 5000 }).toBeGreaterThan(0)
    expect(errors).toEqual([])
  })
}

test('turning Auto off lets the sky burn out and stops the loop; Clear empties it', async ({ page }) => {
  await page.goto('/demo/')
  await expect.poll(() => count(page, 'particles'), { timeout: 5000 }).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Auto: on' }).click()
  await expect.poll(() => page.evaluate(() => window.show.isRunning), { timeout: 10000 }).toBe(false)
  await page.getByRole('button', { name: 'Auto: off' }).click()
  await expect.poll(() => count(page, 'projectiles')).toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Clear' }).click()
  expect(await page.evaluate(() => window.show.engine.empty)).toBe(true)
})

test('a show on a container it disposes removes its canvas', async ({ page }) => {
  await page.goto('/demo/')
  const left = await page.evaluate(async () => {
    const box = document.createElement('div')
    box.style.cssText = 'width: 200px; height: 100px'
    document.body.append(box)
    const s = new window.Xploders(box)
    const before = [box.querySelectorAll('canvas').length, s.engine.width, s.engine.height]
    s.launch(1)
    await s.waitStop(true)
    return [...before, box.querySelectorAll('canvas').length]
  })
  expect(left).toEqual([1, 200, 100, 0])
})

test('the script-tag build exposes a global Xploders class', async ({ page }) => {
  await page.goto('/demo/')
  await page.evaluate(() => delete window.Xploders)
  await page.addScriptTag({ url: '/dist/xploders.min.js' })
  const info = await page.evaluate(() => ({
    isClass: typeof window.Xploders === 'function',
    hasChicken: typeof window.Xploders.Chicken === 'function',
    hasBursts: Object.keys(window.Xploders.bursts).sort(),
  }))
  expect(info).toEqual({ isClass: true, hasChicken: true, hasBursts: ['crackle', 'peony', 'ring', 'willow'] })
})
