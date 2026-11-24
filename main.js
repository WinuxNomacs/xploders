import { Xploders } from './xploders.mjs'

const sky = /** @type {HTMLElement} */ (document.getElementById('sky'))
const show = new Xploders(sky, { intensity: 15 }).start()

/** @param {string} id */
const el = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))

el('auto').addEventListener('click', () => {
  const on = el('auto').getAttribute('aria-pressed') !== 'true'
  if (on) show.start()
  else show.waitStop()
  el('auto').setAttribute('aria-pressed', String(on))
  el('auto').textContent = `Auto: ${on ? 'on' : 'off'}`
})

// Each launch button launches and selects its type; a click on the sky fires one of the selected type there.
/** @type {Record<string, {type: string, init?: () => object, count: number}>} */
const types = {
  fireworks: { type: 'rocket', count: 5 },
  chicken: { type: 'chicken', init: () => ({ flight: el('flight').value }), count: 1 },
  jug: { type: 'jug', count: 1 },
  cow: { type: 'cow', count: 1 },
}
let selected = 'fireworks'
const select = (/** @type {string} */ id) => {
  selected = id
  for (const other of Object.keys(types)) el(other).setAttribute('aria-pressed', String(other === id))
}
for (const [id, t] of Object.entries(types)) {
  el(id).addEventListener('click', () => {
    select(id)
    show.launch(t.type, t.count, t.init?.())
  })
}
select(selected)
/** @param {PointerEvent} e @returns {{x: number, y: number}} CSS px from the canvas's top left */
const at = (e) => {
  const box = show.canvas.getBoundingClientRect()
  return { x: e.clientX - box.left, y: e.clientY - box.top }
}
show.canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return
  const { x, y } = at(e)
  if (startDrag(e, x, y)) return // a press on the boundaries box's edge resizes it instead
  const t = types[selected]
  show.launchAt(x, y, t.type, t.init?.())
})
el('clear').addEventListener('click', () => show.clear())
el('burst').addEventListener('change', () => {
  const v = el('burst').value
  show.updateOptions({ burst: v === 'mix' ? ['peony', 'ring', 'willow', 'crackle', 'fireball', 'saturn', 'shapes', 'animals'] : /** @type {any} */ (v) })
})
el('halfres').addEventListener('change', () => show.updateOptions({ trailResolution: el('halfres').checked ? 'half' : 'full' }))
el('intensity').addEventListener('input', () => show.updateOptions({ intensity: Number(el('intensity').value) }))

// The boundaries editor: with Boundaries checked, sliders for the box's margins and
// drag handles on its edges and corners.
/** @typedef {'left' | 'right' | 'top' | 'bottom'} Edge */
const EDGES = /** @type {Edge[]} */ (['left', 'right', 'top', 'bottom'])
const MIN_BOX = 20
const bounds = /** @type {HTMLElement} */ (document.querySelector('.bounds'))
/** set once the top is moved by hand; from then on it no longer follows the controls panel */
let topByHand = false

const skySize = () => {
  const b = show.currentOptions.boundaries
  return { w: b.width, h: b.height }
}

/** @returns {Record<Edge, number>} the box's margins from each canvas edge, px */
const margins = () => {
  const a = show.targetArea
  const { w, h } = skySize()
  return { left: a.left, right: w - a.right, top: a.top, bottom: h - a.bottom }
}

/**
 * Moves edges of the box, keeping it at least MIN_BOX px across. Sets all four
 * margins, so the right and bottom stop following the left and the height.
 * @param {Partial<Record<Edge, number>>} change
 */
const setMargins = (change) => {
  const m = { ...margins(), ...change }
  const { w, h } = skySize()
  const clamp = (/** @type {number} */ v, /** @type {number} */ max) => Math.round(Math.min(Math.max(v, 0), Math.max(0, max)))
  if ('left' in change) m.left = clamp(m.left, w - m.right - MIN_BOX)
  if ('right' in change) m.right = clamp(m.right, w - m.left - MIN_BOX)
  if ('top' in change) m.top = clamp(m.top, h - m.bottom - MIN_BOX)
  if ('bottom' in change) m.bottom = clamp(m.bottom, h - m.top - MIN_BOX)
  if ('top' in change) topByHand = true
  show.updateBoundaries({ x: m.left, right: m.right, y: m.top, bottom: m.bottom })
  syncSliders()
}

const syncSliders = () => {
  if (bounds.hidden) return
  const { w, h } = skySize()
  const m = margins()
  for (const edge of EDGES) {
    const input = el(`b-${edge}`)
    input.max = String(Math.round(edge === 'left' || edge === 'right' ? w : h))
    input.value = String(Math.round(m[edge]))
    el(`b-${edge}-value`).textContent = `${Math.round(m[edge])}`
  }
}

for (const edge of EDGES) {
  el(`b-${edge}`).addEventListener('input', () => setMargins({ [edge]: Number(el(`b-${edge}`).value) }))
}

el('debug').addEventListener('change', () => {
  const on = el('debug').checked
  show.updateBoundaries({ debug: on })
  bounds.hidden = !on
  show.canvas.style.touchAction = on ? 'none' : '' // so dragging a handle on a phone doesn't scroll
  if (!on) show.canvas.style.cursor = ''
  syncSliders()
})

/**
 * The edges of the box within reach of (x, y): at most one side and one of top or bottom.
 * @param {number} x
 * @param {number} y
 * @param {number} reach px
 * @returns {Edge[]}
 */
const edgesAt = (x, y, reach) => {
  const a = show.targetArea
  const withinY = y >= a.top - reach && y <= a.bottom + reach
  const withinX = x >= a.left - reach && x <= a.right + reach
  /** @type {Edge[]} */
  const grabbed = []
  const nearest = (/** @type {[Edge, number][]} */ options) => {
    const close = options.filter(([, d]) => d <= reach).sort((p, q) => p[1] - q[1])
    if (close.length) grabbed.push(close[0][0])
  }
  if (withinY) nearest([['left', Math.abs(x - a.left)], ['right', Math.abs(x - a.right)]])
  if (withinX) nearest([['top', Math.abs(y - a.top)], ['bottom', Math.abs(y - a.bottom)]])
  return grabbed
}

/** @param {Edge[]} edges */
const cursorFor = (edges) => {
  if (edges.length === 2) return (edges[0] === 'left') === (edges[1] === 'top') ? 'nwse-resize' : 'nesw-resize'
  if (edges.length === 1) return edges[0] === 'left' || edges[0] === 'right' ? 'ew-resize' : 'ns-resize'
  return ''
}

/** @type {{edges: Edge[], pointer: number} | null} */
let drag = null
const reachFor = (/** @type {PointerEvent} */ e) => (e.pointerType === 'touch' ? 16 : 8)

/**
 * Starts dragging the box's edges if Boundaries is checked and the press is on one.
 * @param {PointerEvent} e
 * @param {number} x
 * @param {number} y
 */
function startDrag(e, x, y) {
  if (!el('debug').checked) return false
  const edges = edgesAt(x, y, reachFor(e))
  if (!edges.length) return false
  drag = { edges, pointer: e.pointerId }
  show.canvas.setPointerCapture(e.pointerId)
  return true
}

show.canvas.addEventListener('pointermove', (e) => {
  const { x, y } = at(e)
  if (drag && e.pointerId === drag.pointer) {
    const { w, h } = skySize()
    const to = { left: x, right: w - x, top: y, bottom: h - y }
    setMargins(Object.fromEntries(drag.edges.map((edge) => [edge, to[edge]])))
  } else if (el('debug').checked) {
    show.canvas.style.cursor = cursorFor(edgesAt(x, y, reachFor(e)))
  }
})
const endDrag = (/** @type {PointerEvent} */ e) => {
  if (drag && e.pointerId === drag.pointer) drag = null
}
show.canvas.addEventListener('pointerup', endDrag)
show.canvas.addEventListener('pointercancel', endDrag)

// Fireworks burst below the controls, not behind them (they take more room on a phone),
// until the top is set by hand.
const controls = /** @type {HTMLElement} */ (document.querySelector('.controls'))
const keepBelowControls = () => {
  if (!topByHand) show.updateBoundaries({ y: Math.round(controls.getBoundingClientRect().bottom) + 24 })
  syncSliders()
}
new ResizeObserver(keepBelowControls).observe(controls)
new ResizeObserver(syncSliders).observe(sky)
keepBelowControls()

// Exposed for the browser tests and for poking at in the console.
Object.assign(window, { show, Xploders })
