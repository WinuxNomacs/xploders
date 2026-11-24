import { Projectile } from '../projectile.js'
import { Sprite } from '../sprite.js'
import { Feather } from '../feather.js'
import { palette, flapFrames, panicFrames } from '../art/chicken.js'

/**
 * @typedef {object} ChickenOptions
 * @property {'random' | 'rise' | 'cross'} [flight] up from the bottom, or across from a side edge
 * @property {number} [scale] CSS px per sprite pixel
 * @property {number} [speed] px/step
 * @property {number} [panicSteps] steps of panic before the explosion (60 = 1 s)
 * @property {number} [feathers] feathers in the explosion
 */

const FLAP_FPS = 12
const PANIC_FPS = 20

/**
 * An original pixel-art chicken that flaps into the sky, bobbing in time with
 * its wings, panics at its target, then explodes into feathers and fireworks.
 */
export class Chicken extends Projectile {
  /** Defaults for every chicken; per launch: `show.launch('chicken', 1, {flight: 'cross'})`. */
  static defaults = /** @type {Required<ChickenOptions>} */ ({
    flight: 'random',
    scale: 3,
    speed: 3,
    panicSteps: 30,
    feathers: 16,
  })

  /** Frames 0-3 flap (up, mid, down, mid), 4-5 panic. Replace with your own art in the same layout. */
  static sprite = Sprite.fromPixels([...flapFrames, ...panicFrames], palette)

  /** @param {import('../projectile.js').ProjectileInit & ChickenOptions} init */
  constructor(init) {
    super(init)
    const d = Chicken.defaults
    const r = init.random
    this.layer = /** @type {const} */ ('sprite')
    this.scale = init.scale ?? d.scale
    this.speed = init.speed ?? d.speed
    this.panicSteps = init.panicSteps ?? d.panicSteps
    this.featherCount = init.feathers ?? d.feathers
    const flight = init.flight ?? d.flight
    /** @type {'rise' | 'cross'} */
    this.flight = flight === 'random' ? (r.next() < 0.5 ? 'rise' : 'cross') : flight

    const half = (Chicken.sprite.frameWidth * this.scale) / 2
    if (this.flight === 'cross') {
      const fromLeft = r.next() < 0.5
      const startY = init.target.y + r.range(-40, 40)
      this.startX = fromLeft ? -half : init.size.width + half
      this.startY = Math.min(Math.max(startY, half), Math.max(half, init.size.height * 0.6))
    } else {
      this.startX = init.x
      this.startY = init.y + half // starts just below the bottom edge
    }
    this.moveTo(this.startX, this.startY)
    const dx = init.target.x - this.startX
    const dy = init.target.y - this.startY
    this.distance = Math.hypot(dx, dy)
    this.dirX = this.distance ? dx / this.distance : 0
    this.dirY = this.distance ? dy / this.distance : -1
    this.travelled = 0
    /** faces left when flying left (the art faces right) */
    this.flip = dx < 0 || (dx === 0 && r.next() < 0.5)
    // Bob sideways to the path, one bob per flap cycle (4 frames).
    this.bobAmp = this.scale
    this.bobRate = ((FLAP_FPS / 4) * 2 * Math.PI) / 60 // rad/step
    this.panicAge = -1
    this.flash = false
  }

  get panicking() {
    return this.panicAge >= 0
  }

  update() {
    this.age++
    if (this.panicking) {
      this.panicAge++
      const r = this.random
      const shake = Math.max(1, this.scale / 2)
      this.moveTo(this.target.x + r.range(-shake, shake), this.target.y + r.range(-shake, shake))
      this.flash = !this.engine?.calm && this.panicAge % 6 < 2
      return
    }
    this.travelled = Math.min(this.distance, this.travelled + this.speed)
    const bob = Math.sin(this.age * this.bobRate) * this.bobAmp
    this.moveTo(
      this.startX + this.dirX * this.travelled - this.dirY * bob,
      this.startY + this.dirY * this.travelled + this.dirX * bob,
    )
    if (this.travelled >= this.distance) this.panicAge = 0
  }

  shouldExplode() {
    return this.panicking && this.panicAge >= this.panicSteps
  }

  /** @param {import('../engine.js').Engine} engine */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst)
    engine.addParticles(
      Array.from(
        { length: this.featherCount },
        () => new Feather({ x: this.x, y: this.y, scale: Math.max(1, this.scale - 1), random: this.random }),
      ),
    )
  }

  /** Index into `Chicken.sprite` for the current step. */
  get frame() {
    if (this.panicking) return 4 + (Math.floor((this.panicAge * PANIC_FPS) / 60) % 2)
    return Math.floor((this.age * FLAP_FPS) / 60) % 4
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    Chicken.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, flip: this.flip, flash: this.flash })
  }
}
