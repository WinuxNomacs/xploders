import { describe, it, expect, vi } from 'vitest'
import { Jug } from '../src/projectiles/jug.js'
import { Shard } from '../src/shard.js'
import { Flame, Glow, Smoke } from '../src/fireball.js'
import { Particle } from '../src/particle.js'
import { Random } from '../src/random.js'
import { bursts } from '../src/bursts.js'
import { defaultOptions } from '../src/options.js'
import { parsePixels } from '../src/sprite.js'
import { frames, shardFrames, palette, lettering, WIDTH, HEIGHT } from '../src/art/jug.js'
import { Xploders } from '../src/index.js'
import { fakeCanvas, fakeScheduler } from './helpers.js'

const size = { width: 800, height: 600 }

/** @param {Partial<import('../src/projectiles/jug.js').JugOptions>} [opts] */
function jug(opts = {}, target = { x: 300, y: 200 }, seed = 5) {
  return new Jug({ x: 400, y: 600, target, size, hue: 120, options: defaultOptions(), random: new Random(seed), ...opts })
}

/** Steps until it asks to explode; returns the path. */
function flyToBurst(j) {
  const path = []
  for (let i = 0; i < 2000; i++) {
    j.update()
    path.push([j.x, j.y])
    if (j.shouldExplode()) break
  }
  return path
}

describe('Jug-o-BOOM art', () => {
  it('parses: three flame frames of 31x40 and six shards', () => {
    const sheet = parsePixels(frames, palette)
    expect(sheet).toMatchObject({ frameWidth: WIDTH, frameHeight: HEIGHT, frames: 3 })
    expect([WIDTH, HEIGHT]).toEqual([31, 40])
    expect(parsePixels(shardFrames, palette).frames).toBe(6)
  })

  it('says JUG-O- in cobalt over BOOM in red', () => {
    expect(lettering.map((l) => l.text).join('')).toBe('JUG-O-BOOM')
    const cobalt = frames[0].join('').split('u').length - 1
    const red = frames[0].join('').split('m').length - 1
    expect(cobalt).toBeGreaterThan(30)
    expect(red).toBeGreaterThan(30)
    // Only the flame differs between frames; the lettering is on every one.
    for (const f of frames) expect(f.slice(20)).toEqual(frames[0].slice(20))
  })
})

describe('Jug flight', () => {
  it('starts just below the bottom edge, peaks at its target and bursts there', () => {
    const j = jug()
    expect(j.y).toBe(600 + (HEIGHT * Jug.defaults.scale) / 2)
    const path = flyToBurst(j)
    expect(j.shouldExplode()).toBe(true)
    expect(Math.abs(j.x - 300)).toBeLessThan(3)
    expect(Math.abs(j.y - 200)).toBeLessThan(3)
    expect(Math.min(...path.map(([, y]) => y))).toBeGreaterThan(197) // the top of the arc, not past it
  })

  it('tumbles the way it is thrown, and spin 0 keeps it steady', () => {
    const left = jug({}, { x: 100, y: 200 })
    const right = jug({}, { x: 700, y: 200 })
    left.update()
    right.update()
    expect(left.spin).toBeLessThan(0)
    expect(right.spin).toBeGreaterThan(0)
    const steady = jug({ spin: 0 })
    const start = steady.rotation
    flyToBurst(steady)
    expect(steady.rotation).toBe(start)
  })

  it('flickers through its three flame frames', () => {
    const j = jug()
    const seen = new Set()
    for (let i = 0; i < 20; i++) {
      j.update()
      seen.add(j.frame)
    }
    expect([...seen].sort()).toEqual([0, 1, 2])
  })

  it('puts the wick above the jug when upright and below it upside down', () => {
    const j = jug({ spin: 0 })
    j.rotation = 0
    expect(j.wick.y).toBeLessThan(j.y)
    j.rotation = Math.PI
    expect(j.wick.y).toBeGreaterThan(j.y)
    expect(Math.abs(j.wick.x - j.x)).toBeLessThan(1e-9)
  })

  it('is drawn on the crisp sprite layer', () => {
    expect(jug().layer).toBe('sprite')
  })
})

describe('Jug in a show', () => {
  function show(options = {}) {
    const scheduler = fakeScheduler()
    return new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 3, intensity: 0, ...options }, scheduler)
  }

  it('sheds embers off the wick in flight, within maxParticles', () => {
    const s = show({ maxParticles: 4 })
    s.launch('jug')
    for (let i = 0; i < 30; i++) s.engine.step()
    expect(s.engine.particles.length).toBe(4)
    expect(s.engine.particles.every((p) => p instanceof Particle && p.gravity < 0)).toBe(true)
  })

  it('bursts into a fireball and shards, whatever the show style', () => {
    const s = show({ burst: 'ring', particles: 40 })
    s.launch('jug', 1, { shards: 7 })
    const e = s.engine
    for (let i = 0; i < 2000 && e.projectiles.length; i++) e.step()
    e.particles = e.particles.filter((p) => !(p instanceof Particle && p.gravity < 0)) // drop wick embers
    expect(e.particles.filter((p) => p instanceof Shard)).toHaveLength(7)
    expect(e.particles.filter((p) => p instanceof Glow)).toHaveLength(1)
    expect(e.particles.filter((p) => p instanceof Flame).length).toBeGreaterThan(10)
    expect(e.particles.filter((p) => p instanceof Smoke).length).toBeGreaterThan(0)
  })

  it('takes another burst style when asked', () => {
    const s = show({ particles: 20 })
    s.launch('jug', 1, { burst: 'ring', shards: 0 })
    const e = s.engine
    for (let i = 0; i < 2000 && e.projectiles.length; i++) e.step()
    const ring = e.particles.filter((p) => p instanceof Particle && p.gravity > 0)
    expect(ring).toHaveLength(20)
    expect(new Set(ring.map((p) => p.speed)).size).toBe(1)
  })

  it('keeps the whole explosion within maxParticles', () => {
    const s = show({ maxParticles: 25, particles: 40 })
    s.launch('jug', 1, { shards: 12 })
    const e = s.engine
    for (let i = 0; i < 2000 && e.projectiles.length; i++) e.step()
    expect(e.particles.length).toBeLessThanOrEqual(25)
  })

  it('draws through its whole life without errors and leaves an empty sky', () => {
    const errors = vi.spyOn(console, 'error')
    const scheduler = fakeScheduler()
    const s = new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 4, intensity: 0 }, scheduler).start()
    s.launch('jug')
    let burst = false
    for (let i = 0; i < 600; i++) {
      scheduler.steps(1)
      burst ||= s.engine.particles.some((p) => p instanceof Shard)
    }
    expect(burst).toBe(true) // it really flew and burst, rather than being removed
    expect(errors).not.toHaveBeenCalled()
    expect(s.engine.projectiles.length + s.engine.particles.length).toBe(0)
    errors.mockRestore()
  })

  it('is registered as jug', () => {
    const s = show()
    s.launch('jug', 2)
    expect(s.engine.projectiles.map((p) => p.constructor)).toEqual([Jug, Jug])
  })
})

describe('Fireball burst', () => {
  const c = (count = 50, seed = 1) => ({ x: 400, y: 300, hue: 200, count, options: defaultOptions(), random: new Random(seed) })

  it('fits its count: glow, flames, embers and smoke', () => {
    const parts = bursts.fireball(c(50))
    expect(parts).toHaveLength(50)
    expect(parts[0]).toBeInstanceOf(Glow) // first, so trimming keeps it
    expect(parts.filter((p) => p instanceof Particle).every((p) => p.hue >= 25 && p.hue <= 45)).toBe(true)
  })

  it('flames rise, swell, cool from yellow to red and die', () => {
    const f = new Flame({ x: 0, y: 0, angle: 0, speed: 0, radius: 10, life: 60 })
    const start = { hue: f.hue, light: f.lightness, radius: f.radius, alpha: f.alpha }
    for (let i = 0; i < 30; i++) f.update()
    expect(f.y).toBeLessThan(-5)
    expect(f.hue).toBeLessThan(start.hue)
    expect(f.lightness).toBeLessThan(start.light)
    expect(f.radius).toBeGreaterThan(start.radius)
    expect(f.alpha).toBeLessThan(start.alpha)
    expect(start.hue).toBeGreaterThanOrEqual(50) // yellow
    for (let i = 0; i < 30; i++) f.update()
    expect(f.dead).toBe(true)
    expect(f.hue).toBe(0) // red at the end
  })

  it('smoke stays invisible until its delay passes, then rises and fades out', () => {
    const s = new Smoke({ x: 0, y: 0, delay: 20, life: 60, drift: 0, rise: 0.5, radius: 10 })
    for (let i = 0; i < 20; i++) {
      s.update()
      expect(s.alpha).toBe(0)
    }
    for (let i = 0; i < 20; i++) s.update()
    expect(s.alpha).toBeGreaterThan(0)
    expect(s.y).toBeLessThan(0)
    while (!s.dead) s.update()
    expect(s.alpha).toBeLessThanOrEqual(0)
  })

  it('never goes over maxParticles, even with room for only one piece', () => {
    const s = new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 2, intensity: 0, maxParticles: 1 }, fakeScheduler())
    s.engine.burst(100, 100, 0, 'fireball')
    expect(s.engine.particles).toHaveLength(1)
  })

  it('works on plain rockets through the burst option', () => {
    const scheduler = fakeScheduler()
    const s = new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 2, intensity: 0, burst: 'fireball' }, scheduler)
    s.launch(1)
    for (let i = 0; i < 2000 && s.engine.projectiles.length; i++) s.engine.step()
    expect(s.engine.particles.some((p) => p instanceof Flame)).toBe(true)
  })
})

describe('Shard', () => {
  it('falls with gravity, tumbles, and dies after its life', () => {
    const sh = new Shard({ x: 0, y: 0, scale: 2, random: new Random(3) })
    const r0 = sh.rotation
    let steps = 0
    while (!sh.dead) {
      sh.update()
      steps++
    }
    expect(sh.y).toBeGreaterThan(100) // well below where it burst
    expect(sh.rotation).not.toBe(r0)
    expect(steps).toBeGreaterThanOrEqual(70)
    expect(steps).toBeLessThanOrEqual(110)
  })
})
