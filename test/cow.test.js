import { describe, it, expect } from 'vitest'
import { Cow } from '../src/projectiles/cow.js'
import { Shard } from '../src/shard.js'
import { Milk } from '../src/milk.js'
import { Particle } from '../src/particle.js'
import { Random } from '../src/random.js'
import { defaultOptions } from '../src/options.js'
import { parsePixels } from '../src/sprite.js'
import { palette, floatFrames, mooFrames, bubbleFrames, steakFrames, WIDTH, HEIGHT, BUBBLE_WIDTH, BUBBLE_HEIGHT } from '../src/art/cow.js'
import { font, stamp, textWidth } from '../src/art/font.js'
import { Xploders } from '../src/index.js'
import { fakeCanvas, fakeScheduler } from './helpers.js'

const size = { width: 800, height: 600 }

/** @param {Partial<import('../src/projectiles/cow.js').CowOptions>} [opts] */
function cow(opts = {}, target = { x: 300, y: 200 }, seed = 5, engine = undefined) {
  return new Cow({ x: 400, y: 600, target, size, hue: 120, options: defaultOptions(), random: new Random(seed), engine, ...opts })
}

/** Steps until it asks to explode; returns each step's phase and position. */
function live(c) {
  const steps = []
  for (let i = 0; i < 3000; i++) {
    c.update()
    steps.push({ phase: c.phase, x: c.x, y: c.y })
    if (c.shouldExplode()) break
  }
  return steps
}

function show(options = {}) {
  return new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 3, intensity: 0, ...options }, fakeScheduler())
}

describe('Cow art', () => {
  it('has well-formed frames: equal sizes, every pixel in the palette', () => {
    for (const [frames, w, h] of [
      [[...floatFrames, ...mooFrames], WIDTH, HEIGHT],
      [bubbleFrames, BUBBLE_WIDTH, BUBBLE_HEIGHT],
      [steakFrames, 9, 7],
    ]) {
      for (const frame of frames) {
        expect(frame).toHaveLength(h)
        for (const row of frame) {
          expect(row).toHaveLength(w)
          for (const ch of row) expect(ch in palette).toBe(true)
        }
      }
      expect(parsePixels(frames, palette).frames).toBe(frames.length)
    }
  })

  it('kicks its legs while floating and opens its mouth when it Moo!s', () => {
    expect(floatFrames[0]).toEqual(floatFrames[2]) // straight, kicked one way, straight, kicked the other
    expect(new Set(floatFrames.map((f) => f.join('\n'))).size).toBe(3)
    expect(mooFrames[0].join('')).toContain('r') // open mouth
    expect(floatFrames[0].join('')).not.toContain('r')
  })

  it('says MOO! in the bubble, unmirrored whichever side its tail is on', () => {
    const g = Array.from({ length: 5 }, () => Array(textWidth('MOO!')).fill('.'))
    stamp(g, 'MOO!', 'k', 0, 0)
    const text = g.map((row) => row.join(''))
    for (const frame of bubbleFrames) {
      const inside = frame.slice(2, 7).map((row) => row.slice(3, 3 + textWidth('MOO!')))
      expect(inside.map((row) => row.replace(/w/g, '.'))).toEqual(text)
    }
    // the tails point opposite ways
    expect(bubbleFrames[0].at(-1).indexOf('k')).toBeLessThan(BUBBLE_WIDTH / 2)
    expect(bubbleFrames[1].at(-1).indexOf('k')).toBeGreaterThan(BUBBLE_WIDTH / 2)
  })

  it('has an M wide enough to read as M, and throws on a missing glyph', () => {
    expect(font.M[0]).toHaveLength(5)
    expect(textWidth('MOO!')).toBe(5 + 3 + 3 + 3 + 3)
    expect(() => stamp([['.']], 'Z', 'k', 0, 0)).toThrow(/Z/)
  })
})

describe('Cow flight', () => {
  it('starts at a random spot from 10% to 90% across, just below the bottom edge', () => {
    const xs = Array.from({ length: 40 }, (_, i) => cow({}, undefined, i + 1)).map((c) => {
      expect(c.y).toBeGreaterThan(600)
      return c.x
    })
    expect(xs.every((x) => x >= 80 && x <= 720)).toBe(true)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(400)
  })

  it('floats to its target slowing as it arrives, hovers, Moo!s, then asks to explode', () => {
    const c = cow({}, { x: 300, y: 200 })
    const steps = live(c)
    const phases = steps.map((s) => s.phase)
    expect([...new Set(phases)]).toEqual(['float', 'hover', 'moo'])
    expect(phases.filter((p) => p === 'hover')).toHaveLength(Cow.defaults.hoverSteps)
    expect(phases.filter((p) => p === 'moo')).toHaveLength(Cow.defaults.mooSteps)
    // slows: the first steps cover more ground than the last ones before it arrives
    const float = steps.filter((s) => s.phase === 'float')
    const first = Math.hypot(float[1].x - float[0].x, float[1].y - float[0].y)
    const last = Math.hypot(float.at(-1).x - float.at(-2).x, float.at(-1).y - float.at(-2).y)
    expect(first).toBeGreaterThan(last * 3)
    // hovers and Moo!s at its target
    for (const s of steps.filter((s) => s.phase !== 'float')) {
      expect(Math.abs(s.x - 300)).toBeLessThanOrEqual(c.scale)
      expect(Math.abs(s.y - 200)).toBeLessThanOrEqual(c.scale * 3)
    }
    expect(c.shouldExplode()).toBe(true)
  })

  it('faces the way it drifts', () => {
    for (let seed = 1; seed < 20; seed++) {
      const c = cow({}, { x: 400, y: 200 }, seed)
      expect(c.flip).toBe(c.x > 400)
    }
  })

  it('shakes and bounces while it Moo!s, but holds still under reduced motion', () => {
    for (const calm of [false, true]) {
      const c = cow({}, { x: 300, y: 200 }, 5, /** @type {any} */ ({ calm, addParticles() {} }))
      const moo = live(c).filter((s) => s.phase === 'moo')
      const moved = moo.some((s) => s.x !== 300 || s.y !== 200)
      expect(moved).toBe(!calm)
      expect(c.frame).toBeGreaterThanOrEqual(4) // excited face either way
    }
  })

  it('takes its timings and size per launch', () => {
    const c = cow({ hoverSteps: 2, mooSteps: 3, scale: 5 })
    const phases = live(c).map((s) => s.phase)
    expect(phases.filter((p) => p === 'hover')).toHaveLength(2)
    expect(phases.filter((p) => p === 'moo')).toHaveLength(3)
    expect(c.scale).toBe(5)
  })
})

describe('Cow speech bubble', () => {
  /** @param {{x: number, y: number}} target */
  function mooing(target, seed = 5) {
    const c = cow({}, target, seed)
    while (!c.mooing) c.update()
    for (let i = 0; i < 6; i++) c.update()
    return c
  }

  it('sits above the head on the side the cow faces', () => {
    for (let seed = 1; seed < 20; seed++) {
      const c = mooing({ x: 400, y: 300 }, seed)
      const b = c.bubblePlace()
      expect(b.y).toBeLessThan(c.y)
      expect(b.frame).toBe(c.flip ? 1 : 0)
      expect(Math.sign(b.x - c.x)).toBe(c.flip ? -1 : 1)
    }
  })

  it('stays inside the canvas near its edges, switching sides at the right or left edge', () => {
    for (const target of [
      { x: 790, y: 10 },
      { x: 10, y: 10 },
      { x: 780, y: 300 },
      { x: 20, y: 300 },
    ]) {
      for (let seed = 1; seed < 10; seed++) {
        const c = mooing(target, seed)
        const b = c.bubblePlace()
        const w = BUBBLE_WIDTH * b.scale
        const h = BUBBLE_HEIGHT * b.scale
        expect(b.x - w / 2).toBeGreaterThanOrEqual(-1e-9)
        expect(b.x + w / 2).toBeLessThanOrEqual(800 + 1e-9)
        expect(b.y - h / 2).toBeGreaterThanOrEqual(-1e-9)
      }
    }
    const right = mooing({ x: 790, y: 300 })
    expect(right.bubblePlace().frame).toBe(1) // moved to the left of the head
  })

  it('shows only while it Moo!s', () => {
    const c = cow()
    const ctx = fakeCanvas().ctx
    let drawn = 0
    const draw = Cow.themes.retro.bubble.draw
    Cow.themes.retro.bubble.draw = () => drawn++
    try {
      c.draw(/** @type {any} */ (ctx))
      expect(drawn).toBe(0)
      while (!c.mooing) c.update()
      c.draw(/** @type {any} */ (ctx))
      expect(drawn).toBe(1)
    } finally {
      Cow.themes.retro.bubble.draw = draw
    }
  })
})

describe('Cow in a show', () => {
  it('is registered as cow and launches from the demo-style launchAt at the clicked spot', () => {
    const s = show()
    const xs = new Set()
    for (let i = 0; i < 10; i++) {
      s.launchAt(250, 120, 'cow')
      const c = s.engine.projectiles.at(-1)
      expect(c).toBeInstanceOf(Cow)
      expect(c.target).toEqual({ x: 250, y: 120 })
      xs.add(Math.round(c.x))
    }
    expect(xs.size).toBeGreaterThan(5)
  })

  it("explodes into the show's burst style, steaks and milk", () => {
    const s = show({ burst: 'ring', particles: 30 })
    s.launch('cow', 1, { steaks: 5, milk: 9 })
    const e = s.engine
    for (let i = 0; i < 3000 && e.projectiles.length; i++) e.step()
    expect(e.projectiles).toHaveLength(0)
    expect(e.particles.filter((p) => p instanceof Shard)).toHaveLength(5)
    expect(e.particles.filter((p) => p instanceof Milk)).toHaveLength(9)
    const sparks = e.particles.filter((p) => p instanceof Particle)
    expect(sparks.length).toBeGreaterThan(20)
    // a ring: every spark shares one speed
    expect(new Set(sparks.map((p) => p.speed)).size).toBe(1)
  })

  it('keeps the explosion within maxParticles', () => {
    const s = show({ maxParticles: 10 })
    s.launch('cow')
    for (let i = 0; i < 3000 && s.engine.projectiles.length; i++) s.engine.step()
    expect(s.engine.particles.length).toBeLessThanOrEqual(10)
  })

  it('draws its whole life, and its steaks and milk fall and die', () => {
    const s = show()
    s.start()
    s.launch('cow')
    const e = s.engine
    for (let i = 0; i < 3000 && e.projectiles.length; i++) {
      e.step()
      e.draw(1)
    }
    const pieces = e.particles.filter((p) => p instanceof Shard || p instanceof Milk)
    expect(pieces.length).toBeGreaterThan(0)
    for (let i = 0; i < 45; i++) {
      e.step()
      e.draw(1)
    }
    const alive = pieces.filter((p) => !p.dead)
    expect(alive.length).toBeGreaterThan(0)
    expect(alive.every((p) => p.vy > 0)).toBe(true) // thrown up, now all falling
    for (let i = 0; i < 200; i++) e.step()
    expect(e.particles.some((p) => p instanceof Shard || p instanceof Milk)).toBe(false)
    s.stop()
  })
})

describe('Milk', () => {
  it('flies out, falls, fades and dies', () => {
    const m = new Milk({ x: 0, y: 0, scale: 3, random: new Random(2) })
    expect(m.alpha).toBe(1)
    let steps = 0
    while (!m.dead) {
      m.update()
      steps++
    }
    expect(m.y).toBeGreaterThan(50)
    expect(m.alpha).toBeLessThanOrEqual(0)
    expect(steps).toBeGreaterThanOrEqual(40)
    expect(steps).toBeLessThanOrEqual(70)
  })
})
