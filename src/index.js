import { Engine } from './engine.js'
import { Random } from './random.js'
import { Projectile } from './projectile.js'
import { Rocket } from './projectiles/rocket.js'
import { Chicken } from './projectiles/chicken.js'

export { Projectile, Rocket, Chicken, Random }

/**
 * @typedef {object} XplodersOptions
 * @property {number} [gravity] px/s^2, default 300
 * @property {number} [friction] velocity kept per second (0-1), default 0.6
 * @property {[number, number]} [hue] hue range, default [0, 360]
 * @property {number} [particles] particles per explosion, default 80
 * @property {number} [seed] seed for a repeatable show
 */

/** @typedef {new (init: {x: number, y: number, vx: number, vy: number}) => Projectile} ProjectileClass */

/** @type {Map<string, ProjectileClass>} */
const registry = new Map([
  ['rocket', Rocket],
  ['chicken', Chicken],
])

/**
 * Fireworks and things that explode into fireworks, on a canvas.
 *
 * @example
 * const show = new Xploders(document.querySelector('canvas'))
 * show.start()
 * show.launch('chicken')
 */
export class Xploders {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {XplodersOptions} [options]
   */
  constructor(canvas, options = {}) {
    this.options = {
      gravity: options.gravity ?? 300,
      friction: options.friction ?? 0.6,
      hue: options.hue ?? /** @type {[number, number]} */ ([0, 360]),
      particles: options.particles ?? 80,
    }
    this.random = new Random(options.seed)
    this.engine = new Engine(canvas, this.options, this.random)
  }

  /**
   * Make a projectile type available to `launch` by name.
   * @param {string} name
   * @param {ProjectileClass} cls
   */
  static register(name, cls) {
    registry.set(name, cls)
  }

  start() {
    this.engine.start()
    return this
  }

  stop() {
    this.engine.stop()
    return this
  }

  clear() {
    this.engine.clear()
    return this
  }

  /** Call after the canvas changes size. */
  resize() {
    this.engine.resize()
    return this
  }

  /**
   * Launch `count` projectiles of a registered type from the bottom edge.
   * @param {string} [type]
   * @param {number} [count]
   */
  launch(type = 'rocket', count = 1) {
    const Cls = registry.get(type)
    if (!Cls) throw new Error(`xploders: unknown projectile type "${type}"`)
    const { width, height } = this.engine
    const r = this.random
    for (let i = 0; i < count; i++) {
      this.engine.add(
        new Cls({
          x: r.range(width * 0.2, width * 0.8),
          y: height,
          vx: r.range(-60, 60),
          vy: -Math.sqrt(2 * this.options.gravity * r.range(height * 0.4, height * 0.8)),
        }),
      )
    }
    return this
  }
}

export default Xploders
