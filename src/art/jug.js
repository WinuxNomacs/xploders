// Original pixel art for xploders: the Jug-o-BOOM, a stoneware whiskey jug with a
// burning rag wick, 31x40 per frame. The jug is described by its outline (half
// widths per row) and painted into text grids, so the lettering can be stamped
// from a small font; the result is ordinary text grids for Sprite.fromPixels.

import { stamp, textWidth } from './font.js'

/** @type {Record<string, string | null>} */
export const palette = {
  '.': null,
  k: '#2b1e24', // outline
  B: '#7a3f1d', // brown glaze
  b: '#a35a2a', // glaze highlight
  d: '#4f2611', // glaze shade
  c: '#efe2c0', // cream stoneware
  h: '#fbf4e0', // cream highlight
  s: '#c9b48a', // cream shade
  u: '#2f4fa8', // cobalt lettering
  m: '#c8281e', // red lettering
  n: '#b98a4e', // cork
  N: '#8a6232', // cork shade
  r: '#d8d0b8', // rag
  q: '#a39a80', // rag shade
  R: '#e8401c', // flame edge
  o: '#ffa21f', // flame
  y: '#fff27a', // flame core
  w: '#ffffff', // flame heart
}

export const WIDTH = 31
const CENTER = 15

/**
 * Half width of the jug per row, from the cork down; rows before `CORK_ROW`
 * hold the wick and flame.
 */
const CORK_ROW = 9
const halfWidths = [2, 2, 2, 3, 4, 6, 8, 10, 11, 12, 13, ...Array(16).fill(14), 13, 13, 12, 10]
export const HEIGHT = CORK_ROW + halfWidths.length
/** The glaze covers the cork-down rows before this one (with a few drips into it). */
const GLAZE_END = CORK_ROW + 11

/** The lettering: text, colour, top row. */
export const lettering = [
  { text: 'JUG-O-', colour: 'u', row: 23 },
  { text: 'BOOM', colour: 'm', row: 29 },
]

/** Three flame frames over the wick, 7 wide, centred; the third leans the other way. */
const flameA = ['...R...', '..RoR..', '.RoyoR.', '.oywyo.', '.oywyo.', '..oyo..', '...o...']
const flameB = ['..R....', '.RoR...', '.Royo..', '.oywyoR', '.oywyo.', '..oyo..', '...o...']
const flameC = flameB.map((row) => [...row].reverse().join(''))

/** @returns {string[][]} a blank grid */
function blank() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill('.'))
}

/**
 * Paints the jug: outline, brown glazed top with drips, cream body, shading,
 * handle, cork, rag and lettering.
 * @returns {string[][]}
 */
function paintJug() {
  const g = blank()
  halfWidths.forEach((hw, i) => {
    const y = CORK_ROW + i
    const left = CENTER - hw
    const right = CENTER + hw
    const last = i === halfWidths.length - 1
    for (let x = left; x <= right; x++) {
      if (y < CORK_ROW + 3) {
        // cork: shaded on the right
        g[y][x] = x === left || x === right ? 'k' : x === right - 1 ? 'N' : 'n'
        continue
      }
      if (last || x === left || x === right) {
        g[y][x] = 'k'
        continue
      }
      const drip = y === GLAZE_END && [4, 5, 11, 18, 19, 24].includes(x)
      const glazed = y < GLAZE_END || drip
      if (glazed) g[y][x] = x === left + 1 || x === left + 2 ? 'b' : x >= right - 2 ? 'd' : 'B'
      else g[y][x] = x === left + 1 ? 'h' : x >= right - 2 || y >= HEIGHT - 3 ? 's' : 'c'
    }
  })
  // The neck's lip is one row of glaze shade.
  for (let x = CENTER - 2; x <= CENTER + 2; x++) g[CORK_ROW + 3][x] = 'd'
  // Ring handle from the neck out and down to the shoulder, leaving a gap.
  for (const [dy, x] of [
    [3, 19],
    [3, 20],
    [3, 21],
    [3, 22],
    [3, 23],
    [4, 24],
    [5, 25],
    [6, 26],
    [7, 27],
    [8, 28],
    [9, 28],
  ]) {
    const y = CORK_ROW + dy
    g[y][x] = 'k'
    if (g[y][x + 1] === '.') g[y][x + 1] = 'd'
  }
  // Rag wick out of the cork.
  g[CORK_ROW - 1][CENTER - 1] = 'r'
  g[CORK_ROW - 1][CENTER] = 'q'
  g[CORK_ROW - 1][CENTER + 1] = 'r'
  g[CORK_ROW - 2][CENTER] = 'r'
  // Lettering, centred.
  for (const { text, colour, row } of lettering) stamp(g, text, colour, CENTER - Math.floor(textWidth(text) / 2), row)
  return g
}

/**
 * @param {string[][]} jug
 * @param {string[]} flame
 * @returns {string[]}
 */
function withFlame(jug, flame) {
  const g = jug.map((row) => [...row])
  const x0 = CENTER - 3
  flame.forEach((line, y) => {
    for (let dx = 0; dx < line.length; dx++) if (line[dx] !== '.') g[y][x0 + dx] = line[dx]
  })
  return g.map((row) => row.join(''))
}

const jug = paintJug()

/** Frames 0-2: the jug with its wick flame flickering. */
export const frames = [withFlame(jug, flameA), withFlame(jug, flameB), withFlame(jug, flameC)]

/** Stoneware pieces for the explosion, 3x3: three brown, three cream. */
export const shardFrames = [
  ['kB.', 'BBb', '.Bk'],
  ['.kB', 'kBB', 'Bd.'],
  ['Bb.', 'dBk', '...'],
  ['kc.', 'cch', '.ck'],
  ['.kc', 'kcs', 'cs.'],
  ['ch.', 'sck', '...'],
]
