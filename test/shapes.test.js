import { describe, it, expect } from 'vitest'
import { shapes, alongPath, animals, drawing } from '../src/shapes.js'
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
      const ball = parts.filter((p) => p.hue === 30)
      const ring = parts.filter((p) => p.hue === 210)
      expect(ball).toHaveLength(33)
      expect(ring).toHaveLength(54) // a dense ring: twice the rest of the count
      expect(parts).toHaveLength(87)
      // the ring's sparks fly well past the ball's
      expect(Math.max(...ring.map((p) => p.speed))).toBeGreaterThan(Math.max(...ball.map((p) => p.speed)) * 2.5)
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

describe('Animals burst', () => {
  for (const name of Object.keys(animals)) {
    it(`draws a ${name} of exactly n points, centred, within radius 1`, () => {
      const pts = drawing(animals[name], 100)
      expect(pts).toHaveLength(100)
      const xs = pts.map(([x]) => x)
      const ys = pts.map(([, y]) => y)
      for (const [x, y] of pts) expect(Math.hypot(x, y)).toBeLessThanOrEqual(1 + 1e-9)
      expect(Math.max(...pts.map(([x, y]) => Math.hypot(x, y)))).toBeCloseTo(1)
      expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(0) // centred on its box
      expect(Math.min(...ys) + Math.max(...ys)).toBeCloseTo(0)
    })
  }

  it('uses twice the count, keeps its form as it moves, and faces both ways', () => {
    const facings = new Set()
    for (let seed = 1; seed <= 20; seed++) {
      const parts = bursts.animals(c(50, seed))
      expect(parts).toHaveLength(100)
      expect(new Set(parts.map((p) => p.decay)).size).toBe(1)
      const v = parts.map((p) => [Math.cos(p.angle) * p.speed, Math.sin(p.angle) * p.speed])
      run(parts, 12)
      const i = v.findIndex(([vx]) => Math.abs(vx) > 1)
      const k = (parts[i].x - 400) / v[i][0]
      const drop = parts[i].y - 300 - v[i][1] * k
      parts.forEach((p, j) => {
        expect(p.x - 400).toBeCloseTo(v[j][0] * k, 6)
        expect(p.y - 300).toBeCloseTo(v[j][1] * k + drop, 6)
      })
      // which animal and which way: its launch points are one drawing, or that drawing mirrored
      const far = Math.max(...v.map(([x, y]) => Math.hypot(x, y)))
      const launch = v.map(([x, y]) => [x / far, y / far])
      const match = (/** @type {number[][]} */ pts) => pts.every(([x, y], j) => Math.abs(x - launch[j][0]) < 1e-9 && Math.abs(y - launch[j][1]) < 1e-9)
      const found = Object.keys(animals).flatMap((name) => {
        const d = drawing(animals[name], 100)
        return [match(d) && 'right', match(d.map(([x, y]) => [-x, y])) && 'left'].filter(Boolean)
      })
      expect(found).toHaveLength(1)
      facings.add(found[0])
    }
    expect(facings.size).toBe(2)
  })
})
