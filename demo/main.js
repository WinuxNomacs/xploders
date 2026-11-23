import { Xploders } from '../src/index.js'

const sky = /** @type {HTMLElement} */ (document.getElementById('sky'))
const show = new Xploders(sky).start()

/** @param {string} id */
const el = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))

el('auto').addEventListener('click', () => {
  const on = el('auto').getAttribute('aria-pressed') !== 'true'
  if (on) show.start()
  else show.waitStop()
  el('auto').setAttribute('aria-pressed', String(on))
  el('auto').textContent = `Auto: ${on ? 'on' : 'off'}`
})
el('fireworks').addEventListener('click', () => show.launch(5))
el('chicken').addEventListener('click', () => show.launch('chicken'))
el('clear').addEventListener('click', () => show.clear())
el('burst').addEventListener('change', () => {
  const v = el('burst').value
  show.updateOptions({ burst: v === 'mix' ? ['peony', 'ring', 'willow', 'crackle'] : /** @type {any} */ (v) })
})
el('intensity').addEventListener('input', () => show.updateOptions({ intensity: Number(el('intensity').value) }))
el('debug').addEventListener('change', () => show.updateBoundaries({ debug: el('debug').checked }))

// Exposed for the browser tests and for poking at in the console.
Object.assign(window, { show, Xploders })
