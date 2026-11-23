/**
 * @typedef {object} ProjectileInit
 * @property {number} x launch point
 * @property {number} y launch point
 * @property {{x: number, y: number}} target where it should explode
 * @property {{width: number, height: number}} size the sky, CSS px
 * @property {number} hue firework hue chosen for this launch
 * @property {import('./options.js').Options} options the show's live options
 * @property {import('./random.js').Random} random the show's seeded generator
 */

/**
 * Base class for anything launched into the sky that later explodes: a rocket,
 * a chicken, or a user-defined object. One `update` call is one 1/60 s step.
 *
 * The default flight is a ballistic arc that peaks at the target. Subclasses
 * override `draw`, and may override `update`, `shouldExplode` and `explode`.
 */
export class Projectile {
  /** Downward acceleration of the default arc, px/step^2. */
  static gravity = 0.15

  /** @param {ProjectileInit} init */
  constructor({ x, y, target, size, hue, options, random }) {
    this.x = x
    this.y = y
    this.target = target
    this.size = size
    /** @type {'trail' | 'sprite'} drawn with the fading fireworks, or crisp on top */
    this.layer = 'trail'
    this.hue = hue
    this.options = options
    this.random = random
    this.age = 0
    this.exploded = false
    /** @type {import('./options.js').BurstStyle | undefined} burst style; undefined uses the show's option */
    this.burst = undefined
    // Launch speed whose stepped arc peaks at the target. Each step adds g to vy
    // before moving, so n = v/g steps rise v^2/2g - v/2; solving for h gives v.
    const g = Projectile.gravity
    const rise = Math.max(0, y - target.y)
    const v = (g + Math.sqrt(g * g + 8 * g * rise)) / 2
    this.vy = -v
    const steps = rise > 0 ? v / g : 1
    this.vx = (target.x - x) / steps
  }

  update() {
    this.vy += Projectile.gravity
    this.moveTo(this.x + this.vx, this.y + this.vy)
    this.age++
  }

  /**
   * Subclasses move through this rather than assigning `x`/`y` (in a JS
   * subclass, that assignment would declare a new property for the type checker).
   * @param {number} x
   * @param {number} y
   */
  moveTo(x, y) {
    this.x = x
    this.y = y
  }

  /** Default trigger: the top of the arc. */
  shouldExplode() {
    return this.vy >= 0
  }

  /**
   * Called once when `shouldExplode` first returns true.
   * @param {import('./engine.js').Engine} engine
   */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst)
  }

  /**
   * @param {CanvasRenderingContext2D} _ctx
   */
  draw(_ctx) {}
}
