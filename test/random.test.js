import { describe, it, expect } from 'vitest'
import { Random } from '../src/random.js'

describe('Random', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new Random(42)
    const b = new Random(42)
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()))
  })

  it('keeps range() and int() within their bounds', () => {
    const r = new Random(1)
    for (let i = 0; i < 1000; i++) {
      const f = r.range(-3, 7)
      expect(f).toBeGreaterThanOrEqual(-3)
      expect(f).toBeLessThan(7)
      const n = r.int(2, 4)
      expect([2, 3, 4]).toContain(n)
    }
  })
})
