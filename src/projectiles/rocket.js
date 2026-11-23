import { Projectile } from '../projectile.js'
import { inRange } from '../random.js'

/**
 * The firework shell, with fireworks-js `Trace` motion: a straight line from the
 * launch point to the target, speed multiplied by `acceleration` each step.
 */
export class Rocket extends Projectile {
  /** @param {import('../projectile.js').ProjectileInit} init */
  constructor(init) {
    super(init)
    const { options: o } = init
    this.sx = init.x
    this.sy = init.y
    this.speed = o.traceSpeed
    this.acceleration = o.acceleration
    this.angle = Math.atan2(init.target.y - init.y, init.target.x - init.x)
    this.totalDistance = Math.hypot(init.target.x - init.x, init.target.y - init.y)
    this.brightness = init.random.int(50, 70)
    this.arrived = false
    this.lineWidth = inRange(init.random, o.lineWidth.trace)
    /** @type {[number, number][]} newest first */
    this.coordinates = Array.from({ length: Math.max(1, Math.floor(o.traceLength)) }, () => [init.x, init.y])
  }

  update() {
    this.coordinates.pop()
    this.coordinates.unshift([this.x, this.y])
    this.speed *= this.acceleration
    const vx = Math.cos(this.angle) * this.speed
    const vy = Math.sin(this.angle) * this.speed
    if (Math.hypot(this.x + vx - this.sx, this.y + vy - this.sy) >= this.totalDistance) {
      this.moveTo(this.target.x, this.target.y)
      this.arrived = true
    } else {
      this.moveTo(this.x + vx, this.y + vy)
    }
    this.age++
  }

  shouldExplode() {
    return this.arrived
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const [tx, ty] = this.coordinates[this.coordinates.length - 1]
    ctx.beginPath()
    ctx.lineWidth = this.lineWidth
    ctx.moveTo(tx, ty)
    ctx.lineTo(this.x, this.y)
    ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, 1)`
    ctx.stroke()
  }
}
