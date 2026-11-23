import { describe, it, expect } from 'vitest'
import { Projectile } from '../src/projectile.js'
import { Particle } from '../src/particle.js'

describe('Projectile', () => {
  it('rises, slows under gravity and asks to explode at the top of its arc', () => {
    const p = new Projectile({ x: 0, y: 500, vx: 0, vy: -300 })
    let steps = 0
    while (!p.shouldExplode() && steps < 1000) {
      p.update(1 / 60, 300)
      steps++
    }
    // v = g t, so the apex comes after about one second (60 steps).
    expect(steps).toBeGreaterThanOrEqual(59)
    expect(steps).toBeLessThanOrEqual(61)
    expect(p.y).toBeLessThan(500 - 140)
  })
})

describe('Particle', () => {
  it('fades out and reports dead after its life', () => {
    const p = new Particle({ x: 0, y: 0, vx: 10, vy: 0, hue: 0, life: 0.5 })
    for (let i = 0; i < 29; i++) p.update(1 / 60, 0, 1)
    expect(p.dead).toBe(false)
    for (let i = 0; i < 2; i++) p.update(1 / 60, 0, 1)
    expect(p.dead).toBe(true)
  })

  it('loses speed to friction', () => {
    const p = new Particle({ x: 0, y: 0, vx: 100, vy: 0, hue: 0, life: 10 })
    p.update(1, 0, 0.5)
    expect(p.vx).toBeCloseTo(50)
  })
})
