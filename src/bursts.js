import { Particle } from './particle.js'
import { inRange } from './random.js'
import { Core, Flame, Flash, Glow, Smoke } from './fireball.js'

/** Turn between flames in a sunflower spread, radians. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
/** Front flames' launch speed, px/step at burst size 1; they travel about ten times this. */
const FIREBALL_SPEED = 6

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
 * @property {boolean} [calm] reduced motion is in effect: no flashes
 * @property {number} [size] scales how far the burst spreads (and a fireball's flames and smoke); 1 by default
 *
 * @typedef {(c: BurstContext) => import('./engine.js').ParticleLike[]} Burst
 */

/**
 * The fireworks-js explosion particle.
 * @param {BurstContext} c
 * @param {Partial<import('./particle.js').ParticleInit>} [overrides]
 */
function particle({ x, y, hue, options: o, random: r, size = 1 }, overrides = {}) {
  const init = {
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
  }
  // Distance travelled is proportional to speed (friction is a fixed ratio per step).
  return new Particle({ ...init, speed: init.speed * size })
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

  // A ball of fire: a white flash and a glow, then flames blasting out as a
  // round ball (a sunflower spread fills the disc evenly; one shared friction
  // keeps it round as it grows) around a blue heart; then they rise
  // and cool to red, with gold embers, then smoke as the flames die. Its own
  // colours; the hue is unused. Under reduced motion there is no flash of light.
  fireball: (c) => {
    const r = c.random
    const s = c.size ?? 1
    const smoke = Math.floor(c.count * 0.15)
    const embers = Math.floor(c.count * 0.25)
    const flames = Math.max(1, c.count - smoke - embers - (c.calm ? 1 : 3))
    const offset = r.range(0, Math.PI * 2)
    return [
      ...(c.calm ? [] : [new Flash(c.x, c.y, 45 * s), new Glow(c.x, c.y, 120 * s)]),
      new Core(c.x, c.y, FIREBALL_SPEED * 10 * 0.6 * s, 20 * s),
      ...Array.from({ length: flames }, (_, i) => {
        const reach = Math.sqrt((i + 0.5) / flames) // 0 at the heart, 1 at the front
        return new Flame({
          x: c.x + r.range(-4, 4) * s,
          y: c.y + r.range(-4, 4) * s,
          angle: offset + i * GOLDEN_ANGLE + r.range(-0.15, 0.15),
          speed: FIREBALL_SPEED * reach * r.range(0.92, 1.08) * s,
          radius: r.range(14, 28) * s,
          life: r.int(45, 80),
          buoyancy: Flame.BUOYANCY * s,
          blue: 1 - reach,
        })
      }),
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
            x: c.x + r.range(-35, 35) * s,
            y: c.y + r.range(-30, 5) * s,
            delay: r.int(25, 45),
            life: r.int(60, 90),
            drift: r.range(-0.6, 0.6) * s,
            rise: r.range(0.4, 0.9) * s,
            radius: r.range(16, 26) * s,
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
