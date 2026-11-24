import { Sprite } from './sprite.js'
import { palette, shardFrames } from './art/jug.js'

/** The retro jug's stoneware shards. */
export const jugShards = Sprite.fromPixels(shardFrames, palette)

/**
 * @typedef {object} ShardInit
 * @property {number} x
 * @property {number} y
 * @property {number} scale CSS px per sprite pixel
 * @property {import('./random.js').Random} random
 * @property {Sprite} [sprite] its pictures, one picked at random; stoneware shards by default
 * @property {number} [pixelSize] retro pixels per sprite pixel, as in a theme
 */

/**
 * A piece of an exploded jug (or a cow's steak): flies out, tumbles and falls,
 * fading near the end. Heavier than a feather. Drawn crisp on the sprite layer. Units are per
 * 1/60 s step.
 */
export class Shard {
  static GRAVITY = 0.22 // px/step^2
  static FADE_STEPS = 30

  /** @param {ShardInit} init */
  constructor({ x, y, scale, random: r, sprite = jugShards, pixelSize = 1 }) {
    const angle = r.range(0, Math.PI * 2)
    const speed = r.range(2, 7)
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed - 2.5 // thrown upward a little
    this.scale = scale
    this.sprite = sprite
    this.pixelSize = pixelSize
    this.frame = r.int(0, sprite.frames - 1)
    this.rotation = r.range(0, Math.PI * 2)
    this.spin = r.range(-0.3, 0.3) // rad/step
    this.life = r.int(70, 110)
    this.age = 0
    this.dead = false
    /** @type {'sprite'} */
    this.layer = 'sprite'
  }

  /** @returns {boolean} never pops */
  update() {
    this.vx *= 0.99
    this.vy += Shard.GRAVITY
    this.x += this.vx
    this.y += this.vy
    this.rotation += this.spin
    this.age++
    if (this.age >= this.life) this.dead = true
    return false
  }

  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = Math.min(1, (this.life - this.age) / Shard.FADE_STEPS)
    this.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale * this.pixelSize, alpha, rotation: this.rotation })
  }
}
