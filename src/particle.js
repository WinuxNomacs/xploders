/**
 * One spark of an explosion. Moves under gravity and friction and fades out.
 * Phase 2 fills in trails and drawing styles.
 */
export class Particle {
  /**
   * @param {object} init
   * @param {number} init.x
   * @param {number} init.y
   * @param {number} init.vx velocity in px/s
   * @param {number} init.vy velocity in px/s
   * @param {number} init.hue 0-360
   * @param {number} init.life seconds until fully faded
   */
  constructor({ x, y, vx, vy, hue, life }) {
    this.x = x
    this.y = y
    this.vx = vx
    this.vy = vy
    this.hue = hue
    this.life = life
    this.age = 0
  }

  /** @returns {boolean} true once fully faded */
  get dead() {
    return this.age >= this.life
  }

  /**
   * @param {number} dt seconds
   * @param {number} gravity px/s^2
   * @param {number} friction velocity multiplier per second (0-1)
   */
  update(dt, gravity, friction) {
    const damp = friction ** dt
    this.vx *= damp
    this.vy = this.vy * damp + gravity * dt
    this.x += this.vx * dt
    this.y += this.vy * dt
    this.age += dt
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = Math.max(0, 1 - this.age / this.life)
    ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${alpha})`
    ctx.fillRect(this.x - 1, this.y - 1, 2, 2)
  }
}
