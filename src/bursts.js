import { Particle } from './particle.js'
import { inRange } from './random.js'
import { Flame, Glow, Smoke } from './fireball.js'

/**
 * Burst styles. Each returns up to `count` particles for an explosion at (x, y).
 *
 * @typedef {object} BurstContext
 * @property {number} x
 * @property {number} y
 * @property {number} hue
 * @property {number} count
 * @property {import('./options.js').Options} options
 * @property {import('./random.js').Random} random
 *
 * @typedef {(c: BurstContext) => import('./engine.js').ParticleLike[]} Burst
 */

/**
 * The fireworks-js explosion particle.
 * @param {BurstContext} c
 * @param {Partial<import('./particle.js').ParticleInit>} [overrides]
 */
function particle({ x, y, hue, options: o, random: r }, overrides = {}) {
  return new Particle({
    x,
    y,
    angle: r.range(0, Math.PI * 2),
    speed: r.int(1, 10),
    hue,
    brightness: inRange(r, o.brightness, true),
    decay: inRange(r, o.decay),
    friction: o.friction,
    gravity: o.gravity,
    trail: o.explosion,
    lineWidth: inRange(r, o.lineWidth.explosion),
    flicker: r.int(0, 100) <= o.flickering,
    ...overrides,
  })
}

/** @type {Record<import('./options.js').BurstStyle, Burst>} */
export const bursts = {
  peony: (c) => Array.from({ length: c.count }, () => particle(c)),

  // Evenly spaced angles and one shared speed: friction and gravity act the same
  // on every particle, so the ring stays a circle as it drifts and fades.
  ring: (c) => {
    const speed = c.random.range(6, 9)
    const decay = inRange(c.random, c.options.decay)
    const offset = c.random.range(0, Math.PI * 2)
    return Array.from({ length: c.count }, (_, i) =>
      particle(c, { angle: offset + (i / c.count) * Math.PI * 2, speed, decay }),
    )
  },

  // Long-lived gold strands that droop further than a peony.
  willow: (c) =>
    Array.from({ length: c.count }, () =>
      particle(c, {
        hue: c.random.range(35, 48),
        speed: c.random.range(2, 8),
        decay: inRange(c.random, c.options.decay) * 0.4,
        friction: Math.max(c.options.friction, 0.96),
        gravity: c.options.gravity * 0.5,
        trail: c.options.explosion * 3,
        brightness: c.random.range(55, 70),
        flicker: false,
      }),
    ),

  // Flickers, then each particle pops into a few tiny sparks near the end.
  crackle: (c) =>
    Array.from({ length: c.count }, () => particle(c, { flicker: true, crackleAt: c.random.range(0.2, 0.4) })),

  // A ball of fire: a glow, rising flames that cool from yellow to red, gold
  // embers, then smoke as the flames die. Its own colours; the hue is unused.
  fireball: (c) => {
    const r = c.random
    const smoke = Math.floor(c.count * 0.15)
    const embers = Math.floor(c.count * 0.25)
    const flames = Math.max(1, c.count - smoke - embers - 1)
    return [
      new Glow(c.x, c.y, 120),
      ...Array.from(
        { length: flames },
        () =>
          new Flame({
            x: c.x + r.range(-10, 10),
            y: c.y + r.range(-10, 10),
            angle: r.range(0, Math.PI * 2),
            speed: r.range(1, 7),
            radius: r.range(14, 28),
            life: r.int(45, 80),
          }),
      ),
      ...Array.from({ length: embers }, () =>
        particle(c, {
          hue: r.range(25, 45),
          speed: r.range(2, 9),
          brightness: r.range(60, 75),
          decay: r.range(0.02, 0.04),
          gravity: c.options.gravity * 0.6,
          flicker: true,
        }),
      ),
      ...Array.from(
        { length: smoke },
        () =>
          new Smoke({
            x: c.x + r.range(-35, 35),
            y: c.y + r.range(-30, 5),
            delay: r.int(25, 45),
            life: r.int(60, 90),
            drift: r.range(-0.6, 0.6),
            rise: r.range(0.4, 0.9),
            radius: r.range(16, 26),
          }),
      ),
    ]
  },
}

/**
 * The tiny sparks a crackle particle pops into.
 * @param {Particle} parent
 * @param {import('./random.js').Random} r
 * @param {number} max
 */
export function crackleSparks(parent, r, max) {
  return Array.from(
    { length: Math.max(0, Math.min(max, r.int(3, 5))) },
    () =>
      new Particle({
        x: parent.x,
        y: parent.y,
        angle: r.range(0, Math.PI * 2),
        speed: r.range(1, 3),
        hue: parent.hue,
        brightness: 85,
        decay: r.range(0.06, 0.1),
        friction: 0.9,
        gravity: parent.gravity * 0.5,
        trail: 2,
        lineWidth: 1,
        flicker: true,
      }),
  )
}
