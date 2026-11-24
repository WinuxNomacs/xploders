import { Xploders } from '../src/index.js'

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
show.canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return
  const box = show.canvas.getBoundingClientRect()
  const t = types[selected]
  show.launchAt(e.clientX - box.left, e.clientY - box.top, t.type, t.init?.())
})
el('clear').addEventListener('click', () => show.clear())
el('burst').addEventListener('change', () => {
  const v = el('burst').value
  show.updateOptions({ burst: v === 'mix' ? ['peony', 'ring', 'willow', 'crackle', 'fireball'] : /** @type {any} */ (v) })
})
el('intensity').addEventListener('input', () => show.updateOptions({ intensity: Number(el('intensity').value) }))
el('debug').addEventListener('change', () => show.updateBoundaries({ debug: el('debug').checked }))

// Fireworks burst below the controls, not behind them (they take more room on a phone).
const controls = /** @type {HTMLElement} */ (document.querySelector('.controls'))
const keepBelowControls = () => show.updateBoundaries({ y: Math.round(controls.getBoundingClientRect().bottom) + 24 })
new ResizeObserver(keepBelowControls).observe(controls)
keepBelowControls()

// Exposed for the browser tests and for poking at in the console.
Object.assign(window, { show, Xploders })
