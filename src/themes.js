/**
 * Themes: each character class lists its art per theme name in `static themes`, for
 * example `Chicken.themes = { '64bit': {...}, retro: {...} }`. A new theme is a new
 * key there; a new character brings its own `themes`.
 *
 * @typedef {object} ThemeArt
 * @property {import('./sprite.js').Sprite} sprite the character's frames
 * @property {number} pixelSize how many retro pixels one of its sprite pixels is (1/3 for 64-bit art,
 *   which has three times the pixels), so `scale` gives the same size on screen in every theme
 */

/** The theme a show uses unless told otherwise. */
export const DEFAULT_THEME = '64bit'

/** The built-in themes, the default first. */
export const THEMES = ['64bit', 'retro']

/**
 * A character's art for a theme: the one asked for, else the default theme's, else any it has.
 * @template {ThemeArt} T
 * @param {Record<string, T>} themes
 * @param {string | undefined} name
 * @returns {T}
 */
export function pickTheme(themes, name) {
  const art = (name && themes[name]) || themes[DEFAULT_THEME] || Object.values(themes)[0]
  if (!art) throw new Error('xploders: a character has no art in any theme')
  return art
}
