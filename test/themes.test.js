import { describe, it, expect, vi, afterEach } from 'vitest'
import { Xploders, Chicken, Jug, Cow, Feather, pickTheme, DEFAULT_THEME } from '../src/index.js'
import { defaultOptions } from '../src/options.js'
import { parsePixels } from '../src/sprite.js'
import * as hen64 from '../src/art/chicken64.js'
import * as jug64 from '../src/art/jug64.js'
import * as cow64 from '../src/art/cow64.js'
import { Milk } from '../src/milk.js'
import { Shard } from '../src/shard.js'
import { fakeCanvas, fakeScheduler } from './helpers.js'

afterEach(() => vi.restoreAllMocks())

/** @param {Record<string, any>} [options] */
function show(options = {}) {
  return new Xploders(/** @type {any} */ (fakeCanvas()), { seed: 2, intensity: 0, ...options }, fakeScheduler())
}

describe('Picking a theme', () => {
  const art = (/** @type {string} */ name) => /** @type {any} */ ({ name })
  it('takes the theme asked for, else the default, else any the character has', () => {
    expect(pickTheme({ retro: art('retro'), '64bit': art('64bit') }, 'retro').name).toBe('retro')
    expect(pickTheme({ retro: art('retro'), '64bit': art('64bit') }, 'neon').name).toBe('64bit')
    expect(pickTheme({ retro: art('retro') }, '64bit').name).toBe('retro')
    expect(pickTheme({ retro: art('retro') }, undefined).name).toBe('retro')
    expect(() => pickTheme({}, 'retro')).toThrow(/no art/)
  })

  it("defaults to the 64-bit theme and lists the built-in ones", () => {
    expect(DEFAULT_THEME).toBe('64bit')
    expect(defaultOptions().theme).toBe('64bit')
    expect(Xploders.themes).toEqual(['64bit', 'retro'])
  })
})

describe('Themes in a show', () => {
  it("uses the show's theme, a launch's own theme over it, and follows updateOptions for new launches", () => {
    const s = show()
    s.launch('chicken')
    s.launch('chicken', 1, { theme: 'retro' })
    s.updateOptions({ theme: 'retro' })
    s.launch('chicken')
    s.launch('chicken', 1, { theme: '64bit' })
    const arts = s.engine.projectiles.map((p) => /** @type {any} */ (p).art)
    expect(arts).toEqual([Chicken.themes['64bit'], Chicken.themes.retro, Chicken.themes.retro, Chicken.themes['64bit']])
  })

  it('falls back to the default theme for an unknown name, and to whatever a character has without that', () => {
    const s = show({ theme: 'neon' })
    s.launch('chicken')
    s.launch('jug')
    s.launch('cow')
    const [hen, jug, cow] = s.engine.projectiles.map((p) => /** @type {any} */ (p).art)
    expect(hen).toBe(Chicken.themes['64bit'])
    expect(jug).toBe(Jug.themes['64bit'])
    expect(cow).toBe(Cow.themes['64bit'])
    // a character with only one theme's art draws that in every theme
    class Box extends Chicken {
      static themes = { retro: Chicken.themes.retro }
    }
    Xploders.register('box', Box)
    s.launch('box')
    expect(/** @type {any} */ (s.engine.projectiles.at(-1)).art).toBe(Chicken.themes.retro)
  })

  it('draws the chicken the same size on screen in both themes', () => {
    for (const theme of ['64bit', 'retro']) {
      const art = Chicken.themes[theme]
      expect(art.sprite.frameWidth * art.pixelSize).toBe(16)
      expect(art.sprite.frameHeight * art.pixelSize).toBe(16)
      const s = show({ theme })
      s.launch('chicken', 1, { scale: 3 })
      const hen = /** @type {any} */ (s.engine.projectiles[0])
      const draw = vi.spyOn(art.sprite, 'draw').mockImplementation(() => {})
      hen.draw(fakeCanvas().ctx)
      expect(draw.mock.calls[0][4].scale * art.sprite.frameWidth).toBeCloseTo(48)
    }
  })

  it("gives a 64-bit chicken's explosion 64-bit feathers the same size as retro ones", () => {
    for (const theme of ['64bit', 'retro']) {
      const s = show({ theme })
      s.launch('chicken', 1, { feathers: 4 })
      for (let i = 0; i < 3000 && s.engine.projectiles.length; i++) s.engine.step()
      const feathers = s.engine.particles.filter((p) => p instanceof Feather).map((p) => /** @type {any} */ (p))
      expect(feathers).toHaveLength(4)
      for (const f of feathers) {
        expect(f.sprite.frameWidth * f.pixelSize * f.scale).toBe(8) // 8 px across in both themes
        if (theme === '64bit') expect(f.sprite).toBe(Chicken.themes['64bit'].feather)
      }
    }
  })
})

describe('64-bit chicken art', () => {
  it('has six 48x48 frames and three 12x12 feathers, every pixel in the palette', () => {
    for (const [frames, size] of [
      [[...hen64.flapFrames, ...hen64.panicFrames], 48],
      [hen64.featherFrames, 12],
    ]) {
      for (const frame of frames) {
        expect(frame).toHaveLength(size)
        for (const row of frame) {
          expect(row).toHaveLength(size)
          for (const ch of row) expect(ch in hen64.palette).toBe(true)
        }
      }
      expect(parsePixels(frames, hen64.palette).frames).toBe(frames.length)
    }
    expect(Chicken.themes['64bit'].sprite.frames).toBe(6)
  })

  it('flaps, and panics with its beak open', () => {
    expect(new Set(hen64.flapFrames.map((f) => f.join(''))).size).toBe(3)
    expect(hen64.panicFrames[0].join('')).toContain('m') // inside the open beak
    expect(hen64.flapFrames[0].join('')).not.toContain('m')
  })
})

describe('64-bit jug', () => {
  it('has three 93x120 frames and six 9x9 shards, every pixel in the palette', () => {
    for (const [frames, w, h] of [
      [jug64.frames, 93, 120],
      [jug64.shardFrames, 9, 9],
    ]) {
      for (const frame of frames) {
        expect(frame).toHaveLength(h)
        for (const row of frame) {
          expect(row).toHaveLength(w)
          for (const ch of row) expect(ch in jug64.palette).toBe(true)
        }
      }
    }
    expect(new Set(jug64.frames.map((f) => f.join(''))).size).toBe(3) // the flame flickers
  })

  it('is the same size on screen as the retro jug, and bursts into 64-bit shards', () => {
    for (const theme of ['64bit', 'retro']) {
      const art = Jug.themes[theme]
      expect(art.sprite.frameWidth * art.pixelSize).toBe(31)
      expect(art.sprite.frameHeight * art.pixelSize).toBe(40)
      const s = show({ theme })
      s.launch('jug', 1, { shards: 3 })
      for (let i = 0; i < 3000 && s.engine.projectiles.length; i++) s.engine.step()
      const shards = s.engine.particles.filter((p) => p instanceof Shard).map((p) => /** @type {any} */ (p))
      expect(shards).toHaveLength(3)
      for (const sh of shards) {
        expect(sh.sprite).toBe(art.shards)
        expect(sh.sprite.frameWidth * sh.pixelSize).toBe(3) // 3 retro pixels across in both themes
      }
    }
  })
})

describe('64-bit cow', () => {
  it('has six 72x48 frames, a 69x36 bubble each way and 27x21 T-bones, every pixel in the palette', () => {
    for (const [frames, w, h] of [
      [[...cow64.floatFrames, ...cow64.mooFrames], 72, 48],
      [cow64.bubbleFrames, 69, 36],
      [cow64.steakFrames, 27, 21],
    ]) {
      for (const frame of frames) {
        expect(frame).toHaveLength(h)
        for (const row of frame) {
          expect(row).toHaveLength(w)
          for (const ch of row) expect(ch in cow64.palette).toBe(true)
        }
      }
    }
    expect(cow64.mooFrames[0].join('')).toContain('r') // the open mouth
    expect(cow64.floatFrames[0].join('')).not.toContain('r')
    expect(cow64.bubbleFrames[0]).not.toEqual(cow64.bubbleFrames[1]) // tails on opposite sides
  })

  it('is the same size on screen as the retro cow, with its bubble too', () => {
    for (const theme of ['64bit', 'retro']) {
      const art = Cow.themes[theme]
      expect(art.sprite.frameWidth * art.pixelSize).toBe(24)
      expect(art.sprite.frameHeight * art.pixelSize).toBe(16)
      expect(art.bubble.frameWidth * art.pixelSize).toBe(23)
      expect(art.bubble.frameHeight * art.pixelSize).toBe(12)
      expect(art.head.x * art.pixelSize).toBeCloseTo(theme === '64bit' ? 61 / 3 : 20)
    }
  })

  it('bursts into 64-bit T-bones and shiny milk, the retro cow into plain milk', () => {
    for (const theme of ['64bit', 'retro']) {
      const s = show({ theme })
      s.launch('cow', 1, { steaks: 2, milk: 3 })
      for (let i = 0; i < 3000 && s.engine.projectiles.length; i++) s.engine.step()
      const steaks = s.engine.particles.filter((p) => p instanceof Shard).map((p) => /** @type {any} */ (p))
      const milk = s.engine.particles.filter((p) => p instanceof Milk).map((p) => /** @type {any} */ (p))
      expect(steaks.every((p) => p.sprite === Cow.themes[theme].steaks)).toBe(true)
      expect(steaks.every((p) => p.sprite.frameWidth * p.pixelSize === 9)).toBe(true) // 9 retro pixels across
      expect(milk).toHaveLength(3)
      expect(milk.every((m) => m.glint === (theme === '64bit'))).toBe(true)
    }
  })
})
