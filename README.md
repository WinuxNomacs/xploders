# xploders

Fireworks, and things that explode into fireworks, on a transparent HTML canvas. Plain JavaScript, zero runtime
dependencies. Options and methods follow [fireworks-js](https://fireworks.js.org/), so a fireworks-js config works
here.

> Early development; see [upcoming-changes.md](upcoming-changes.md) for what's next.

## Install

```sh
npm install xploders
```

Or with a script tag (exposes a global `Xploders`):

```html
<script src="https://cdn.jsdelivr.net/npm/xploders/dist/xploders.min.js"></script>
```

(Not published yet.)

## Usage

```html
<div class="sky" style="position: fixed; inset: 0"></div>
```

```js
import { Xploders } from 'xploders'

const show = new Xploders(document.querySelector('.sky'), { burst: ['peony', 'ring'] })
show.start() // auto-launches at `intensity`
show.launch(5) // five more rockets
show.launch('chicken') // a chicken that explodes into fireworks
await show.waitStop() // stop launching, resolve once the sky is empty
```

Pass a container (a canvas is created inside it and follows its size) or a canvas element. The canvas is transparent,
so the page shows through.

### Methods

| Method                        | What it does                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `start()`                     | Runs the show, auto-launching at `intensity`                                          |
| `launch(count)`               | Launches rockets; on a stopped show, runs until the sky is empty                      |
| `launch(type, count, init?)`  | Launches a registered type, such as `'chicken'`; `init` goes to each one             |
| `waitStop(dispose?)`          | Stops auto-launch; the promise resolves once everything has burnt out                 |
| `stop(dispose?)`              | Stops and clears at once. `dispose` also stops following the size and removes a canvas the show created |
| `pause()`                     | Freezes or resumes, keeping everything in the sky                                     |
| `clear()`                     | Empties the sky; the show keeps running                                               |
| `updateOptions(options)`      | Merges options into the live ones                                                     |
| `updateSize({width, height})` | Resizes; by default to the container                                                  |
| `updateBoundaries(b)`         | Merges into `boundaries`                                                              |
| `isRunning`, `currentOptions` | Getters                                                                               |

All except the getters and `waitStop` return the show, so calls chain.

### Options

Units are per 1/60 s step, as fireworks-js's are per frame. The show runs in fixed steps, so it looks the same at any
refresh rate.

| Option         | Default                                  | Meaning                                                    |
| -------------- | ---------------------------------------- | ---------------------------------------------------------- |
| `intensity`    | `30`                                     | Auto-launch rate; `0` launches only by hand                |
| `delay`        | `{min: 30, max: 60}`                     | Spacing between auto-launches (with `intensity`)           |
| `rocketsPoint` | `{min: 50, max: 50}`                     | Launch x, percent of width                                 |
| `traceSpeed`   | `10`                                     | Rocket start speed, px/step                                |
| `acceleration` | `1.05`                                   | Rocket speed multiplier per step                           |
| `traceLength`  | `3`                                      | Rocket trail length                                        |
| `hue`          | `{min: 0, max: 360}`                     | Hue per firework                                           |
| `particles`    | `50`                                     | Particles per explosion                                    |
| `explosion`    | `5`                                      | Particle trail length                                      |
| `friction`     | `0.95`                                   | Particle speed multiplier per step                         |
| `gravity`      | `1.5`                                    | Particle downward drift, px/step                           |
| `decay`        | `{min: 0.015, max: 0.03}`                | Particle fade per step                                     |
| `brightness`   | `{min: 50, max: 80}`                     | Particle lightness, percent                                |
| `flickering`   | `50`                                     | Percent of particles that flicker                          |
| `lineWidth`    | `{trace: {min: 1, max: 2}, explosion: {min: 1, max: 3}}` | Stroke widths                              |
| `lineStyle`    | `'round'`                                | Line cap                                                   |
| `opacity`      | `0.5`                                    | Trail fade per step                                        |
| `boundaries`   | `{x: 50, y: 50, debug: false}`           | Margins for where rockets explode; `debug` draws the area  |
| `autoresize`   | `true`                                   | Follow the container's size                                |
| `burst`        | `'peony'`                                | `'peony'`, `'ring'`, `'willow'`, `'crackle'`, or a list to pick from per firework |
| `maxParticles` | `4000`                                   | Cap on live particles                                      |
| `seed`         | random                                   | Seed for a repeatable show                                 |

Not yet supported from fireworks-js: `mouse` and `sound` (planned).

### The chicken

An original pixel-art hen that flaps into the sky, panics at its target (frantic flapping, shaking, flashing), then
explodes into a puff of feathers and a firework burst in the show's `burst` style.

```js
import { Chicken } from 'xploders'

show.launch('chicken') // flies up from the bottom or across from a side, at random
show.launch('chicken', 3, { flight: 'cross', scale: 4 })
Chicken.defaults.panicSteps = 60 // change the default for every chicken
```

| Option       | Default    | Meaning                                                   |
| ------------ | ---------- | --------------------------------------------------------- |
| `flight`     | `'random'` | `'rise'` from the bottom, `'cross'` from a side edge      |
| `scale`      | `3`        | CSS pixels per sprite pixel (the sprite is 16x16)         |
| `speed`      | `3`        | px per 1/60 s                                             |
| `panicSteps` | `30`       | Panic before the explosion, in 1/60 s steps               |
| `feathers`   | `16`       | Feathers in the explosion (they count towards `maxParticles`) |

To use your own art, replace `Chicken.sprite` with a sprite of the same layout: frames 0-3 flap (wings up, mid,
down, mid), 4-5 panic, facing right.

### Pixel sprites

`Sprite.fromPixels(frames, palette, fps)` builds a sprite sheet from text grids, one character per pixel:

```js
import { Sprite } from 'xploders'

const star = Sprite.fromPixels(
  [
    ['.y.', 'yyy', '.y.'],
    ['y.y', '.y.', 'y.y'],
  ],
  { '.': null, y: '#ffd400' },
)
star.draw(ctx, frame, x, y, { scale: 4, flip: false, flash: false, alpha: 1 })
```

`new Sprite(image, {frameWidth, frameHeight, frames, fps})` works with any image or canvas holding frames side by
side; an image that hasn't loaded yet is skipped.

### Custom projectiles

Extend `Projectile`, override `draw(ctx)`, and optionally `update()` (one call per step; move with `moveTo(x, y)`),
`shouldExplode()` and `explode(engine)`. Set `this.burst` to pick its burst style, and `this.layer = 'sprite'` to
draw it crisp on top instead of with the fading firework trails (which would smear a moving picture). Then register
it:

```js
import { Xploders, Projectile } from 'xploders'

class Box extends Projectile {
  burst = 'ring'
  draw(ctx) {
    ctx.fillStyle = 'orange'
    ctx.fillRect(this.x - 5, this.y - 5, 10, 10)
  }
}
Xploders.register('box', Box)
show.launch('box')
```

The default flight is an arc that peaks at a random target inside the boundaries. A projectile that throws an error
is removed (and logged) without stopping the show.

## Development

Needs Node 20 or newer.

```sh
npm install
npx playwright install chromium   # once, for the browser tests
npm run dev                       # demo at http://127.0.0.1:8000/demo/, or the next free port (prints the URL)
npm run check                     # lint, typecheck, unit tests, build, browser tests
```

Individual steps: `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build` (writes `dist/`),
`npm run test:browser` (Playwright, starts its own server on port 8123; needs `npm run build` first).

## Credits

Inspired by [fireworks-js](https://fireworks.js.org/) (MIT) by Vitalij Ryndin. xploders is a separate implementation
that follows its options and reproduces its rocket and particle motion.

## Licence

MIT
