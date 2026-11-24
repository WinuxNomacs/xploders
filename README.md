# xploders

Fireworks, and things that explode into fireworks, on a transparent HTML canvas. Plain JavaScript, zero runtime
dependencies. Options and methods follow [fireworks-js](https://fireworks.js.org/), so a fireworks-js config works
here.

**Live demo: <https://winuxnomacs.com/xploders/>**

In the demo, click or tap the sky to launch at that spot: it launches whatever you picked last (Fireworks, Chicken,
Jug-o-BOOM or Cow), fireworks until you pick. The demo starts at intensity 15; the library default is 30.

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
show.launch('jug') // a Jug-o-BOOM that bursts into a fireball
show.launch('cow') // a cow that Moo!s, then explodes into fireworks, steaks and milk
await show.waitStop() // stop launching, resolve once the sky is empty
```

Pass a container (a canvas is created inside it and follows its size) or a canvas element. The canvas is transparent,
so the page shows through. A canvas you pass draws at its size on the page; give it a CSS size to make it follow a
layout (`width: 100%`), otherwise it keeps the size it had when the show started.

### Methods

| Method                        | What it does                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| `start()`                     | Runs the show, auto-launching at `intensity`                                          |
| `launch(count)`               | Launches rockets; on a stopped show, runs until the sky is empty                      |
| `launch(type, count, init?)`  | Launches a registered type, `'chicken'`, `'jug'` or `'cow'`; `init` goes to each one |
| `launchAt(x, y, type?, init?)` | Launches one that explodes at (x, y), CSS px from the canvas's top left             |
| `waitStop(dispose?)`          | Stops auto-launch; the promise resolves once everything has burnt out                 |
| `stop(dispose?)`              | Stops and clears at once. `dispose` also stops following the size and removes a canvas the show created |
| `pause()`                     | Freezes or resumes, keeping everything in the sky                                     |
| `clear()`                     | Empties the sky; the show keeps running                                               |
| `updateOptions(options)`      | Merges options into the live ones                                                     |
| `updateSize({width, height})` | Resizes; by default to the container                                                  |
| `updateBoundaries(b)`         | Merges into `boundaries`                                                              |
| `isRunning`, `currentOptions`, `calm` | Getters (`calm`: reduced motion is in effect)                                 |
| `targetArea`                  | Getter: the boundaries box, `{left, top, right, bottom}` in CSS px                 |

All except the getters and `waitStop` return the show, so calls chain.

### Options

Units are per 1/60 s step, as fireworks-js's are per frame. The show runs in fixed steps, so it looks the same at any
refresh rate. It skips drawing frames nobody would see: while the canvas is scrolled out of view, and once an empty
sky's trails have faded (it keeps stepping, so `waitStop` still resolves). Browsers already pause it in a hidden tab.

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
| `boundaries`   | `{x: 50, y: 50, right: null, bottom: null, debug: false}` | Margins for where rockets explode, see below; `debug` draws the area |
| `autoresize`   | `true`                                   | Follow the container's size                                |
| `burst`        | `'peony'`                                | `'peony'`, `'ring'`, `'willow'`, `'crackle'`, `'fireball'`, `'saturn'`, `'shapes'`, `'animals'`, or a list to pick from per firework |
| `maxParticles` | `4000`                                   | Cap on live particles                                      |
| `maxProjectiles` | `100`                                  | Cap on projectiles in flight; `launch()` beyond it launches fewer |
| `mouse`        | `{click: false, move: false, max: 1, projectile: 'rocket'}` | Pointer launch, see below               |
| `reducedMotion` | `'auto'`                                | `'auto'`, `'always'` or `'ignore'`, see below              |
| `theme`      | `'64bit'`                                | Art for the chicken, jug and cow: `'64bit'` (detailed) or `'retro'`, see below |
| `trailResolution` | `'full'`                              | `'half'` draws sparks, flames and glows at half the device pixel ratio (never below 1 pixel per CSS px); sprites stay crisp. Much faster with many sparks; can be slower with big sprites or fireballs (measured in Firefox: many sparks 48 to 139 fps, cows 165 to 112), so measure your own show with the bench |
| `seed`         | random                                   | Seed for a repeatable show                                 |

The fireworks-js `sound` option is not supported; it is ignored if passed.

### Burst styles

| Style        | What it looks like                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `'peony'`    | A ball of sparks (fireworks-js's explosion)                                                         |
| `'ring'`     | A ring that stays round as it drifts and fades                                                      |
| `'willow'`   | Long-lived gold strands that droop                                                                  |
| `'crackle'`  | Flickering sparks that pop into tiny sparks near the end                                            |
| `'fireball'` | A white flash, then a ball of fire with a blue heart that rises, cools to red and turns to smoke    |
| `'saturn'`   | A ball in the launch colour inside a wide, dense, flattened, tilted ring in the opposite colour. Uses about 1.45 times `particles`, for the ring |
| `'shapes'`   | An outline picked at random: a tilted ellipse, a polygon, a spiral, a smiley, a heart, or a star with little fireworks for eyes |
| `'animals'`  | A zoo animal's outline picked at random, facing left or right: elephant, giraffe, lion, monkey, penguin, flamingo, snake or turtle. Uses twice `particles`, since legs and tails need the points |

Saturn, shapes and animals keep their form as they grow, drift and fade, since every spark in them shares one friction,
gravity and fade.

### Boundaries

Rockets (and launched objects) aim at random spots inside the boundaries box: `x` px in from the left, `y` px down
from the top, `right` px in from the right and `bottom` px up from the bottom. Leave `right` or `bottom` out (or
`null`) for fireworks-js's box: a right margin of twice `x`, and the bottom at half the height. `width` and `height`
are set from the canvas size. `launchAt` and pointer launch aim where they are told, inside the box or not.

```js
show.updateBoundaries({ x: 40, right: 40, y: 80, bottom: 120, debug: true })
show.targetArea // {left: 40, top: 80, right: ..., bottom: ...}
```

In the demo, checking Boundaries shows the box with sliders for its four margins; its edges and corners can be dragged.

### Pointer launch

With `mouse.click`, holding the pointer on the canvas launches rockets towards it, up to `mouse.max` in flight; the
hold follows the pointer and ends on release, even outside the canvas. With `mouse.move`, auto-launched rockets aim at
the pointer while it is over the canvas. `mouse.projectile` picks what the pointer launches (`'chicken'`, `'jug'` and `'cow'` work; an unknown name logs a warning
and launches nothing).

Events are read from the canvas only, as in fireworks-js. If your overlay is click-through (`pointer-events: none`),
pointer launch doesn't fire, and the page underneath stays usable. While `click` is on, the canvas gets
`touch-action: none` so dragging on a phone doesn't scroll.

### Reduced motion

When the visitor's system asks for reduced motion (`prefers-reduced-motion: reduce`), the show calms down by default:
no auto-launch, no flickering sparks, no chicken flash, no fireball flash, no shaking cow. `launch()`, `launchAt()` and pointer launch still work. It
follows the setting live. `reducedMotion: 'always'` calms the show for everyone; `'ignore'` never calms it.

### Themes

The characters come in two looks: `'64bit'`, detailed pixel art with shading and highlights (the default), and
`'retro'`, the original chunky pixel art. Set it for the show, change it live, or give one launch its own:

```js
const show = new Xploders(sky, { theme: 'retro' })
show.updateOptions({ theme: '64bit' })
show.launch('chicken', 1, { theme: 'retro' }) // this one only
```

Each character class lists its art per theme in `static themes` (for example `Chicken.themes['64bit']`); a character
without art for a theme uses the default theme's, else whatever it has. Both looks are the same size on screen, so
`scale` means the same in each. The chicken, jug and cow all have both looks, with their feathers, shards, T-bones,
bubble and milk (64-bit milk gets a shine). `Xploders.themes` lists the built-in names. A subclass can bring its own
`static themes`. Detailed art shrunk below one screen pixel
per pixel (the 64-bit jug on a low-DPI screen) is drawn smoothed instead of dropping pixels.

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

To use your own art, replace a theme's sprite (`Chicken.themes.retro.sprite`, or `Chicken.themes['64bit'].sprite`
with `pixelSize: 1/3` for art three times as detailed) with a sprite of the same layout: frames 0-3 flap (wings up, mid,
down, mid), 4-5 panic, facing right.

### The Jug-o-BOOM

An original pixel-art stoneware whiskey jug with "JUG-O-BOOM" on its belly and a burning rag wick. It is lobbed up
from a random spot along the bottom edge on an arc, tumbling end over end and shedding sparks, and at the top of the
arc it bursts into a fireball and stoneware shards. The fireball goes off with a bright white flash, then blasts out
as a round ball, blue-white at its heart and bright orange-yellow at its front; it slows, rises like hot air, cools
to red and turns to smoke, with gold embers flying out.

```js
import { Jug } from 'xploders'

show.launch('jug')
show.launch('jug', 2, { spin: 0, burst: 'willow' }) // upright, with a willow burst instead
Jug.defaults.scale = 3 // change the default for every jug
```

| Option   | Default      | Meaning                                                             |
| -------- | ------------ | ------------------------------------------------------------------- |
| `scale`  | `2`          | CSS pixels per sprite pixel (the sprite is 31x40)                    |
| `spin`   | `0.05`       | Tumble speed, radians per 1/60 s; it tumbles the way it was thrown   |
| `shards` | `12`         | Shards in the explosion (they count towards `maxParticles`)          |
| `burst`  | `'fireball'` | Burst style                                                          |
| `burstSize` | `3`      | How big the burst is: `1` is a rocket's burst; `3` spreads it three times as far, with flames and smoke three times as big |
| `launchPoint` | `{min: 10, max: 90}` | Where along the bottom edge it starts, percent of width, random in this range (rockets use `rocketsPoint`) |

The `'fireball'` burst works for rockets too (`burst: 'fireball'`). It uses its own fire colours, not `hue`. Its
blue heart and grey smoke are drawn over the page, so they show on light and dark backgrounds. Under reduced motion
it has no white flash or glow.

To use your own art, replace `Jug.themes.retro.sprite` (or the `'64bit'` one, with `pixelSize: 1/3`) with a sprite of
the same layout: frames 0-2 the wick flame flickering,
upright, wick at the top.

### The cow

An original pixel-art black-and-white dairy cow. It floats up from a random spot along the bottom edge, legs kicking,
slows and hovers at its target, then Moo!s excitedly: a "MOO!" speech bubble pops up beside its head while it bounces
and shakes with its mouth open. Then it explodes into a firework burst in the show's `burst` style, grilled T-bone
steaks and splashes of milk.

```js
import { Cow } from 'xploders'

show.launch('cow')
show.launch('cow', 2, { scale: 4, mooSteps: 60 }) // bigger, and Moo!s for a whole second
Cow.defaults.steaks = 12 // change the default for every cow
```

| Option        | Default              | Meaning                                                               |
| ------------- | -------------------- | --------------------------------------------------------------------- |
| `scale`       | `3`                  | CSS pixels per sprite pixel (the sprite is 24x16)                     |
| `speed`       | `3`                  | Average px per 1/60 s on the way up; it slows as it arrives           |
| `hoverSteps`  | `18`                 | Hover at the target before the Moo!, in 1/60 s steps                  |
| `mooSteps`    | `30`                 | Moo! before the explosion, in 1/60 s steps                            |
| `steaks`      | `8`                  | T-bone steaks in the explosion (they count towards `maxParticles`)    |
| `milk`        | `16`                 | Milk splashes in the explosion (they count towards `maxParticles`)    |
| `launchPoint` | `{min: 10, max: 90}` | Where along the bottom edge it starts, percent of width, random in this range |

The speech bubble sits above the head on the side the cow faces, and moves to the other side, or inside the canvas,
near an edge. Under reduced motion the cow doesn't bounce or shake; the bubble still shows. The milk has a faint
blue-grey edge, so it shows on a white page too.

To use your own art, replace `Cow.themes.retro.sprite` (or the `'64bit'` one, with `pixelSize: 1/3`) with a sprite of
the same layout: frames 0-3 the legs kicking, 4-5 excited, facing right. A theme's `bubble` is the speech bubble:
frame 0 with its tail on the left, 1 on the right; `head` says where the head is in the sprite, for placing it.

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
star.draw(ctx, frame, x, y, { scale: 4, flip: false, flash: false, alpha: 1, rotation: 0 })
```

`new Sprite(image, {frameWidth, frameHeight, frames, fps})` works with any image or canvas holding frames side by
side; an image that hasn't loaded yet is skipped.

### Custom projectiles

Extend `Projectile`, override `draw(ctx)`, and optionally `update()` (one call per step; move with `moveTo(x, y)`),
`shouldExplode()` and `explode(engine)`. Set `this.burst` to pick its burst style, and `this.layer = 'sprite'` to
draw it crisp on top instead of with the fading firework trails (which would smear a moving picture). A projectile
or particle that throws is removed and logged; the show keeps running. Then register it:

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
`npm run build:site` (builds `dist/` and the demo site in `site/`), `npm run test:browser` (Playwright, starts its
own server on port 8123; needs `npm run build:site` first).

### Bench

`/demo/bench.html` (also on the demo site: <https://winuxnomacs.com/xploders/bench.html>) runs fixed, seeded scenes
for 5 seconds each and reports the show's work per frame and the frame rate, ready to copy. `?scene=4` runs only the
fourth scene; `?trails=half` runs every scene with `trailResolution: 'half'`; `?quick` runs each briefly (the browser
tests use it). The first column is JavaScript time only: the browser may finish drawing after it, so frames per
second is the figure that counts.

### Demo site

```sh
npm run publish:site        # builds site/ and commits it to the gh-pages branch (does not push)
git push origin gh-pages    # publishes it to https://winuxnomacs.com/xploders/
```

## Credits

Inspired by [fireworks-js](https://fireworks.js.org/) (MIT) by Vitalij Ryndin. xploders is a separate implementation
that follows its options and reproduces its rocket and particle motion.

## Licence

MIT
