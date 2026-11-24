import { Projectile } from '../projectile.js'
import { Particle } from '../particle.js'
import { Sprite } from '../sprite.js'
import { Shard } from '../shard.js'
import { palette, frames } from '../art/jug.js'
import { inRange } from '../random.js'

/**
 * @typedef {object} JugOptions
 * @property {number} [scale] CSS px per sprite pixel
 * @property {number} [spin] tumble speed, rad/step (the direction follows the throw)
 * @property {number} [shards] stoneware pieces in the explosion
 * @property {number} [burstSize] how big the burst is: 1 is a rocket's size
 * @property {import('../options.js').MinMax} [launchPoint] where along the bottom edge it starts, percent of width
 * @property {import('../options.js').BurstStyle} [burst] burst style, 'fireball' by default
 */

const FLAME_FPS = 12
/** Sprite pixels from the jug's centre up to the wick flame. */
const WICK = 17

/**
 * The Jug-o-BOOM: a stoneware whiskey jug with a burning rag wick, lobbed up
 * from the bottom on a ballistic arc, tumbling and shedding embers; it bursts
 * into a fireball and shards at the top of the arc.
 */
export class Jug extends Projectile {
  /** Defaults for every jug; per launch: `show.launch('jug', 1, {spin: 0})`. */
  static defaults = /** @type {Required<Omit<JugOptions, 'burst'>>} */ ({
    scale: 2,
    spin: 0.05,
    shards: 12,
    burstSize: 3,
    launchPoint: { min: 10, max: 90 },
  })

  /** Frames 0-2: the wick flame flickering. Replace with your own art in the same layout. */
  static sprite = Sprite.fromPixels(frames, palette)

  /** @param {import('../projectile.js').ProjectileInit & JugOptions} init */
  constructor(init) {
    const d = Jug.defaults
    const scale = init.scale ?? d.scale
    const r = init.random
    // Start at a random spot just below the bottom edge; the arc still peaks at the target.
    const x = (init.size.width * inRange(r, init.launchPoint ?? d.launchPoint)) / 100
    super({ ...init, x, y: init.y + (Jug.sprite.frameHeight * scale) / 2 })
    this.layer = /** @type {const} */ ('sprite')
    this.scale = scale
    this.shardCount = init.shards ?? d.shards
    this.burst = init.burst ?? 'fireball'
    this.burstSize = init.burstSize ?? d.burstSize
    // Tumble forward, the way it was thrown.
    const direction = this.vx > 0 ? 1 : this.vx < 0 ? -1 : r.next() < 0.5 ? 1 : -1
    this.spin = direction * (init.spin ?? d.spin) * r.range(0.7, 1.3)
    this.rotation = r.range(-0.3, 0.3)
  }

  /** Where the wick flame is now, after the tumble. */
  get wick() {
    const reach = WICK * this.scale
    return { x: this.x + Math.sin(this.rotation) * reach, y: this.y - Math.cos(this.rotation) * reach }
  }

  update() {
    super.update()
    this.rotation += this.spin
    if (this.age % 3 === 0) this.engine?.addParticles([this.ember()])
  }

  /** A spark off the burning wick, left behind as a trail. */
  ember() {
    const r = this.random
    const { x, y } = this.wick
    return new Particle({
      x,
      y,
      angle: r.range(0, Math.PI * 2),
      speed: r.range(0.3, 1.2),
      hue: r.range(25, 45),
      brightness: r.range(55, 70),
      decay: r.range(0.05, 0.09),
      friction: 0.92,
      gravity: -0.4, // drifts up, like sparks off a flame
      trail: 3,
      lineWidth: r.range(1, 2),
      flicker: true,
    })
  }

  /** @param {import('../engine.js').Engine} engine */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst, this.burstSize)
    engine.addParticles(
      Array.from({ length: this.shardCount }, () => new Shard({ x: this.x, y: this.y, scale: this.scale, random: this.random })),
    )
  }

  /** Index into `Jug.sprite` for the current step. */
  get frame() {
    return Math.floor((this.age * FLAME_FPS) / 60) % 3
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    Jug.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, rotation: this.rotation })
  }
}
