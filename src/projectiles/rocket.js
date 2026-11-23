import { Projectile } from '../projectile.js'

/** The classic firework shell. Phase 2 adds the trail and its drawing. */
export class Rocket extends Projectile {
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(this.x - 1, this.y - 1, 2, 2)
  }
}
