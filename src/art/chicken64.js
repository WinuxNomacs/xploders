// Original detailed pixel art for xploders' 64-bit theme: the white hen facing right,
// 48x48 per frame (three times the retro hen's 16x16), painted from shaded shapes lit
// from the top left. Same frame layout as the retro hen: flap (wings up, mid, down,
// mid), then panic.

import { Grid } from './paint.js'

/** @type {Record<string, string | null>} */
export const palette = {
  '.': null,
  k: '#1e1418', // outline
  K: '#6b5a62', // lines inside the drawing
  W: '#ffffff', // feathers, light to dark
  w: '#f2eee6',
  v: '#dcd5c9',
  s: '#bbb1a3',
  d: '#8d8376',
  R: '#ff6e5c', // comb and wattle, light to dark
  r: '#e2323e',
  q: '#a3182a',
  Q: '#600c1a',
  Y: '#ffe37c', // beak and feet, light to dark
  y: '#f8b834',
  o: '#d3801e',
  O: '#8f4a0e',
  m: '#5e0e1c', // inside the beak
}

export const SIZE = 48
const FEATHERS = 'Wwvsd'
const RED = 'Rrq Q'.replace(' ', '')
const GOLD = 'YyoO'

/**
 * @param {'up' | 'mid' | 'down'} wing
 * @param {boolean} panic
 * @returns {string[]}
 */
function hen(wing, panic) {
  const g = new Grid(SIZE, SIZE)
  // tail feathers, fanned up and back
  g.ellipse(11, 16, 6, 2.6, FEATHERS, { angle: -1.15, rim: 'K' })
  g.ellipse(9, 20, 7, 3, FEATHERS, { angle: -0.85, rim: 'K' })
  g.ellipse(8, 24, 7, 3, FEATHERS, { angle: -0.5, rim: 'K' })
  // legs and feet
  for (const x of [19, 25]) {
    g.polygon(
      [
        [x - 1, 39],
        [x + 1, 39],
        [x + 1, 44],
        [x - 1, 44],
      ],
      GOLD.slice(1),
    )
    g.polygon(
      [
        [x - 3, 44],
        [x + 3, 44],
        [x + 4, 46],
        [x - 4, 46],
      ],
      GOLD,
    )
  }
  // body, breast, neck and head
  g.ellipse(21, 30, 14, 11, FEATHERS)
  g.ellipse(29, 27, 8, 9, FEATHERS, { bias: 0.05 })
  g.ellipse(32, 19, 6, 7, FEATHERS, { bias: 0.1 })
  g.ellipse(35, 13, 6.5, 6, FEATHERS, { bias: 0.15 })
  // the wing: a step darker than the body, outlined all round, with its flight feathers marked
  const wings = {
    up: { cx: 18, cy: 16, rx: 9.5, ry: 4, angle: -1.25 },
    mid: { cx: 19, cy: 30, rx: 9.5, ry: 5, angle: 0.15 },
    down: { cx: 20, cy: 37, rx: 9.5, ry: 4, angle: 0.65 },
  }
  const wg = wings[wing]
  g.ellipse(wg.cx, wg.cy, wg.rx, wg.ry, 'wvsd', { angle: wg.angle, rim: 'K', rimAt: 0.86, rimAll: true })
  const c = Math.cos(wg.angle)
  const s = Math.sin(wg.angle)
  for (const across of [-0.3, 0.35]) {
    // from the middle out to the wing's tip end (its left, back end)
    const bx = wg.cx - s * wg.ry * across
    const by = wg.cy + c * wg.ry * across
    g.line(bx - c * wg.rx * 0.15, by - s * wg.rx * 0.15, bx - c * wg.rx * 0.8, by - s * wg.rx * 0.8, 'K')
  }
  // comb and wattle
  g.ellipse(34, 8, 4, 1.6, RED)
  g.ellipse(31, 6.5, 2.2, 2.2, RED)
  g.ellipse(34, 5.3, 2.6, 2.6, RED)
  g.ellipse(37.2, 6.5, 2.2, 2.2, RED)
  g.ellipse(39.5, 19.5, 1.8, 2.7, RED)
  // beak and eye
  if (panic) {
    g.polygon(
      [
        [40, 10.5],
        [45.5, 11.5],
        [40, 13],
      ],
      GOLD.slice(0, 2),
    )
    g.polygon(
      [
        [40, 14],
        [44.5, 16.5],
        [40, 16.5],
      ],
      GOLD.slice(1, 3),
    )
    g.polygon(
      [
        [40, 13],
        [43, 13],
        [43, 14],
        [40, 14],
      ],
      'm',
    )
    g.ellipse(36.5, 11.5, 2.3, 2.3, 'W')
    g.set(37, 12, 'k')
    for (const [x, y] of [
      [34, 10],
      [34, 13],
      [39, 10],
      [39, 13],
      [36, 9],
      [37, 9],
      [36, 14],
      [37, 14],
    ]) {
      g.set(x, y, 'K')
    }
    // ruffled feathers standing out
    for (const [x0, y0, x1, y1] of [
      [27, 18, 25, 15],
      [12, 31, 9, 33],
      [30, 39, 32, 42],
      [17, 41, 15, 43],
    ]) {
      g.line(x0, y0, x1, y1, 'v')
    }
  } else {
    g.polygon(
      [
        [40, 11],
        [45.5, 13.5],
        [40, 15.5],
      ],
      GOLD,
    )
    g.line(41, 13.5, 44, 13.5, 'O')
    g.set(36, 11, 'k')
    g.set(37, 11, 'k')
    g.set(36, 12, 'k')
    g.set(37, 12, 'k')
    g.set(36, 11, 'W') // the glint
  }
  return g.outline('k').rows()
}

/** Frames 0-3 flap (wings up, mid, down, mid). */
export const flapFrames = [hen('up', false), hen('mid', false), hen('down', false), hen('mid', false)]

/** Frames 4-5 panic: eye wide, beak open, feathers ruffled, wings flung up then down. */
export const panicFrames = [hen('up', true), hen('down', true)]

/**
 * A feather for the explosion, 12x12.
 * @param {number} angle radians
 */
function feather(angle) {
  const g = new Grid(12, 12)
  g.ellipse(6, 6, 5, 1.8, FEATHERS, { angle, rim: 'K' })
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  g.line(6 - c * 5, 6 - s * 5, 6 + c * 4, 6 + s * 4, 's') // the quill
  return g.outline('k').rows()
}
/** Three poses for the sway: tilted right, flat, tilted left. */
export const featherFrames = [feather(-0.75), feather(0), feather(0.75)]
