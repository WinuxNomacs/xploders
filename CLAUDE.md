# xploders

Zero-dependency canvas library: fireworks, and projectiles (a chicken first) that explode into fireworks. Plain
JavaScript ES modules with JSDoc types; `.d.ts` generated from the JSDoc.

## Commands

- `npm run dev`: serves the repo root; demo at `/demo/` (loads `src/` directly, no build). Starts at `PORT`
  (default 8000) and moves to the next free port if it is taken; it prints the URL it used.
- `npm run check`: lint, typecheck, unit tests, build, browser tests. Run before every merge.
- `npm test`: Vitest, Node only (`test/*.test.js`): no DOM; `test/helpers.js` has a recording fake canvas and a
  scheduler the test drives frame by frame.
- `npm run test:browser`: Playwright against the demo on port 8123 (it starts and stops its own server). Uses
  `dist/`, so build first.
- `npm run build`: esbuild writes `dist/xploders.mjs` (ESM) and `dist/xploders.min.js` (IIFE, global `Xploders`),
  then `tsc` writes `dist/*.d.ts`.

## Structure

- `src/index.js`: public API (`Xploders` class, projectile registry). Everything exported here is public.
- `src/options.js`: defaults (fireworks-js names, shapes, defaults and units) and the deep merge.
- `src/engine.js`: canvas, DPR scaling, fixed-step (1/60 s) loop, auto-launch, particle cap, drawing.
- `src/projectile.js`: base class for launched objects (one `update()` per step; move with `moveTo`);
  `src/projectiles/` holds the built-in ones. `Rocket` reproduces fireworks-js `Trace` motion.
- `src/particle.js` (fireworks-js `Explosion` motion), `src/bursts.js` (burst styles).
- `src/sprite.js`: `parsePixels` (text grids to RGBA, pure) and `Sprite` (sheet built lazily on first draw, crisp,
  flip, white flash silhouette). `src/art/chicken.js`: the original chicken art as text grids; `src/feather.js`.
- Two layers in `Engine.draw`: things with `layer: 'trail'` draw on an offscreen layer that fades per step; the
  visible canvas is cleared, gets that layer copied in, then `layer: 'sprite'` things draw crisp on top.
- `src/random.js`: seedable RNG. Anything that shapes the show uses the show's `Random`, never `Math.random`, so
  seeded shows repeat at any frame rate; draw-time randomness (flicker) uses the engine's separate `flickerRandom`.
- Option units are per 1/60 s step, matching fireworks-js's per-frame units; `test/motion.test.js` holds a port of
  its formulas as the reference.
- `demo/`: the dev page; the browser tests drive it through `window.show`.

## Rules

- No runtime dependencies. Dev dependencies pinned exactly.
- Source stays plain JS that runs in the browser unbuilt; types come from JSDoc and must pass `tsc --noEmit`
  (strict, checkJs).
- Art: only original or properly licensed assets. No sprites ripped from games.
- Publishing is `npm publish` by the maintainer; nothing in this repo publishes on push (no CI workflows yet).
- Roadmap and decisions: `upcoming-changes.md`.
