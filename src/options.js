/**
 * Options, with fireworks-js names, shapes, defaults and units (per 1/60 s step).
 *
 * @typedef {{min: number, max: number}} MinMax
 * @typedef {'peony' | 'ring' | 'willow' | 'crackle' | 'fireball' | 'saturn' | 'shapes' | 'animals'} BurstStyle
 *
 * @typedef {object} Boundaries
 * @property {number} x left/right margin for rocket targets, px
 * @property {number} y top margin for rocket targets, px
 * @property {number | null} right right margin, px; null: twice `x`, as in fireworks-js (ours)
 * @property {number | null} bottom bottom margin, px; null: half the height, as in fireworks-js (ours)
 * @property {number} width set from the canvas size on resize
 * @property {number} height set from the canvas size on resize
 * @property {boolean} debug draw the target box
 *
 * @typedef {object} Mouse
 * @property {boolean} click while the pointer is held on the canvas, launch towards it
 * @property {boolean} move aim auto-launched rockets at the pointer
 * @property {number} max projectiles in flight while holding (all kinds, as in fireworks-js)
 * @property {string} projectile registered type the pointer launches (ours)
 *
 * @typedef {object} Options
 * @property {number} intensity auto-launch rate: a clock advancing intensity * pi per second
 * @property {MinMax} delay launch when that clock passes a random value in this range
 * @property {MinMax} rocketsPoint launch x, percent of width
 * @property {number} traceSpeed rocket start speed, px/step
 * @property {number} acceleration rocket speed multiplier per step
 * @property {number} traceLength rocket trail length, positions
 * @property {MinMax} hue hue per firework
 * @property {number} particles particles per explosion
 * @property {number} explosion particle trail length, positions
 * @property {number} friction particle speed multiplier per step
 * @property {number} gravity particle downward drift, px/step
 * @property {MinMax} decay particle alpha lost per step
 * @property {MinMax} brightness particle lightness, percent
 * @property {number} flickering percent of particles whose lightness flickers
 * @property {{trace: MinMax, explosion: MinMax}} lineWidth stroke widths
 * @property {CanvasLineCap} lineStyle line cap
 * @property {number} opacity trail fade per step (0-1)
 * @property {Boundaries} boundaries where rockets explode
 * @property {boolean} autoresize follow the canvas or container size
 * @property {BurstStyle | BurstStyle[]} burst burst style, or a list to pick from per firework
 * @property {number} maxParticles cap on live particles
 * @property {number} maxProjectiles cap on projectiles in flight
 * @property {Mouse} mouse pointer launch
 * @property {'auto' | 'always' | 'ignore'} reducedMotion calm the show when the visitor asks for reduced motion
 * @property {number} [seed] seed for a repeatable show
 */

/**
 * @template T
 * @typedef {{[K in keyof T]?: T[K] extends any[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K]}} DeepPartial
 */

/** @typedef {DeepPartial<Options>} XplodersOptions */

/** @returns {Options} */
export function defaultOptions() {
  return {
    intensity: 30,
    delay: { min: 30, max: 60 },
    rocketsPoint: { min: 50, max: 50 },
    traceSpeed: 10,
    acceleration: 1.05,
    traceLength: 3,
    hue: { min: 0, max: 360 },
    particles: 50,
    explosion: 5,
    friction: 0.95,
    gravity: 1.5,
    decay: { min: 0.015, max: 0.03 },
    brightness: { min: 50, max: 80 },
    flickering: 50,
    lineWidth: { trace: { min: 1, max: 2 }, explosion: { min: 1, max: 3 } },
    lineStyle: 'round',
    opacity: 0.5,
    boundaries: { x: 50, y: 50, right: null, bottom: null, width: 0, height: 0, debug: false },
    autoresize: true,
    burst: 'peony',
    maxParticles: 4000,
    maxProjectiles: 100,
    mouse: { click: false, move: false, max: 1, projectile: 'rocket' },
    reducedMotion: 'auto',
  }
}

/** Keys that would reach an object's prototype; options from untrusted JSON must not set them. */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** @param {unknown} v @returns {v is Record<string, any>} */
const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Merges `source` into `target` in place: nested objects merge, everything else
 * (arrays included) replaces. Undefined values are skipped, and so are
 * `__proto__`, `constructor` and `prototype` (no prototype pollution).
 * @template {Record<string, any>} T
 * @param {T} target
 * @param {Record<string, any>} source
 * @returns {T}
 */
export function deepMerge(target, source) {
  /** @type {Record<string, any>} */
  const t = target
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || UNSAFE_KEYS.has(key)) continue
    if (isPlainObject(value) && isPlainObject(t[key])) deepMerge(t[key], value)
    else t[key] = Array.isArray(value) ? [...value] : value
  }
  return target
}
