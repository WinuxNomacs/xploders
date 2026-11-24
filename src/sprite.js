/**
 * @typedef {object} PixelSheet
 * @property {number} frameWidth
 * @property {number} frameHeight
 * @property {number} frames
 * @property {Uint8ClampedArray} data RGBA for all frames side by side
 */

/**
 * Turns text grids (one character per pixel) into RGBA pixels for a
 * horizontal sprite sheet. Pure, so it runs and is tested without a canvas.
 * @param {string[][]} frames each frame is a list of equal-length rows
 * @param {Record<string, string | null>} palette character to CSS hex colour (#rgb or #rrggbb); null is transparent
 * @returns {PixelSheet}
 */
export function parsePixels(frames, palette) {
  if (frames.length === 0) throw new Error('xploders: a sprite needs at least one frame')
  const frameHeight = frames[0].length
  const frameWidth = frames[0][0]?.length ?? 0
  if (frameWidth === 0) throw new Error('xploders: empty sprite frame')
  const width = frameWidth * frames.length
  const data = new Uint8ClampedArray(width * frameHeight * 4)
  /** @type {Map<string, [number, number, number] | null>} */
  const colours = new Map()
  for (const [ch, css] of Object.entries(palette)) colours.set(ch, css === null ? null : hexToRgb(css))
  frames.forEach((rows, f) => {
    if (rows.length !== frameHeight) throw new Error(`xploders: frame ${f} has ${rows.length} rows, expected ${frameHeight}`)
    rows.forEach((row, y) => {
      if (row.length !== frameWidth) {
        throw new Error(`xploders: frame ${f} row ${y} is ${row.length} wide, expected ${frameWidth}`)
      }
      for (let x = 0; x < frameWidth; x++) {
        const ch = row[x]
        if (!colours.has(ch)) throw new Error(`xploders: frame ${f} row ${y} uses "${ch}", which is not in the palette`)
        const rgb = colours.get(ch)
        if (!rgb) continue
        const i = (y * width + f * frameWidth + x) * 4
        data[i] = rgb[0]
        data[i + 1] = rgb[1]
        data[i + 2] = rgb[2]
        data[i + 3] = 255
      }
    })
  })
  return { frameWidth, frameHeight, frames: frames.length, data }
}

/** @param {string} css @returns {[number, number, number]} */
function hexToRgb(css) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css)
  if (!m) throw new Error(`xploders: palette colour "${css}" is not #rgb or #rrggbb`)
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

/** @param {number} w @param {number} h @returns {HTMLCanvasElement | OffscreenCanvas} */
export function createCanvas(w, h) {
  if (typeof OffscreenCanvas === 'function') return new OffscreenCanvas(w, h)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** @param {CanvasImageSource} image */
function isReady(image) {
  if (typeof HTMLImageElement === 'function' && image instanceof HTMLImageElement) {
    return image.complete && image.naturalWidth > 0
  }
  return true
}

/**
 * Frame-based animation over a horizontal sprite sheet: any image or canvas, or
 * one built from text grids with `Sprite.fromPixels`. Drawn pixel-crisp.
 */
export class Sprite {
  /**
   * @param {CanvasImageSource | null} image null when built lazily from pixels
   * @param {object} opts
   * @param {number} opts.frameWidth
   * @param {number} opts.frameHeight
   * @param {number} opts.frames number of frames in the sheet
   * @param {number} [opts.fps]
   */
  constructor(image, { frameWidth, frameHeight, frames, fps = 8 }) {
    this.image = image
    /** @type {CanvasImageSource | null} the same frames as a white silhouette, for flashing */
    this.flashImage = null
    this.frameWidth = frameWidth
    this.frameHeight = frameHeight
    this.frames = frames
    this.fps = fps
    /** @type {PixelSheet | null} */
    this.pixels = null
  }

  /**
   * Builds a sprite from text grids. The sheet is made on first draw, so this
   * also works where there is no canvas (Node, server rendering).
   * @param {string[][]} frames
   * @param {Record<string, string | null>} palette
   * @param {number} [fps]
   */
  static fromPixels(frames, palette, fps = 8) {
    const pixels = parsePixels(frames, palette)
    const sprite = new Sprite(null, { ...pixels, fps })
    sprite.pixels = pixels
    return sprite
  }

  /** Makes the sheet (and its flash silhouette) from pixels, once. */
  build() {
    if (this.image || !this.pixels) return
    const { frameWidth, frameHeight, frames, data } = this.pixels
    const w = frameWidth * frames
    const sheet = createCanvas(w, frameHeight)
    const flash = createCanvas(w, frameHeight)
    const white = new Uint8ClampedArray(data)
    for (let i = 0; i < white.length; i += 4) {
      if (white[i + 3]) white.fill(255, i, i + 3)
    }
    /** @type {any} */
    const sheetCtx = sheet.getContext('2d')
    /** @type {any} */
    const flashCtx = flash.getContext('2d')
    sheetCtx.putImageData(new ImageData(new Uint8ClampedArray(data), w, frameHeight), 0, 0)
    flashCtx.putImageData(new ImageData(white, w, frameHeight), 0, 0)
    this.image = sheet
    this.flashImage = flash
  }

  /**
   * @param {number} time seconds since the animation started
   * @returns {number} the frame index to show
   */
  frameAt(time) {
    return Math.floor(time * this.fps) % this.frames
  }

  /**
   * Draws one frame centred on (x, y), snapped to whole pixels.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} frame
   * @param {number} x
   * @param {number} y
   * @param {object} [opts]
   * @param {number} [opts.scale] CSS pixels per sprite pixel
   * @param {boolean} [opts.flip] mirror horizontally
   * @param {boolean} [opts.flash] draw the white silhouette instead
   * @param {number} [opts.alpha]
   * @param {number} [opts.rotation] radians, clockwise, about the centre
   */
  draw(ctx, frame, x, y, { scale = 1, flip = false, flash = false, alpha = 1, rotation = 0 } = {}) {
    this.build()
    const image = flash && this.flashImage ? this.flashImage : this.image
    if (!image || !isReady(image)) return
    const w = this.frameWidth * scale
    const h = this.frameHeight * scale
    ctx.save()
    // Crisp pixels, unless art is shrunk below one screen pixel per pixel (detailed art on a
    // low-DPI screen), where dropping pixels would look jagged and smoothing looks right.
    const transform = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null
    const device = scale * (transform && transform.a > 0 ? transform.a : 1)
    ctx.imageSmoothingEnabled = device < 0.999
    ctx.globalAlpha = alpha
    ctx.translate(Math.round(x), Math.round(y))
    if (rotation) ctx.rotate(rotation)
    if (flip) ctx.scale(-1, 1)
    ctx.drawImage(image, (frame % this.frames) * this.frameWidth, 0, this.frameWidth, this.frameHeight, -Math.round(w / 2), -Math.round(h / 2), w, h)
    ctx.restore()
  }
}
