import { Projectile } from '../projectile.js'

/**
 * A pixel-art chicken that flaps across the sky and bursts into fireworks.
 * Placeholder until phase 3 draws the original sprite and its flight.
 */
export class Chicken extends Projectile {
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(this.x - 4, this.y - 4, 8, 8)
  }
}
