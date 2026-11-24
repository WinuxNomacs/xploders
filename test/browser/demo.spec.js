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

test('a Jug-o-BOOM is lobbed up tumbling, bursts into a fireball and shards, and leaves an empty sky', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/demo/')
  await page.evaluate(() => window.show.updateOptions({ intensity: 0 }).clear())
  await page.getByRole('button', { name: 'Jug-o-BOOM' }).click()
  const start = await page.evaluate(() => ({ name: window.show.engine.projectiles[0].constructor.name, rotation: window.show.engine.projectiles[0].rotation }))
  expect(start.name).toBe('Jug')
  await expect.poll(() => page.evaluate(() => window.show.engine.projectiles[0]?.rotation), { timeout: 5000 }).not.toBe(start.rotation)
  const kinds = () => page.evaluate(() => [...new Set(window.show.engine.particles.map((p) => p.constructor.name))].sort())
  await expect.poll(kinds, { timeout: 15000, intervals: [100] }).toEqual(expect.arrayContaining(['Flame', 'Glow', 'Shard']))
  expect(await count(page, 'projectiles')).toBe(0)
  await expect.poll(() => count(page, 'particles'), { timeout: 15000 }).toBe(0)
  expect(errors).toEqual([])
})

test('a cow floats up, Moo!s with its bubble, explodes into steaks, milk and sparks, and leaves an empty sky', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/demo/')
  await page.evaluate(() => window.show.updateOptions({ intensity: 0 }).clear())
  await page.getByRole('button', { name: 'Cow' }).click()
  expect(await page.locator('#cow').getAttribute('aria-pressed')).toBe('true')
  expect(await page.evaluate(() => window.show.engine.projectiles[0].constructor.name)).toBe('Cow')
  await expect.poll(() => page.evaluate(() => window.show.engine.projectiles[0]?.phase), { timeout: 10000, intervals: [50] }).toBe('moo')
  const kinds = () => page.evaluate(() => [...new Set(window.show.engine.particles.map((p) => p.constructor.name))].sort())
  await expect.poll(kinds, { timeout: 10000, intervals: [100] }).toEqual(expect.arrayContaining(['Milk', 'Particle', 'Shard']))
  expect(await count(page, 'projectiles')).toBe(0)
  await expect.poll(() => count(page, 'particles'), { timeout: 15000 }).toBe(0)
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

test('the demo starts at intensity 15, while the library default stays 30', async ({ page }) => {
  await page.goto('/demo/')
  expect(await page.locator('#intensity').inputValue()).toBe('15')
  expect(await page.evaluate(() => window.show.options.intensity)).toBe(15)
  expect(await page.evaluate(() => new window.Xploders(document.createElement('div')).options.intensity)).toBe(30)
})

test('a click on the sky fires the last selected type at that spot, fireworks by default', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/demo/')
  await page.evaluate(() => window.show.updateOptions({ intensity: 0 }).clear())
  expect(await page.locator('#fireworks').getAttribute('aria-pressed')).toBe('true')
  expect(await page.getByRole('button', { name: /Pointer/ }).count()).toBe(0)
  const last = () =>
    page.evaluate(() => {
      const p = window.show.engine.projectiles.at(-1)
      return { type: p.constructor.name, target: p.target }
    })
  await page.mouse.click(400, 300)
  expect(await count(page, 'projectiles')).toBe(1)
  expect(await last()).toEqual({ type: 'Rocket', target: { x: 400, y: 300 } })

  await page.getByRole('button', { name: 'Chicken' }).click()
  expect(await page.locator('#chicken').getAttribute('aria-pressed')).toBe('true')
  expect(await page.locator('#fireworks').getAttribute('aria-pressed')).toBe('false')
  await page.mouse.click(500, 350)
  expect((await last()).type).toBe('Chicken')
  expect((await last()).target).toEqual({ x: 500, y: 350 })

  await page.getByRole('button', { name: 'Jug-o-BOOM' }).click()
  await page.mouse.click(600, 250)
  expect(await last()).toEqual({ type: 'Jug', target: { x: 600, y: 250 } })

  await page.getByRole('button', { name: 'Cow' }).click()
  await page.mouse.click(450, 280)
  expect(await last()).toEqual({ type: 'Cow', target: { x: 450, y: 280 } })

  // Not blocked by a sky full of rockets, and clicks on the controls launch nothing.
  await page.evaluate(() => window.show.launch(20))
  const before = await count(page, 'projectiles')
  await page.mouse.click(300, 400)
  expect(await count(page, 'projectiles')).toBe(before + 1)
  const n = await count(page, 'projectiles')
  await page.locator('label', { hasText: 'Intensity' }).click()
  expect(await count(page, 'projectiles')).toBe(n)
  expect(errors).toEqual([])
})

test('the boundaries editor: sliders while Boundaries is checked, and edges and corners drag without launching', async ({ page }) => {
  const errors = collectErrors(page)
  await page.setViewportSize({ width: 1000, height: 700 })
  await page.goto('/demo/')
  await page.evaluate(() => window.show.updateOptions({ intensity: 0 }).clear())
  const area = () => page.evaluate(() => window.show.targetArea)
  await expect(page.locator('#b-left')).toBeHidden()
  await page.getByLabel('Boundaries').check()
  await expect(page.locator('#b-left')).toBeVisible()
  expect(await page.evaluate(() => window.show.currentOptions.boundaries.debug)).toBe(true)

  // The sliders show the box, and move its edges.
  const before = await area()
  expect(Number(await page.locator('#b-left').inputValue())).toBe(before.left)
  await page.locator('#b-right').fill('100')
  expect((await area()).right).toBe(900)
  expect((await area()).left).toBe(before.left) // the right no longer follows the left
  await page.locator('#b-bottom').fill('150')
  expect((await area()).bottom).toBe(550)
  expect(await page.locator('#b-bottom-value').textContent()).toBe('150')

  // Dragging the bottom-right corner resizes the box and launches nothing.
  const a = await area()
  await page.mouse.move(a.right, a.bottom)
  expect(await page.evaluate(() => window.show.canvas.style.cursor)).toBe('nwse-resize')
  await page.mouse.down()
  await page.mouse.move(a.right - 200, a.bottom - 100, { steps: 5 })
  await page.mouse.up()
  expect(await area()).toMatchObject({ right: a.right - 200, bottom: a.bottom - 100 })
  expect(await count(page, 'projectiles')).toBe(0)
  expect(Number(await page.locator('#b-right').inputValue())).toBe(1000 - (a.right - 200))

  // A click inside the box still launches.
  const c = await area()
  await page.mouse.click((c.left + c.right) / 2, (c.top + c.bottom) / 2)
  expect(await count(page, 'projectiles')).toBe(1)

  // It can't be turned inside out.
  await page.mouse.move(c.left, (c.top + c.bottom) / 2)
  await page.mouse.down()
  await page.mouse.move(c.right + 300, (c.top + c.bottom) / 2, { steps: 5 })
  await page.mouse.up()
  expect((await area()).right - (await area()).left).toBe(20)
  expect(await count(page, 'projectiles')).toBe(1)

  // Unchecked: sliders gone, and the edge is just sky again.
  await page.getByLabel('Boundaries').uncheck()
  await expect(page.locator('#b-left')).toBeHidden()
  await page.mouse.click(c.right, c.bottom)
  expect(await count(page, 'projectiles')).toBe(2)
  expect(errors).toEqual([])
})

test('the box top follows the controls panel until it is set by hand', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 })
  await page.goto('/demo/')
  const top = () => page.evaluate(() => window.show.targetArea.top)
  const panelBottom = () => page.evaluate(() => Math.round(document.querySelector('.controls').getBoundingClientRect().bottom))
  expect(await top()).toBe((await panelBottom()) + 24)
  await page.getByLabel('Boundaries').check() // the sliders make the panel taller, and the top follows
  await expect.poll(top).toBe((await panelBottom()) + 24)
  await page.locator('#b-top').fill('300')
  expect(await top()).toBe(300)
  const tall = await panelBottom()
  await page.setViewportSize({ width: 420, height: 700 }) // the panel wraps taller
  await expect.poll(panelBottom).toBeGreaterThan(tall)
  await page.waitForTimeout(100)
  expect(await top()).toBe(300)
})

test('the library pointer option still holds, drags and releases over the panel', async ({ page }) => {
  await page.goto('/demo/')
  await page.evaluate(() => window.show.updateOptions({ intensity: 0, mouse: { click: true, max: 3 } }).clear())
  await page.mouse.move(400, 300)
  await page.mouse.down()
  await expect.poll(() => count(page, 'projectiles')).toBeGreaterThan(0)
  const first = await page.evaluate(() => window.show.engine.projectiles[0].target)
  expect(first).toEqual({ x: 400, y: 300 })
  await page.mouse.move(600, 250, { steps: 5 })
  await expect
    .poll(() => page.evaluate(() => window.show.engine.projectiles.some((p) => p.target.x === 600 && p.target.y === 250)))
    .toBe(true)
  // Release over the How-to panel, outside the canvas: pointer capture still ends the hold.
  const panel = await page.locator('.howto').boundingBox()
  await page.mouse.move(panel.x + 10, panel.y + 10, { steps: 5 })
  expect(await page.evaluate(() => window.show.pointer.active)).toBe(true) // captured: still holding off the canvas
  await page.mouse.up()
  expect(await page.evaluate(() => window.show.pointer.active)).toBe(false)
})

test('a visitor asking for reduced motion gets a calm demo, and it follows the setting live', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/demo/')
  expect(await page.evaluate(() => window.show.calm)).toBe(true)
  await page.waitForTimeout(1500)
  expect(await count(page, 'projectiles')).toBe(0)
  await page.getByRole('button', { name: 'Fireworks' }).click()
  expect(await count(page, 'projectiles')).toBe(5)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => page.evaluate(() => window.show.calm)).toBe(false)
})

test('the built site runs from a static host without errors', async ({ page }) => {
  const { readFile } = await import('node:fs/promises')
  const types = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript' }
  await page.route('http://site.test/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, '/index.html')
    try {
      const body = await readFile(`site${path}`)
      await route.fulfill({ body, contentType: types[path.split('.').pop()] ?? 'application/octet-stream' })
    } catch {
      await route.fulfill({ status: 404, body: 'not found' })
    }
  })
  const errors = collectErrors(page)
  await page.goto('http://site.test/')
  await expect.poll(() => count(page, 'particles'), { timeout: 5000 }).toBeGreaterThan(0)
  await page.getByText('How to use').click()
  await expect(page.getByRole('link', { name: 'README on GitHub' })).toBeVisible()
  expect(errors).toEqual([])
})

test('both builds keep the class names', async ({ page }) => {
  await page.goto('/demo/')
  await page.addScriptTag({ url: '/dist/xploders.min.js' })
  const mismatches = await page.evaluate(async () => {
    const esm = await import('/dist/xploders.mjs')
    const bad = []
    for (const [build, mod] of [['esm', esm], ['script tag', window.Xploders]]) {
      for (const [key, value] of Object.entries(mod)) {
        if (typeof value === 'function' && /^[A-Z]/.test(key) && value.name !== key) bad.push(`${build}: ${key} is named ${value.name}`)
      }
      if (build === 'esm' && esm.default.name !== 'Xploders') bad.push(`esm: default is named ${esm.default.name}`)
    }
    return bad
  })
  expect(mismatches).toEqual([])
})

test('the script-tag build exposes a global Xploders class', async ({ page }) => {
  await page.goto('/demo/')
  await page.evaluate(() => delete window.Xploders)
  await page.addScriptTag({ url: '/dist/xploders.min.js' })
  const info = await page.evaluate(() => ({
    isClass: typeof window.Xploders === 'function',
    hasChicken: typeof window.Xploders.Chicken === 'function',
    hasJug: typeof window.Xploders.Jug === 'function',
    hasCow: typeof window.Xploders.Cow === 'function',
    hasBursts: Object.keys(window.Xploders.bursts).sort(),
    hasSprite: typeof window.Xploders.Sprite.fromPixels === 'function',
  }))
  expect(info).toEqual({
    isClass: true,
    hasChicken: true,
    hasJug: true,
    hasCow: true,
    hasBursts: ['crackle', 'fireball', 'peony', 'ring', 'saturn', 'shapes', 'willow'],
    hasSprite: true,
  })
})

test.describe('sizing on a high-DPI screen', () => {
  test.use({ deviceScaleFactor: 2 })

  /** Waits a few frames so ResizeObserver and the loop get to run. */
  const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))))

  test('a canvas with no CSS size keeps its size instead of growing', async ({ page }) => {
    await page.goto('/demo/')
    const start = await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.id = 'bare'
      document.body.append(c)
      window.bare = new window.Xploders(c)
      return [c.clientWidth, c.clientHeight]
    })
    for (let i = 0; i < 5; i++) await frames(page)
    const end = await page.evaluate(() => {
      const c = document.getElementById('bare')
      return { css: [c.clientWidth, c.clientHeight], backing: [c.width, c.height], drawing: [window.bare.engine.width, window.bare.engine.height] }
    })
    expect(end.css).toEqual(start)
    expect(end.drawing).toEqual(start)
    expect(end.backing).toEqual(start.map((v) => v * 2))
  })

  test('a canvas in a padded container draws at the size it is shown', async ({ page }) => {
    await page.goto('/demo/')
    const r = await page.evaluate(() => {
      const box = document.createElement('div')
      box.style.cssText = 'position: fixed; top: 0; width: 300px; height: 200px; padding: 20px'
      document.body.append(box)
      const s = new window.Xploders(box)
      return { drawing: [s.engine.width, s.engine.height], shown: [s.canvas.clientWidth, s.canvas.clientHeight] }
    })
    expect(r.drawing).toEqual([300, 200])
    expect(r.shown).toEqual([300, 200])
  })

  test('a CSS-sized canvas still follows its container when it resizes', async ({ page }) => {
    await page.goto('/demo/')
    await page.evaluate(() => {
      const box = document.createElement('div')
      box.id = 'box'
      box.style.cssText = 'position: fixed; top: 0; width: 400px; height: 200px'
      document.body.append(box)
      window.boxed = new window.Xploders(box)
    })
    await frames(page)
    await page.evaluate(() => Object.assign(document.getElementById('box').style, { width: '250px', height: '120px' }))
    await frames(page)
    const r = await page.evaluate(() => [window.boxed.engine.width, window.boxed.engine.height, window.boxed.canvas.clientWidth])
    expect(r).toEqual([250, 120, 250])
  })

  test('a canvas in a container with no height stays put', async ({ page }) => {
    await page.goto('/demo/')
    const start = await page.evaluate(() => {
      const box = document.createElement('div')
      box.id = 'auto'
      box.style.cssText = 'position: fixed; top: 0; width: 300px'
      document.body.append(box)
      window.auto = new window.Xploders(box)
      return window.auto.engine.height
    })
    for (let i = 0; i < 5; i++) await frames(page)
    expect(await page.evaluate(() => window.auto.engine.height)).toBe(start)
  })
})

test.describe('the demo on a phone', () => {
  test.use({ viewport: { width: 390, height: 700 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })

  test('fireworks burst below the controls, not behind them', async ({ page }) => {
    await page.goto('/demo/')
    const r = await page.evaluate(() => ({
      controlsBottom: document.querySelector('.controls').getBoundingClientRect().bottom,
      top: window.show.currentOptions.boundaries.y,
    }))
    expect(r.top).toBeGreaterThan(r.controlsBottom)
    expect(r.controlsBottom).toBeLessThan(200) // compact enough to leave sky
  })

  test('a tap on the sky launches at the tap', async ({ page }) => {
    await page.goto('/demo/')
    await page.evaluate(() => window.show.updateOptions({ intensity: 0 }).clear())
    await page.touchscreen.tap(200, 450)
    expect(await page.evaluate(() => window.show.engine.projectiles.map((p) => p.target))).toEqual([{ x: 200, y: 450 }])
  })
})
