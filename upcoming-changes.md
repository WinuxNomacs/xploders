# Upcoming changes

## Phases (current and upcoming)

- **Up next:** 1. Demo boundaries editor (details below)
- **Then:** 2. Saturn and Shapes bursts; 3. Animals burst; 4. Performance review (after the planned updates)
- **Later:** projectile extras (spin, fuse) and new launchable objects, shaped when the next object is known

## Done

- **The exploding cow** (2026-11-24, branch `phase-7/cow`): original black-and-white cow, its "MOO!" bubble and
  grilled T-bones (`src/art/cow.js`), the font moved to `src/art/font.js` with variable-width glyphs (a 5-wide M,
  which the jug's "BOOM" now uses too) and "!"; the cow's float, hover, Moo! and explosion with the bubble kept on
  screen (`src/projectiles/cow.js`), milk splashes (`src/milk.js`), steaks as `Shard`s with their own sprite
  (`src/shard.js`), registered as `'cow'`, demo Cow button and click to fire. Tests: `test/cow.test.js` (art, start
  spot, phases and timings, calm, bubble placement at the edges, explosion and cap, pieces falling), browser tests
  for a cow's whole life and click to fire with Cow. Seen in headless Chromium on the dark demo, a white page, at
  the right edge and on a phone. Plan kept below.

- **Jug launch spots and the new fireball** (2026-11-24, branch `phase-6/jug-spots-fireball`): jugs start at a
  random spot 10-90% across the bottom edge, clicks on the sky included (`launchPoint` in `Jug.defaults`,
  `src/projectiles/jug.js`); the `fireball` burst goes off with a white `Flash`, flames blast out as a round ball
  (sunflower spread, rise held back for the first 15 steps) and cool blue-white, orange-yellow, red, around a blue
  `Core` drawn normally on the sprite layer (additive flames washed out any blue to white) (`src/fireball.js`,
  `src/bursts.js`). Tests in `test/jug.test.js`: launch spots (launchAt included, rockets unchanged), the round
  blast, the blue heart, flame colours, the flash and none when calm. Seen frame by frame in headless Chromium.
  Plan kept below.
  - Draw cost against `main`, measured 2026-11-24 in headless Chromium at DPR 2, jug size (`burstSize` 3), two
    runs each: 1 fireball 10.5-11.5 ms per frame (main 10.6-10.7), 3 fireballs 25.1-25.6 ms (main 24.1-24.6),
    10 fireballs 76.0-77.6 ms (main 71.7-73.1). Several jug fireballs at once are still heavy, as before.

- **Demo: calmer default and click to fire** (2026-11-24, branch `phase-5/click-to-fire`): the demo starts at
  intensity 15 (library default still 30); a click or tap on the sky launches the last selected type at that spot
  via `launchAt`, launch buttons show as selected, the Pointer button is gone (`demo/main.js`, `demo/index.html`).
  Tests: browser tests for the starting intensity, click to fire for each type (unblocked by a full sky, nothing
  from clicks on the controls), a tap on a phone, and the library `mouse` option still holding and dragging. Plan
  kept below.

- **Fixes from the code review** (2026-11-24, branch `fix/review-findings`): canvas sized from its own box and an
  intrinsic size pinned (`updateSize` in `src/index.js`); `deepMerge` skips prototype keys (`src/options.js`);
  particle errors removed and logged once per step, a failed frame never stops the loop, non-finite bursts ignored,
  no draw to a zero-size backing store, smoke drawn behind sprites, unknown `mouse.projectile` warned about,
  `maxProjectiles` (`src/engine.js`); fireball drawn from cached soft dots, no glow in calm mode (`src/fireball.js`,
  `src/bursts.js`); compact demo controls and bursts below them on phones; `tsc` run through `node` in
  `scripts/build.js`. Tests: `test/robustness.test.js`, whole-life tests for the jug and chicken with
  `test/setup.js`, browser tests for sizing at DPR 2 and the demo on a phone. Plan kept below.
  - Fireball draw cost after caching, measured 2026-11-24 in headless Chromium at DPR 2 (software rendering):
    10 fireballs 9.0 ms per frame (was 10.5), 40 fireballs 32.2 ms (was 39.6); 10 peonies 5.0 ms. What remains is
    fill rate (large soft dots, additive), not per-piece overhead.

- **Jug-o-BOOM** (2026-11-23, branch `phase-4/jug`): original stoneware jug art lettered "JUG-O-BOOM"
  (`src/art/jug.js`, painted into text grids with a 3x5 font), the lobbed, tumbling jug with wick embers
  (`src/projectiles/jug.js`), the `fireball` burst style (`src/bursts.js`, `src/fireball.js`: glow, flames, embers,
  smoke), shards (`src/shard.js`), `rotation` on `Sprite.draw`, bursts trimmed to `maxParticles` in `engine.burst`,
  demo button and Fireball burst option. Tests: `test/jug.test.js` (the cap test seen failing without the trim),
  browser test for a jug's whole life. Plan kept below under "Jug-o-BOOM (done)".

- **Extras: pointer launch, reduced motion, demo site** (2026-11-23, branch `phase-3/extras`): fireworks-js `mouse`
  options with pointer capture and CSS-box mapping (`src/pointer.js`), `launchAt`, `reducedMotion` with live
  following (`src/index.js`, `engine.calm`), site build and gh-pages publishing (`scripts/build-site.js`,
  `scripts/publish-site.js`), demo Pointer toggle and How-to panel. Tests: `test/pointer.test.js`, browser tests
  for a real drag with release off the canvas, emulated reduced motion, and the built site. Plan kept below under
  "Extras (done)".
  - Pre-public review 2026-11-23, whole history: no secrets, no binary files or archives, emails only GitHub and
    Anthropic noreply addresses, no local paths, lockfile resolves only to registry.npmjs.org.

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

## Demo: calmer default and click to fire (done)

Requests (`new.md`, 2026-11-24): "reduce default intensity by half"; "enable click to fire at target the last type
the user selected, default fireworks". Builds on the demo page (`demo/index.html`, `demo/main.js`) and
`launchAt` (`src/index.js`), which already aims rockets, chickens and jugs at a point.

### Decisions (user, 2026-11-24)

- **Intensity: demo page only.** The demo's Intensity slider starts at 15 (was 30). The library default stays 30,
  matching fireworks-js.
- **Click to fire: one launch per click or tap, always on.** A click on the sky launches one of the last selected
  type at that point: Fireworks, Chicken (with the Chicken flight choice), Jug-o-BOOM, and Cow once phase 2 lands;
  fireworks until a button is pressed. Pressing a launch button both launches as today and selects its type. Never
  blocked by auto rockets in flight (it calls `launchAt` directly; `mouse.max` is not involved).
- **The "Pointer: on/off" button goes**, and with it drag-aiming of auto rockets in the demo. The library's `mouse`
  options are unchanged.

### Behaviour

- Built in the demo, not the library: a `pointerdown` listener on the sky canvas maps the CSS position
  (`getBoundingClientRect`) and calls `show.launchAt(x, y, type, init)`. Clicks on the controls don't reach the
  canvas. The selected button shows as pressed (`aria-pressed`), so it is clear what a click fires.
- The How-to panel and README's demo description say how clicking works.
- A tap on a phone fires; the canvas doesn't need `touch-action: none` for a single tap (no drag). Checked on the
  phone viewport test.

### Tests

- Browser: the slider starts at 15; a click with nothing selected launches a rocket at the click; after pressing
  Chicken (and Jug-o-BOOM), a click launches that type at the click point; a click while 10+ auto rockets fly still
  launches; clicks on the controls launch nothing; no Pointer button.

## Jug launch spots and the new fireball (done)

Requests (`new.md`, 2026-11-24): "Randomize starting launch position for Jugs but keep it at the bottom of the
screen"; "Fireballs need to start with a bright white flash at their explosion's epicenter with their actual fireball
blasting outward in a bright orangeish yellow and blue-hued spherical fireball before it dissipates".

Builds on: jugs launch from `rocketsPoint` (default 50%, shared with rockets) in `Engine.launch`
(`src/engine.js`), so every jug leaves from the bottom centre, clicks on the sky included. The `fireball` burst
(`src/bursts.js`, `src/fireball.js`) is a yellow-orange `Glow` (no white), then flames scattered at random that rise
and cool from white-yellow to red, gold embers, then smoke; scaled by `burstSize` (3 for jugs). Rockets with
`burst: 'fireball'` get the same burst.

### Decisions (user, 2026-11-24)

- **Jug start: anywhere from 10% to 90% across the bottom edge**, random per jug, for clicks on the sky too (the jug
  arcs from its spot to the click). Rockets keep `rocketsPoint`.
- **Blue core, then orange:** the sphere starts with a blue-white heart, like a gas flame, that turns bright
  orange-yellow as it expands, then fades to red and smoke.
- **Round blast, then rises:** flames blast outward evenly as a sphere first; once slowed, they drift up like hot
  air, break up and turn to smoke.
- **White flash at the epicentre, none under reduced motion** (as the glow and the chicken's flash today); the
  sphere still shows.

### Proposed, and as built

- Jug: a `launchPoint` option in `Jug.defaults` (`{min: 10, max: 90}`, percent of width) that replaces the launch
  x the engine passes; README jug table row.
- As built, the blue comes from a separate `Core` ball rather than the flames alone: overlapping flames add up to
  white on the additive trail layer, which hid every blue flame.
- Fireball: a short, bright white `Flash` (a few steps, small and intense) at the centre before the glow; flames
  launched at evenly spread angles with one shared speed (small jitter) so the front stays round, buoyancy held back
  until they slow; flame colour runs blue-white, orange-yellow, red over its life, with a few inner flames staying
  blue longer. Same piece counts, so `maxParticles` and draw cost stay as measured; draw cost checked again at
  `burstSize` 3.
- Tests: jug start x stays within 10-90% of the width at the bottom, launchAt included; flash present normally and
  absent when calm; the flames' early positions lie near one circle; flame colour starts blue and ends red. A visual
  check in a real browser of the blast frame by frame.

## The exploding cow (done)

Request (`new.md`, 2026-11-24): "add exploding cows that appear to Moo! excitedly just before they explode into
fireworks, steaks and milk splatters". Builds on the projectile API (`src/projectile.js`, `moveTo`), pixel sprites
(`src/sprite.js`, text grids like `src/art/jug.js` and its 3x5 font), shards (`src/shard.js`) as the model for
steaks, and the demo's launch buttons and click to fire.

### Decisions (user, 2026-11-24)

- **Flight: floats up and hovers.** Rises from below the bottom edge, legs kicking, slows and hovers at its
  target, then Moo!s and explodes.
- **The Moo!: speech bubble and shake.** A pixel speech bubble saying "MOO!" pops up beside the cow while it bounces
  and shakes, eyes wide, for about half a second; then it explodes.

- **Look: black-and-white** spotted dairy cow with a pink nose and udder (planned 2026-11-24).
- **Start: a random spot 10-90% across the bottom edge**, clicks on the sky included, like the Jug-o-BOOM
  (`launchPoint` in `Cow.defaults`); it floats from there to its target.
- **Burst: the show's burst style** in the launch hue, like the chicken.
- **Steaks: cooked T-bones**: small brown grilled steaks with a white bone and grill marks, tumbling as they fall.

### Design

- As built: steaks are `Shard`s with a steak sprite rather than a new `src/steak.js`; the M in the font became 5
  pixels wide, since a 3-wide M read as H.
- Original pixel art (`src/art/cow.js`, text grids for `Sprite.fromPixels`): side view facing right, about 24x16
  sprite pixels at scale 3 by default; frames 0-3 legs kicking as it floats, 4-5 excited (eyes wide, mouth open).
  The speech bubble is its own sprite, "MOO!" from the 3x5 font (moved to a shared `src/art/font.js`, adding M and
  "!"), drawn beside the cow's head on the side it faces, kept on screen. The T-bone is its own small sprite.
- `src/projectiles/cow.js`: `Cow`, registered as `'cow'`, `layer: 'sprite'`. Flight: eases up from below the
  bottom edge to its target (fast, slowing as it arrives), legs kicking and a gentle bob; hovers about 0.3 s; then
  the Moo!: excited frames, bubble showing, bouncing and shaking for about 0.5 s; then it explodes. Faces the way it
  drifts. Defaults: `scale`, `speed`, `hoverSteps`, `mooSteps`, `steaks`, `milk`, `launchPoint`.
- Explosion: `engine.burst` in the show's style, then steaks (`src/steak.js`, tumbling sprite pieces like shards)
  and milk splatters (`src/milk.js`, white droplets that fly out, fall, stretch and fade; on the sprite layer so they
  stay white instead of adding up to glare, so they show on light pages too). All count towards `maxParticles`.
- Reduced motion: no shake or bounce; the bubble and excited frames still show.
- Demo: a Cow button in the controls panel; it joins click to fire (a click launches a cow once Cow is picked).
  README: a Cow section with its options table; `Cow.sprite` replaceable like the chicken's.

### Tests

- Unit (`test/cow.test.js`): art grids are well formed (equal widths, palette keys); start spot within 10-90% at
  the bottom, launchAt included; it reaches and hovers at the target, then Moo!s for `mooSteps` with the bubble,
  then explodes; no shake when calm; explosion gives the burst in the show's style, the steaks and milk, trimmed to
  `maxParticles`; steaks and milk fall and die; the bubble stays inside the canvas near an edge.
- Browser: a cow's whole life in the demo without errors; the Cow button and click to fire with Cow picked.
- Seen in a real browser frame by frame: the art, the bubble, the explosion on the dark demo and on a light page.

## 1. Demo boundaries editor

Request (`new.md`, 2026-11-24): "In the demo, add sliders for resizing and moving the boundaries when Boundaries is
checked/enabled. Also allow for the Boundaries box to be resized using the mouse on its corners and borders."

Builds on: the Boundaries checkbox in the demo's controls panel (`debug`), `updateBoundaries`, and the box as the
engine uses it today (`Engine.launch`, `src/engine.js`): left margin `x`, right margin `2x` (as fireworks-js), top
`y`, bottom fixed at half the canvas height; `width`/`height` are overwritten with the canvas size on every resize.
The demo also moves `y` below the controls panel whenever the panel resizes.

Proposed: with Boundaries checked, a panel of sliders (left, right, top, bottom) and drag handles on the box's
corners and edges on the canvas; a drag on a handle doesn't launch (click to fire skips it).

Open decisions (to ask when planning):
- Library or demo only: the current fields can't express a free box (the right margin is tied to the left, the
  bottom is fixed at 50%), so free sliders need new boundary fields in the library (for example `right` and
  `bottom` margins, defaults keeping today's box) or the demo maps onto only `x` and `y`.
- Whether the demo still moves the top below the controls panel once the user has set it by hand.
- Moving the whole box by dragging its middle, or only resizing from corners and edges.

## 2. Saturn and Shapes bursts

Requests (`new.md`, 2026-11-24): "Add a burst type called Saturn that explodes a spehere of one color inside
exploding rings of another color"; "Add a burst type called Shapes that explodes fireworks in random shapes,
ellipsoids and geometries".

Builds on: burst styles in `src/bursts.js` (`ring` already keeps a circle by sharing one speed; the fireball's
sunflower spread fills a disc evenly), the `burst` option and the demo's Burst menu.

Proposed: `'saturn'`, a filled ball of particles in the launch hue inside one or more rings in a second hue, rings
tilted (drawn as ellipses: flattened circles at an angle); `'shapes'`, particles placed along an outline picked at
random (ellipse, star, heart, triangle, square, spiral...), sized by launch speed so the shape grows and keeps its
form. Both in the Burst menu and in its "mix".

Open decisions (to ask when planning):
- Saturn: how the second colour is chosen (opposite on the colour wheel, or random), and one ring or several.
- Shapes: which shapes are in the set, and whether they are flat outlines or filled.

## 3. Animals burst

Request (`new.md`, 2026-11-24): "Add a burst type called Animals that explodes fireworks in the shapes of random zoo
animals".

Builds on: the Shapes burst (phase 2), whose outline-to-particles code it reuses with animal outlines.

Proposed: `'animals'`, outlines drawn by us as point lists (original art, per the repo rules), one picked at random
per burst; in the Burst menu.

Open decisions (to ask when planning): which animals (for example elephant, giraffe, lion, monkey, penguin), and
whether an outline faces a random way.

## 4. Performance review

Request (`new.md`, 2026-11-24): "Once the current planned updates are complete. Plan a performance review to improve
rendering performance and reduce unnecessary cpu/gpu impact."

Builds on: the measurements so far (in Done): step + draw per particle count, the trail-layer copy, fireball draw
cost (large additive soft dots are fill-rate bound: 10 jug fireballs about 76 ms per frame in headless Chromium at
DPR 2, software rendering). The loop is fixed-step `requestAnimationFrame` (`src/engine.js`).

Proposed, to plan once phases 1-3 are done: profile the demo in a real GPU-backed browser as well as headless
(headless uses software rendering, so its numbers are pessimistic); measure where frame time goes (trail fade,
additive flames, sprite draws, particle updates); candidates to weigh: idling the loop when the sky is empty and
auto-launch is off, a lower-resolution trail layer at high DPR, capping fireball fill (fewer, cached bigger dots),
pausing when the tab or canvas is hidden (`document.hidden`, `IntersectionObserver`), and batching draws by style.
Each change measured before and after, on the same machine in the same session.

## Fixes from the code review of 2026-11-24 (done)

Branch `fix/review-findings`. The user asked for all of them to be fixed. Each fix gets a test seen failing first.

1. **Canvas sizing feedback loop**: a `<canvas>` with no CSS size grew every frame at DPR > 1 (600x300 to 33554432
   px wide in six frames, measured). Size from the canvas's own box; when its CSS size follows its backing store,
   pin the measured size in CSS px.
2. **Prototype pollution** in `deepMerge` (`__proto__` reached `Object.prototype`, confirmed): skip `__proto__`,
   `constructor`, `prototype`.
3. **One throwing particle froze the show** with `isRunning` still true: particle `update`/`draw` errors remove that
   particle and are logged once per step; a frame that fails anyway is logged and the loop goes on. Bursts at a
   non-finite position are ignored; no drawing to a zero-size backing store.
4. **Padded container**: drew at 340x240, shown at 300x200 (measured). Fixed by 1 (the canvas's own box).
5. **Demo on phones**: controls covered 0-216 px, bursts landed at 50-350 px. Compact controls on narrow screens,
   and the demo keeps `boundaries.y` below the controls.
6. **Fireball draw cost**: about 2.3x a spark per piece (measured, headless). Flames, glow and smoke draw cached soft
   sprites (`drawImage`) instead of a new radial gradient per piece per frame; measure again.
7. **Reduced motion** still showed the fireball's flash: no glow in calm mode (bursts get `calm`).
8. Minor: an unknown `mouse.projectile` warns once and launches nothing (it silently launched rockets); the build
   runs `tsc` through `node` (`npx` via `execFileSync` fails on Windows); smoke draws behind sprites (`behind` on
   particles); new option `maxProjectiles` (default 100) caps projectiles in flight.
9. Found while fixing: unit tests had no canvas for sprite sheets, so sprites drawn in Node threw and the engine
   removed them, letting a jug test pass vacuously. Tests install a fake `OffscreenCanvas`/`ImageData`, and the
   whole-life tests check that nothing was logged as an error.

## Jug-o-BOOM (done)

Planned and built 2026-11-23. Branch `phase-4/jug`.

A large old-fashioned stoneware whiskey jug, lit like a molotov cocktail, lobbed up from the bottom; it bursts
into a fireball at the top of its arc.

### Decisions (user, 2026-11-23)

- **Bursts at the top of the arc**, mid-air like the fireworks (not smashing at the bottom edge).
- **Tumbles end over end** in flight: smooth rotation, pixels kept chunky (`rotation` on `Sprite.draw`). Slow
  enough that the lettering reads for part of the flight.
- **Stoneware crock look**: cream body, brown glazed top, ring handle from the neck, cork, burning rag wick.
- **It says "Jug-o-BOOM" on it**: "JUG-O-" in cobalt blue (like stoneware stencils) over "BOOM" in red, a 3x5
  pixel font. This sets the size: 31x40 sprite pixels, drawn at scale 2 by default (62x80 CSS px).

### API

- `show.launch('jug')`, registered as `jug`; the demo and docs call it Jug-o-BOOM. Class `Jug`, exported.
- `Jug.defaults`: `scale` 2, `spin` (rad/step, a random sign per jug), `shards` 12. Per launch through `init`.
- Burst style `fireball`, usable by any projectile (`burst: 'fireball'`); the jug uses it unless `burst` is given.

### Behaviour

- Flight: the base `Projectile` ballistic arc (exact peak at the target), starting just below the bottom edge;
  explodes at the apex (the base trigger). The wick flame animates (3 frames) and drops embers on the trail layer.
- Fireball (from the explosion's particle budget): a glow that swells and fades; flames (soft round blobs on the
  trail layer) that rise like hot air and age white-yellow, orange, red; gold embers (fireworks-js particles);
  dark smoke puffs that start as the flames die (sprite layer, since the additive trail layer can't show dark).
- Shards: stoneware pieces (brown and cream) that tumble and fall, like the chicken's feathers but heavier.
- Reduced motion: embers don't flicker (as other particles); nothing else flashes.

### What can go wrong

- Particle cap: the fireball is split from the `particles` budget and trimmed to `maxParticles`; wick embers and
  shards are added through `addParticles`, which trims too.
- A jug launched with a target below its start (pointer near the bottom): the arc's rise is 0, it bursts at once.

### Tests

- Unit: the art parses (lettering present, frames the same size); the jug starts below the bottom, peaks at its
  target and bursts there; spin changes rotation; embers respect the cap; fireball flames rise and redden, smoke
  starts late, everything dies; shards fall; `burst: 'fireball'` works on rockets.
- Browser: a jug's whole life in the demo (launch, burst, sky empties) with no errors; screenshots looked at.

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

## Extras (done)

Planned and built 2026-11-23. Branch `phase-3/extras`.

### Decisions (user, 2026-11-23)

- **Pointer launch listens on the canvas only**, as fireworks-js does: drop-in compatible; a click-through overlay
  (`pointer-events: none`) simply gets no pointer launch, and page buttons stay usable.
- **Reduced motion calms the show by default**: no auto-launch, no flickering sparks, no chicken flash; `launch()`
  and pointer launch still work.
- **Demo site**: the user makes the repo public; the site is built into a `gh-pages` branch that updates only when
  the user pushes it. No workflow file added.
- **Projectile extras (spin, fuse) and new objects: not now**; a later phase shaped when the next object is known.
- **No sound at all for now** (user, 2026-11-23): the fireworks-js `sound` option is not supported; it is ignored
  if passed. Revisit only if asked.

### Pointer

- fireworks-js options: `mouse: {click: false, move: false, max: 1}`.
  - `click`: while the pointer is held on the canvas, rockets launch towards it, keeping up to `max` in flight.
  - `move`: auto-launched rockets aim at the pointer's last position on the canvas.
- Fixes over fireworks-js: position from `getBoundingClientRect` (fireworks-js uses `pageX - offsetLeft`, wrong for
  nested or scrolled canvases); pointer capture, so releasing outside the canvas ends the hold (fireworks-js can get
  stuck launching); `touch-action: none` on the canvas only while `click` is on, so dragging doesn't scroll.
- Ours: `mouse.projectile` (default `'rocket'`; `'chicken'` works) and `launchAt(x, y, type?, init?)` for code that
  wants a firework at a point (fireworks-js issue #101 asks for this).

### Reduced motion

- Option `reducedMotion: 'auto' | 'always' | 'ignore'` (default `'auto'`). Calm mode applies under `'auto'` when
  `prefers-reduced-motion: reduce` matches (followed live as the setting changes), or always under `'always'`.
- Calm mode: no auto-launch; sparks don't flicker (`flickering` treated as 0, crackle without flicker); the chicken
  doesn't flash while panicking. Manual and pointer launches still work.

### Demo site

1. **Pre-public review** (global rule), before the user flips visibility: secrets and personal data across the
   whole history, including any binary or archive (none so far). Commit emails already checked 2026-11-23: GitHub
   noreply addresses only. Findings reported; rewriting history, if ever needed, is the user's call.
2. The user makes the repo public (GitHub settings).
3. `npm run build:site` writes `site/` (git-ignored): the demo page loading `dist/xploders.mjs`, the dist files, a
   short "how to use" panel with links to the README and npm, and `.nojekyll`.
4. `npm run publish:site` commits `site/` to the `gh-pages` branch through a git worktree; nothing is pushed.
   The user pushes `gh-pages` and, once, sets Pages to deploy from that branch. GitHub then runs its own
   `pages-build-deployment` on each push of `gh-pages` (Actions minutes are free on a public repo).

### What can go wrong

- `matchMedia` missing (old browsers, Node): treated as no reduced-motion preference.
- Pointer capture unsupported: falls back to ending the hold on `pointerup`/`pointercancel`/`pointerleave`.
- `stop(true)`: also removes pointer listeners and the media-query listener.

### Tests

- Unit (Node, fake events): `click` launches towards the pointer up to `max` and stops on release or cancel; `move` aims auto-launches;
  `launchAt`; calm mode (auto-launch off, no flicker, no flash) and `'ignore'`/`'always'`; dispose removes listeners.
- Browser: real pointer drags on the demo launch at the pointer; `emulateMedia({reducedMotion: 'reduce'})` calms
  the demo, live; the built site loads from a static server with no errors.
- Demo: a Pointer toggle.

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
