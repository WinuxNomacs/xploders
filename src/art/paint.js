// A small painter for detailed pixel art: shaded ellipses and polygons, lines and an
// outline, painted into a grid of palette characters, so the result is ordinary text
// grids for Sprite.fromPixels. Light comes from the top left, as in late-90s sprites.

/** Unit vector towards the light: up, to the left and towards the viewer. */
const LIGHT = (() => {
  const v = [-0.5, -0.65, 0.6]
  const n = Math.hypot(...v)
  return v.map((c) => c / n)
})()

/**
 * Which step of a light-to-dark ramp a point of a lit dome gets.
 * @param {number} nx -1 to 1 across the shape
 * @param {number} ny -1 to 1 down the shape
 * @param {number} steps ramp length
 * @param {number} [bias] added to the brightness, -1 to 1
 */
export function shade(nx, ny, steps, bias = 0) {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
  const lit = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + bias // about -1 to 1
  const t = Math.min(1, Math.max(0, (lit + 0.25) / 1.15))
  return Math.round((1 - t) * (steps - 1))
}

export class Grid {
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    this.width = width
    this.height = height
    /** @type {string[][]} */
    this.px = Array.from({ length: height }, () => Array(width).fill('.'))
  }

  /** @param {number} x @param {number} y @param {string} ch */
  set(x, y, ch) {
    const ix = Math.round(x)
    const iy = Math.round(y)
    if (ix >= 0 && iy >= 0 && ix < this.width && iy < this.height) this.px[iy][ix] = ch
  }

  /** @param {number} x @param {number} y */
  get(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height ? this.px[y][x] : '.'
  }

  /**
   * A filled ellipse shaded as a lit dome.
   * @param {number} cx
   * @param {number} cy
   * @param {number} rx
   * @param {number} ry
   * @param {string} ramp palette characters, light to dark
   * @param {{angle?: number, bias?: number, rim?: string, rimAt?: number, rimAll?: boolean, only?: (x: number, y: number) => boolean}} [opts]
   *   angle: radians clockwise; bias: brighter or darker; rim: a character for the outer band (from `rimAt`, 0 to 1,
   *   of the radius) on the side away from the light, or all round with `rimAll`; only: paint only where this is true
   */
  ellipse(cx, cy, rx, ry, ramp, { angle = 0, bias = 0, rim, rimAt = 0.82, rimAll = false, only } = {}) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    const reach = Math.max(rx, ry) + 1
    for (let y = Math.floor(cy - reach); y <= Math.ceil(cy + reach); y++) {
      for (let x = Math.floor(cx - reach); x <= Math.ceil(cx + reach); x++) {
        const dx = x - cx
        const dy = y - cy
        const u = (dx * c + dy * s) / rx
        const v = (-dx * s + dy * c) / ry
        const r2 = u * u + v * v
        if (r2 > 1 || (only && !only(x, y))) continue
        // the dome's normal, back in screen axes
        const nx = u * c - v * s
        const ny = u * s + v * c
        const away = nx * LIGHT[0] + ny * LIGHT[1] < 0
        if (rim && (away || rimAll) && r2 > rimAt * rimAt) this.set(x, y, rim)
        else this.set(x, y, ramp[shade(nx, ny, ramp.length, bias)])
      }
    }
    return this
  }

  /**
   * A filled polygon, shaded top to bottom across its own height (or one character).
   * @param {[number, number][]} points
   * @param {string} ramp light to dark; one character paints it flat
   */
  polygon(points, ramp) {
    const ys = points.map(([, y]) => y)
    const top = Math.min(...ys)
    const bottom = Math.max(...ys)
    for (let y = Math.floor(top); y <= Math.ceil(bottom); y++) {
      const cy = y
      /** @type {number[]} */
      const xs = []
      for (let i = 0; i < points.length; i++) {
        const [x0, y0] = points[i]
        const [x1, y1] = points[(i + 1) % points.length]
        if ((y0 <= cy && y1 > cy) || (y1 <= cy && y0 > cy)) xs.push(x0 + ((cy - y0) / (y1 - y0)) * (x1 - x0))
      }
      xs.sort((a, b) => a - b)
      const t = bottom > top ? (cy - top) / (bottom - top) : 0
      const ch = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))]
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) this.set(x, y, ch)
      }
    }
    return this
  }

  /**
   * A one-pixel line.
   * @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {string} ch
   */
  line(x0, y0, x1, y1, ch) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, ch)
    return this
  }

  /**
   * Outlines the drawing: every empty pixel next to a painted one (up, down, left or right) gets `ch`.
   * @param {string} ch
   */
  outline(ch) {
    const edge = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.px[y][x] !== '.') continue
        const near = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)]
        if (near.some((n) => n !== '.' && n !== ch)) edge.push([x, y])
      }
    }
    for (const [x, y] of edge) this.px[y][x] = ch
    return this
  }

  /** @returns {Grid} a copy to paint over */
  copy() {
    const g = new Grid(this.width, this.height)
    g.px = this.px.map((row) => [...row])
    return g
  }

  /** @returns {string[]} the rows, for Sprite.fromPixels */
  rows() {
    return this.px.map((row) => row.join(''))
  }
}
