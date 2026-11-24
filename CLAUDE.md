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
- `npm run build:site`: build, then the demo site in `site/` (git-ignored), loading `dist/xploders.mjs`.
- `npm run publish:site`: builds the site and commits it to the `gh-pages` branch through a temporary worktree.
  Never pushes; pushing `gh-pages` publishes the site (GitHub Pages deploys from that branch).
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
  flip, rotation, white flash silhouette). `src/art/chicken.js`: the original chicken art as text grids;
  `src/feather.js`. `src/art/jug.js`: the Jug-o-BOOM art, painted into text grids with its lettering stamped from
  a 3x5 font; `src/projectiles/jug.js`, `src/shard.js`, `src/fireball.js` (the `fireball` burst's flames, glow and
  smoke).
- Two layers in `Engine.draw`: things with `layer: 'trail'` draw on an offscreen layer that fades per step; the
  visible canvas is cleared, gets that layer copied in, then `layer: 'sprite'` things draw crisp on top.
- `src/random.js`: seedable RNG. Anything that shapes the show uses the show's `Random`, never `Math.random`, so
  seeded shows repeat at any frame rate; draw-time randomness (flicker) uses the engine's separate `flickerRandom`.
- Option units are per 1/60 s step, matching fireworks-js's per-frame units; `test/motion.test.js` holds a port of
  its formulas as the reference.
- `src/pointer.js`: the fireworks-js `mouse` options (canvas listeners, pointer capture, CSS-box mapping). Reduced
  motion lives in `src/index.js` (`syncMotion`) and sets `engine.calm`.
- `demo/`: the dev page; the browser tests drive it through `window.show`. `scripts/build-site.js` turns it into the
  site by rewriting its `../src/index.js` import.

## Rules

- No runtime dependencies. Dev dependencies pinned exactly.
- Source stays plain JS that runs in the browser unbuilt; types come from JSDoc and must pass `tsc --noEmit`
  (strict, checkJs).
- Art: only original or properly licensed assets. No sprites ripped from games.
- Publishing is `npm publish` by the maintainer. No CI workflows: pushing `main` runs nothing; pushing `gh-pages`
  updates the demo site once Pages is set to deploy from it.
- Roadmap and decisions: `upcoming-changes.md`.
