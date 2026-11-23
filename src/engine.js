import { bursts, crackleSparks } from './bursts.js'
import { Random, inRange } from './random.js'

/** One physics step, ms. Option units are per step, as fireworks-js's are per 60 fps frame. */
export const STEP_MS = 1000 / 60
const MAX_FRAME_MS = 250 // a longer gap (tab in background) is clamped, not replayed

/**
 * @typedef {object} Scheduler
 * @property {(cb: (now: number) => void) => number} raf
 * @property {(id: number) => void} caf
 * @property {() => number} now ms
 */

/** @typedef {new (init: import('./projectile.js').ProjectileInit) => import('./projectile.js').Projectile} ProjectileClass */

/**
 * Owns the canvas, the animation loop and every live object. Draws in CSS pixels;
 * the backing store is scaled by devicePixelRatio. Simulation runs in fixed steps,
 * so the show looks the same at any refresh rate.
 */
export class Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./options.js').Options} options live options object (updated in place)
   * @param {Random} random seeded generator for everything that shapes the show
   * @param {Partial<Scheduler>} [scheduler] injectable for tests
   */
  constructor(canvas, options, random, scheduler = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('xploders: canvas 2D context unavailable')
    this.ctx = ctx
    this.options = options
    this.random = random
    // Flicker is drawn per frame, so it must not consume the seeded generator.
    const flicker = new Random()
    this.flickerRandom = () => flicker.next()
    this.raf = scheduler.raf ?? ((cb) => requestAnimationFrame(cb))
    this.caf = scheduler.caf ?? ((id) => cancelAnimationFrame(id))
    this.now = scheduler.now ?? (() => performance.now())
    /** @type {import('./projectile.js').Projectile[]} */
    this.projectiles = []
    /** @type {import('./particle.js').Particle[]} */
    this.particles = []
    this.width = 0
    this.height = 0
    this.running = false
    this.autoLaunch = false
    /** auto-launch clock and the value it must pass, as fireworks-js's `tick` and `delay` */
    this.launchClock = 0
    this.launchAt = 0
    this.accumulator = 0
    this.lastTime = 0
    this.pendingSteps = 0
    /** @type {number | null} */
    this.frameId = null
    /** @type {(() => void) | null} called after a step that leaves the sky empty */
    this.onEmpty = null
    this.tick = this.tick.bind(this)
  }

  /**
   * Sets the drawing size in CSS pixels and the matching backing store.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    const dpr = globalThis.devicePixelRatio || 1
    this.width = Math.max(0, width)
    this.height = Math.max(0, height)
    this.canvas.width = Math.round(this.width * dpr)
    this.canvas.height = Math.round(this.height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.options.boundaries.width = this.width
    this.options.boundaries.height = this.height
  }

  get empty() {
    return this.projectiles.length === 0 && this.particles.length === 0
  }

  startLoop() {
    if (this.running) return
    this.running = true
    this.lastTime = this.now()
    this.accumulator = 0
    this.frameId = this.raf(this.tick)
  }

  stopLoop() {
    this.running = false
    if (this.frameId !== null) this.caf(this.frameId)
    this.frameId = null
  }

  clear() {
    this.projectiles.length = 0
    this.particles.length = 0
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  /** @param {number} now */
  tick(now) {
    if (!this.running) return
    this.accumulator += Math.min(Math.max(0, now - this.lastTime), MAX_FRAME_MS)
    this.lastTime = now
    while (this.accumulator >= STEP_MS) {
      this.step()
      this.accumulator -= STEP_MS
      this.pendingSteps++
    }
    if (this.pendingSteps > 0) {
      this.draw(this.pendingSteps)
      this.pendingSteps = 0
    }
    if (this.running) this.frameId = this.raf(this.tick)
    if (this.empty && this.onEmpty) this.onEmpty()
  }

  /** One fixed 1/60 s step of the whole show. */
  step() {
    const o = this.options
    if (this.autoLaunch && o.intensity > 0) {
      // fireworks-js advances its clock by intensity * pi per second.
      this.launchClock += (STEP_MS * o.intensity * Math.PI) / 1000
      if (this.launchClock > this.launchAt) {
        this.launch(1)
        this.launchClock = 0
        this.launchAt = inRange(this.random, o.delay, true)
      }
    }

    const projectiles = this.projectiles
    this.projectiles = []
    for (const p of projectiles) {
      if (p.exploded) continue
      try {
        p.update()
        if (p.shouldExplode()) {
          p.exploded = true
          p.explode(this)
        } else {
          this.projectiles.push(p)
        }
      } catch (error) {
        console.error('xploders: removed a projectile that threw', error)
      }
    }

    const particles = this.particles
    this.particles = []
    let live = particles.length
    for (const p of particles) {
      if (p.update()) {
        const sparks = crackleSparks(p, this.random, Math.floor(this.options.maxParticles) - live + 1)
        this.particles.push(...sparks)
        live += sparks.length
      }
      if (p.dead) live--
      else this.particles.push(p)
    }
  }

  /** @returns {number} how many more particles fit under maxParticles */
  capacity() {
    return Math.max(0, Math.floor(this.options.maxParticles) - this.particles.length)
  }

  /**
   * Launches projectiles from `rocketsPoint` at the bottom edge towards random
   * targets inside the boundaries, as fireworks-js does.
   * @param {number} count
   * @param {ProjectileClass} [Cls] defaults to the class registered as 'rocket'
   */
  launch(count, Cls = this.defaultProjectile) {
    if (!Cls || this.width <= 0 || this.height <= 0) return
    const o = this.options
    const r = this.random
    const b = o.boundaries
    for (let i = 0; i < count; i++) {
      const x = (this.width * inRange(r, o.rocketsPoint, true)) / 100
      const target = {
        x: r.int(Math.min(b.x, b.width - b.x * 2), Math.max(b.x, b.width - b.x * 2)),
        y: r.int(Math.min(b.y, b.height * 0.5), Math.max(b.y, b.height * 0.5)),
      }
      this.projectiles.push(
        new Cls({ x, y: this.height, target, hue: inRange(r, o.hue, true), options: o, random: r }),
      )
    }
  }

  /** @type {ProjectileClass | undefined} set by Xploders */
  defaultProjectile = undefined

  /**
   * Adds an explosion's particles, trimmed to fit under `maxParticles`.
   * @param {number} x
   * @param {number} y
   * @param {number} hue
   * @param {import('./options.js').BurstStyle} [style] defaults to the `burst` option
   */
  burst(x, y, hue, style) {
    const o = this.options
    const choice = style ?? (Array.isArray(o.burst) ? this.random.pick(o.burst) : o.burst)
    const make = bursts[choice] ?? bursts.peony
    const count = Math.min(Math.floor(o.particles), this.capacity())
    if (count <= 0) return
    this.particles.push(...make({ x, y, hue, count, options: o, random: this.random }))
  }

  /** @param {number} steps physics steps since the last draw */
  draw(steps) {
    const { ctx, width, height, options: o } = this
    if (width <= 0 || height <= 0) return
    // Fade the previous frame once per step, so trails look the same at 60 and 120 Hz.
    const fade = 1 - (1 - o.opacity) ** steps
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = `rgba(0, 0, 0, ${fade})`
    ctx.fillRect(0, 0, width, height)

    if (o.boundaries.debug) {
      const b = o.boundaries
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(b.x, b.y, b.width - b.x * 3, b.height * 0.5 - b.y)
    }

    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = o.lineStyle
    ctx.lineJoin = 'round'
    const projectiles = this.projectiles
    for (const p of projectiles) {
      try {
        p.draw(ctx)
      } catch (error) {
        console.error('xploders: removed a projectile that threw while drawing', error)
        this.projectiles = this.projectiles.filter((q) => q !== p)
      }
    }
    for (const p of this.particles) p.draw(ctx, this.flickerRandom)
    ctx.globalCompositeOperation = 'source-over'
  }
}
