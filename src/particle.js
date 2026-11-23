/**
 * @typedef {object} ParticleInit
 * @property {number} x
 * @property {number} y
 * @property {number} angle radians
 * @property {number} speed px/step
 * @property {number} hue 0-360
 * @property {number} brightness lightness, percent
 * @property {number} decay alpha lost per step
 * @property {number} friction speed multiplier per step
 * @property {number} gravity downward drift, px/step
 * @property {number} trail positions kept for the trail line
 * @property {number} lineWidth
 * @property {boolean} [flicker] lightness flickers when drawn
 * @property {number} [crackleAt] alpha at which it pops into sparks (crackle bursts)
 */

/**
 * One spark of an explosion, with fireworks-js `Explosion` motion: speed decays
 * by `friction`, `gravity` is a constant drift, alpha drops by `decay` per step.
 * Units are per 1/60 s step.
 */
export class Particle {
  /** @param {ParticleInit} init */
  constructor(init) {
    this.x = init.x
    this.y = init.y
    this.angle = init.angle
    this.speed = init.speed
    this.hue = init.hue
    this.brightness = init.brightness
    this.decay = init.decay
    this.friction = init.friction
    this.gravity = init.gravity
    this.lineWidth = init.lineWidth
    this.flicker = init.flicker ?? false
    this.crackleAt = init.crackleAt ?? 0
    this.alpha = 1
    /** @type {[number, number][]} newest first */
    this.coordinates = Array.from({ length: Math.max(1, Math.floor(init.trail)) }, () => [init.x, init.y])
    this.dead = false
  }

  /**
   * Advances one step.
   * @returns {boolean} true when it should pop into sparks now (crackle)
   */
  update() {
    this.coordinates.pop()
    this.coordinates.unshift([this.x, this.y])
    this.speed *= this.friction
    this.x += Math.cos(this.angle) * this.speed
    this.y += Math.sin(this.angle) * this.speed + this.gravity
    this.alpha -= this.decay
    if (this.crackleAt > 0 && this.alpha <= this.crackleAt) {
      this.dead = true
      return true
    }
    if (this.alpha <= this.decay) this.dead = true
    return false
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {() => number} flickerRandom a [0, 1) source not tied to the simulation's seed
   */
  draw(ctx, flickerRandom) {
    const [tx, ty] = this.coordinates[this.coordinates.length - 1]
    const light = this.flicker ? flickerRandom() * this.brightness : this.brightness
    ctx.beginPath()
    ctx.lineWidth = this.lineWidth
    ctx.moveTo(tx, ty)
    ctx.lineTo(this.x, this.y)
    ctx.strokeStyle = `hsla(${this.hue}, 100%, ${light}%, ${this.alpha})`
    ctx.stroke()
  }
}
