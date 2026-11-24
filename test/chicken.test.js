import { describe, it, expect, vi } from 'vitest'
import { Chicken } from '../src/projectiles/chicken.js'
import { Feather } from '../src/feather.js'
import { Particle } from '../src/particle.js'
import { Random } from '../src/random.js'
import { defaultOptions } from '../src/options.js'
import { Xploders } from '../src/index.js'
import { fakeCanvas, fakeScheduler } from './helpers.js'

const size = { width: 800, height: 600 }

/** @param {Partial<import('../src/projectiles/chicken.js').ChickenOptions>} [opts] */
function chicken(opts = {}, target = { x: 300, y: 200 }, seed = 5) {
  return new Chicken({ x: 400, y: 600, target, size, hue: 120, options: defaultOptions(), random: new Random(seed), ...opts })
}

/** Runs until it starts to panic; returns the path. */
function flyToPanic(c) {
  const path = []
  for (let i = 0; i < 2000 && !c.panicking; i++) {
    c.update()
    path.push([c.x, c.y])
  }
  return path
}

describe('Chicken flight', () => {
  it('rises from below the bottom edge at rocketsPoint to its target', () => {
    const c = chicken({ flight: 'rise' })
    expect(c.x).toBe(400)
    expect(c.y).toBeGreaterThan(600)
    flyToPanic(c)
    expect(c.panicking).toBe(true)
    expect(Math.hypot(c.x - 300, c.y - 200)).toBeLessThan(c.bobAmp + 0.001)
  })

  it('crosses from just off a side edge to its target', () => {
    const starts = new Set()
    for (let seed = 1; seed <= 20; seed++) {
      const c = chicken({ flight: 'cross' }, { x: 400, y: 200 }, seed)
      expect(c.x === -24 || c.x === 824).toBe(true)
      starts.add(c.x)
      flyToPanic(c)
      expect(Math.hypot(c.x - 400, c.y - 200)).toBeLessThan(c.bobAmp + 0.001)
    }
    expect([...starts].sort()).toEqual([-24, 824])
  })

  it('picks rise or cross at random by default, and the option forces one', () => {
    const flights = new Set(Array.from({ length: 30 }, (_, i) => chicken({}, undefined, i + 1).flight))
    expect([...flights].sort()).toEqual(['cross', 'rise'])
    expect(chicken({ flight: 'cross' }).flight).toBe('cross')
  })

  it('bobs sideways to its path, no further than its bob amplitude', () => {
    const c = chicken({ flight: 'rise' }, { x: 400, y: 100 }) // straight up
    const xs = flyToPanic(c).map(([x]) => x - 400)
    expect(Math.max(...xs)).toBeGreaterThan(c.bobAmp * 0.9)
    expect(Math.min(...xs)).toBeLessThan(-c.bobAmp * 0.9)
    expect(Math.max(...xs.map(Math.abs))).toBeLessThanOrEqual(c.bobAmp + 1e-9)
  })

  it('faces the way it flies', () => {
    expect(chicken({}, { x: 100, y: 200 }).flip).toBe(true)
    expect(chicken({ flight: 'rise' }, { x: 700, y: 200 }).flip).toBe(false)
  })

  it('cycles the four flap frames while flying', () => {
    const c = chicken({ flight: 'rise' })
    const frames = new Set()
    for (let i = 0; i < 20; i++) {
      c.update()
      frames.add(c.frame)
    }
    expect([...frames].sort()).toEqual([0, 1, 2, 3])
  })
})

describe('Chicken panic', () => {
  it('lasts panicSteps, shaking near its target in panic frames and flashing, then asks to explode', () => {
    const c = chicken({ panicSteps: 30 })
    flyToPanic(c)
    const frames = new Set()
    let flashes = 0
    for (let i = 0; i < 29; i++) {
      c.update()
      expect(c.shouldExplode()).toBe(false)
      expect(Math.abs(c.x - 300)).toBeLessThanOrEqual(1.5)
      expect(Math.abs(c.y - 200)).toBeLessThanOrEqual(1.5)
      frames.add(c.frame)
      if (c.flash) flashes++
    }
    c.update()
    expect(c.shouldExplode()).toBe(true)
    expect([...frames].sort()).toEqual([4, 5])
    expect(flashes).toBeGreaterThan(5)
    expect(flashes).toBeLessThan(25)
  })
})

describe('Chicken explosion', () => {
  function showWithChicken(options = {}, init = {}) {
    const scheduler = fakeScheduler()
    const show = new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 3, intensity: 0, ...options }, scheduler)
    show.launch('chicken', 1, { panicSteps: 5, ...init })
    const engine = show.engine
    const hue = engine.projectiles[0].hue
    for (let i = 0; i < 2000 && engine.projectiles.length; i++) engine.step()
    return Object.assign(engine, { chickenHue: hue })
  }

  it('makes feathers plus a firework burst in the show style', () => {
    const engine = showWithChicken({ burst: 'ring', particles: 24 }, { feathers: 10 })
    const feathers = engine.particles.filter((p) => p instanceof Feather)
    const sparks = engine.particles.filter((p) => p instanceof Particle)
    expect(feathers).toHaveLength(10)
    expect(sparks).toHaveLength(24)
    expect(new Set(sparks.map((p) => p.speed)).size).toBe(1) // ring
    expect(new Set(sparks.map((p) => p.hue))).toEqual(new Set([engine.chickenHue]))
  })

  it('keeps feathers within maxParticles', () => {
    const engine = showWithChicken({ maxParticles: 30, particles: 25 }, { feathers: 16 })
    expect(engine.particles.length).toBe(30)
  })

  it('passes launch options through to the chicken', () => {
    const scheduler = fakeScheduler()
    const show = new Xploders(/** @type {any} */ (fakeCanvas()), { intensity: 0 }, scheduler)
    show.launch('chicken', 2, { flight: 'cross', scale: 5 })
    for (const c of show.engine.projectiles) expect(c).toMatchObject({ flight: 'cross', scale: 5 })
  })
})

describe('Chicken in a running show', () => {
  it('draws through its whole life without errors and leaves an empty sky', () => {
    const errors = vi.spyOn(console, 'error')
    const scheduler = fakeScheduler()
    const s = new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 4, intensity: 0 }, scheduler).start()
    s.launch('chicken', 1, { panicSteps: 5 })
    let feathers = false
    for (let i = 0; i < 1200; i++) {
      scheduler.steps(1)
      feathers ||= s.engine.particles.some((p) => p instanceof Feather)
    }
    expect(feathers).toBe(true)
    expect(errors).not.toHaveBeenCalled()
    expect(s.engine.projectiles.length + s.engine.particles.length).toBe(0)
    errors.mockRestore()
  })
})

describe('Feather', () => {
  const feather = (seed = 1) => new Feather({ x: 0, y: 0, scale: 2, random: new Random(seed) })

  it('falls no faster than its slow fall speed, far slower than sparks', () => {
    const f = feather()
    let maxFall = 0
    let lastY = f.y
    while (!f.dead) {
      f.update()
      maxFall = Math.max(maxFall, f.y - lastY)
      lastY = f.y
    }
    expect(maxFall).toBeLessThanOrEqual(Feather.FALL_SPEED + 1e-9)
    expect(Feather.FALL_SPEED).toBeLessThan(defaultOptions().gravity)
  })

  it('sways side to side through all three poses, and dies after its life', () => {
    const f = feather(2)
    const poses = new Set()
    let steps = 0
    while (!f.dead) {
      f.update()
      poses.add(f.frame)
      steps++
    }
    expect([...poses].sort()).toEqual([0, 1, 2])
    expect(steps).toBeGreaterThanOrEqual(120)
    expect(steps).toBeLessThanOrEqual(180)
  })

  it('is drawn on the crisp sprite layer', () => {
    expect(feather().layer).toBe('sprite')
  })
})
