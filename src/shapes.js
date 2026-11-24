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

/**
 * @typedef {{points: Point[], closed?: boolean}} Stroke one path of a drawing; open unless `closed`
 */

/**
 * Length of a path.
 * @param {Point[]} points
 * @param {boolean} closed
 */
function pathLength(points, closed) {
  let total = 0
  const pts = closed ? [...points, points[0]] : points
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return total
}

/**
 * Centres points on their bounding box and scales the farthest to radius 1.
 * @param {Point[]} points
 * @returns {Point[]}
 */
function centreAndFit(points) {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return fit(points.map(([x, y]) => [x - cx, y - cy]))
}

/**
 * `n` points spread over a drawing's strokes by their lengths, centred and fitted to radius 1.
 * @param {Stroke[]} strokes
 * @param {number} n
 * @returns {Point[]}
 */
export function drawing(strokes, n) {
  const counts = split(
    n,
    strokes.map((st) => pathLength(st.points, st.closed ?? false)),
  )
  return centreAndFit(strokes.flatMap((st, i) => alongPath(st.points, counts[i], st.closed ?? false)))
}

/**
 * Points round an ellipse, for eyes, heads and bodies in the drawings.
 * @param {number} cx
 * @param {number} cy
 * @param {number} rx
 * @param {number} [ry]
 * @returns {Stroke}
 */
function oval(cx, cy, rx, ry = rx) {
  return { points: sample((t) => [cx + rx * Math.cos(TAU * t), cy + ry * Math.sin(TAU * t)], 48), closed: true }
}

/** Where the snake's body ends, so its head and tongue sit there. */
const SNAKE_HEAD_Y = 55 + 14 * Math.sin(84 / 11)

/**
 * Side views facing right, drawn on a 100 x 100 grid (y down). Each is a few
 * strokes: closed silhouettes and open lines (tails, legs, a trunk).
 * @type {Record<string, Stroke[]>}
 */
export const animals = {
  elephant: [
    {
      closed: true,
      points: [
        [14, 44], [20, 32], [32, 25], [48, 22], [62, 24], [70, 19], [80, 20], [87, 27], [89, 38], [90, 52],
        [93, 66], [97, 74], [92, 77], [86, 68], [83, 55], [80, 46], [76, 52], [75, 85], [64, 85], [63, 64],
        [50, 66], [38, 66], [36, 85], [25, 85], [24, 64], [17, 58],
      ],
    },
    { closed: true, points: [[60, 30], [70, 28], [73, 40], [66, 52], [58, 44]] }, // ear
    { points: [[15, 46], [10, 56], [9, 62]] }, // tail
    oval(82, 30, 1.5),
  ],
  giraffe: [
    {
      closed: true,
      points: [
        [18, 52], [24, 47], [48, 45], [56, 40], [60, 28], [64, 16], [65, 6], [68, 9], [70, 5], [72, 10], [80, 11],
        [86, 15], [83, 19], [74, 19], [70, 26], [66, 38], [63, 50], [63, 60], [62, 96], [58, 96], [57, 64], [52, 64],
        [51, 96], [47, 96], [46, 64], [33, 64], [32, 96], [28, 96], [27, 64], [24, 64], [23, 96], [19, 96], [18, 62],
      ],
    },
    { points: [[18, 53], [12, 62], [11, 70]] }, // tail
    { points: [[30, 52], [36, 51]] }, // spots
    { points: [[42, 56], [48, 55]] },
    { points: [[58, 34], [61, 33]] },
    oval(76, 14, 1.2),
  ],
  lion: [
    {
      // body, from behind the mane round to its front
      points: [
        [56, 32], [30, 34], [18, 38], [14, 50], [17, 62], [18, 86], [26, 86], [28, 68], [46, 68], [48, 86],
        [56, 86], [58, 62],
      ],
    },
    { closed: true, points: sample((t) => [70 + (17 + 2.5 * Math.sin(TAU * 9 * t)) * Math.cos(TAU * t), 40 + (17 + 2.5 * Math.sin(TAU * 9 * t)) * Math.sin(TAU * t)], 120) }, // mane
    oval(72, 41, 9, 10), // face
    oval(75, 37, 1.3),
    { points: [[15, 44], [8, 36], [6, 26]] }, // tail
    oval(6, 24, 2.5), // its tuft
  ],
  monkey: [
    oval(62, 26, 12), // head
    oval(51, 22, 4), // ear
    oval(70, 30, 6, 5), // muzzle
    oval(65, 22, 1.3),
    oval(50, 56, 15, 19), // body
    { points: [[60, 46], [72, 58], [78, 68]] }, // arm
    { points: [[44, 72], [40, 90], [50, 92]] }, // leg
    {
      // the curly tail, from its back
      points: [
        [36, 64], [28, 71], [20, 71], [14, 65], [14, 57], [19, 52], [25, 55], [24, 61], [19, 61],
      ],
    },
  ],
  penguin: [
    {
      closed: true,
      points: [
        [50, 8], [58, 11], [62, 16], [72, 19], [62, 23], [64, 40], [66, 60], [62, 80], [70, 88], [54, 88],
        [44, 86], [34, 88], [38, 70], [38, 50], [40, 30], [44, 14],
      ],
    },
    { points: [[46, 34], [36, 56], [41, 60]] }, // flipper
    { points: [[52, 30], [56, 50], [56, 78]] }, // belly line
    oval(56, 16, 1.5),
  ],
  flamingo: [
    oval(38, 42, 18, 10), // body
    {
      // neck and head
      points: [
        [53, 37], [60, 28], [59, 18], [53, 11], [56, 4], [64, 3], [69, 8], [74, 11], [75, 17], [71, 14], [66, 12],
      ],
    },
    { points: [[22, 40], [12, 36], [16, 44]] }, // tail feathers
    { points: [[40, 52], [40, 96], [48, 96]] }, // the leg it stands on
    { points: [[44, 52], [52, 64], [42, 68]] }, // the tucked-up leg
    oval(64, 7, 1.2),
  ],
  snake: [
    {
      closed: true,
      points: [
        ...Array.from({ length: 50 }, (_, i) => {
          const x = 4 + i * 1.6
          const w = 5 * Math.min(1, i / 15)
          return /** @type {Point} */ ([x, 55 + 14 * Math.sin(x / 11) - w])
        }),
        ...Array.from({ length: 50 }, (_, j) => {
          const i = 49 - j
          const x = 4 + i * 1.6
          const w = 5 * Math.min(1, i / 15)
          return /** @type {Point} */ ([x, 55 + 14 * Math.sin(x / 11) + w])
        }),
      ],
    },
    oval(86, SNAKE_HEAD_Y, 7, 5), // head
    { points: [[93, SNAKE_HEAD_Y], [98, SNAKE_HEAD_Y], [101, SNAKE_HEAD_Y - 3]] }, // forked tongue
    { points: [[98, SNAKE_HEAD_Y], [101, SNAKE_HEAD_Y + 3]] },
    oval(88, SNAKE_HEAD_Y - 2, 1.2),
  ],
  turtle: [
    {
      closed: true,
      points: [
        ...Array.from({ length: 40 }, (_, i) => {
          const a = Math.PI * (1 - i / 39)
          return /** @type {Point} */ ([50 + 30 * Math.cos(a), 56 - 26 * Math.sin(a)])
        }),
      ],
    },
    { points: [[26, 46], [50, 42], [74, 46]] }, // the shell's pattern
    { points: [[50, 30], [50, 42]] },
    { points: [[78, 52], [86, 48]] }, // neck
    oval(90, 46, 6, 5), // head
    oval(92, 44, 1.1),
    { points: [[30, 56], [28, 66], [36, 66], [37, 56]] }, // legs
    { points: [[62, 56], [62, 66], [70, 66], [70, 56]] },
    { points: [[20, 54], [14, 58]] }, // tail
  ],
}
