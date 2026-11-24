// Gives Node what sprite sheets and cached fireball sprites are built on, so
// drawing runs in unit tests instead of throwing (which the engine would catch
// and hide by removing the projectile).
import { fakeCanvas } from './helpers.js'

if (typeof globalThis.OffscreenCanvas !== 'function') {
  globalThis.OffscreenCanvas = /** @type {any} */ (
    class {
      /** @param {number} width @param {number} height */
      constructor(width, height) {
        const c = fakeCanvas(width, height)
        c.width = width
        c.height = height
        return c
      }
    }
  )
}

if (typeof globalThis.ImageData !== 'function') {
  globalThis.ImageData = /** @type {any} */ (
    class {
      /** @param {Uint8ClampedArray} data @param {number} width @param {number} height */
      constructor(data, width, height) {
        Object.assign(this, { data, width, height })
      }
    }
  )
}
