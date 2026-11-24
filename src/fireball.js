/**
 * The pieces of a fireball burst: a glow, flames and smoke. Gold embers are
 * ordinary fireworks particles (see `bursts.fireball`). Units are per 1/60 s step.
 *
 * Flames and the glow draw on the trail layer, whose additive blending makes
 * overlapping flames burn white-hot in the middle. Smoke is dark, which an
 * additive layer can't show, so it draws on the sprite layer.
 */

/**
 * @typedef {object} FlameInit
 * @property {number} x
 * @property {number} y
 * @property {number} angle radians
 * @property {number} speed px/step
 * @property {number} radius px at the start
 * @property {number} life steps
 */

/**
 * A soft ball of fire that slows, rises like hot air, swells, and cools from
 * white-yellow through orange to red as it fades.
 */
export class Flame {
  static BUOYANCY = 0.06 // upward px/step^2
  static FRICTION = 0.9

  /** @param {FlameInit} init */
  constructor({ x, y, angle, speed, radius, life }) {
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.radius0 = radius
    this.life = life
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
    this.vy = this.vy * Flame.FRICTION - Flame.BUOYANCY
    this.x += this.vx
    this.y += this.vy
    this.age++
    if (this.age >= this.life) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const r = this.radius
    const colour = `${this.hue}, 100%, ${this.lightness}%`
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r)
    g.addColorStop(0, `hsla(${colour}, ${this.alpha})`)
    g.addColorStop(1, `hsla(${colour}, 0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
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
    const r = this.maxRadius * (1 - (1 - t) ** 3) + 1
    const a = 0.55 * (1 - t)
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r)
    g.addColorStop(0, `hsla(50, 100%, 90%, ${a})`)
    g.addColorStop(0.4, `hsla(30, 100%, 60%, ${a * 0.6})`)
    g.addColorStop(1, 'hsla(15, 100%, 50%, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
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
    const a = this.alpha
    if (a <= 0) return
    const r = this.radius0 * (1 + (1.5 * this.age) / this.life)
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r)
    g.addColorStop(0, `hsla(20, 6%, 38%, ${a})`)
    g.addColorStop(1, 'hsla(20, 6%, 38%, 0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}
