# Upcoming changes

## Phases (current and upcoming)

- **Up next:** 1. Extras (sound, pointer launch, reduced motion, demo site)

## Done

- **The flapping pixel chicken** (2026-11-23, branch `phase-2/chicken`): original art as text grids
  (`src/art/chicken.js`), `Sprite.fromPixels` and crisp sprite drawing (`src/sprite.js`), the chicken's rise/cross
  flight, panic and explosion (`src/projectiles/chicken.js`), feathers (`src/feather.js`), the trail layer plus
  crisp sprite layer (`src/engine.js`), `launch(type, count, init)`. Tests: `test/sprite.test.js`,
  `test/chicken.test.js`, browser tests for the chicken's whole life and for leaving no ghost (with a control that
  shows a trail-layer chicken would). Plan kept below under "The flapping pixel chicken (done)".
  - Trail-layer copy cost, measured 2026-11-23 in headless Chromium at 1920x1080: 0.007 ms per frame at DPR 1,
    0.043 ms at DPR 2 (a whole empty-sky draw: 1.0 ms and 4.6 ms, mostly the fade, which existed before). Too small
    to be worth skipping when no sprites are in the sky.

- **Fireworks engine** (2026-11-23, branch `phase-1/fireworks-engine`): fireworks-js-compatible options and methods
  (`src/options.js`, `src/index.js`), its rocket and particle motion (`src/projectiles/rocket.js`,
  `src/particle.js`), burst styles peony/ring/willow/crackle (`src/bursts.js`), fixed-step engine with auto-launch,
  `maxParticles`, per-step trail fade and error isolation (`src/engine.js`). Tests: `test/options.test.js`,
  `test/motion.test.js` (against a port of the fireworks-js formulas), `test/engine.test.js`,
  `test/browser/demo.spec.js`. Plan and decisions kept below under "Fireworks engine (done)".
  - `maxParticles` default 4000: measured 2026-11-23 in headless Chromium (software rendering, so likely
    pessimistic), step + draw per frame: 1000 particles 3.6 ms, 2000 6.9 ms, 4000 12.9 ms, 8000 33.4 ms,
    16000 66.3 ms. 4000 fits a 60 Hz frame there; the default show stays far below the cap.
  - Differences from fireworks-js, on purpose: auto-launch rolls its `delay` threshold once per launch (fireworks-js
    re-rolls every frame, which favours the low end); `launch()` on a running auto show only adds rockets
    (fireworks-js switches the show to stop once the sky is empty); rocket line width is picked per rocket, not per
    frame; the canvas size is CSS pixels with a devicePixelRatio backing store.

- **Setup** (2026-11-23, branch `setup/scaffold`): package, esbuild build (ESM + IIFE + `.d.ts`), dev server, demo
  page, ESLint, Vitest (`test/*.test.js`), Playwright (`test/browser/`), engine skeleton in `src/` (fixed-step loop,
  DPR canvas, `Projectile` base, placeholder `Rocket`/`Chicken`, single burst style, seedable `Random`).

## Fireworks engine (done)

Planned and built 2026-11-23. Branch `phase-1/fireworks-engine`.

A fireworks show that works as a drop-in for fireworks-js: the same options, defaults and look, plus four burst
styles. Semantics below are taken from fireworks-js v2.10.8 source (`options.ts`, `trace.ts`, `explosion.ts`,
`fireworks.ts`, `raf.ts`, read 2026-11-23).

### Decisions (user, 2026-11-23)

- **Drop-in compatible options**: fireworks-js names, `{min, max}` shapes, defaults and units. Its loop is capped
  at 60 fps and its units are per frame; ours are per fixed 1/60 s step, so a pasted config looks the same and stays
  frame-rate independent (fireworks-js slows down below 60 fps; we don't). Replaces the skeleton's per-second units
  and `hue: [a, b]`.
- **Burst styles**: peony, ring, willow, crackle.
- **`start()` auto-launches** at `intensity`, as fireworks-js does; `launch()` adds more by hand.
- **Transparent overlay canvas**: trails fade with `destination-out` and particles draw with `lighter`, as
  fireworks-js does; the page shows through.

### API

- `new Xploders(target, options)`: `target` is a canvas or a container element (a canvas is created and appended in
  it, sized to the container), as in fireworks-js.
- Methods (fireworks-js set): `start()`, `stop(dispose?)`, `pause()` (toggle), `clear()`, `launch(count)`,
  `waitStop(dispose?)` (stops auto-launch, resolves once the sky is empty), `updateOptions(partial)` (deep merge),
  `updateSize({width, height}?)`, `updateBoundaries(partial)`, getters `isRunning`, `currentOptions`.
- `launch` also takes a type: `launch(count)` launches rockets; `launch('chicken', count)` any registered type.
  As in fireworks-js, `launch()` on a stopped show runs the loop until the sky is empty, without auto-launch.
- `Xploders.register(name, cls)` stays.

### Options (fireworks-js defaults)

| Option           | Default                     | Meaning (per 1/60 s step)                                          |
| ---------------- | --------------------------- | ------------------------------------------------------------------ |
| `intensity`      | 30                          | Auto-launch rate: a clock advancing `intensity * pi` per second     |
| `delay`          | {30, 60}                    | Launch when that clock passes a random value in this range          |
| `rocketsPoint`   | {50, 50}                    | Launch x, % of width                                               |
| `traceSpeed`     | 10                          | Rocket start speed, px/step                                        |
| `acceleration`   | 1.05                        | Rocket speed multiplier per step                                   |
| `traceLength`    | 3                           | Rocket trail length, positions                                     |
| `hue`            | {0, 360}                    | Hue per firework                                                   |
| `particles`      | 50                          | Particles per explosion                                            |
| `explosion`      | 5                           | Particle trail length, positions                                   |
| `friction`       | 0.95                        | Particle speed multiplier per step                                 |
| `gravity`        | 1.5                         | Particle downward drift, px/step (constant, not an acceleration)   |
| `decay`          | {0.015, 0.03}               | Particle alpha lost per step                                       |
| `brightness`     | {50, 80}                    | Particle lightness, %                                              |
| `flickering`     | 50                          | % of particles whose lightness flickers                            |
| `lineWidth`      | trace {1, 2}, explosion {1, 3} | Stroke widths                                                   |
| `lineStyle`      | 'round'                     | Line cap                                                           |
| `opacity`        | 0.5                         | Trail fade per step (`destination-out` alpha)                      |
| `boundaries`     | x 50, y 50, debug false     | Rocket targets: x in [x, width - 2x], y in [y, height / 2]; debug draws the box |
| `autoresize`     | true                        | Follow the container's size (ResizeObserver)                       |
| `burst` (ours)   | 'peony'                     | Style name, or an array to pick from at random per firework        |
| `maxParticles` (ours) | 4000 (measured, above) | Cap on live particles; new explosions shrink to fit                |
| `seed` (ours)    | random                      | Repeatable show                                                    |

`mouse` and `sound` options belong to the Extras phase.

### Behaviour

- **Rocket** (fireworks-js `Trace`): straight line from the launch point to a random target in the boundaries,
  speed `*= acceleration` each step; explodes on reaching the target. Overrides the base class's ballistic
  `update`, which stays for the chicken and custom projectiles.
- **Particle** (fireworks-js `Explosion`): random angle, speed 1-10, `speed *= friction`, `y += gravity`,
  `alpha -= decay`, drawn as a line through its last `explosion` positions.
- **Bursts**: peony = the fireworks-js particle above. Ring = evenly spaced angles, one speed, so it stays a circle.
  Willow = gold hue, slow decay, longer trails, falls further. Crackle = flickers and, near the end of its life,
  pops into a few tiny short-lived sparks.
- **Rendering**: DPR-scaled backing store. Trail fade is applied per physics step, not per drawn frame
  (`1 - (1 - opacity)^steps`), so 120 Hz screens look the same as 60 Hz.

### What can go wrong while a page runs it

- Tab hidden: rAF stops; on return the elapsed time is clamped (already in the skeleton), not replayed.
- Container 0x0 or detached: skip drawing, keep no work queued; resumes on the next resize.
- A custom projectile throws in `update`/`draw`: remove it, `console.error` once, keep the loop alive.
- Particle count explodes (high `particles`, many rockets): `maxParticles` cap.
- `stop(true)` / dispose: cancel rAF, disconnect the ResizeObserver, remove a canvas we created.

### Tests

- Unit (Node): rocket and particle steps match the fireworks-js formulas; option deep-merge and defaults;
  auto-launch timing with an injected clock (no rAF); each burst's shape (ring stays circular, crackle spawns
  sparks); `maxParticles`; a throwing projectile is removed and the loop keeps going; `launch(n)` vs
  `launch('chicken', n)`; `waitStop` resolves.
- Browser: demo auto-launches without errors; `pause`/`clear`/`waitStop`; container target creates and sizes a
  canvas; trail fade looks the same at 60 and 120 Hz (step count, not frames); screenshots of each burst looked at.
- Demo gets controls: burst style, intensity, auto on/off.
- Measure: frame time with the cap at a few values to choose the `maxParticles` default.

## The flapping pixel chicken (done)

Planned and built 2026-11-23. Branch `phase-2/chicken`.

An original 16-bit-style pixel chicken that flaps into the sky, panics, and explodes into feathers and fireworks.
Plus what the projectile API needs for it, kept to that: sprites, a crisp sprite layer, per-launch options.

### Decisions (user, 2026-11-23)

- **It flaps.** Each chicken picks at random between flapping **up from the bottom** to its target and flapping
  **across** from a side edge to its target; an option can force one.
- **Panic, then boom**: at its target it stops, flaps frantically, shakes and flashes for about half a second, then
  explodes.
- **Feathers + fireworks**: a puff of white pixel feathers that sway and drift down, plus a firework burst in the
  show's `burst` style.
- **No sounds** for the chicken (no squawk).

### Art

- Original pixel art, drawn by us as text grids in `src/art/chicken.js` (one character per pixel, plus a palette):
  white hen, dark outline, grey shading, red comb and wattle, yellow-orange beak and feet. 16x16 per frame:
  4 flap frames (wings up, mid, down, mid) and 2 panic frames (wings flared, feathers ruffled, eyes wide).
  Not the SNES Zelda chicken sprite, which is Nintendo's art.
- Kept as code, not a PNG: nothing to load, works the same in the script-tag build.
- Before merging, I show you the sheet rendered at 8x and the chicken in flight for approval.

### API

- `Sprite.fromPixels(frames, palette)`: builds a sprite sheet from text grids, so users can make their own pixel
  sprites the same way. `new Sprite(image, {frameWidth, frameHeight, frames, fps})` stays for any image or canvas
  (an image that hasn't loaded yet is skipped, not an error).
- `launch(type, count, init)`: the third argument goes to the projectile, e.g.
  `show.launch('chicken', 3, {flight: 'cross', scale: 4})`.
- `Chicken.defaults`: `flight: 'random' | 'rise' | 'cross'` (default random), `scale` (pixel size, default 3, so
  48 CSS px), `speed`, `panicSteps` (default 30 = 0.5 s), `feathers` (count, default 16).
- `Projectile.layer`: `'trail'` (drawn with the fading fireworks, like rockets) or `'sprite'` (drawn crisp, like the
  chicken). Custom projectiles choose.

### Behaviour

- **Rise**: starts at `rocketsPoint` on the bottom edge, flies to its target at a steady speed, bobbing sideways in
  time with the flaps.
- **Cross**: starts just off the left or right edge at about the target's height, flies across bobbing up and down,
  to the target (a random point inside the boundaries, as for rockets).
- Faces the way it flies (sprite flipped). Flaps at about 12 frames a second; panic frames faster.
- **Panic** (`panicSteps`): hovers, shakes 1-2 px (seeded), flashes white every few steps, then explodes.
- **Explosion**: `engine.burst()` in the show's style at the chicken's hue, plus feathers: small pixel feathers that
  burst outward, slow quickly, then fall slowly while swaying and turning, and fade near the end (about 2-3 s).
  Feathers count towards `maxParticles`.

### Rendering: a crisp sprite layer

Today everything is drawn on one canvas whose previous frame fades a little each step; that is what makes the
firework trails. A moving sprite drawn there would leave a smeared ghost behind it. So the fireworks move to an
offscreen trail layer (faded exactly as now), and each frame the visible canvas is cleared, the trail layer copied in,
and sprite-layer things (chicken, feathers) drawn on top, pixel-snapped with image smoothing off. No extra elements
are added to the page, so canvas and container targets both work. Cost of the extra copy to be measured at
1920x1080, DPR 1 and 2; if it matters, the copy is skipped when no sprites are in the sky.

### What can go wrong

- A user-supplied sprite image not loaded or broken: drawn as nothing until it is ready; no error.
- No canvas available to build the sheet (Node, SSR): the sheet is built lazily on first draw, in the browser.
- Resize: the trail layer is recreated at the new size (trails in flight are lost, as now).
- A chicken whose target is off-screen after a resize: still explodes when it arrives (cross mode clamps its start).

### Tests

- Unit (Node): text grids to pixels (palette lookup, ragged rows and unknown characters rejected); rise and cross
  flights reach their target, bob within bounds, face their direction; `flight` forced by option or launch init;
  panic lasts `panicSteps` with the chicken within its shake radius; explosion makes feathers plus a burst in the
  show's style; feathers fall slower than sparks, sway, fade and die; feathers respect `maxParticles`; launch's
  third argument reaches the projectile.
- Browser: a chicken flies, panics and explodes without errors; the spot it has left is clear on the visible canvas
  (no ghost); fireworks trails still fade; both target types still work; screenshots of each stage looked at.
- Measure the trail-layer copy cost (above).
- Demo: Chicken button, plus a flight choice (random, rise, cross).

## 1. Extras

- Sounds for fireworks: opt-in, lazy-loaded, user-supplied files allowed (not for the chicken: user, 2026-11-23).
- Pointer/touch launch at a point.
- Respect `prefers-reduced-motion`.
- More projectiles; projectile extras if wanted (spin, explode on a timer).
- Demo/docs site on GitHub Pages (workflow triggered by hand only).

## Decisions

- **Own engine, not a fork of fireworks-js** (user, 2026-11-23). Checked 2026-11-23 via GitHub API and npm:
  fireworks-js is MIT, last release v2.10.8 (2024-07-13), last commit 2024-07-16, one maintainer (428 commits; next
  is dependabot with 5), 9 open issues without replies. Its "trace flies to a point, then explodes" model does not fit
  projectiles with their own physics and animation. Option names are borrowed; README credits it.
- **Original pixel chicken** (user, 2026-11-23); sprite API accepts any art.
- **Plain JS + JSDoc**, types emitted by `tsc` (user, 2026-11-23).
- **ESM + script-tag build** with esbuild (user, 2026-11-23).
- **Licence MIT** (default chosen at setup; change before first publish if wanted).

### Dev tooling (checked 2026-11-23, npm registry)

| Tool             | Pinned  | Last publish | Notes                                                                  |
| ---------------- | ------- | ------------ | ---------------------------------------------------------------------- |
| esbuild          | 0.28.2  | 2026-08-08   | MIT, single maintainer but the standard; no deps; postinstall not needed |
| vitest           | 5.1.1   | 2026-11-18   | MIT, 5 maintainers                                                     |
| @playwright/test | 1.65.1  | 2026-11-23   | Apache-2.0, Microsoft; needs Chromium build v1255                      |
| typescript       | 7.0.2   | 2026-11-23   | Apache-2.0; verified it emits `.d.ts` from JSDoc with `allowJs`        |
| eslint           | 10.15.0 | 2026-11-16   | MIT, actively maintained; dev-only, with `@eslint/js` 10.0.1, `globals` 17.14.0 |

`npm audit` reported 0 vulnerabilities at install.
