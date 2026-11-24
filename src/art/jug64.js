// Original detailed pixel art for xploders' 64-bit theme: the Jug-o-BOOM, 93x120 per
// frame (three times the retro jug's 31x40, with the same outline), painted with a
// glossy brown glaze, cream stoneware shaded as a lit round body, shaded lettering, a
// ring handle, a rag wick and a three-frame flame. Same frame layout as the retro jug.

import { Grid, shade } from './paint.js'
import { font } from './font.js'

/** @type {Record<string, string | null>} */
export const palette = {
  '.': null,
  k: '#1e1418', // outline
  g: '#ffe9cf', // glaze glint
  H: '#c97a42', // glaze, light to dark
  b: '#a35a2a',
  B: '#7a3f1d',
  d: '#4f2611',
  D: '#2e1408',
  h: '#fffaf0', // cream stoneware, light to dark
  c: '#efe2c0',
  C: '#dccaa0',
  s: '#c0aa80',
  S: '#8f7a55',
  u: '#3557b8', // cobalt lettering and its shadow
  U: '#1b2c66',
  m: '#d22d20', // red lettering and its shadow
  M: '#7a140e',
  n: '#c99a5c', // cork, light to dark
  N: '#9a7040',
  P: '#6a4a26',
  r: '#e6dfca', // rag, light to dark
  q: '#b0a68a',
  Q: '#7e7560',
  R: '#e8401c', // flame, outside in
  o: '#ff9a1f',
  y: '#ffe36a',
  w: '#fffbe8',
}

export const WIDTH = 93
export const HEIGHT = 120
const CENTER = 46
const K = 3 // pixels per retro pixel
const CORK_ROW = 9 * K
/** Retro half widths per row from the cork down (as in the retro jug). */
const RETRO_HALF = [2, 2, 2, 3, 4, 6, 8, 10, 11, 12, 13, ...Array(16).fill(14), 13, 13, 12, 10]
const GLAZE = 'gHbBdD'
const CREAM = 'hcCsS'

/**
 * The jug's half width at a row, smoothly between the retro rows.
 * @param {number} y
 */
function halfWidth(y) {
  const t = Math.min(RETRO_HALF.length - 1, Math.max(0, (y - CORK_ROW - 1) / K))
  const i = Math.floor(t)
  const f = t - i
  const a = RETRO_HALF[i]
  const b = RETRO_HALF[Math.min(RETRO_HALF.length - 1, i + 1)]
  return (a + (b - a) * f) * K + 1
}

/**
 * Where the glaze ends at a column: a wavy edge with drips (where the retro jug's are).
 * @param {number} x
 */
function glazeEnd(x) {
  let drip = 0
  for (const rx of [4, 5, 11, 18, 19, 24]) drip = Math.max(drip, 4 * Math.exp(-(((x - (rx * K + 1)) / 2.2) ** 2)))
  return 20 * K + Math.sin(x * 0.45) * 0.8 + drip
}

/**
 * Stamps text at twice the font's size, with a shadow one pixel down and right.
 * @param {Grid} g
 * @param {string} text
 * @param {string} ink
 * @param {string} shadow
 * @param {number} y0 top row
 */
function letter(g, text, ink, shadow, y0) {
  const k = 2
  const width = [...text].reduce((w, ch) => w + (font[ch][0].length + 1) * k, -k)
  for (const [dx, dy, col] of /** @type {[number, number, string][]} */ ([
    [1, 1, shadow],
    [0, 0, ink],
  ])) {
    let x0 = CENTER - Math.floor(width / 2)
    for (const ch of text) {
      const glyph = font[ch]
      glyph.forEach((line, gy) => {
        for (let gx = 0; gx < line.length; gx++) {
          if (line[gx] !== '#') continue
          for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) g.set(x0 + gx * k + i + dx, y0 + gy * k + j + dy, col)
        }
      })
      x0 += (glyph[0].length + 1) * k
    }
  }
}

/** The jug without its flame. */
function paintJug() {
  const g = new Grid(WIDTH, HEIGHT)
  // the ring handle, from the neck out and down to the shoulder (behind the body's edge)
  const handle = [
    [3, 19],
    [3, 23],
    [4, 24.5],
    [5, 25.6],
    [6, 26.6],
    [7, 27.5],
    [8, 28],
    [9.5, 28],
  ].map(([dy, x]) => [x * K + 1, (9 + dy) * K + 1])
  for (let i = 0; i + 1 < handle.length; i++) {
    const [x0, y0] = handle[i]
    const [x1, y1] = handle[i + 1]
    for (let w = -2; w <= 2; w++) g.line(x0 + w * 0.3, y0 + w, x1 + w * 0.3, y1 + w, w < 0 ? 'H' : w > 1 ? 'D' : 'B')
  }
  // body: cork, neck lip, glaze with drips, cream stoneware
  const bodyTop = CORK_ROW
  const bottom = HEIGHT - 2
  for (let y = bodyTop; y <= bottom; y++) {
    const hw = halfWidth(y)
    for (let x = Math.ceil(CENTER - hw); x <= Math.floor(CENTER + hw); x++) {
      const nx = (x - CENTER) / hw
      if (y < CORK_ROW + 3 * K) {
        g.set(x, y, 'nNP'[shade(nx, -0.3, 3)])
        continue
      }
      if (y < CORK_ROW + 4 * K) {
        g.set(x, y, 'bBd'[shade(nx, 0, 3)])
        continue
      }
      // a round body: darker towards the bottom as well as the sides
      const ny = Math.max(-0.6, Math.min(0.85, (y - 88) / 34))
      if (y < glazeEnd(x)) {
        // a dark glossy glaze: its lightest step is kept for the glint streak below
        g.set(x, y, GLAZE[Math.max(1, shade(nx * 0.95, ny * 0.6 - 0.2, GLAZE.length, -0.35))])
      } else {
        g.set(x, y, CREAM[shade(nx * 0.95, ny, CREAM.length)])
      }
    }
  }
  // the glaze's glint: a bright streak down its upper left, softening at the ends
  for (let y = CORK_ROW + 5 * K; y < 57; y++) {
    const x = Math.round(CENTER - halfWidth(y) * 0.52)
    const end = y < CORK_ROW + 7 * K || y > 53
    g.set(x, y, end ? 'H' : 'g')
    g.set(x + 1, y, 'H')
  }
  letter(g, 'JUG-O-', 'u', 'U', 23 * K - 1)
  letter(g, 'BOOM', 'm', 'M', 29 * K)
  // the rag wick, out of the cork
  g.ellipse(CENTER, CORK_ROW - 3, 5, 3, 'rqQ')
  g.ellipse(CENTER - 1, CORK_ROW - 7, 2.5, 3, 'rqQ', { angle: 0.3 })
  return g
}

/**
 * The flame over the wick: nested teardrops, leaning by `lean` (-1 to 1).
 * @param {Grid} jug
 * @param {number} lean
 * @param {number} grow
 */
function withFlame(jug, lean, grow) {
  const g = jug.copy()
  const base = CORK_ROW - 8
  for (const [scale, ch] of /** @type {[number, string][]} */ ([
    [1, 'R'],
    [0.75, 'o'],
    [0.5, 'y'],
    [0.25, 'w'],
  ])) {
    const h = 15 * grow * scale + 2
    const r = 5.5 * scale + 1
    for (let i = 0; i <= 20; i++) {
      const t = i / 20 // 0 at the base, 1 at the tip
      const cx = CENTER + lean * 3 * t * t
      const cy = base - t * h + r * 0.4
      const rr = r * Math.sqrt(1 - t) * (1 - 0.15 * t)
      g.ellipse(cx, cy, Math.max(0.6, rr), Math.max(0.6, rr * 0.9), ch)
    }
  }
  return g.outline('k').rows()
}

const jug = paintJug()

/** Frames 0-2: the jug with its wick flame flickering (upright, then leaning one way and the other). */
export const frames = [withFlame(jug, 0, 1), withFlame(jug, -1, 0.92), withFlame(jug, 1, 0.96)]

/**
 * A stoneware shard, 9x9: a jagged piece shaded top to bottom.
 * @param {[number, number][]} points
 * @param {string} ramp
 */
function shard(points, ramp) {
  const g = new Grid(9, 9)
  g.polygon(points, ramp)
  return g.outline('k').rows()
}

/** Shards for the explosion, 9x9: three glazed, three cream. */
export const shardFrames = [
  shard(
    [
      [1, 2],
      [6, 1],
      [7, 5],
      [3, 7],
    ],
    'HbBd',
  ),
  shard(
    [
      [2, 1],
      [7, 3],
      [5, 7],
      [1, 5],
    ],
    'bBdD',
  ),
  shard(
    [
      [1, 3],
      [7, 2],
      [4, 7],
    ],
    'HbB',
  ),
  shard(
    [
      [1, 2],
      [6, 1],
      [7, 6],
      [2, 7],
    ],
    'hcCs',
  ),
  shard(
    [
      [2, 1],
      [7, 4],
      [3, 7],
      [1, 4],
    ],
    'cCsS',
  ),
  shard(
    [
      [1, 1],
      [7, 3],
      [3, 7],
    ],
    'hcC',
  ),
]
