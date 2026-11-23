/**
 * Base class for anything launched into the sky that later explodes: a rocket,
 * a chicken, or a user-defined object. Subclasses override `draw` and may
 * override `update` and `shouldExplode`.
 */
export class Projectile {
  /**
   * @param {object} init
   * @param {number} init.x
   * @param {number} init.y
   * @param {number} init.vx velocity in px/s
   * @param {number} init.vy velocity in px/s (negative is up)
   */
  constructor({ x, y, vx, vy }) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.age = 0
    this.exploded = false
  }

  /**
   * Ballistic step. Override for custom flight (flapping, homing...).
   * @param {number} dt seconds
   * @param {number} gravity px/s^2
   */
  update(dt, gravity) {
    this.vy += gravity * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.age += dt
  }

  /**
   * Default trigger: explode at the top of the arc.
   * @returns {boolean}
   */
  shouldExplode() {
    return this.vy >= 0
  }

  /**
   * @param {CanvasRenderingContext2D} _ctx
   */
  draw(_ctx) {}
}
