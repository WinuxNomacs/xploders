// Original pixel art for xploders: a black-and-white dairy cow facing right,
// 24x16 per frame, its "MOO!" speech bubble, and a grilled T-bone steak. The cow
// is a body with legs painted on per frame; the bubble's lettering is stamped
// from the 3x5 font. The results are ordinary text grids for Sprite.fromPixels.

import { stamp, textWidth } from './font.js'

/** @type {Record<string, string | null>} */
export const palette = {
  '.': null,
  k: '#2b1e24', // outline and spots
  w: '#ffffff', // hide
  g: '#c8c6d8', // hide shade
  p: '#f4a3b4', // nose, ear, udder
  P: '#c8607a', // nostrils, tongue
  h: '#efe2c0', // horns
  n: '#5a4636', // hooves
  r: '#e8323a', // open mouth
  // steak
  D: '#8a4a22', // grilled meat
  d: '#5e2e12', // grill marks
  f: '#e9c79a', // fat rim
  b: '#f6f0e2', // bone
}

export const WIDTH = 24
export const HEIGHT = 16

/** Rows 0-11: head, body, tail and udder; the legs are painted below. */
const body = [
  '........................',
  '.................h....h.',
  '.............kk.kkkkkkkk',
  '.............kpkkwkkwwwk',
  '..kkkkkkkkkkkkkkkwkwwkwk',
  '.kwwkkkwwwwwkkwwwwwwwwwk',
  'kkwkkkkwwwwkkkwwwwpppppk',
  'kkgwkkwwwwwwkkwwwkpPpPpk',
  'kkgwwwwwwkwwwwwwwkpppppk',
  'kkggwwwwwwwwwwwggkkkkkk.',
  '.kgggwwwwwwwwwgggk......',
  '..kgggggggppggggkk......',
]

/** Excited face, painted over the head: eye wide open, jaw dropped with a tongue. [column, row, pixels] */
const excitedHead = /** @type {[number, number, string][]} */ ([
  [21, 4, 'k'],
  [21, 5, 'k'],
  [17, 8, 'kpkrrk'],
  [17, 9, '.krPPk'],
  [18, 10, 'kkkk'],
])

/** Left column of each leg: back pair, front pair. */
const LEGS = [2, 6, 11, 15]

/**
 * Paints the four legs into rows 11-15. `kick` gives each leg's sideways shift
 * at the hoof (the top stays put, so the leg swings from the hip).
 * @param {string[][]} g
 * @param {number[]} kick per leg, -1, 0 or 1
 */
function paintLegs(g, kick) {
  LEGS.forEach((x, i) => {
    const shift = [0, 0, kick[i] > 0 ? 1 : kick[i] < 0 ? -1 : 0, kick[i]]
    for (let row = 12; row < HEIGHT; row++) {
      const dx = shift[row - 12]
      const hoof = row === HEIGHT - 1
      g[row][x + dx] = 'k'
      g[row][x + dx + 1] = hoof ? 'n' : 'w'
      g[row][x + dx + 2] = 'k'
    }
    // the leg joins the belly
    g[11][x + 1] = g[11][x + 1] === 'p' ? 'p' : 'g'
  })
}

/**
 * @param {number[]} kick
 * @param {boolean} excited
 * @returns {string[]}
 */
function cow(kick, excited = false) {
  const g = [...body.map((row) => [...row]), ...Array.from({ length: HEIGHT - body.length }, () => Array(WIDTH).fill('.'))]
  paintLegs(g, kick)
  if (excited) {
    for (const [x, y, line] of excitedHead) {
      for (let dx = 0; dx < line.length; dx++) if (line[dx] !== '.') g[y][x + dx] = line[dx]
    }
  }
  return g.map((row) => row.join(''))
}

/** Frames 0-3: legs kicking as it floats up (back pair and front pair swing in turn). */
export const floatFrames = [cow([0, 0, 0, 0]), cow([-1, 1, -1, 1]), cow([0, 0, 0, 0]), cow([1, -1, 1, -1])]

/** Frames 4-5: excited, mouth open, legs splayed one way then the other. */
export const mooFrames = [cow([-1, -1, 1, 1], true), cow([1, 1, -1, -1], true)]

/** Where the head is, in sprite pixels from the top left (for placing the bubble). */
export const HEAD = { x: 20, y: 4 }

const MOO = 'MOO!'
const BUBBLE_BODY = 5 + 4
export const BUBBLE_WIDTH = textWidth(MOO) + 6
export const BUBBLE_HEIGHT = BUBBLE_BODY + 3

/**
 * A speech bubble saying "MOO!" with its tail at the bottom, near the given side,
 * pointing down and outwards (towards the cow's head).
 * @param {'left' | 'right'} side
 * @returns {string[]}
 */
function bubble(side) {
  const w = BUBBLE_WIDTH
  const g = Array.from({ length: BUBBLE_HEIGHT }, () => Array(w).fill('.'))
  const last = BUBBLE_BODY - 1
  for (let y = 0; y < BUBBLE_BODY; y++) {
    for (let x = 0; x < w; x++) {
      const outerCorner = (y === 0 || y === last) && (x === 0 || x === w - 1)
      const innerCorner = (y === 1 || y === last - 1) && (x === 1 || x === w - 2)
      const edge = y === 0 || y === last || x === 0 || x === w - 1
      if (!outerCorner) g[y][x] = edge || innerCorner ? 'k' : 'w'
    }
  }
  stamp(g, MOO, 'k', 3, 2)
  // The tail, as [column from the near side, row, pixel], mirrored for the right.
  const tail = /** @type {[number, number, string][]} */ ([
    [4, last, 'w'],
    [5, last, 'w'],
    [3, last + 1, 'k'],
    [4, last + 1, 'w'],
    [5, last + 1, 'k'],
    [2, last + 2, 'k'],
    [3, last + 2, 'k'],
    [4, last + 2, 'k'],
    [1, last + 3, 'k'],
  ])
  for (const [x, y, px] of tail) g[y][side === 'left' ? x : w - 1 - x] = px
  return g.map((row) => row.join(''))
}

/** Bubble frames: 0 with its tail on the left (the bubble sits right of the head), 1 with it on the right. */
export const bubbleFrames = [bubble('left'), bubble('right')]

/** Grilled T-bone steaks for the explosion, 9x7: one and its mirror image. */
const steak = ['..kkkkkk.', '.kfbbbbDk', 'kDDdbDdDk', 'kDdDbDDdk', 'kdDDbdDDk', '.kDdbDdk.', '..kkkkk..']
export const steakFrames = [steak, steak.map((row) => [...row].reverse().join(''))]
