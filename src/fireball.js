/**
 * The pieces of a fireball burst: a glow, flames and smoke. Gold embers are
 * ordinary fireworks particles (see `bursts.fireball`). Units are per 1/60 s step.
 *
 * Flames and the glow draw on the trail layer, whose additive blending makes
 * overlapping flames burn white-hot in the middle. Smoke is dark, which an
 * additive layer can't show, so it draws on the sprite layer, behind sprites.
 *
 * All three draw soft dots made once and cached, scaled with drawImage: far
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

/**
 * @typedef {object} FlameInit
 * @property {number} x
 * @property {number} y
 * @property {number} angle radians
 * @property {number} speed px/step
 * @property {number} radius px at the start
 * @property {number} life steps
 * @property {number} [buoyancy] upward px/step^2, `Flame.BUOYANCY` by default
 */

/**
 * A soft ball of fire that slows, rises like hot air, swells, and cools from
 * white-yellow through orange to red as it fades.
 */
export class Flame {
  static BUOYANCY = 0.06 // upward px/step^2
  static FRICTION = 0.9

  /** @param {FlameInit} init */
  constructor({ x, y, angle, speed, radius, life, buoyancy = Flame.BUOYANCY }) {
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius0 = radius
    this.life = life
    this.buoyancy = buoyancy
    this.age = 0
    this.dead = false
    /** @type {'trail'} */
    this.layer = 'trail'
  }

  /** @returns {number} 0 at birth, 1 at death */
  get t() {
    return Math.min(1, this.age / this.life)
  }

  get hue() {
    return 55 * (1 - this.t)
  }

  get lightness() {
    return 92 - 50 * this.t
  }

  get radius() {
    return this.radius0 * (0.6 + 0.9 * this.t)
  }

  get alpha() {
    return (1 - this.t) ** 1.5
  }

  /** @returns {boolean} never pops */
  update() {
    this.vx *= Flame.FRICTION
    this.vy = this.vy * Flame.FRICTION - this.buoyancy
    this.x += this.vx
    this.y += this.vy
    this.age++
    if (this.age >= this.life) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const step = Math.min(FLAME_STEPS - 1, Math.floor(this.t * FLAME_STEPS))
    const t = step / (FLAME_STEPS - 1)
    const colour = `${Math.round(55 * (1 - t))}, 100%, ${Math.round(92 - 50 * t)}%`
    const dot = softDot(`flame${step}`, [
      [0, `hsla(${colour}, 1)`],
      [1, `hsla(${colour}, 0)`],
    ])
    drawDot(ctx, dot, this.x, this.y, this.radius, this.alpha)
  }
}

/** The flash of light at the heart of a fireball: swells quickly and fades. */
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
