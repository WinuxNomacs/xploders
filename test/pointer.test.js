import { describe, it, expect } from 'vitest'
import { Xploders } from '../src/index.js'
import { fakeCanvas, fakeScheduler, fakeMatchMedia } from './helpers.js'

/** @param {import('../src/options.js').XplodersOptions} [options] */
function makeShow(options = {}, { reduced = false } = {}) {
  const canvas = fakeCanvas()
  const scheduler = fakeScheduler()
  const media = fakeMatchMedia(reduced)
  const show = new Xploders(/** @type {any} */ (canvas), { seed: 4, ...options }, { ...scheduler, matchMedia: media.matchMedia })
  return { show, canvas, scheduler, media, engine: show.engine }
}

const targets = (engine) => engine.projectiles.map((p) => [p.target.x, p.target.y])

describe('pointer click (mouse.click)', () => {
  it('launches towards the held pointer, keeping up to max in flight', () => {
    const { show, canvas, scheduler, engine } = makeShow({ intensity: 0, mouse: { click: true, max: 3 } })
    show.start()
    canvas.fire('pointerdown', { clientX: 200, clientY: 150 })
    scheduler.steps(5)
    expect(engine.projectiles).toHaveLength(3)
    for (const t of targets(engine)) expect(t).toEqual([200, 150])
  })

  it('follows the pointer while held', () => {
    const { show, canvas, scheduler, engine } = makeShow({ intensity: 0, mouse: { click: true, max: 10 } })
    show.start()
    canvas.fire('pointerdown', { clientX: 100, clientY: 100 })
    scheduler.steps(1)
    canvas.fire('pointermove', { clientX: 500, clientY: 120 })
    scheduler.steps(1)
    expect(targets(engine).slice(0, 2)).toEqual([
      [100, 100],
      [500, 120],
    ])
  })

  it('stops launching on release, on cancel, and on release outside the canvas (pointer capture)', () => {
    for (const end of ['pointerup', 'pointercancel']) {
      const { show, canvas, scheduler, engine } = makeShow({ intensity: 0, mouse: { click: true, max: 50 } })
      show.start()
      canvas.fire('pointerdown', { clientX: 100, clientY: 100 })
      scheduler.steps(2)
      // With capture, the release reaches the canvas even when it happens outside it.
      canvas.fire(end, { clientX: -300, clientY: 900 })
      const n = engine.projectiles.length
      scheduler.steps(10)
      expect(engine.projectiles.length).toBeLessThanOrEqual(n)
      expect(show.pointer.active).toBe(false)
    }
  })

  it('ends the hold when the pointer leaves, if capture is unavailable', () => {
    const { show, canvas } = makeShow({ mouse: { click: true } })
    canvas.setPointerCapture = undefined
    canvas.hasPointerCapture = undefined
    canvas.fire('pointerdown', { clientX: 10, clientY: 10 })
    expect(show.pointer.active).toBe(true)
    canvas.fire('pointerleave')
    expect(show.pointer.active).toBe(false)
  })

  it('maps the pointer through the canvas box, so scrolled or CSS-scaled canvases aim right', () => {
    const { show, canvas, engine } = makeShow({ intensity: 0, mouse: { click: true } })
    canvas.rect = { left: 50, top: 400, width: 400, height: 300 } // shown at half size, scrolled
    show.start()
    canvas.fire('pointerdown', { clientX: 250, clientY: 550 })
    engine.step()
    expect(targets(engine)[0]).toEqual([400, 300])
  })

  it('on a stopped show, a hold runs the loop until the sky is empty', () => {
    const { show, canvas, scheduler } = makeShow({ mouse: { click: true } })
    canvas.fire('pointerdown', { clientX: 300, clientY: 200 })
    expect(show.isRunning).toBe(true)
    canvas.fire('pointerup', { clientX: 300, clientY: 200 })
    scheduler.steps(600)
    expect(show.isRunning).toBe(false)
  })

  it('launches the mouse.projectile type', () => {
    const { show, canvas, engine } = makeShow({ intensity: 0, mouse: { click: true, projectile: 'chicken' } })
    show.start()
    canvas.fire('pointerdown', { clientX: 300, clientY: 200 })
    engine.step()
    expect(engine.projectiles[0].constructor.name).toBe('Chicken')
  })

  it('does nothing when click and move are off (the default)', () => {
    const { show, canvas, engine } = makeShow({ intensity: 0 })
    show.start()
    canvas.fire('pointerdown', { clientX: 300, clientY: 200 })
    engine.step()
    expect(engine.projectiles).toHaveLength(0)
    expect(show.pointer.active).toBe(false)
  })

  it('sets touch-action none only while click is on, and restores it', () => {
    const { show, canvas } = makeShow()
    canvas.style.touchAction = 'pan-y'
    show.updateOptions({ mouse: { click: true } })
    expect(canvas.style.touchAction).toBe('none')
    show.updateOptions({ mouse: { click: false } })
    expect(canvas.style.touchAction).toBe('pan-y')
  })
})

describe('pointer move (mouse.move)', () => {
  it('aims auto-launched rockets at the pointer while it is over the canvas', () => {
    const { show, canvas, scheduler, engine } = makeShow({ mouse: { move: true } })
    show.start()
    canvas.fire('pointermove', { clientX: 640, clientY: 90 })
    scheduler.steps(1)
    expect(targets(engine)[0]).toEqual([640, 90])
    canvas.fire('pointerleave')
    scheduler.steps(25) // the next auto-launch
    const last = targets(engine).at(-1)
    expect(last).not.toEqual([640, 90])
  })
})

describe('launchAt', () => {
  it('launches one rocket, or another type, that explodes at the given point', () => {
    const { show, engine } = makeShow({ intensity: 0 })
    show.launchAt(123, 45)
    show.launchAt(300, 80, 'chicken', { flight: 'rise' })
    expect(targets(engine)).toEqual([
      [123, 45],
      [300, 80],
    ])
    expect(engine.projectiles[1]).toMatchObject({ flight: 'rise' })
  })
})

describe('dispose', () => {
  it('removes pointer and media listeners and restores touch-action', () => {
    const { show, canvas, media } = makeShow({ mouse: { click: true } })
    expect(canvas.listenerCount()).toBeGreaterThan(0)
    expect(media.query.listenerCount).toBe(1)
    show.stop(true)
    expect(canvas.listenerCount()).toBe(0)
    expect(media.query.listenerCount).toBe(0)
    expect(canvas.style.touchAction).toBe('')
  })
})

describe('reduced motion', () => {
  it('auto mode: a visitor asking for reduced motion gets no auto-launch, but launch() still works', () => {
    const { show, scheduler, engine } = makeShow({}, { reduced: true })
    expect(show.calm).toBe(true)
    show.start()
    scheduler.steps(120)
    expect(engine.projectiles).toHaveLength(0)
    show.launch(2)
    expect(engine.projectiles).toHaveLength(2)
  })

  it('follows the setting live', () => {
    const { show, media, scheduler, engine } = makeShow()
    show.start()
    media.query.set(true)
    expect(show.calm).toBe(true)
    show.clear()
    scheduler.steps(60)
    expect(engine.projectiles).toHaveLength(0)
    media.query.set(false)
    scheduler.steps(60)
    expect(engine.projectiles.length).toBeGreaterThan(0)
  })

  it('stops sparks flickering and the chicken flashing', () => {
    const { show, engine } = makeShow({ intensity: 0, flickering: 100 }, { reduced: true })
    expect(Array.from({ length: 20 }, () => engine.flickerRandom())).toEqual(Array(20).fill(1))
    show.launch('chicken', 1, { panicSteps: 30 })
    const c = engine.projectiles[0]
    let flashes = 0
    for (let i = 0; i < 2000 && engine.projectiles.length; i++) {
      engine.step()
      if (c.flash) flashes++
    }
    expect(flashes).toBe(0)
  })

  it("'ignore' keeps the full show for everyone, 'always' calms it for everyone", () => {
    expect(makeShow({ reducedMotion: 'ignore' }, { reduced: true }).show.calm).toBe(false)
    expect(makeShow({ reducedMotion: 'always' }, { reduced: false }).show.calm).toBe(true)
    const { show } = makeShow({}, { reduced: true })
    show.updateOptions({ reducedMotion: 'ignore' })
    expect(show.calm).toBe(false)
  })

  it('without matchMedia (old browsers, Node) there is no preference', () => {
    const scheduler = fakeScheduler()
    const show = new Xploders(/** @type {any} */ (fakeCanvas()), {}, { ...scheduler, matchMedia: undefined })
    expect(show.calm).toBe(false)
  })
})
