# Upcoming changes

## Phases (current and upcoming)

- **Up next:** 1. Fireworks engine
- **Then:** 2. Projectile API and the pixel chicken
- **Later:** 3. Extras (sound, pointer launch, reduced motion, demo site)

## Done

- **Setup** (2026-11-23, branch `setup/scaffold`): package, esbuild build (ESM + IIFE + `.d.ts`), dev server, demo
  page, ESLint, Vitest (`test/*.test.js`), Playwright (`test/browser/`), engine skeleton in `src/` (fixed-step loop,
  DPR canvas, `Projectile` base, placeholder `Rocket`/`Chicken`, single burst style, seedable `Random`).

## 1. Fireworks engine

Planned 2026-11-23. Branch `phase-1/fireworks-engine`.

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
| `maxParticles` (ours) | to measure             | Cap on live particles; new explosions shrink to fit                |
| `seed` (ours)    | random                      | Repeatable show                                                    |

`mouse` and `sound` options belong to phase 3.

### Behaviour

- **Rocket** (fireworks-js `Trace`): straight line from the launch point to a random target in the boundaries,
  speed `*= acceleration` each step; explodes on reaching the target. Overrides the base class's ballistic
  `update`, which stays for phase 2 projectiles.
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

## 2. Projectile API and the pixel chicken

- Generic `Projectile`: custom draw/update, arc physics, rotation/spin, explode on apex, timer or target point; a
  projectile chooses its own burst (the chicken: feathers plus fireworks).
- `Sprite`: frame animation over any sprite sheet (image or canvas), so users can bring their own art.
- Original 16-bit-style pixel chicken (white hen, red comb, flap/flail frames), drawn by us and stored in the repo.
  Not the SNES Zelda chicken sprite: that is Nintendo's art.
- `xploders.launch('chicken', opts)`, `Xploders.register(name, cls)` (exists in skeleton form).
- Open: how the chicken flies (flapping arc vs. thrown and tumbling), whether it squawks (ties into sound, phase 3).

## 3. Extras

- Sounds: opt-in, lazy-loaded, user-supplied files allowed.
- Pointer/touch launch at a point.
- Respect `prefers-reduced-motion`.
- More projectiles.
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
