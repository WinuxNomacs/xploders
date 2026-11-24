import { Projectile } from '../projectile.js'
import { Sprite } from '../sprite.js'
import { Shard } from '../shard.js'
import { Milk } from '../milk.js'
import { inRange } from '../random.js'
import { pickTheme } from '../themes.js'
import { palette, floatFrames, mooFrames, bubbleFrames, steakFrames, HEAD } from '../art/cow.js'
import * as cow64 from '../art/cow64.js'

/**
 * @typedef {object} CowOptions
 * @property {number} [scale] CSS px per sprite pixel
 * @property {number} [speed] average px/step on the way up
 * @property {number} [hoverSteps] steps it hovers at its target before the Moo! (60 = 1 s)
 * @property {number} [mooSteps] steps of Moo! before it explodes
 * @property {number} [steaks] T-bone steaks in the explosion
 * @property {number} [milk] milk splashes in the explosion
 * @property {import('../options.js').MinMax} [launchPoint] where along the bottom edge it starts, percent of width
 */

const LEG_FPS = 10
const MOO_FPS = 12

/**
 * An original pixel-art cow that floats up from the bottom edge, legs kicking,
 * slows and hovers at its target, Moo!s excitedly (a speech bubble, bouncing and
 * shaking), then explodes into fireworks, T-bone steaks and milk.
 */
export class Cow extends Projectile {
  /** Defaults for every cow; per launch: `show.launch('cow', 1, {scale: 4})`. */
  static defaults = /** @type {Required<CowOptions>} */ ({
    scale: 3,
    speed: 3,
    hoverSteps: 18,
    mooSteps: 30,
    steaks: 8,
    milk: 16,
    launchPoint: { min: 10, max: 90 },
  })

  /**
   * Art per theme. Frames 0-3 legs kicking, 4-5 excited (mouth open), facing right. `bubble`:
   * frame 0 with its tail on the left (for a bubble right of the head), 1 on the right. `steaks`:
   * the T-bones. `head`: where the head is, in sprite pixels, for placing the bubble. `milkGlint`:
   * shiny milk. Replace a theme's art, or add a theme under a new name.
   * @type {Record<string, import('../themes.js').ThemeArt & {bubble: Sprite, steaks: Sprite, head: {x: number, y: number}, milkGlint?: boolean}>}
   */
  static themes = {
    '64bit': {
      sprite: Sprite.fromPixels([...cow64.floatFrames, ...cow64.mooFrames], cow64.palette),
      pixelSize: 1 / 3,
      bubble: Sprite.fromPixels(cow64.bubbleFrames, cow64.palette),
      steaks: Sprite.fromPixels(cow64.steakFrames, cow64.palette),
      head: cow64.HEAD,
      milkGlint: true,
    },
    retro: {
      sprite: Sprite.fromPixels([...floatFrames, ...mooFrames], palette),
      pixelSize: 1,
      bubble: Sprite.fromPixels(bubbleFrames, palette),
      steaks: Sprite.fromPixels(steakFrames, palette),
      head: HEAD,
    },
  }

  /** @param {import('../projectile.js').ProjectileInit & CowOptions} init */
  constructor(init) {
    const d = Cow.defaults
    const r = init.random
    const scale = init.scale ?? d.scale
    const x = (init.size.width * inRange(r, init.launchPoint ?? d.launchPoint)) / 100
    super({ ...init, x })
    this.layer = /** @type {const} */ ('sprite')
    this.art = pickTheme(new.target.themes, this.theme) // a subclass's own themes, if it has them
    this.scale = scale
    this.speed = init.speed ?? d.speed
    this.hoverSteps = init.hoverSteps ?? d.hoverSteps
    this.mooSteps = init.mooSteps ?? d.mooSteps
    this.steakCount = init.steaks ?? d.steaks
    this.milkCount = init.milk ?? d.milk
    this.startX = x
    this.startY = init.y + (this.art.sprite.frameHeight * this.art.pixelSize * scale) / 2 // just below the bottom edge
    this.moveTo(this.startX, this.startY)
    const distance = Math.hypot(init.target.x - this.startX, init.target.y - this.startY)
    /** steps to get there, slowing as it arrives */
    this.floatSteps = Math.max(30, Math.round(distance / this.speed))
    /** faces the way it drifts (the art faces right) */
    this.flip = init.target.x < this.startX
    this.bobRate = (2 * Math.PI) / 50 // rad/step: a slow bob
    /** @type {'float' | 'hover' | 'moo'} */
    this.phase = 'float'
    this.phaseAge = 0
  }

  get mooing() {
    return this.phase === 'moo'
  }

  update() {
    // A phase that has had all its steps hands over before this step moves.
    if (this.phase === 'float' && this.phaseAge >= this.floatSteps) this.next('hover')
    if (this.phase === 'hover' && this.phaseAge >= this.hoverSteps) this.next('moo')
    this.age++
    this.phaseAge++
    const bob = Math.sin(this.age * this.bobRate) * this.scale
    if (this.phase === 'float') {
      const p = this.phaseAge / this.floatSteps
      const eased = 1 - (1 - p) ** 3
      this.moveTo(
        this.startX + (this.target.x - this.startX) * eased,
        this.startY + (this.target.y - this.startY) * eased + bob * p,
      )
    } else if (this.phase === 'hover') {
      this.moveTo(this.target.x, this.target.y + bob)
    } else if (this.engine?.calm) {
      this.moveTo(this.target.x, this.target.y)
    } else {
      const r = this.random
      const shake = this.scale / 2
      const bounce = -Math.abs(Math.sin(this.phaseAge * 0.5)) * this.scale * 2
      this.moveTo(this.target.x + r.range(-shake, shake), this.target.y + bounce + r.range(-shake, shake))
    }
  }

  /** @param {'hover' | 'moo'} phase */
  next(phase) {
    this.phase = phase
    this.phaseAge = 0
  }

  shouldExplode() {
    return this.mooing && this.phaseAge >= this.mooSteps
  }

  /** @param {import('../engine.js').Engine} engine */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst)
    const { x, y, random } = this
    engine.addParticles([
      ...Array.from({ length: this.steakCount }, () => new Shard({ x, y, scale: Math.max(1, this.scale - 1), random, sprite: this.art.steaks, pixelSize: this.art.pixelSize })),
      ...Array.from({ length: this.milkCount }, () => new Milk({ x, y, scale: this.scale, random, glint: this.art.milkGlint })),
    ])
  }

  /** Index into its theme's sprite for the current step. */
  get frame() {
    if (this.mooing) return 4 + (Math.floor((this.phaseAge * MOO_FPS) / 60) % 2)
    return Math.floor((this.age * LEG_FPS) / 60) % 4
  }

  /**
   * Where the speech bubble goes: above the head on the side the cow faces, or the
   * other side if that runs off the canvas, then kept inside it.
   * @returns {{x: number, y: number, frame: number, scale: number}} its centre, frame and scale
   */
  bubblePlace() {
    const s = this.scale * this.art.pixelSize // CSS px per sprite pixel
    const pop = Math.min(1, 0.6 + 0.1 * this.phaseAge) // pops up over a few steps
    const { sprite, head, bubble } = this.art
    const headX = this.x + (this.flip ? -1 : 1) * (head.x + 0.5 - sprite.frameWidth / 2) * s
    const headY = this.y + (head.y + 0.5 - sprite.frameHeight / 2) * s
    const w = bubble.frameWidth * s
    const h = bubble.frameHeight * s
    const reach = w / 2 - s // from the tail's tip to the bubble's centre
    let right = !this.flip
    if (right && headX + reach + w / 2 > this.size.width) right = false
    else if (!right && headX - reach - w / 2 < 0) right = true
    const x = Math.min(Math.max(headX + (right ? reach : -reach), w / 2), Math.max(w / 2, this.size.width - w / 2))
    const y = Math.max(headY - 2 * s - h / 2, h / 2)
    return { x, y, frame: right ? 0 : 1, scale: s * pop }
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    this.art.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale * this.art.pixelSize, flip: this.flip })
    if (this.mooing) {
      const b = this.bubblePlace()
      this.art.bubble.draw(ctx, b.frame, b.x, b.y, { scale: b.scale })
    }
  }
}
