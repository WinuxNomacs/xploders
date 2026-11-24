// Original detailed pixel art for xploders' 64-bit theme: the black-and-white dairy cow
// facing right, 72x48 per frame (three times the retro cow's 24x16), its MOO! speech
// bubble and a grilled T-bone, painted from shaded shapes lit from the top left. Same
// frame layout as the retro cow: legs kicking, then excited.

import { Grid } from './paint.js'
import { font } from './font.js'

/** @type {Record<string, string | null>} */
export const palette = {
  '.': null,
  k: '#1e1418', // outline
  W: '#ffffff', // hide, light to dark
  w: '#f1eee8',
  v: '#d9d4cc',
  s: '#b4ada3',
  X: '#4a4450', // spots, light to dark
  x: '#2c2732',
  z: '#17131b',
  p: '#ffb3c2', // nose, ear, udder, light to dark
  P: '#f08aa2',
  q: '#c45a76',
  h: '#f6ead0', // horns
  H: '#c9b48c',
  n: '#6b5444', // hooves
  N: '#3e2f25',
  r: '#e8323a', // open mouth
  R: '#7a1020',
  // the bubble
  b: '#ffffff',
  B: '#dfe3ec',
  g: '#8b90a0', // lettering shadow
  // steak
  D: '#9a5428', // grilled meat, light to dark
  d: '#7a3f1c',
  e: '#55270f',
  G: '#2e1408', // grill marks
  f: '#f0d3a6', // fat rim
  F: '#d4ae7c',
  o: '#fbf6ea', // bone, light to dark
  O: '#d8cdb6',
}

export const WIDTH = 72
export const HEIGHT = 48
const HIDE = 'Wwvs'
const SPOT = 'Xxz'
const PINK = 'pPq'

/** Where the head is, in sprite pixels from the top left (for placing the bubble). */
export const HEAD = { x: 61, y: 13 }

/** Centre column of each leg: back pair, front pair (as in the retro cow). */
const LEGS = [10, 22, 37, 49]

/**
 * One leg, swung by `kick` (-1 to 1) from the hip.
 * @param {Grid} g
 * @param {number} x
 * @param {number} kick
 * @param {boolean} far drawn darker, behind the body
 */
function leg(g, x, kick, far) {
  const ramp = far ? 'vs' : 'Wwv'
  const foot = x + kick * 3
  g.polygon(
    [
      [x - 3, 30],
      [x + 3, 30],
      [foot + 3, 43],
      [foot - 3, 43],
    ],
    ramp,
  )
  g.polygon(
    [
      [foot - 3, 43],
      [foot + 3, 43],
      [foot + 3, 46],
      [foot - 3, 46],
    ],
    'nN',
  )
}

/**
 * @param {number[]} kick per leg, -1 to 1
 * @param {boolean} excited
 * @returns {string[]}
 */
function cow(kick, excited) {
  const g = new Grid(WIDTH, HEIGHT)
  // the far legs of each pair, behind the body
  leg(g, LEGS[1], kick[1], true)
  leg(g, LEGS[3], kick[3], true)
  // the tail, hanging from the rump with a dark tuft
  g.line(8, 15, 5, 22, 'v')
  g.line(5, 22, 4, 29, 'v')
  g.line(9, 15, 6, 22, 's')
  g.ellipse(4, 31, 2.2, 3, SPOT)
  // body, neck and head
  g.ellipse(30, 22, 23, 11, HIDE)
  g.ellipse(50, 18, 8, 9, HIDE, { bias: 0.05 })
  g.ellipse(61, 15, 8, 9, HIDE, { bias: 0.1 })
  // black spots, only on the hide already painted
  const onHide = (/** @type {number} */ x, /** @type {number} */ y) => 'Wwvs'.includes(g.get(x, y))
  g.ellipse(20, 17, 8, 5, SPOT, { angle: 0.3, only: onHide })
  g.ellipse(38, 25, 6, 4.5, SPOT, { angle: -0.2, only: onHide })
  g.ellipse(10, 24, 4, 5.5, SPOT, { only: onHide })
  g.ellipse(46, 15, 3.5, 3, SPOT, { only: onHide })
  g.ellipse(56.5, 8.5, 3, 2.5, SPOT, { angle: 0.4, only: onHide }) // clear of the eye
  // the udder, and the near legs
  g.ellipse(31, 33, 4.5, 3, PINK)
  leg(g, LEGS[0], kick[0], false)
  leg(g, LEGS[2], kick[2], false)
  // horns and ear
  g.ellipse(56, 4.5, 1.6, 2.6, 'hH', { angle: -0.4 })
  g.ellipse(67, 4.5, 1.6, 2.6, 'hH', { angle: 0.4 })
  g.ellipse(51, 9, 4, 2.2, PINK, { angle: -0.5 })
  // the muzzle, nostrils and eye
  g.ellipse(65.5, 22, 6, 5, PINK)
  g.set(64, 21, 'q')
  g.set(68, 21, 'q')
  if (excited) {
    // eye wide open, jaw dropped with a tongue
    g.ellipse(62, 12, 3.2, 3.6, 'k') // ringed in black so it shows on the white hide
    g.ellipse(62, 12, 2.2, 2.6, 'W')
    g.set(62, 12, 'k')
    g.set(62, 13, 'k')
    g.ellipse(65, 28, 4, 3, 'rR')
    g.ellipse(65.5, 29.5, 2.2, 1.3, 'Pq')
  } else {
    g.ellipse(62.5, 12.5, 1.7, 2, 'z')
    g.set(62, 11, 'W') // the glint
    g.line(62, 26, 68, 26, 'q') // the mouth
  }
  return g.outline('k').rows()
}

/** Frames 0-3: legs kicking as it floats up (straight, one way, straight, the other). */
export const floatFrames = [cow([0, 0, 0, 0], false), cow([-1, 1, -1, 1], false), cow([0, 0, 0, 0], false), cow([1, -1, 1, -1], false)]

/** Frames 4-5: excited, mouth open, legs splayed one way then the other. */
export const mooFrames = [cow([-1, -1, 1, 1], true), cow([1, 1, -1, -1], true)]

export const BUBBLE_WIDTH = 69
export const BUBBLE_HEIGHT = 36
const BUBBLE_BODY = 27

/**
 * The MOO! speech bubble, 69x36, its tail at the bottom near the given side.
 * @param {'left' | 'right'} side
 * @returns {string[]}
 */
function bubble(side) {
  const g = new Grid(BUBBLE_WIDTH, BUBBLE_HEIGHT)
  const near = (/** @type {number} */ x) => (side === 'left' ? x : BUBBLE_WIDTH - 1 - x)
  g.ellipse(34, 13, 32.5, 12.5, 'bbbB') // a rounded bubble, shaded a touch at its bottom
  g.polygon(
    [
      [near(10), BUBBLE_BODY - 6],
      [near(18), BUBBLE_BODY - 3],
      [near(4), BUBBLE_HEIGHT - 2],
    ],
    'bB',
  )
  // MOO! at three times the font's size, with a shadow
  const k = 3
  const text = 'MOO!'
  const width = [...text].reduce((w, ch) => w + (font[ch][0].length + 1) * k, -k)
  for (const [dx, dy, ink] of /** @type {[number, number, string][]} */ ([
    [1, 1, 'g'],
    [0, 0, 'k'],
  ])) {
    let x0 = 35 - Math.floor(width / 2)
    for (const ch of text) {
      const glyph = font[ch]
      glyph.forEach((line, gy) => {
        for (let gx = 0; gx < line.length; gx++) {
          if (line[gx] !== '#') continue
          for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) g.set(x0 + gx * k + i + dx, 6 + gy * k + j + dy, ink)
        }
      })
      x0 += (glyph[0].length + 1) * k
    }
  }
  return g.outline('k').rows()
}

/** Bubble frames: 0 with its tail on the left (the bubble sits right of the head), 1 with it on the right. */
export const bubbleFrames = [bubble('left'), bubble('right')]

/** A grilled T-bone, 27x21: meat with grill marks, a fat rim, and the T-shaped bone. */
function steak() {
  const g = new Grid(27, 21)
  g.ellipse(13, 10.5, 12, 8.5, 'fF')
  g.ellipse(13.5, 11, 10.5, 7, 'Dde', { bias: 0.1 })
  // grill marks, on the meat only
  for (const off of [-8, -2, 4, 10]) {
    for (let i = 0; i <= 14; i++) {
      const x = Math.round(7 + off + (4 * i) / 14)
      const y = 4 + i
      if ('Dde'.includes(g.get(x, y))) g.set(x, y, 'G')
    }
  }
  // the T-shaped bone
  g.polygon(
    [
      [6, 5],
      [20, 5],
      [20, 7],
      [6, 7],
    ],
    'oO',
  )
  g.polygon(
    [
      [12, 7],
      [14, 7],
      [14, 17],
      [12, 17],
    ],
    'oO',
  )
  return g.outline('k').rows()
}
const t = steak()

/** T-bones for the explosion, 27x21: one and its mirror image. */
export const steakFrames = [t, t.map((row) => [...row].reverse().join(''))]
