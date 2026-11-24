import { describe, it, expect, vi, afterEach } from 'vitest'
import { Xploders } from '../src/index.js'
import { fakeCanvas, fakeScheduler } from './helpers.js'

afterEach(() => vi.unstubAllGlobals())

/** @param {Record<string, any>} [options] */
function makeShow(options = {}) {
  const canvas = fakeCanvas()
  const scheduler = fakeScheduler()
  const show = new Xploders(/** @type {any} */ (canvas), { seed: 3, intensity: 0, ...options }, scheduler)
  const engine = show.engine
  let draws = 0
  const draw = engine.draw.bind(engine)
  /** @type {number[]} */
  const drawnSteps = []
  engine.draw = (n) => {
    draws++
    drawnSteps.push(n)
    draw(n)
  }
  return { show, engine, scheduler, canvas, draws: () => draws, drawnSteps }
}

describe('Drawing only what can be seen', () => {
  it('stops drawing once an empty sky has faded, and starts again when something launches', () => {
    const { show, engine, scheduler, draws } = makeShow()
    show.start()
    scheduler.steps(5)
    const fade = engine.fadeSteps() // 9 at the default opacity of 0.5
    expect(fade).toBe(9)
    scheduler.steps(fade + 5)
    const before = draws()
    scheduler.steps(60)
    expect(draws()).toBe(before) // nothing new to show
    expect(show.isRunning).toBe(true) // the loop still runs, cheaply
    show.launch(1)
    scheduler.steps(3)
    expect(draws()).toBe(before + 3)
    show.stop()
  })

  it('keeps drawing until the last trail has faded after the sky empties', () => {
    const { show, engine, scheduler, drawnSteps } = makeShow()
    show.start()
    show.launch(1)
    for (let i = 0; i < 2000 && !engine.empty; i++) scheduler.steps(1)
    const atEmpty = drawnSteps.length // includes the first frame with an empty sky
    scheduler.steps(30)
    expect(drawnSteps.length - atEmpty + 1).toBe(engine.fadeSteps()) // one fade per frame until it is gone
    show.stop()
  })

  it('takes longer to go quiet with long trails, and still goes quiet when trails never fade', () => {
    expect(makeShow({ opacity: 0.05 }).engine.fadeSteps()).toBe(110)
    expect(makeShow({ opacity: 0 }).engine.fadeSteps()).toBe(1)
    expect(makeShow({ opacity: 1 }).engine.fadeSteps()).toBe(1)
  })

  it('keeps drawing the boundaries outline, and draws once more after it is turned off', () => {
    const { show, scheduler, draws } = makeShow({ boundaries: { debug: true } })
    show.start()
    scheduler.steps(40)
    let before = draws()
    scheduler.steps(10)
    expect(draws()).toBe(before + 10)
    show.updateBoundaries({ debug: false })
    scheduler.steps(10)
    expect(draws()).toBe(before + 11) // the frame that removes the outline
    before = draws()
    scheduler.steps(10)
    expect(draws()).toBe(before)
    show.stop()
  })

  it('skips drawing while out of view but keeps the show moving, then fades by every skipped step', () => {
    const { show, engine, scheduler, draws, drawnSteps } = makeShow()
    show.start()
    show.launch(3)
    scheduler.steps(5)
    engine.visible = false
    const before = draws()
    const age = engine.projectiles[0].age
    scheduler.steps(12)
    expect(draws()).toBe(before)
    expect(engine.projectiles[0].age).toBe(age + 12) // still stepping
    engine.visible = true
    const trail = scheduler.layers[0].ctx.log.fills
    const fills = trail.length
    scheduler.steps(1)
    expect(drawnSteps.at(-1)).toBe(13)
    expect(trail.slice(fills)).toContain(`rgba(0, 0, 0, ${1 - 0.5 ** 13})`)
    show.stop()
  })

  it('follows the canvas in and out of view through an IntersectionObserver, and lets go of it on dispose', () => {
    /** @type {any[]} */
    const observers = []
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        /** @param {(entries: any[]) => void} cb */
        constructor(cb) {
          this.cb = cb
          this.observed = []
          this.disconnected = false
          observers.push(this)
        }
        /** @param {any} el */
        observe(el) {
          this.observed.push(el)
        }
        disconnect() {
          this.disconnected = true
        }
      },
    )
    const { show, engine, canvas } = makeShow()
    expect(observers).toHaveLength(1)
    expect(observers[0].observed).toEqual([canvas])
    observers[0].cb([{ isIntersecting: false }])
    expect(engine.visible).toBe(false)
    observers[0].cb([{ isIntersecting: true }])
    expect(engine.visible).toBe(true)
    show.stop(true)
    expect(observers[0].disconnected).toBe(true)
  })

  it('waitStop still resolves while the canvas is out of view', async () => {
    const { show, engine, scheduler } = makeShow()
    show.start()
    show.launch(2)
    engine.visible = false
    const done = show.waitStop()
    scheduler.steps(2000)
    await expect(done).resolves.toBeUndefined()
  })
})

describe('Half-resolution trails', () => {
  /** @param {number} dpr @param {Record<string, any>} [options] */
  function at(dpr, options = {}) {
    vi.stubGlobal('devicePixelRatio', dpr)
    const { show, engine, scheduler, canvas } = makeShow(options)
    return { show, engine, canvas, trail: scheduler.layers[0] }
  }

  it('draws the trail layer at full resolution by default', () => {
    const { canvas, trail, show } = at(2)
    expect(show.currentOptions.trailResolution).toBe('full')
    expect([canvas.width, canvas.height]).toEqual([1600, 1200])
    expect([trail.width, trail.height]).toEqual([1600, 1200])
  })

  it("draws it at half the device pixel ratio with 'half', never below one pixel per CSS px, the visible canvas unchanged", () => {
    for (const [dpr, ratio] of [
      [2, 1],
      [3, 1.5],
      [1.5, 1],
      [1, 1],
    ]) {
      const { canvas, trail, engine } = at(dpr, { trailResolution: 'half' })
      expect(engine.trailDpr).toBe(ratio)
      expect([trail.width, trail.height]).toEqual([800 * ratio, 600 * ratio])
      expect([canvas.width, canvas.height]).toEqual([800 * dpr, 600 * dpr])
    }
  })

  it('scales the trail layer up to the whole canvas, smoothly', () => {
    const { canvas, trail, engine } = at(2, { trailResolution: 'half' })
    /** @type {any[][]} */
    const copies = []
    canvas.ctx.drawImage = (...a) => copies.push(a)
    engine.draw(1)
    expect(copies[0]).toEqual([trail, 0, 0, 1600, 1200])
    expect(canvas.ctx.imageSmoothingEnabled).toBe(true)
  })

  it('switches at runtime through updateOptions', () => {
    const { show, trail } = at(2)
    show.updateOptions({ trailResolution: 'half' })
    expect(trail.width).toBe(800)
    show.updateOptions({ trailResolution: 'full' })
    expect(trail.width).toBe(1600)
  })
})
