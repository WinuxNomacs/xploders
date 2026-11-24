import { bursts, crackleSparks } from './bursts.js'
import { Particle } from './particle.js'
import { Random, inRange } from './random.js'
import { createCanvas } from './sprite.js'

/** One physics step, ms. Option units are per step, as fireworks-js's are per 60 fps frame. */
export const STEP_MS = 1000 / 60
const MAX_FRAME_MS = 250 // a longer gap (tab in background) is clamped, not replayed
/** Undrawn steps counted at most; far past any trail's fade, so the count stays small however long it idles. */
const MAX_PENDING_STEPS = 10000

/**
 * What the engine needs from the browser; tests pass stand-ins.
 * @typedef {object} Env
 * @property {(cb: (now: number) => void) => number} raf
 * @property {(id: number) => void} caf
 * @property {() => number} now ms
 * @property {(width: number, height: number) => HTMLCanvasElement | OffscreenCanvas} createCanvas for the trail layer
 */

/**
 * Anything in the particle list: sparks, feathers.
 * @typedef {object} ParticleLike
 * @property {boolean} dead
 * @property {'trail' | 'sprite'} [layer]
 * @property {boolean} [behind] drawn before everything else on its layer (smoke)
 * @property {() => boolean} update one step; true when it pops (crackle)
 * @property {(ctx: CanvasRenderingContext2D, flickerRandom: () => number) => void} draw
 */

/** @typedef {new (init: import('./projectile.js').ProjectileInit) => import('./projectile.js').Projectile} ProjectileClass */

/**
 * Owns the canvas, the animation loop and every live object. Draws in CSS pixels;
 * the backing store is scaled by devicePixelRatio. Simulation runs in fixed steps,
 * so the show looks the same at any refresh rate.
 *
 * Two layers: fireworks draw on an offscreen trail layer whose previous frame
 * fades a little each step (that makes the trails); each frame the visible
 * canvas is cleared, the trail layer copied in, and sprites (chickens,
 * feathers) drawn crisp on top, so they leave no smeared ghost.
 */
export class Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./options.js').Options} options live options object (updated in place)
   * @param {Random} random seeded generator for everything that shapes the show
   * @param {Partial<Env>} [env] injectable for tests
   */
  constructor(canvas, options, random, env = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('xploders: canvas 2D context unavailable')
    this.ctx = ctx
    this.options = options
    this.random = random
    /** reduced motion: no auto-launch, no flicker, no flashing (set by Xploders) */
    this.calm = false
    // Flicker is drawn per frame, so it must not consume the seeded generator.
    // In calm mode it returns 1, so flickering particles keep their full lightness.
    const flicker = new Random()
    this.flickerRandom = () => (this.calm ? 1 : flicker.next())
    /** @type {import('./pointer.js').Pointer | null} set by Xploders */
    this.pointer = null
    /** @type {(name: string) => ProjectileClass | undefined} registered types, set by Xploders */
    this.resolve = () => undefined
    this.raf = env.raf ?? ((cb) => requestAnimationFrame(cb))
    this.caf = env.caf ?? ((id) => cancelAnimationFrame(id))
    this.now = env.now ?? (() => performance.now())
    this.trail = (env.createCanvas ?? createCanvas)(1, 1)
    const trailCtx = this.trail.getContext('2d')
    if (!trailCtx) throw new Error('xploders: canvas 2D context unavailable')
    /** @type {CanvasRenderingContext2D} */
    this.trailCtx = /** @type {any} */ (trailCtx)
    /** @type {import('./projectile.js').Projectile[]} */
    this.projectiles = []
    /** @type {ParticleLike[]} */
    this.particles = []
    this.width = 0
    this.height = 0
    /** the trail layer's pixels per CSS px (see resize) */
    this.trailDpr = 1
    this.running = false
    this.autoLaunch = false
    /** auto-launch clock and the value it must pass, as fireworks-js's `tick` and `delay` */
    this.launchClock = 0
    this.launchAt = 0
    this.accumulator = 0
    this.lastTime = 0
    /** steps not drawn yet: since the last draw, including frames skipped as unseen */
    this.pendingSteps = 0
    /** false while the canvas is out of view (set by Xploders); the show still steps, but isn't drawn */
    this.visible = true
    /** steps since the sky became empty */
    this.idleSteps = 0
    /** whether the last frame drawn showed the boundaries outline */
    this.drewDebug = false
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
    /** the trail layer's pixels per CSS px: half the screen's with `trailResolution: 'half'`, at least 1 */
    this.trailDpr = this.options.trailResolution === 'half' ? Math.min(dpr, Math.max(1, dpr / 2)) : dpr
    for (const [c, ctx, ratio] of /** @type {const} */ ([
      [this.canvas, this.ctx, dpr],
      [this.trail, this.trailCtx, this.trailDpr],
    ])) {
      c.width = Math.round(this.width * ratio)
      c.height = Math.round(this.height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
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
    this.trailCtx.clearRect(0, 0, this.width, this.height)
  }

  /** @param {number} now */
  tick(now) {
    if (!this.running) return
    this.accumulator += Math.min(Math.max(0, now - this.lastTime), MAX_FRAME_MS)
    this.lastTime = now
    try {
      while (this.accumulator >= STEP_MS) {
        this.step()
        this.accumulator -= STEP_MS
        this.pendingSteps = Math.min(this.pendingSteps + 1, MAX_PENDING_STEPS)
        this.idleSteps = this.empty ? this.idleSteps + 1 : 0
      }
      if (this.pendingSteps > 0 && this.shouldDraw()) {
        this.draw(this.pendingSteps)
        this.pendingSteps = 0
      }
    } catch (error) {
      // Pieces that fail are removed where they fail; this is the last guard, so the loop never dies.
      console.error('xploders: a frame failed', error)
      this.accumulator = 0
      this.pendingSteps = 0
    }
    if (this.running) this.frameId = this.raf(this.tick)
    if (this.empty && this.onEmpty) this.onEmpty()
  }

  /**
   * Whether a frame would show anything new: not while the canvas is out of view,
   * nor once the sky has been empty long enough for its trails to fade out (unless
   * the boundaries outline is, or was last, showing). Skipped steps are drawn later,
   * so the trails fade by the same amount either way.
   */
  shouldDraw() {
    if (!this.visible) return false
    if (this.options.boundaries.debug || this.drewDebug) return true
    return !(this.empty && this.idleSteps > this.fadeSteps())
  }

  /** Steps for a trail to fade below one 8-bit level at the `opacity` option's rate. */
  fadeSteps() {
    const o = this.options.opacity
    if (!(o > 0) || o >= 1) return 1 // nothing fades, or it all goes in one step
    return Math.ceil(Math.log(1 / 256) / Math.log(1 - o)) + 1
  }

  /** One fixed 1/60 s step of the whole show. */
  step() {
    const o = this.options
    if (this.pointer?.active && o.mouse.click && this.projectiles.length < o.mouse.max) {
      const Cls = this.resolve(o.mouse.projectile)
      if (Cls) this.launch(1, Cls)
      else if (this.warnedProjectile !== o.mouse.projectile) {
        this.warnedProjectile = o.mouse.projectile
        console.warn(`xploders: mouse.projectile "${o.mouse.projectile}" is not a registered type; nothing launched`)
      }
    }
    if (this.autoLaunch && !this.calm && o.intensity > 0) {
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
    let failed = 0
    /** @type {unknown} */
    let firstError
    for (const p of particles) {
      try {
        if (p.update() && p instanceof Particle) {
          const sparks = crackleSparks(p, this.random, Math.floor(this.options.maxParticles) - live + 1)
          this.particles.push(...sparks)
          live += sparks.length
        }
      } catch (error) {
        if (!failed++) firstError = error
        live--
        continue
      }
      if (p.dead) live--
      else this.particles.push(p)
    }
    if (failed) console.error(`xploders: removed ${failed} particle(s) that threw`, firstError)
  }

  /** @type {string | undefined} the unknown mouse.projectile already warned about */
  warnedProjectile = undefined

  /** @returns {number} how many more particles fit under maxParticles */
  capacity() {
    return Math.max(0, Math.floor(this.options.maxParticles) - this.particles.length)
  }

  /**
   * Launches projectiles from `rocketsPoint` at the bottom edge towards random
   * targets inside the boundaries, as fireworks-js does.
   * @param {number} count
   * @param {ProjectileClass} [Cls] defaults to the class registered as 'rocket'
   * @param {Record<string, any>} [extra] merged into each projectile's init (e.g. chicken options)
   */
  launch(count, Cls = this.defaultProjectile, extra = {}) {
    if (!Cls || this.width <= 0 || this.height <= 0) return
    const o = this.options
    const r = this.random
    const a = this.targetArea()
    for (let i = 0; i < count && this.projectiles.length < o.maxProjectiles; i++) {
      const x = (this.width * inRange(r, o.rocketsPoint, true)) / 100
      // As in fireworks-js: aim at the pointer while held, or while `move` is on and it is over the canvas.
      const target = this.pointer?.target() ?? {
        x: r.int(Math.min(a.left, a.right), Math.max(a.left, a.right)),
        y: r.int(Math.min(a.top, a.bottom), Math.max(a.top, a.bottom)),
      }
      const size = { width: this.width, height: this.height }
      const hue = inRange(r, o.hue, true)
      this.projectiles.push(new Cls({ x, y: this.height, target, size, hue, options: o, random: r, engine: this, ...extra }))
    }
  }

  /**
   * Where random targets go, CSS px from the canvas's top left: `boundaries` margins,
   * with fireworks-js's box (right margin twice `x`, bottom at half the height) where
   * `right` or `bottom` is null.
   * @returns {{left: number, top: number, right: number, bottom: number}}
   */
  targetArea() {
    const b = this.options.boundaries
    return {
      left: b.x,
      top: b.y,
      right: b.right == null ? b.width - b.x * 2 : b.width - b.right,
      bottom: b.bottom == null ? b.height * 0.5 : b.height - b.bottom,
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
   * @param {number} [size] how far it spreads, 1 by default
   */
  burst(x, y, hue, style, size = 1) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    const o = this.options
    const choice = style ?? (Array.isArray(o.burst) ? this.random.pick(o.burst) : o.burst)
    const make = bursts[choice] ?? bursts.peony
    const count = Math.min(Math.floor(o.particles), this.capacity())
    if (count <= 0) return
    // A burst may add a few non-particle pieces (a fireball's glow): trim to fit.
    this.particles.push(...make({ x, y, hue, count, options: o, random: this.random, calm: this.calm, size }).slice(0, this.capacity()))
  }

  /**
   * Adds particles of any kind (feathers...), as many as fit under `maxParticles`.
   * @param {ParticleLike[]} particles
   */
  addParticles(particles) {
    this.particles.push(...particles.slice(0, this.capacity()))
  }

  /** @param {number} steps physics steps since the last draw */
  draw(steps) {
    const { ctx, trailCtx: tc, width, height, options: o } = this
    if (width <= 0 || height <= 0 || this.canvas.width === 0 || this.canvas.height === 0) return
    // Fade the trail layer once per step, so trails look the same at 60 and 120 Hz.
    const fade = 1 - (1 - o.opacity) ** steps
    tc.globalCompositeOperation = 'destination-out'
    tc.fillStyle = `rgba(0, 0, 0, ${fade})`
    tc.fillRect(0, 0, width, height)
    tc.globalCompositeOperation = 'lighter'
    tc.lineCap = o.lineStyle
    tc.lineJoin = 'round'
    this.drawLayer(tc, 'trail')
    tc.globalCompositeOperation = 'source-over'

    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    // scaled up when the trail layer is at a lower resolution, smoothly
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.trail, 0, 0, this.canvas.width, this.canvas.height)
    ctx.restore()
    this.drewDebug = o.boundaries.debug
    if (o.boundaries.debug) {
      const a = this.targetArea()
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(a.left, a.top, a.right - a.left, a.bottom - a.top)
      // corner handles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
      for (const x of [a.left, a.right]) for (const y of [a.top, a.bottom]) ctx.fillRect(x - 3, y - 3, 6, 6)
    }
    this.drawLayer(ctx, 'sprite')
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {'trail' | 'sprite'} layer
   */
  drawLayer(ctx, layer) {
    // one pass over the particles: those drawn behind the projectiles, and the rest
    /** @type {ParticleLike[]} */
    const behind = []
    /** @type {ParticleLike[]} */
    const front = []
    for (const p of this.particles) if ((p.layer ?? 'trail') === layer) (p.behind ? behind : front).push(p)
    let failed = this.drawParticles(ctx, behind)
    for (const p of this.projectiles) {
      if (p.layer !== layer) continue
      try {
        p.draw(ctx)
      } catch (error) {
        console.error('xploders: removed a projectile that threw while drawing', error)
        this.projectiles = this.projectiles.filter((q) => q !== p)
      }
    }
    failed += this.drawParticles(ctx, front)
    if (failed) this.particles = this.particles.filter((p) => !p.dead)
  }

  /**
   * Draws particles; one that throws is marked dead and the first error logged.
   * @param {CanvasRenderingContext2D} ctx
   * @param {ParticleLike[]} list
   * @returns {number} how many failed
   */
  drawParticles(ctx, list) {
    let failed = 0
    for (const p of list) {
      try {
        p.draw(ctx, this.flickerRandom)
      } catch (error) {
        if (!failed++) console.error('xploders: removed a particle that threw while drawing', error)
        p.dead = true
      }
    }
    return failed
  }
}
