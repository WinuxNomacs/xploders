import { Sprite } from './sprite.js'

// Original pixel feather, three poses for the sway: tilted right, flat, tilted left.
const sprite = Sprite.fromPixels(
  [
    ['...w', '..wg', '.wg.', 'g...'],
    ['....', 'wwww', '.ggg', '....'],
    ['w...', 'gw..', '.gw.', '...g'],
  ],
  { '.': null, w: '#ffffff', g: '#c8c6d8' },
)

/**
 * @typedef {object} FeatherInit
 * @property {number} x
 * @property {number} y
 * @property {number} scale CSS px per sprite pixel
 * @property {import('./random.js').Random} random
 */

/**
 * A feather from an exploding chicken: bursts outward, slows quickly, then
 * falls slowly while swaying and turning, and fades near the end. Drawn crisp
 * on the sprite layer. Units are per 1/60 s step.
 */
export class Feather {
  static FALL_SPEED = 0.7 // px/step, slow and steady
  static FADE_STEPS = 40

  /** @param {FeatherInit} init */
  constructor({ x, y, scale, random: r }) {
    const angle = r.range(0, Math.PI * 2)
    const speed = r.range(2.5, 6)
    this.baseX = x
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed - 1.5 // puffs upward a little
    this.scale = scale
    this.swayAmp = r.range(6, 12)
    this.swayFreq = r.range(0.05, 0.08) // rad/step
    this.phase = r.range(0, Math.PI * 2)
    this.life = r.int(120, 180)
    this.age = 0
    this.dead = false
    /** @type {'sprite'} */
    this.layer = 'sprite'
  }

  /** @returns {boolean} never pops */
  update() {
    this.vx *= 0.92
    this.vy = Math.min(this.vy * 0.92 + 0.05, Feather.FALL_SPEED)
    this.baseX += this.vx
    this.y += this.vy
    this.age++
    this.x = this.baseX + Math.sin(this.age * this.swayFreq + this.phase) * this.swayAmp
    if (this.age >= this.life) this.dead = true
    return false
  }

  /** Which pose: the way it is swinging. */
  get frame() {
    const swing = Math.cos(this.age * this.swayFreq + this.phase)
    return swing > 0.35 ? 0 : swing < -0.35 ? 2 : 1
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = Math.min(1, (this.life - this.age) / Feather.FADE_STEPS)
    sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, alpha })
  }
}
