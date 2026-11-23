import { Particle } from './particle.js'

const STEP = 1 / 60 // fixed physics step, seconds
const MAX_FRAME = 0.25 // a longer gap (tab in background) is clamped, not replayed

/**
 * @typedef {object} EngineOptions
 * @property {number} gravity px/s^2
 * @property {number} friction velocity multiplier per second (0-1)
 * @property {[number, number]} hue hue range for explosions
 * @property {number} particles particles per explosion
 */

/**
 * Owns the canvas, the animation loop and every live object. Rendering uses
 * CSS pixels; the backing store is scaled by devicePixelRatio.
 */
export class Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {EngineOptions} options
   * @param {import('./random.js').Random} random
   */
  constructor(canvas, options, random) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('xploders: canvas 2D context unavailable')
    this.ctx = ctx
    this.options = options
    this.random = random
    /** @type {import('./projectile.js').Projectile[]} */
    this.projectiles = []
    /** @type {Particle[]} */
    this.particles = []
    this.width = 0
    this.height = 0
    this.running = false
    this.accumulator = 0
    this.lastTime = 0
    /** @type {number | null} */
    this.frameId = null
    this.tick = this.tick.bind(this)
  }

  resize() {
    const dpr = globalThis.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = Math.round(rect.width * dpr)
    this.canvas.height = Math.round(rect.height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  start() {
    if (this.running) return
    this.running = true
    this.resize()
    this.lastTime = performance.now()
    this.frameId = requestAnimationFrame(this.tick)
  }

  stop() {
    this.running = false
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
  }

  clear() {
    this.projectiles.length = 0
    this.particles.length = 0
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  /** @param {import('./projectile.js').Projectile} projectile */
  add(projectile) {
    this.projectiles.push(projectile)
  }

  /** @param {number} now */
  tick(now) {
    if (!this.running) return
    this.accumulator += Math.min((now - this.lastTime) / 1000, MAX_FRAME)
    this.lastTime = now
    while (this.accumulator >= STEP) {
      this.update(STEP)
      this.accumulator -= STEP
    }
    this.draw()
    this.frameId = requestAnimationFrame(this.tick)
  }

  /** @param {number} dt seconds */
  update(dt) {
    const { gravity, friction } = this.options
    for (const p of this.projectiles) {
      p.update(dt, gravity)
      if (p.shouldExplode()) this.explode(p)
    }
    this.projectiles = this.projectiles.filter((p) => !p.exploded)
    for (const p of this.particles) p.update(dt, gravity, friction)
    this.particles = this.particles.filter((p) => !p.dead)
  }

  /**
   * Placeholder burst; phase 2 adds shapes, trails and per-projectile bursts.
   * @param {import('./projectile.js').Projectile} p
   */
  explode(p) {
    p.exploded = true
    const r = this.random
    const hue = r.range(...this.options.hue)
    for (let i = 0; i < this.options.particles; i++) {
      const angle = r.range(0, Math.PI * 2)
      const speed = r.range(40, 220)
      this.particles.push(
        new Particle({
          x: p.x,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          hue: hue + r.range(-20, 20),
          life: r.range(0.8, 1.6),
        }),
      )
    }
  }

  draw() {
    const { ctx } = this
    ctx.clearRect(0, 0, this.width, this.height)
    for (const p of this.particles) p.draw(ctx)
    for (const p of this.projectiles) p.draw(ctx)
  }
}
