import { describe, it, expect, vi, afterEach } from 'vitest'
import { Xploders, Projectile } from '../src/index.js'
import { bursts } from '../src/bursts.js'
import { Random } from '../src/random.js'
import { defaultOptions } from '../src/options.js'
import { fakeCanvas, fakeScheduler } from './helpers.js'

/** @param {import('../src/options.js').XplodersOptions} [options] */
function makeShow(options = {}) {
  const canvas = fakeCanvas()
  const scheduler = fakeScheduler()
  const show = new Xploders(/** @type {any} */ (canvas), { seed: 7, ...options }, scheduler)
  return { show, canvas, scheduler, engine: show.engine }
}

afterEach(() => vi.restoreAllMocks())

describe('auto-launch', () => {
  it('launches at the fireworks-js rate: a clock of intensity * pi per second against delay', () => {
    // intensity 30 advances the clock 1.5708 per step; with delay 30 a launch
    // needs 20 steps (19 * 1.5708 = 29.8 is not past 30). The first is immediate.
    const { show, engine, scheduler } = makeShow({ delay: { min: 30, max: 30 } })
    const launches = []
    const launch = engine.launch.bind(engine)
    let step = 0
    engine.launch = (n, Cls) => {
      launches.push(step)
      launch(n, Cls)
    }
    show.start()
    for (step = 1; step <= 60; step++) scheduler.steps(1)
    expect(launches).toEqual([1, 21, 41])
  })

  it('does not launch when intensity is 0', () => {
    const { show, engine, scheduler } = makeShow({ intensity: 0 })
    show.start()
    scheduler.steps(300)
    expect(engine.projectiles).toHaveLength(0)
    expect(engine.particles).toHaveLength(0)
  })
})

describe('launch', () => {
  it('launches rockets by count and other registered types by name', () => {
    const { show, engine } = makeShow({ intensity: 0 })
    show.launch(3)
    expect(engine.projectiles.map((p) => p.constructor.name)).toEqual(['Rocket', 'Rocket', 'Rocket'])
    show.launch('chicken', 2)
    expect(engine.projectiles.slice(3).map((p) => p.constructor.name)).toEqual(['Chicken', 'Chicken'])
  })

  it('throws on an unknown type', () => {
    const { show } = makeShow()
    expect(() => show.launch('dragon')).toThrow(/unknown projectile type "dragon"/)
  })

  it('aims rockets inside the boundaries, from rocketsPoint at the bottom edge', () => {
    const { show, engine } = makeShow({ rocketsPoint: { min: 25, max: 25 } })
    show.launch(50)
    for (const p of engine.projectiles) {
      expect(p.x).toBe(200)
      expect(p.y).toBe(600)
      expect(p.target.x).toBeGreaterThanOrEqual(50)
      expect(p.target.x).toBeLessThanOrEqual(800 - 100)
      expect(p.target.y).toBeGreaterThanOrEqual(50)
      expect(p.target.y).toBeLessThanOrEqual(300)
    }
  })

  it('on a stopped show, runs until the sky is empty and then stops', () => {
    const { show, scheduler, engine } = makeShow()
    show.launch(2)
    expect(show.isRunning).toBe(true)
    expect(engine.autoLaunch).toBe(false)
    scheduler.steps(600)
    expect(engine.empty).toBe(true)
    expect(show.isRunning).toBe(false)
    expect(scheduler.scheduled).toBe(false)
  })

  it('launches nothing while the canvas has no size', () => {
    const { show, engine } = makeShow()
    show.updateSize({ width: 0, height: 0 })
    show.launch(3)
    expect(engine.projectiles).toHaveLength(0)
  })
})

describe('waitStop', () => {
  it('stops auto-launch and resolves once everything has burnt out', async () => {
    const { show, scheduler, engine } = makeShow()
    show.start()
    scheduler.steps(30)
    expect(engine.empty).toBe(false)
    let done = false
    const p = show.waitStop().then(() => (done = true))
    scheduler.steps(5)
    await Promise.resolve()
    expect(done).toBe(false)
    scheduler.steps(600)
    await p
    expect(done).toBe(true)
    expect(show.isRunning).toBe(false)
  })

  it('resolves at once on a stopped show', async () => {
    const { show } = makeShow()
    await show.waitStop()
    expect(show.isRunning).toBe(false)
  })
})

describe('pause and clear', () => {
  it('pause freezes the sky and resumes it', () => {
    const { show, scheduler, engine } = makeShow()
    show.launch(1)
    scheduler.steps(3)
    const y = engine.projectiles[0].y
    show.pause()
    scheduler.steps(10)
    expect(engine.projectiles[0].y).toBe(y)
    show.pause()
    scheduler.steps(1)
    expect(engine.projectiles[0].y).not.toBe(y)
  })

  it('clear empties the sky but keeps the show running', () => {
    const { show, scheduler, engine } = makeShow()
    show.start()
    scheduler.steps(60)
    show.clear()
    expect(engine.empty).toBe(true)
    expect(show.isRunning).toBe(true)
  })
})

describe('bursts', () => {
  const context = (count = 40) => ({ x: 100, y: 100, hue: 200, count, options: defaultOptions(), random: new Random(3) })

  it('peony, ring, willow and crackle each make the requested number of particles', () => {
    for (const style of /** @type {const} */ (['peony', 'ring', 'willow', 'crackle'])) {
      expect(bursts[style](context(40))).toHaveLength(40)
    }
  })

  it('a ring stays a circle as it drifts and fades', () => {
    const ps = bursts.ring(context(36))
    for (let i = 0; i < 20; i++) for (const p of ps) p.update()
    const cx = ps.reduce((s, p) => s + p.x, 0) / ps.length
    const cy = ps.reduce((s, p) => s + p.y, 0) / ps.length
    const radii = ps.map((p) => Math.hypot(p.x - cx, p.y - cy))
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(1e-6)
    expect(radii[0]).toBeGreaterThan(20)
  })

  it('willow particles outlive peony particles', () => {
    const steps = (ps) => {
      let n = 0
      while (ps.some((p) => !p.dead) && n < 10000) {
        for (const p of ps) if (!p.dead) p.update()
        n++
      }
      return n
    }
    expect(steps(bursts.willow(context()))).toBeGreaterThan(steps(bursts.peony(context())) * 1.5)
  })

  it('crackle particles pop into sparks near the end', () => {
    const { show, engine } = makeShow({ burst: 'crackle', particles: 20 })
    engine.burst(100, 100, 0)
    const sparkCount = () => engine.particles.filter((p) => p.lineWidth === 1 && p.brightness === 85).length
    let maxSparks = 0
    for (let i = 0; i < 200; i++) {
      engine.step()
      maxSparks = Math.max(maxSparks, sparkCount())
    }
    expect(maxSparks).toBeGreaterThan(20)
    show.stop()
  })

  it("a projectile's own burst style overrides the option", () => {
    class Box extends Projectile {
      burst = /** @type {const} */ ('ring')
    }
    const { engine } = makeShow({ burst: 'peony', particles: 12 })
    const p = new Box({ x: 100, y: 600, target: { x: 100, y: 100 }, size: { width: 800, height: 600 }, hue: 0, options: engine.options, random: engine.random })
    p.explode(engine)
    const speeds = new Set(engine.particles.map((q) => q.speed))
    expect(speeds.size).toBe(1) // a ring: one shared speed
  })

  it('a list of styles is picked from per firework', () => {
    const { engine } = makeShow({ burst: ['ring', 'willow'] })
    const picked = new Set()
    const pick = engine.random.pick.bind(engine.random)
    engine.random.pick = (items) => {
      const v = pick(items)
      picked.add(v)
      return v
    }
    for (let i = 0; i < 20; i++) engine.burst(100, 100, 0)
    expect([...picked].sort()).toEqual(['ring', 'willow'])
  })
})

describe('limits and failures', () => {
  it('never holds more particles than maxParticles', () => {
    const { show, scheduler, engine } = makeShow({ maxParticles: 300, particles: 120, burst: 'crackle', intensity: 200 })
    show.start()
    let max = 0
    for (let i = 0; i < 900; i++) {
      scheduler.steps(1)
      max = Math.max(max, engine.particles.length)
    }
    expect(max).toBeLessThanOrEqual(300)
    expect(max).toBeGreaterThan(200)
  })

  it('removes a projectile that throws and keeps the show running', () => {
    class Broken extends Projectile {
      update() {
        throw new Error('boom')
      }
    }
    Xploders.register('broken', Broken)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { show, scheduler, engine } = makeShow({ intensity: 0 })
    show.start()
    show.launch('broken')
    show.launch(1)
    scheduler.steps(1)
    expect(error).toHaveBeenCalledOnce()
    expect(engine.projectiles.map((p) => p.constructor.name)).toEqual(['Rocket'])
    scheduler.steps(5)
    expect(show.isRunning).toBe(true)
  })

  it('removes a projectile that throws while drawing', () => {
    class BadDraw extends Projectile {
      draw() {
        throw new Error('paint')
      }
    }
    Xploders.register('bad-draw', BadDraw)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { show, scheduler, engine } = makeShow({ intensity: 0 })
    show.start()
    show.launch('bad-draw')
    scheduler.steps(1)
    expect(engine.projectiles).toHaveLength(0)
  })

  it('clamps a long gap (hidden tab) instead of replaying it', () => {
    const { show, scheduler, engine } = makeShow({ intensity: 0 })
    show.start()
    const step = vi.spyOn(engine, 'step')
    scheduler.frame(60_000)
    expect(step.mock.calls.length).toBeLessThanOrEqual(15)
  })
})

describe('rendering', () => {
  it('fades the trail once per step, so 60 and 120 Hz look the same', () => {
    const { show, scheduler } = makeShow({ intensity: 0, opacity: 0.5 })
    show.start()
    const trail = scheduler.layers[0].ctx.log
    trail.fills.length = 0
    scheduler.frame(2 * (1000 / 60) + 0.01) // one frame covering two steps
    expect(trail.fills[0]).toBe('rgba(0, 0, 0, 0.75)')
  })

  it('skips drawing on a frame with no step, so nothing is drawn twice', () => {
    const { show, scheduler } = makeShow({ intensity: 0 })
    show.start()
    const trail = scheduler.layers[0].ctx.log
    trail.fills.length = 0
    scheduler.frame(5)
    expect(trail.fills).toHaveLength(0)
  })
})

describe('seeded shows', () => {
  it('repeat exactly with the same seed, whatever the frame rate', () => {
    const run = (frameMs) => {
      const { show, scheduler, engine } = makeShow({ seed: 99, burst: ['peony', 'crackle', 'ring'] })
      show.start()
      for (let t = 0; t < 3000; t += frameMs) scheduler.frame(frameMs)
      return engine.particles.slice(0, 20).map((p) => [p.x.toFixed(6), p.y.toFixed(6)])
    }
    expect(run(1000 / 120)).toEqual(run(1000 / 60))
  })
})

describe('options at runtime', () => {
  it('updateOptions and updateBoundaries merge into the live options', () => {
    const { show } = makeShow()
    show.updateOptions({ hue: { min: 10 } }).updateBoundaries({ debug: true })
    expect(show.currentOptions.hue).toEqual({ min: 10, max: 360 })
    expect(show.currentOptions.boundaries.debug).toBe(true)
  })

  it('updateSize sets the boundaries to the new size', () => {
    const { show } = makeShow()
    show.updateSize({ width: 300, height: 200 })
    expect(show.currentOptions.boundaries).toMatchObject({ width: 300, height: 200 })
  })
})
