/**
 * Tracks the pointer over the canvas for the fireworks-js `mouse` options.
 * Listens on the canvas only, so a click-through overlay keeps page controls
 * usable. Fixes over fireworks-js: position from getBoundingClientRect (right
 * for nested, scrolled or CSS-scaled canvases) and pointer capture, so a
 * release outside the canvas still ends the hold.
 */
export class Pointer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./options.js').Options} options live options
   * @param {() => {width: number, height: number}} size the drawing size in CSS px
   * @param {() => void} onPress called when a hold starts with `click` on
   */
  constructor(canvas, options, size, onPress) {
    this.canvas = canvas
    this.options = options
    this.size = size
    this.onPress = onPress
    this.x = 0
    this.y = 0
    /** whether a position has been seen since the pointer entered */
    this.known = false
    /** held down with `click` on */
    this.active = false
    /** @type {string | null} the canvas's own touch-action, kept while we override it */
    this.savedTouchAction = null
    this.down = this.down.bind(this)
    this.up = this.up.bind(this)
    this.move = this.move.bind(this)
    this.leave = this.leave.bind(this)
    canvas.addEventListener('pointerdown', this.down)
    canvas.addEventListener('pointerup', this.up)
    canvas.addEventListener('pointercancel', this.up)
    canvas.addEventListener('pointermove', this.move)
    canvas.addEventListener('pointerleave', this.leave)
    this.sync()
  }

  /** Applies option changes: `touch-action: none` only while `click` is on, so dragging doesn't scroll. */
  sync() {
    const style = this.canvas.style
    if (this.options.mouse.click && this.savedTouchAction === null) {
      this.savedTouchAction = style.touchAction ?? ''
      style.touchAction = 'none'
    } else if (!this.options.mouse.click && this.savedTouchAction !== null) {
      style.touchAction = this.savedTouchAction
      this.savedTouchAction = null
    }
    if (!this.options.mouse.click) this.active = false
  }

  /** @param {PointerEvent} e */
  locate(e) {
    const rect = this.canvas.getBoundingClientRect()
    const { width, height } = this.size()
    this.x = rect.width ? ((e.clientX - rect.left) * width) / rect.width : 0
    this.y = rect.height ? ((e.clientY - rect.top) * height) / rect.height : 0
    this.known = true
  }

  /** @param {PointerEvent} e */
  down(e) {
    const { click, move } = this.options.mouse
    if (!click && !move) return
    this.locate(e)
    if (!click) return
    this.active = true
    try {
      this.canvas.setPointerCapture?.(e.pointerId)
    } catch {
      // Unsupported or the pointer is gone: release still arrives as pointerup/cancel/leave.
    }
    this.onPress()
  }

  /** @param {PointerEvent} e */
  up(e) {
    if (this.active || this.options.mouse.move) this.locate(e)
    this.active = false
  }

  /** @param {PointerEvent} e */
  move(e) {
    if (this.options.mouse.click || this.options.mouse.move) this.locate(e)
  }

  /** @param {PointerEvent} e */
  leave(e) {
    // With capture, leave only fires after release; without it, leaving ends the hold.
    if (!this.canvas.hasPointerCapture?.(e.pointerId)) this.active = false
    this.known = false
  }

  /** @returns {{x: number, y: number} | null} where pointer-aware launches should aim */
  target() {
    const { move } = this.options.mouse
    return this.active || (move && this.known) ? { x: this.x, y: this.y } : null
  }

  dispose() {
    const c = this.canvas
    c.removeEventListener('pointerdown', this.down)
    c.removeEventListener('pointerup', this.up)
    c.removeEventListener('pointercancel', this.up)
    c.removeEventListener('pointermove', this.move)
    c.removeEventListener('pointerleave', this.leave)
    if (this.savedTouchAction !== null) c.style.touchAction = this.savedTouchAction
    this.savedTouchAction = null
    this.active = false
  }
}
