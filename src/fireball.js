/**
 * The pieces of a fireball burst: a white flash, a glow, a blue heart, flames and smoke. Gold embers are
 * ordinary fireworks particles (see `bursts.fireball`). Units are per 1/60 s step.
 *
 * Flames and the glow draw on the trail layer, whose additive blending makes
 * overlapping flames burn white-hot in the middle. Smoke is dark, which an
 * additive layer can't show, so it draws on the sprite layer, behind sprites.
 *
 * All of them draw soft dots made once and cached, scaled with drawImage: far
 * cheaper than a new radial gradient per piece per frame.
 */
import { createCanvas } from './sprite.js'

const DOT = 64
/** @type {Map<string, HTMLCanvasElement | OffscreenCanvas>} */
const dots = new Map()

/**
 * A soft round dot with these gradient stops, made on first use.
 * @param {string} key
 * @param {[number, string][]} stops
 */
function softDot(key, stops) {
  let dot = dots.get(key)
  if (!dot) {
    dot = createCanvas(DOT, DOT)
    /** @type {any} */
    const c = dot.getContext('2d')
    const g = c.createRadialGradient(DOT / 2, DOT / 2, 0, DOT / 2, DOT / 2, DOT / 2)
    for (const [at, colour] of stops) g.addColorStop(at, colour)
    c.fillStyle = g
    c.fillRect(0, 0, DOT, DOT)
    dots.set(key, dot)
  }
  return dot
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement | OffscreenCanvas} dot
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} alpha
 */
function drawDot(ctx, dot, x, y, r, alpha) {
  if (!(alpha > 0) || !(r > 0)) return
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.drawImage(dot, x - r, y - r, r * 2, r * 2)
  ctx.globalAlpha = 1
}

/** Flame colours are cached in this many steps over a flame's life. */
const FLAME_STEPS = 24
/** ...and this many levels of how long a flame stays blue. */
const BLUE_LEVELS = 4

/** A flame's colour from birth (0) to death (1), after its blue-white start. */
const COOLING = /** @type {[number, [number, number, number]][]} */ ([
  [0, [255, 245, 200]], // white-yellow
  [0.15, [255, 185, 50]], // bright orange-yellow
  [0.55, [235, 90, 20]], // orange-red
  [1, [140, 25, 5]], // deep red
])
const BLUE_WHITE = /** @type {[number, number, number]} */ ([185, 210, 255])

/**
 * The colour at `t` (0 to 1) of a flame that stays blue for the first `hold` of its life.
 * @param {number} t
 * @param {number} hold
 * @returns {[number, number, number]}
 */
export function flameColour(t, hold) {
  const keys = /** @type {[number, [number, number, number]][]} */ ([
    [0, BLUE_WHITE],
    ...COOLING.map(([at, c]) => /** @type {[number, [number, number, number]]} */ ([hold + at * (1 - hold), c])),
  ])
  let i = 1
  while (i < keys.length - 1 && t > keys[i][0]) i++
  const [a, ca] = keys[i - 1]
  const [b, cb] = keys[i]
  const f = b > a ? Math.min(1, Math.max(0, (t - a) / (b - a))) : 1
  return /** @type {[number, number, number]} */ (ca.map((v, k) => Math.round(v + (cb[k] - v) * f)))
}

/**
 * @typedef {object} FlameInit
 * @property {number} x
 * @property {number} y
 * @property {number} angle radians
 * @property {number} speed px/step
 * @property {number} radius px at the start
 * @property {number} life steps
 * @property {number} [buoyancy] upward px/step^2, `Flame.BUOYANCY` by default
 * @property {number} [blue] 0 to 1: how long it stays blue-white, the heart of the fireball longest; 0 by default
 */

/**
 * A soft ball of fire that blasts out, slows, then rises like hot air, swells,
 * and cools from blue-white through orange-yellow to red as it fades.
 */
export class Flame {
  static BUOYANCY = 0.06 // upward px/step^2
  static FRICTION = 0.9
  /** Below 1 so the yellow shows where only a few flames overlap, not just white. */
  static MAX_ALPHA = 0.8
  /** Steps before it rises at full buoyancy, so the blast stays round first. */
  static RISE_AFTER = 15

  /** @param {FlameInit} init */
  constructor({ x, y, angle, speed, radius, life, buoyancy = Flame.BUOYANCY, blue = 0 }) {
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius0 = radius
    this.life = life
    this.buoyancy = buoyancy
    /** share of its life it stays blue-white, quantised so colours cache */
    this.hold = 0.06 + 0.24 * (Math.round(Math.min(1, Math.max(0, blue)) * (BLUE_LEVELS - 1)) / (BLUE_LEVELS - 1))
    this.age = 0
    this.dead = false
    /** @type {'trail'} */
    this.layer = 'trail'
  }

  /** @returns {number} 0 at birth, 1 at death */
  get t() {
    return Math.min(1, this.age / this.life)
  }

  /** @returns {[number, number, number]} red, green, blue now */
  get colour() {
    return flameColour(this.t, this.hold)
  }

  get radius() {
    return this.radius0 * (0.6 + 0.9 * this.t)
  }

  get alpha() {
    return Flame.MAX_ALPHA * (1 - this.t) ** 1.5
  }

  /** @returns {boolean} never pops */
  update() {
    this.vx *= Flame.FRICTION
    this.vy = this.vy * Flame.FRICTION - this.buoyancy * Math.min(1, this.age / Flame.RISE_AFTER)
    this.x += this.vx
    this.y += this.vy
    this.age++
    if (this.age >= this.life) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const step = Math.min(FLAME_STEPS - 1, Math.floor(this.t * FLAME_STEPS))
    const colour = flameColour(step / (FLAME_STEPS - 1), this.hold).join(', ')
    const dot = softDot(`flame${colour}`, [
      [0, `rgba(${colour}, 1)`],
      [1, `rgba(${colour}, 0)`],
    ])
    drawDot(ctx, dot, this.x, this.y, this.radius, this.alpha)
  }
}

/** The bright white flash at the very centre as it goes off: a few steps, then gone. */
export class Flash {
  static LIFE = 9

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius px at its biggest
   */
  constructor(x, y, radius) {
    this.x = x
    this.y = y
    this.maxRadius = radius
    this.age = 0
    this.dead = false
    /** @type {'trail'} */
    this.layer = 'trail'
  }

  get t() {
    return Math.min(1, this.age / Flash.LIFE)
  }

  /** @returns {boolean} never pops */
  update() {
    this.age++
    if (this.age >= Flash.LIFE) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const t = this.t
    const dot = softDot('flash', [
      [0, 'rgba(255, 255, 255, 1)'],
      [0.35, 'rgba(255, 255, 255, 0.9)'],
      [1, 'rgba(255, 255, 255, 0)'],
    ])
    drawDot(ctx, dot, this.x, this.y, this.maxRadius * (0.6 + 0.4 * t), (1 - t) ** 2)
  }
}

/**
 * The blue heart of a fireball. Overlapping flames add up to white on the
 * additive trail layer, so blue can't come from them; this is a translucent
 * blue ball drawn normally on the sprite layer, tinting the white-hot middle
 * blue as the ball grows, then fading as the flames turn orange-yellow.
 */
export class Core {
  static LIFE = 26
  static MAX_ALPHA = 0.75

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} reach px it grows to, following the flames
   * @param {number} radius px at the start
   */
  constructor(x, y, reach, radius) {
    this.x = x
    this.y = y
    this.reach = reach
    this.radius0 = radius
    this.age = 0
    this.dead = false
    /** @type {'sprite'} */
    this.layer = 'sprite'
    /** drawn behind the sprites flying through it */
    this.behind = true
  }

  get t() {
    return Math.min(1, this.age / Core.LIFE)
  }

  get alpha() {
    return Core.MAX_ALPHA * Math.min(1, this.age / 2) * (1 - this.t) ** 1.5
  }

  get radius() {
    // grows as the flames do: they slow by Flame.FRICTION each step
    return this.radius0 + this.reach * (1 - Flame.FRICTION ** this.age)
  }

  /** @returns {boolean} never pops */
  update() {
    this.age++
    if (this.age >= Core.LIFE) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const dot = softDot('core', [
      [0, 'rgba(120, 170, 255, 1)'],
      [0.55, 'rgba(70, 120, 255, 0.7)'],
      [1, 'rgba(50, 90, 255, 0)'],
    ])
    drawDot(ctx, dot, this.x, this.y, this.radius, this.alpha)
  }
}

/** The glow of light around a fireball: swells quickly and fades. */
export class Glow {
  static LIFE = 28

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius px when fully swollen
   */
  constructor(x, y, radius) {
    this.x = x
    this.y = y
    this.maxRadius = radius
    this.age = 0
    this.dead = false
    /** @type {'trail'} */
    this.layer = 'trail'
  }

  get t() {
    return Math.min(1, this.age / Glow.LIFE)
  }

  /** @returns {boolean} never pops */
  update() {
    this.age++
    if (this.age >= Glow.LIFE) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const t = this.t
    const dot = softDot('glow', [
      [0, 'hsla(50, 100%, 90%, 1)'],
      [0.4, 'hsla(30, 100%, 60%, 0.6)'],
      [1, 'hsla(15, 100%, 50%, 0)'],
    ])
    drawDot(ctx, dot, this.x, this.y, this.maxRadius * (1 - (1 - t) ** 3) + 1, 0.55 * (1 - t))
  }
}

/**
 * @typedef {object} SmokeInit
 * @property {number} x
 * @property {number} y
 * @property {number} delay steps before it shows, so it rises as the flames die
 * @property {number} life steps once showing
 * @property {number} drift px/step sideways
 * @property {number} rise px/step upward
 * @property {number} radius px at the start
 */

/** A dark puff that appears as the flames burn out, rises, spreads and fades. */
export class Smoke {
  static MAX_ALPHA = 0.35

  /** @param {SmokeInit} init */
  constructor({ x, y, delay, life, drift, rise, radius }) {
    this.x = x
    this.y = y
    this.delay = delay
    this.life = life
    this.vx = drift
    this.vy = -rise
    this.radius0 = radius
    this.age = -delay
    this.dead = false
    /** @type {'sprite'} */
    this.layer = 'sprite'
    /** drawn behind the sprites flying through it */
    this.behind = true
  }

  /** @returns {boolean} never pops */
  update() {
    this.age++
    if (this.age > 0) {
      this.vx *= 0.98
      this.x += this.vx
      this.y += this.vy
    }
    if (this.age >= this.life) this.dead = true
    return false
  }

  get alpha() {
    if (this.age <= 0) return 0
    return Smoke.MAX_ALPHA * Math.min(1, this.age / 12) * (1 - this.age / this.life)
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const dot = softDot('smoke', [
      [0, 'hsla(20, 6%, 38%, 1)'],
      [1, 'hsla(20, 6%, 38%, 0)'],
    ])
    drawDot(ctx, dot, this.x, this.y, this.radius0 * (1 + (1.5 * this.age) / this.life), this.alpha)
  }
}
