/**
 * Outlines for the `shapes` burst: each returns `n` points evenly spaced along
 * the outline, within radius 1 of the centre (canvas axes: y grows downwards).
 *
 * @typedef {[number, number]} Point
 * @typedef {{points: Point[], eyes?: Point[]}} Shape `eyes`: where a star's eyes go
 */

const TAU = Math.PI * 2

/**
 * Points along a path, evenly spaced by distance travelled.
 * @param {Point[]} path densely sampled
 * @param {number} n
 * @param {boolean} closed whether the path returns to its start
 * @returns {Point[]}
 */
export function alongPath(path, n, closed) {
  if (n <= 0 || path.length === 0) return []
  const pts = closed ? [...path, path[0]] : path
  const lengths = [0]
  for (let i = 1; i < pts.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  }
  const total = lengths.at(-1) ?? 0
  if (total === 0) return Array.from({ length: n }, () => [pts[0][0], pts[0][1]])
  /** @type {Point[]} */
  const out = []
  let j = 1
  for (let i = 0; i < n; i++) {
    // a closed path wraps, so its last point would sit on its first
    const d = (total * i) / (closed || n === 1 ? n : n - 1)
    while (j < pts.length - 1 && lengths[j] < d) j++
    const span = lengths[j] - lengths[j - 1] || 1
    const f = Math.min(1, Math.max(0, (d - lengths[j - 1]) / span))
    out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * f, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * f])
  }
  return out
}

/**
 * @param {Point[]} points
 * @param {number} angle radians, clockwise on the canvas
 * @returns {Point[]}
 */
function rotate(points, angle) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  return points.map(([x, y]) => [x * c - y * s, x * s + y * c])
}

/**
 * Scales points so the farthest is at radius 1.
 * @param {Point[]} points
 * @returns {Point[]}
 */
function fit(points) {
  const far = Math.max(...points.map(([x, y]) => Math.hypot(x, y))) || 1
  return points.map(([x, y]) => [x / far, y / far])
}

/**
 * A closed curve sampled from a function of t in [0, 1).
 * @param {(t: number) => Point} f
 * @param {number} [samples]
 */
function sample(f, samples = 240) {
  return Array.from({ length: samples }, (_, i) => f(i / samples))
}

/**
 * Splits `n` points between parts by weight, every point used.
 * @param {number} n
 * @param {number[]} weights
 */
function split(n, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  const counts = weights.map((w) => Math.floor((n * w) / total))
  for (let i = 0; counts.reduce((a, b) => a + b, 0) < n; i = (i + 1) % counts.length) counts[i]++
  return counts
}

/** @type {Record<string, (n: number, r: import('./random.js').Random) => Shape>} */
export const shapes = {
  /** A flattened circle at a random tilt. */
  ellipse: (n, r) => {
    const ratio = r.range(0.3, 0.9)
    return { points: rotate(alongPath(sample((t) => [Math.cos(TAU * t), Math.sin(TAU * t) * ratio]), n, true), r.range(0, Math.PI)) }
  },

  /** A triangle, square, pentagon or hexagon at a random rotation. */
  polygon: (n, r) => {
    const sides = r.int(3, 6)
    /** @type {Point[]} */
    const corners = Array.from({ length: sides }, (_, i) => [Math.cos((TAU * i) / sides), Math.sin((TAU * i) / sides)])
    return { points: rotate(alongPath(corners, n, true), r.range(0, TAU)) }
  },

  /** Two and a half turns, out from the middle. */
  spiral: (n, r) => {
    const turns = 2.5
    const path = /** @type {Point[]} */ (
      Array.from({ length: 400 }, (_, i) => {
        const t = i / 399
        return [t * Math.cos(TAU * turns * t), t * Math.sin(TAU * turns * t)]
      })
    )
    return { points: rotate(alongPath(path, n, false), r.range(0, TAU)) }
  },

  /** A round face, two eyes and a smile. */
  smiley: (n, r) => {
    const [face, left, right, smile] = split(n, [0.58, 0.07, 0.07, 0.28])
    const eye = (/** @type {number} */ cx, /** @type {number} */ k) =>
      alongPath(sample((t) => [cx + 0.09 * Math.cos(TAU * t), -0.3 + 0.09 * Math.sin(TAU * t)]), k, true)
    /** @type {Point[]} */
    const arc = Array.from({ length: 100 }, (_, i) => {
      const a = Math.PI * (0.2 + (0.6 * i) / 99) // below the centre: y grows downwards
      return [0.55 * Math.cos(a), 0.05 + 0.5 * Math.sin(a)]
    })
    const points = [
      ...alongPath(sample((t) => [Math.cos(TAU * t), Math.sin(TAU * t)]), face, true),
      ...eye(-0.35, left),
      ...eye(0.35, right),
      ...alongPath(arc, smile, false),
    ]
    return { points: rotate(points, r.range(-0.25, 0.25)) }
  },

  /** The classic heart curve, point down. */
  heart: (n, r) => {
    const path = sample((t) => {
      const a = TAU * t
      const x = 16 * Math.sin(a) ** 3
      const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))
      return [x, y - 2.5] // about centred
    })
    return { points: rotate(fit(alongPath(path, n, true)), r.range(-0.25, 0.25)) }
  },

  /** A five-pointed star, point up, with two eyes (each a small burst; see `bursts.shapes`). */
  star: (n, r) => {
    /** @type {Point[]} */
    const corners = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (Math.PI * i) / 5
      const radius = i % 2 === 0 ? 1 : 0.42
      return [radius * Math.cos(a), radius * Math.sin(a)]
    })
    const tilt = r.range(-0.2, 0.2)
    return {
      points: rotate(alongPath(corners, n, true), tilt),
      eyes: rotate(
        [
          [-0.15, -0.06],
          [0.15, -0.06],
        ],
        tilt,
      ),
    }
  },
}
