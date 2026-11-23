/**
 * Frame-based animation over a horizontal sprite sheet. Any image (or canvas)
 * works, so users can supply their own art. Filled in by phase 3.
 */
export class Sprite {
  /**
   * @param {CanvasImageSource} image
   * @param {object} opts
   * @param {number} opts.frameWidth
   * @param {number} opts.frameHeight
   * @param {number} opts.frames number of frames in the sheet
   * @param {number} [opts.fps]
   */
  constructor(image, { frameWidth, frameHeight, frames, fps = 8 }) {
    this.image = image
    this.frameWidth = frameWidth
    this.frameHeight = frameHeight
    this.frames = frames
    this.fps = fps
  }

  /**
   * @param {number} time seconds since the animation started
   * @returns {number} the frame index to show
   */
  frameAt(time) {
    return Math.floor(time * this.fps) % this.frames
  }
}
