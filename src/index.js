import { Engine } from './engine.js'
import { Random } from './random.js'
import { defaultOptions, deepMerge } from './options.js'
import { Projectile } from './projectile.js'
import { Particle } from './particle.js'
import { Rocket } from './projectiles/rocket.js'
import { Chicken } from './projectiles/chicken.js'
import { bursts } from './bursts.js'

export { Projectile, Particle, Rocket, Chicken, Random, bursts, defaultOptions }

/**
 * @typedef {import('./options.js').Options} Options
 * @typedef {import('./options.js').XplodersOptions} XplodersOptions
 * @typedef {import('./options.js').BurstStyle} BurstStyle
 * @typedef {import('./engine.js').ProjectileClass} ProjectileClass
 * @typedef {import('./projectile.js').ProjectileInit} ProjectileInit
 */

/** @type {Map<string, ProjectileClass>} */
const registry = new Map([
  ['rocket', Rocket],
  ['chicken', Chicken],
])

/** @param {Element} el @returns {el is HTMLCanvasElement} */
const isCanvas = (el) => typeof (/** @type {any} */ (el).getContext) === 'function'

/**
 * Fireworks and things that explode into fireworks, on a transparent canvas.
 * Options and methods follow fireworks-js, so its configs work here.
 *
 * @example
 * const show = new Xploders(document.querySelector('.sky'))
 * show.start()              // auto-launches at `intensity`
 * show.launch('chicken')    // and a chicken
 */
export class Xploders {
  /**
   * @param {Element} target a canvas, or a container to create a canvas in
   * @param {XplodersOptions} [options]
   * @param {Partial<import('./engine.js').Scheduler>} [scheduler] for tests: replaces requestAnimationFrame and the clock
   */
  constructor(target, options = {}, scheduler) {
    /** @type {Options} */
    this.options = deepMerge(defaultOptions(), options)
    /** @type {Element} the element whose size the canvas follows */
    this.container = target
    /** @type {boolean} whether we created the canvas (and remove it on dispose) */
    this.ownsCanvas = !isCanvas(target)
    if (isCanvas(target)) {
      this.canvas = target
    } else {
      this.canvas = document.createElement('canvas')
      Object.assign(this.canvas.style, { display: 'block', width: '100%', height: '100%' })
      target.append(this.canvas)
    }
    this.random = new Random(this.options.seed)
    this.engine = new Engine(this.canvas, this.options, this.random, scheduler)
    this.engine.defaultProjectile = registry.get('rocket')
    /** @type {(() => void)[]} pending waitStop() promises */
    this.waiters = []
    this.updateSize()
    /** @type {ResizeObserver | null} */
    this.resizeObserver = null
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.options.autoresize) this.updateSize()
      })
      this.resizeObserver.observe(this.container)
    }
  }

  /**
   * Make a projectile type available to `launch` by name.
   * @param {string} name
   * @param {ProjectileClass} cls
   */
  static register(name, cls) {
    registry.set(name, cls)
  }

  get isRunning() {
    return this.engine.running
  }

  /** The live options object. */
  get currentOptions() {
    return this.options
  }

  /** Runs the show, auto-launching at `intensity`. */
  start() {
    this.engine.onEmpty = null
    this.engine.autoLaunch = true
    this.engine.startLoop()
    return this
  }

  /**
   * Stops and clears the show.
   * @param {boolean} [dispose] also stop following the size and remove a canvas this show created
   */
  stop(dispose = false) {
    this.engine.stopLoop()
    this.engine.autoLaunch = false
    this.engine.onEmpty = null
    this.engine.clear()
    if (dispose) {
      this.resizeObserver?.disconnect()
      this.resizeObserver = null
      if (this.ownsCanvas) this.canvas.remove()
    }
    for (const resolve of this.waiters.splice(0)) resolve()
    return this
  }

  /** Freezes or resumes the show, keeping everything in the sky. */
  pause() {
    if (this.engine.running) this.engine.stopLoop()
    else this.engine.startLoop()
    return this
  }

  /** Removes everything in the sky; the show keeps running. */
  clear() {
    this.engine.clear()
    return this
  }

  /**
   * Launches rockets (`launch(5)`) or any registered type (`launch('chicken', 2)`).
   * On a stopped show the loop runs until the sky is empty, without auto-launch.
   * @param {string | number} [typeOrCount]
   * @param {number} [count]
   */
  launch(typeOrCount = 1, count = 1) {
    const type = typeof typeOrCount === 'string' ? typeOrCount : 'rocket'
    const n = typeof typeOrCount === 'number' ? typeOrCount : count
    const Cls = registry.get(type)
    if (!Cls) throw new Error(`xploders: unknown projectile type "${type}"`)
    if (!this.engine.running) {
      this.engine.autoLaunch = false
      this.engine.onEmpty = () => this.stop()
      this.engine.startLoop()
    }
    this.engine.launch(n, Cls)
    return this
  }

  /**
   * Stops auto-launching and resolves once everything in the sky has burnt out.
   * @param {boolean} [dispose] as for `stop`
   * @returns {Promise<void>}
   */
  waitStop(dispose = false) {
    this.engine.autoLaunch = false
    return new Promise((resolve) => {
      this.waiters.push(resolve)
      if (!this.engine.running || this.engine.empty) this.stop(dispose)
      else this.engine.onEmpty = () => this.stop(dispose)
    })
  }

  /** @param {XplodersOptions} options merged into the live options */
  updateOptions(options) {
    deepMerge(this.options, options)
    return this
  }

  /**
   * Resizes the canvas, by default to the container's size.
   * @param {{width?: number, height?: number}} [size] CSS pixels
   */
  updateSize({ width = this.container.clientWidth, height = this.container.clientHeight } = {}) {
    this.engine.resize(width, height)
    return this
  }

  /** @param {Partial<import('./options.js').Boundaries>} boundaries */
  updateBoundaries(boundaries) {
    deepMerge(this.options.boundaries, boundaries)
    return this
  }
}

export default Xploders
