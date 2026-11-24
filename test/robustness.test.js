import { describe, it, expect, vi, afterEach } from 'vitest'
import { Xploders } from '../src/index.js'
import { deepMerge, defaultOptions } from '../src/options.js'
import { bursts } from '../src/bursts.js'
import { Glow, Smoke } from '../src/fireball.js'
import { Random } from '../src/random.js'
import { fakeCanvas, fakeScheduler } from './helpers.js'

afterEach(() => vi.restoreAllMocks())

/** @param {Record<string, any>} [options] @param {ReturnType<typeof fakeCanvas>} [canvas] */
function show(options = {}, canvas = fakeCanvas()) {
  const scheduler = fakeScheduler()
  const s = new Xploders(/** @type {any} */ (canvas), { seed: 1, intensity: 0, ...options }, scheduler)
  return { s, scheduler, engine: s.engine }
}

/** A particle that throws when updated or drawn. */
function throwing(when = 'update') {
  return {
    dead: false,
    update() {
      if (when === 'update') throw new Error('update failed')
      return false
    },
    draw() {
      if (when === 'draw') throw new Error('draw failed')
    },
  }
}

describe('Options from untrusted JSON', () => {
  it('cannot reach Object.prototype through __proto__, constructor or prototype', () => {
    for (const json of [
      '{"__proto__": {"polluted": "yes"}}',
      '{"constructor": {"prototype": {"polluted": "yes"}}}',
      '{"mouse": {"__proto__": {"polluted": "yes"}}}',
    ]) {
      const o = deepMerge(defaultOptions(), JSON.parse(json))
      expect(/** @type {any} */ ({}).polluted).toBeUndefined()
      expect(/** @type {any} */ (o).polluted).toBeUndefined()
    }
  })

  it('still merges ordinary keys', () => {
    const o = deepMerge(defaultOptions(), JSON.parse('{"particles": 9, "mouse": {"max": 4}}'))
    expect(o.particles).toBe(9)
    expect(o.mouse).toMatchObject({ max: 4, click: false })
  })
})

describe('A failing piece does not stop the show', () => {
  it('removes a particle that throws while updating, logs it, and keeps the loop running', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { s, scheduler, engine } = show()
    s.start()
    engine.addParticles([throwing('update'), throwing('update')])
    scheduler.steps(1)
    expect(engine.particles).toHaveLength(0)
    expect(errors).toHaveBeenCalledTimes(1) // once per step, not once per particle
    expect(scheduler.scheduled).toBe(true)
    s.launch(1)
    scheduler.steps(5)
    expect(engine.projectiles).toHaveLength(1)
  })

  it('removes a particle that throws while drawing, and keeps the loop running', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { s, scheduler, engine } = show()
    s.start()
    engine.addParticles([throwing('draw')])
    scheduler.steps(2)
    expect(engine.particles).toHaveLength(0)
    expect(errors).toHaveBeenCalledTimes(1)
    expect(scheduler.scheduled).toBe(true)
  })

  it('keeps the loop running when a whole frame fails', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { s, scheduler, engine } = show()
    s.start()
    const draw = engine.draw
    engine.draw = () => {
      throw new Error('frame failed')
    }
    scheduler.steps(1)
    expect(errors).toHaveBeenCalled()
    expect(scheduler.scheduled).toBe(true)
    engine.draw = draw
  })

  it('ignores a burst at a position that is not a number', () => {
    const { engine } = show()
    engine.burst(NaN, 100, 0, 'fireball')
    engine.burst(100, Infinity, 0, 'peony')
    expect(engine.particles).toHaveLength(0)
  })

  it('does not draw to a backing store rounded down to nothing', () => {
    const canvas = fakeCanvas(0.3, 0.3)
    const { s, scheduler } = show({}, canvas)
    const drawImage = vi.fn()
    canvas.ctx.drawImage = drawImage
    s.start()
    scheduler.steps(2)
    expect(drawImage).not.toHaveBeenCalled()
  })
})

describe('Pointer projectile and projectile cap', () => {
  it('warns once about an unknown mouse.projectile and launches nothing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const canvas = fakeCanvas()
    const { s, scheduler, engine } = show({ mouse: { click: true, projectile: 'chiken', max: 5 } }, canvas)
    canvas.fire('pointerdown', { clientX: 100, clientY: 100 })
    scheduler.steps(10)
    expect(engine.projectiles).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('chiken')
    s.stop()
  })

  it('caps projectiles in flight at maxProjectiles', () => {
    const { s, engine } = show({ maxProjectiles: 5 })
    s.launch('jug', 50)
    expect(engine.projectiles).toHaveLength(5)
    expect(defaultOptions().maxProjectiles).toBe(100)
  })
})

describe('Fireball under reduced motion and draw order', () => {
  const c = (calm) => ({ x: 0, y: 0, hue: 0, count: 50, options: defaultOptions(), random: new Random(1), calm })

  it('has no flash of light in calm mode, and the same number of pieces', () => {
    expect(bursts.fireball(c(false)).some((p) => p instanceof Glow)).toBe(true)
    const calm = bursts.fireball(c(true))
    expect(calm.some((p) => p instanceof Glow)).toBe(false)
    expect(calm).toHaveLength(50)
  })

  it('passes calm to bursts', () => {
    const { s, engine } = show({ reducedMotion: 'always' })
    expect(s.calm).toBe(true)
    engine.burst(100, 100, 0, 'fireball')
    expect(engine.particles.some((p) => p instanceof Glow)).toBe(false)
  })

  it('draws smoke behind flying sprites', () => {
    const { engine } = show()
    engine.resize(800, 600)
    const order = []
    const smoke = new Smoke({ x: 0, y: 0, delay: 0, life: 50, drift: 0, rise: 0, radius: 10 })
    smoke.age = 10
    smoke.draw = () => order.push('smoke')
    engine.particles.push(smoke)
    engine.projectiles.push(/** @type {any} */ ({ layer: 'sprite', draw: () => order.push('jug') }))
    engine.draw(1)
    expect(order).toEqual(['smoke', 'jug'])
  })
})
