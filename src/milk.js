/**
 * @typedef {object} MilkInit
 * @property {number} x
 * @property {number} y
 * @property {number} scale CSS px per sprite pixel of the cow it came from
 * @property {import('./random.js').Random} random
 */

/**
 * A splash of milk from an exploded cow: flies out, falls, stretches along its
 * path and fades. Drawn on the sprite layer, so it stays milk-white instead of
 * adding up to glare, with a faint blue-grey edge so it shows on a light page
 * too. Units are per 1/60 s step.
 */
export class Milk {
  static GRAVITY = 0.25 // px/step^2
  static FADE_STEPS = 20

  /** @param {MilkInit} init */
  constructor({ x, y, scale, random: r }) {
    const angle = r.range(0, Math.PI * 2)
    const speed = r.range(2, 8)
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed - 2 // thrown upward a little
    this.radius = r.range(0.6, 1.3) * scale
    this.life = r.int(40, 70)
    this.age = 0
    this.dead = false
    /** @type {'sprite'} */
    this.layer = 'sprite'
  }

  get alpha() {
    return Math.min(1, (this.life - this.age) / Milk.FADE_STEPS)
  }

  /** @returns {boolean} never pops */
  update() {
    this.vx *= 0.98
    this.vy += Milk.GRAVITY
    this.x += this.vx
    this.y += this.vy
    this.age++
    if (this.age >= this.life) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = this.alpha
    if (!(alpha > 0)) return
    const speed = Math.hypot(this.vx, this.vy)
    // stretched along the way it moves, up to twice as long as wide
    const stretch = 1 + Math.min(1, speed / 8)
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(this.x, this.y)
    ctx.rotate(Math.atan2(this.vy, this.vx))
    ctx.beginPath()
    ctx.ellipse(0, 0, this.radius * stretch, this.radius, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#fbfdff'
    ctx.fill()
    ctx.lineWidth = 1
    ctx.strokeStyle = 'rgba(120, 140, 170, 0.6)'
    ctx.stroke()
    ctx.restore()
  }
}
