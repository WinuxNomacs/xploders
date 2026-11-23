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
    await expect.poll(() => count(page, 'particles'), { timeout: 15000 }).toBeGreaterThan(0)
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

test('a chicken flaps, panics and explodes into feathers and sparks without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/demo/')
  await page.evaluate(() => window.show.updateOptions({ intensity: 0 }).clear())
  await page.getByLabel('Chicken flight').selectOption('cross')
  await page.getByRole('button', { name: 'Chicken' }).click()
  const c = await page.evaluate(() => ({ flight: window.show.engine.projectiles[0].flight }))
  expect(c.flight).toBe('cross')
  await expect.poll(() => page.evaluate(() => window.show.engine.projectiles[0]?.panicking ?? false), { timeout: 15000, intervals: [100] }).toBe(true) // panic lasts 0.5 s
  await expect
    .poll(() => page.evaluate(() => window.show.engine.particles.filter((p) => p.constructor.name === 'Feather').length), { timeout: 5000 })
    .toBeGreaterThan(0)
  expect(await count(page, 'projectiles')).toBe(0)
  expect(errors).toEqual([])
})

test('a moving chicken leaves no ghost, while the same chicken on the trail layer would', async ({ page }) => {
  await page.goto('/demo/')
  const result = await page.evaluate(() => {
    const show = window.show
    show.updateOptions({ intensity: 0, opacity: 0.1 })
    const e = show.engine
    const leftover = (layer) => {
      show.clear()
      show.launch('chicken', 1, { flight: 'rise', panicSteps: 1000 })
      if (show.isRunning) show.pause() // drive steps by hand
      const c = e.projectiles[0]
      c.layer = layer
      for (let i = 0; i < 40; i++) e.step() // well onto the screen
      e.draw(1)
      const [x0, y0] = [c.x, c.y]
      for (let i = 0; i < 25; i++) {
        e.step()
        e.draw(1)
      }
      const dpr = devicePixelRatio
      const box = 40 // inside the 48 px sprite, around where it was
      const data = e.ctx.getImageData((x0 - box / 2) * dpr, (y0 - box / 2) * dpr, box * dpr, box * dpr).data
      let sum = 0
      for (let i = 3; i < data.length; i += 4) sum += data[i]
      return { sum, moved: Math.hypot(c.x - x0, c.y - y0), onScreen: y0 > box && y0 < e.height - box }
    }
    return { sprite: leftover('sprite'), trail: leftover('trail') }
  })
  expect(result.sprite.onScreen).toBe(true)
  expect(result.sprite.moved).toBeGreaterThan(60)
  expect(result.sprite.sum).toBe(0)
  expect(result.trail.sum).toBeGreaterThan(0)
})

test('the script-tag build exposes a global Xploders class', async ({ page }) => {
  await page.goto('/demo/')
  await page.evaluate(() => delete window.Xploders)
  await page.addScriptTag({ url: '/dist/xploders.min.js' })
  const info = await page.evaluate(() => ({
    isClass: typeof window.Xploders === 'function',
    hasChicken: typeof window.Xploders.Chicken === 'function',
    hasBursts: Object.keys(window.Xploders.bursts).sort(),
    hasSprite: typeof window.Xploders.Sprite.fromPixels === 'function',
  }))
  expect(info).toEqual({ isClass: true, hasChicken: true, hasBursts: ['crackle', 'peony', 'ring', 'willow'], hasSprite: true })
})
