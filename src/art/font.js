// A 5-row pixel font for lettering stamped into pixel art: just the characters the art uses.
// Glyphs are 3 wide, except M, which needs 5 to read as M.

/** @type {Record<string, string[]>} '#' is ink */
export const font = {
  J: ['..#', '..#', '..#', '#.#', '.##'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  '-': ['...', '...', '###', '...', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
}

/**
 * Stamps `text` into a grid of characters, one column of gap between characters.
 * @param {string[][]} grid changed in place
 * @param {string} text
 * @param {string} ink the palette character to stamp with
 * @param {number} x0 left column
 * @param {number} y0 top row
 */
export function stamp(grid, text, ink, x0, y0) {
  for (const ch of text) {
    const glyph = font[ch]
    if (!glyph) throw new Error(`xploders: no glyph for "${ch}"`)
    glyph.forEach((line, dy) => {
      for (let dx = 0; dx < line.length; dx++) if (line[dx] === '#') grid[y0 + dy][x0 + dx] = ink
    })
    x0 += glyph[0].length + 1
  }
}

/**
 * Width in pixels of `text` stamped with `stamp`.
 * @param {string} text
 */
export function textWidth(text) {
  return [...text].reduce((w, ch) => w + (font[ch]?.[0].length ?? 3) + 1, -1)
}
