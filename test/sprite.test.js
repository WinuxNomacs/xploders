import { describe, it, expect } from 'vitest'
import { parsePixels, Sprite } from '../src/sprite.js'
import { palette, flapFrames, panicFrames, compose } from '../src/art/chicken.js'

describe('parsePixels', () => {
  it('lays frames side by side as RGBA, with null palette entries transparent', () => {
    const sheet = parsePixels([['ab', '.a'], ['..', 'bb']], { '.': null, a: '#f00', b: '#0000ff' })
    expect(sheet).toMatchObject({ frameWidth: 2, frameHeight: 2, frames: 2 })
    const px = (x, y) => [...sheet.data.slice((y * 4 + x) * 4, (y * 4 + x) * 4 + 4)]
    expect(px(0, 0)).toEqual([255, 0, 0, 255])
    expect(px(1, 0)).toEqual([0, 0, 255, 255])
    expect(px(0, 1)).toEqual([0, 0, 0, 0])
    expect(px(3, 1)).toEqual([0, 0, 255, 255])
  })

  it('rejects ragged rows, a frame of another height and unknown characters', () => {
    const pal = { '.': null, a: '#fff' }
    expect(() => parsePixels([['aa', 'a']], pal)).toThrow(/row 1 is 1 wide, expected 2/)
    expect(() => parsePixels([['aa', 'aa'], ['aa']], pal)).toThrow(/frame 1 has 1 rows, expected 2/)
    expect(() => parsePixels([['ax']], pal)).toThrow(/uses "x", which is not in the palette/)
    expect(() => parsePixels([['a']], { a: 'red' })).toThrow(/not #rgb or #rrggbb/)
  })
})

describe('chicken art', () => {
  it('has four 16x16 flap frames and two panic frames using only its palette', () => {
    const sheet = parsePixels([...flapFrames, ...panicFrames], palette)
    expect(sheet).toMatchObject({ frameWidth: 16, frameHeight: 16, frames: 6 })
  })

  it('composes overlays: "." keeps the pixel beneath, a space erases it', () => {
    expect(compose(['ab'], ['.c'], [' .'])).toEqual(['.c'])
  })

  it('builds its sheet lazily, so it can be created without a canvas', () => {
    const s = Sprite.fromPixels([['a']], { a: '#fff' })
    expect(s.image).toBeNull()
    expect(s.frameAt(0.26)).toBe(0)
  })
})

describe('Sprite smoothing', () => {
  /** @param {number} a the context's scale (its devicePixelRatio) */
  function ctxAt(a) {
    const ctx = { getTransform: () => ({ a }), save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage() {}, globalAlpha: 1, imageSmoothingEnabled: true }
    return /** @type {any} */ (ctx)
  }
  const sprite = Sprite.fromPixels([['k']], { k: '#000000' })

  it('keeps pixels crisp at one screen pixel per pixel or more, and smooths art shrunk below that', () => {
    const cases = [
      [1, 1, false], // a 64-bit chicken on a DPR 1 screen
      [2 / 3, 1.5, false], // a 64-bit jug at DPR 1.5: exactly one screen pixel
      [2 / 3, 1, true], // the same jug at DPR 1: shrunk
      [3, 1, false], // retro art
    ]
    for (const [scale, dpr, smooth] of cases) {
      const ctx = ctxAt(dpr)
      sprite.draw(ctx, 0, 0, 0, { scale })
      expect(ctx.imageSmoothingEnabled).toBe(smooth)
    }
  })
})
