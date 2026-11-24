import { describe, it, expect } from 'vitest'
import { shapes, alongPath } from '../src/shapes.js'
import { bursts } from '../src/bursts.js'
import { defaultOptions } from '../src/options.js'
import { Random } from '../src/random.js'

const c = (count = 60, seed = 1, hue = 200) => ({ x: 400, y: 300, hue, count, options: defaultOptions(), random: new Random(seed) })

/** Steps every spark `n` times. */
function run(parts, n) {
  for (let i = 0; i < n; i++) parts.forEach((p) => p.update())
}

describe('Shape outlines', () => {
  it('spaces points evenly along a path', () => {
    const pts = alongPath(
      [
        [0, 0],
        [10, 0],
      ],
      6,
      false,
    )
    expect(pts.map(([x]) => x)).toEqual([0, 2, 4, 6, 8, 10])
    const square = alongPath(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      8,
      true,
    )
    for (let i = 0; i < 8; i++) {
      const [a, b] = [square[i], square[(i + 1) % 8]]
      expect(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])).toBeCloseTo(0.5)
    }
  })

  for (const name of Object.keys(shapes)) {
    it(`makes a ${name} of exactly n points within radius 1`, () => {
      for (let seed = 1; seed <= 5; seed++) {
        const { points } = shapes[name](40, new Random(seed))
        expect(points).toHaveLength(40)
        for (const [x, y] of points) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
          expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-9)
        }
        expect(Math.max(...points.map(([x, y]) => Math.hypot(x, y)))).toBeGreaterThan(0.5) // not a dot
      }
    })
  }

  it('puts the heart point down and the smile below the smiley eyes', () => {
    const heart = shapes.heart(200, new Random(1)).points
    const bottom = heart.reduce((a, b) => (b[1] > a[1] ? b : a))
    expect(Math.abs(bottom[0])).toBeLessThan(0.3) // the point, near the middle
    expect(bottom[1]).toBeGreaterThan(0.7)
    const smiley = shapes.smiley(100, new Random(1)).points
    const inside = smiley.filter(([x, y]) => Math.hypot(x, y) < 0.8)
    expect(inside.some(([, y]) => y < -0.2)).toBe(true) // eyes up
    expect(inside.some(([, y]) => y > 0.4)).toBe(true) // smile down
  })
})

describe('Shapes burst', () => {
  it('keeps its outline as it grows and drifts: every spark stays proportional to its launch point', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const parts = bursts.shapes(c(60, seed))
      expect(parts).toHaveLength(60)
      expect(new Set(parts.map((p) => p.decay)).size).toBe(1) // fades as a whole
      const v = parts.map((p) => [Math.cos(p.angle) * p.speed, Math.sin(p.angle) * p.speed])
      run(parts, 15)
      // every spark has moved by the same multiple of its launch velocity, plus the same drop
      const k = Math.max(...v.map(([vx], i) => (Math.abs(vx) > 1 ? (parts[i].x - 400) / vx : 0)))
      const drop = parts[0].y - 300 - v[0][1] * k
      parts.forEach((p, i) => {
        expect(p.x - 400).toBeCloseTo(v[i][0] * k, 6)
        expect(p.y - 300).toBeCloseTo(v[i][1] * k + drop, 6)
      })
    }
  })

  it('picks every shape, and gives the star two eyes that are little fireworks', () => {
    // The star's eye sparks are the only ones in another hue.
    let stars = 0
    for (let seed = 1; seed <= 60; seed++) {
      const parts = bursts.shapes(c(60, seed, 200))
      const eyes = parts.filter((p) => p.hue !== 200)
      if (!eyes.length) continue
      stars++
      expect(eyes.every((p) => p.hue === 260 && p.flicker)).toBe(true)
      expect(eyes.length).toBeGreaterThanOrEqual(6)
      // each eye spreads: its sparks start at one point but fly at different velocities around it
      const speeds = new Set(eyes.map((p) => p.speed.toFixed(3)))
      expect(speeds.size).toBeGreaterThan(eyes.length / 2)
      // inside the star, in its upper half
      for (const p of eyes) expect(Math.sin(p.angle) * p.speed).toBeLessThan(0.5)
    }
    expect(stars).toBeGreaterThan(3)
  })
})

describe('Saturn burst', () => {
  it('has a ball in the launch colour inside a flattened ring in the opposite colour', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const parts = bursts.saturn(c(60, seed, 30))
      expect(parts).toHaveLength(60)
      const ball = parts.filter((p) => p.hue === 30)
      const ring = parts.filter((p) => p.hue === 210)
      expect(ball.length + ring.length).toBe(60)
      expect(ball.length).toBeGreaterThan(ring.length)
      // the ring's sparks fly further than any of the ball's
      expect(Math.max(...ring.map((p) => p.speed))).toBeGreaterThan(Math.max(...ball.map((p) => p.speed)) * 1.8)
      // flattened: its widest reach is at least twice its narrowest
      expect(Math.max(...ring.map((p) => p.speed))).toBeGreaterThan(Math.min(...ring.map((p) => p.speed)) * 2)
      expect(new Set(parts.map((p) => p.decay)).size).toBe(1)
    }
  })

  it('wraps the opposite hue round the colour wheel', () => {
    const parts = bursts.saturn(c(20, 1, 300))
    expect(new Set(parts.map((p) => p.hue))).toEqual(new Set([300, 120]))
  })
})
