/**
 * Seedable pseudo-random number generator (mulberry32), so a seeded show and
 * the tests are repeatable. Without a seed it starts from Math.random().
 */
export class Random {
  /** @param {number} [seed] */
  constructor(seed) {
    this.state = (seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0
  }

  /** @returns {number} a float in [0, 1) */
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /**
   * @param {number} min
   * @param {number} max
   * @returns {number} a float in [min, max)
   */
  range(min, max) {
    return min + (max - min) * this.next()
  }

  /**
   * @param {number} min
   * @param {number} max
   * @returns {number} an integer in [min, max]
   */
  int(min, max) {
    return Math.floor(this.range(min, max + 1))
  }

  /**
   * @template T
   * @param {readonly T[]} items non-empty
   * @returns {T}
   */
  pick(items) {
    return items[Math.floor(this.next() * items.length)]
  }
}

/**
 * A random value in a fireworks-js `{min, max}` range.
 * @param {Random} random
 * @param {{min: number, max: number}} range
 * @param {boolean} [integer]
 */
export function inRange(random, { min, max }, integer = false) {
  return integer ? random.int(min, max) : random.range(min, max)
}
