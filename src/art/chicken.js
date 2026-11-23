// Original pixel art for xploders: a white hen facing right, 16x16 per frame.
// Each frame is the body with an overlay on top; in an overlay '.' keeps the
// pixel beneath and ' ' (space) erases it.

/** @type {Record<string, string | null>} */
export const palette = {
  '.': null,
  k: '#2b1e24', // outline
  w: '#ffffff', // feathers
  g: '#c8c6d8', // shade
  s: '#8f8ca8', // deep shade
  r: '#e8323a', // comb and wattle
  y: '#f7b02f', // beak and feet
  o: '#c86f14', // beak and feet shade
}

const body = [
  '................',
  '..........r.r...',
  '.........krrrk..',
  '........kwwwwwk.',
  '........kwwwkwyy',
  '........kwwwwwko',
  '.kk.....kwwwwrk.',
  'kwwk....kwwwwrk.',
  'kwgwk..kwwwwwk..',
  'kwggwkkwwwwwwk..',
  '.kwgwwwwwwwwwk..',
  '.kwggwwwwwwwgk..',
  '..kgggwwwwwggk..',
  '...kkgggggggk...',
  '.....kykkyk.....',
  '.....yo..yo.....',
]

const wingMid = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....kkkkk.......',
  '...kwwwwgk......',
  '...kwwwggk......',
  '....kgggk.......',
  '.....kkk........',
  '................',
  '................',
]

const wingUp = [
  '................',
  '................',
  '...k.k.k........',
  '..kwkwkwk.......',
  '..kwwwwgk.......',
  '...kwwggk.......',
  '...kwggsk.......',
  '....kgssk.......',
  '....kssk........',
  '.....kk.........',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]

const wingDown = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '....kkkkkk......',
  '....kwwwwgk.....',
  '.....kwggsk.....',
  '......kgsk......',
  '.......kk.......',
  '................',
]

// Panic: eye wide, beak open, comb and feathers ruffled, wings flung up.
const panicFace = [
  '.........r.r.r..',
  '................',
  '................',
  '................',
  '...........kk.yy',
  '...........kk..y',
  '..............yo',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
]

const ruffle = [
  '................',
  '................',
  '..............w.',
  '................',
  '................',
  '................',
  'w...............',
  '................',
  '................',
  '................',
  '...............w',
  '................',
  '................',
  '..............w.',
  '................',
  '................',
]

/**
 * @param {string[]} base
 * @param {string[][]} overlays
 */
export function compose(base, ...overlays) {
  return base.map((row, y) =>
    [...row]
      .map((ch, x) => {
        let out = ch
        for (const o of overlays) {
          const c = o[y][x]
          if (c === ' ') out = '.'
          else if (c !== '.') out = c
        }
        return out
      })
      .join(''),
  )
}

/** Flap cycle: up, mid, down, mid. */
export const flapFrames = [compose(body, wingUp), compose(body, wingMid), compose(body, wingDown), compose(body, wingMid)]

/** Panic: wings up and down at speed, wild-eyed. */
export const panicFrames = [compose(body, wingUp, panicFace, ruffle), compose(body, wingDown, panicFace)]
