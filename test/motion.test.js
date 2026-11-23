import { describe, it, expect } from 'vitest'
import { Rocket } from '../src/projectiles/rocket.js'
import { Projectile } from '../src/projectile.js'
import { Particle } from '../src/particle.js'
import { Random } from '../src/random.js'
import { defaultOptions } from '../src/options.js'

// The fireworks-js v2.10.8 formulas (trace.ts and explosion.ts), ported
// verbatim, as the reference our motion must match.
function referenceTrace(x, y, dx, dy, speed, acceleration) {
  const sx = x
  const sy = y
  const total = Math.hypot(dx - x, dy - y)
  const angle = Math.atan2(dy - y, dx - x)
  const path = []
  for (;;) {
    speed *= acceleration
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    if (Math.hypot(x + vx - sx, y + vy - sy) >= total) return path
    x += vx
    y += vy
    path.push([x, y])
  }
}

describe('Rocket', () => {
  it('follows the fireworks-js trace path and explodes at its target', () => {
    const options = defaultOptions()
    const target = { x: 300, y: 120 }
    const rocket = new Rocket({ x: 400, y: 600, target, size: { width: 800, height: 600 }, hue: 0, options, random: new Random(1) })
    const expected = referenceTrace(400, 600, 300, 120, options.traceSpeed, options.acceleration)
    for (const [x, y] of expected) {
      rocket.update()
      expect(rocket.shouldExplode()).toBe(false)
      expect(rocket.x).toBeCloseTo(x, 9)
      expect(rocket.y).toBeCloseTo(y, 9)
    }
    rocket.update()
    expect(rocket.shouldExplode()).toBe(true)
    expect([rocket.x, rocket.y]).toEqual([300, 120])
  })
})

describe('Projectile', () => {
  it('flies a ballistic arc that peaks at its target', () => {
    const p = new Projectile({ x: 100, y: 600, target: { x: 300, y: 200 }, size: { width: 800, height: 600 }, hue: 0, options: defaultOptions(), random: new Random(1) })
    let steps = 0
    while (!p.shouldExplode() && steps < 1000) {
      p.update()
      steps++
    }
    // Fixed steps end the arc within a step of the apex: under 2 px over a 200 px flight.
    expect(Math.abs(p.x - 300)).toBeLessThan(2)
    expect(Math.abs(p.y - 200)).toBeLessThan(2)
  })
})

describe('Particle', () => {
  it('moves like a fireworks-js explosion particle', () => {
    const init = { x: 10, y: 20, angle: 0.7, speed: 6, hue: 0, brightness: 60, decay: 0.02, friction: 0.95, gravity: 1.5, trail: 5, lineWidth: 2 }
    const p = new Particle(init)
    let { x, y, speed } = init
    let alpha = 1
    for (let i = 0; i < 30; i++) {
      speed *= 0.95
      x += Math.cos(0.7) * speed
      y += Math.sin(0.7) * speed + 1.5
      alpha -= 0.02
      p.update()
      expect(p.x).toBeCloseTo(x, 9)
      expect(p.y).toBeCloseTo(y, 9)
      expect(p.alpha).toBeCloseTo(alpha, 9)
    }
  })

  it('dies once its alpha falls to its decay, as in fireworks-js', () => {
    const p = new Particle({ x: 0, y: 0, angle: 0, speed: 1, hue: 0, brightness: 60, decay: 0.25, friction: 1, gravity: 0, trail: 1, lineWidth: 1 })
    p.update() // 0.75
    p.update() // 0.5
    expect(p.dead).toBe(false)
    p.update() // 0.25 <= decay
    expect(p.dead).toBe(true)
  })

  it('keeps its trail at the configured length', () => {
    const p = new Particle({ x: 0, y: 0, angle: 0, speed: 1, hue: 0, brightness: 60, decay: 0.01, friction: 1, gravity: 0, trail: 5, lineWidth: 1 })
    for (let i = 0; i < 10; i++) p.update()
    expect(p.coordinates).toHaveLength(5)
  })
})
