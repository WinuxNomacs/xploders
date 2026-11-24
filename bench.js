// The bench page: fixed, seeded scenes, each run for a few seconds, measuring
// how long the show's work takes per frame and how often frames arrive.
import { Xploders } from './xploders.mjs'

// `?quick` runs each scene briefly, for the browser tests; `?scene=4` runs only the fourth;
// `?trails=half` runs every scene with `trailResolution: 'half'`.
const params = new URLSearchParams(location.search)
const quick = params.has('quick')
const only = Number(params.get('scene')) || 0
const trailResolution = params.get('trails') === 'half' ? 'half' : 'full'
const WARMUP_STEPS = quick ? 5 : 60
const MEASURE_STEPS = quick ? 20 : 300 // 5 s at 60 steps a second

/**
 * Each scene sets the show up, then `every(step)` runs once per 1/60 s step, so the
 * scene is the same at any frame rate.
 * @type {{name: string, options: Record<string, any>, every?: (show: Xploders, step: number) => void}[]}
 */
const scenes = [
  { name: 'Idle sky (nothing launching)', options: { intensity: 0 } },
  { name: 'Fireworks show (intensity 80, mixed bursts)', options: { intensity: 80, burst: ['peony', 'ring', 'willow', 'crackle'] } },
  {
    name: 'Many sparks (about 2500)',
    options: { intensity: 0, particles: 120 },
    every: (show, step) => step % 20 === 0 && show.launch(8),
  },
  {
    name: 'Jug-o-BOOM fireballs (3 a second)',
    options: { intensity: 0 },
    every: (show, step) => step % 20 === 0 && show.launch('jug'),
  },
  {
    // aimed a fixed height above the bottom, so they explode within the scene in a tall window too
    name: 'Cows (2 a second, 250 px up)',
    options: { intensity: 0 },
    every: (show, step) => {
      if (step % 30 !== 0) return
      const { width, height } = show.currentOptions.boundaries
      show.launchAt(width * (0.15 + ((step / 30) % 8) * 0.1), Math.max(20, height - 250), 'cow')
    },
  },
  {
    name: 'Saturn, shapes and animals (6 a second)',
    options: { intensity: 0, burst: ['saturn', 'shapes', 'animals'] },
    every: (show, step) => step % 10 === 0 && show.launch(1),
  },
  {
    name: 'Chickens (3 a second)',
    options: { intensity: 0 },
    every: (show, step) => step % 20 === 0 && show.launch('chicken'),
  },
]

const sky = /** @type {HTMLElement} */ (document.getElementById('sky'))
const out = /** @type {HTMLElement} */ (document.getElementById('out'))
const status = /** @type {HTMLElement} */ (document.getElementById('status'))
const runButton = /** @type {HTMLButtonElement} */ (document.getElementById('run'))
const copyButton = /** @type {HTMLButtonElement} */ (document.getElementById('copy'))

/** @param {number[]} values @param {number} q 0 to 1 */
const quantile = (values, q) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

/**
 * Runs one scene and resolves with its measurements.
 * @param {(typeof scenes)[number]} scene
 */
function runScene(scene) {
  return new Promise((resolve) => {
    const show = new Xploders(sky, { seed: 1, ...scene.options, trailResolution })
    const engine = show.engine
    let step = 0
    /** @type {number[]} */
    const work = [] // ms of step + draw per frame
    /** @type {number[]} */
    const intervals = [] // ms between frames
    let frameWork = 0
    let lastFrame = 0
    let particles = 0

    const step0 = engine.step.bind(engine)
    engine.step = () => {
      const t = performance.now()
      scene.every?.(show, step)
      step0()
      step++
      frameWork += performance.now() - t
    }
    const draw0 = engine.draw.bind(engine)
    engine.draw = (/** @type {number} */ n) => {
      const t = performance.now()
      draw0(n)
      frameWork += performance.now() - t
    }

    const frame = (/** @type {number} */ now) => {
      if (step >= WARMUP_STEPS) {
        work.push(frameWork)
        if (lastFrame) intervals.push(now - lastFrame)
        particles = Math.max(particles, engine.particles.length)
      }
      frameWork = 0
      lastFrame = step >= WARMUP_STEPS ? now : 0
      if (step < WARMUP_STEPS + MEASURE_STEPS) {
        requestAnimationFrame(frame)
        return
      }
      show.stop(true)
      const avg = (/** @type {number[]} */ v) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)
      resolve({
        name: scene.name,
        work: avg(work),
        work95: quantile(work, 0.95),
        fps: 1000 / avg(intervals),
        slow: intervals.filter((ms) => ms > 1000 / 50).length,
        frames: intervals.length,
        particles,
      })
    }
    show.start()
    requestAnimationFrame(frame)
  })
}

/** @param {number} n @param {number} [digits] */
const fmt = (n, digits = 1) => n.toFixed(digits).padStart(6)

runButton.addEventListener('click', async () => {
  runButton.disabled = true
  copyButton.disabled = true
  out.textContent = ''
  const lines = [
    `xploders bench, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    `${navigator.userAgent}`,
    `window ${innerWidth}x${innerHeight}, devicePixelRatio ${devicePixelRatio}, trails ${trailResolution}`,
    '',
    'JS ms/frame (the browser may finish drawing later): avg, p95 | frames/s | frames slower than 20 ms | most particles | scene',
  ]
  for (const [i, scene] of scenes.entries()) {
    if (only && i + 1 !== only) continue
    status.textContent = `Running ${i + 1} of ${scenes.length}: ${scene.name}`
    const r = /** @type {any} */ (await runScene(scene))
    lines.push(`${fmt(r.work, 2)} ${fmt(r.work95, 2)} | ${fmt(r.fps)} | ${String(r.slow).padStart(4)} of ${r.frames} | ${String(r.particles).padStart(5)} | ${r.name}`)
    out.textContent = lines.join('\n')
  }
  status.textContent = 'Done.'
  runButton.disabled = false
  copyButton.disabled = false
})

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(out.textContent ?? '')
    status.textContent = 'Copied.'
  } catch {
    status.textContent = 'Copy failed: select the text and copy it by hand.'
  }
})

// For the browser tests.
Object.assign(window, { benchScenes: scenes })
