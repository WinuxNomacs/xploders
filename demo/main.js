import { Xploders } from '../src/index.js'

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('sky'))
const show = new Xploders(canvas).start()

addEventListener('resize', () => show.resize())

/** @param {string} id @param {() => void} fn */
const on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn)
on('fireworks', () => show.launch('rocket', 5))
on('chicken', () => show.launch('chicken'))
on('clear', () => show.clear())

// Exposed for the browser tests and for poking at in the console.
Object.assign(window, { show })
