import { describe, it, expect } from 'vitest'
import { defaultOptions, deepMerge } from '../src/options.js'

describe('options', () => {
  it('default to the fireworks-js v2.10.8 values', () => {
    const o = defaultOptions()
    expect(o).toMatchObject({
      intensity: 30,
      delay: { min: 30, max: 60 },
      rocketsPoint: { min: 50, max: 50 },
      traceSpeed: 10,
      acceleration: 1.05,
      traceLength: 3,
      hue: { min: 0, max: 360 },
      particles: 50,
      explosion: 5,
      friction: 0.95,
      gravity: 1.5,
      decay: { min: 0.015, max: 0.03 },
      brightness: { min: 50, max: 80 },
      flickering: 50,
      lineWidth: { trace: { min: 1, max: 2 }, explosion: { min: 1, max: 3 } },
      lineStyle: 'round',
      opacity: 0.5,
      boundaries: { x: 50, y: 50, debug: false },
      autoresize: true,
    })
  })

  it('merge nested objects in place and replace arrays', () => {
    const o = defaultOptions()
    deepMerge(o, { hue: { min: 120 }, lineWidth: { trace: { max: 4 } }, burst: ['ring', 'willow'] })
    expect(o.hue).toEqual({ min: 120, max: 360 })
    expect(o.lineWidth).toEqual({ trace: { min: 1, max: 4 }, explosion: { min: 1, max: 3 } })
    expect(o.burst).toEqual(['ring', 'willow'])
  })

  it('skip undefined values when merging', () => {
    const o = deepMerge(defaultOptions(), { gravity: undefined })
    expect(o.gravity).toBe(1.5)
  })
})
