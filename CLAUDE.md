# xploders

Zero-dependency canvas library: fireworks, and projectiles (a chicken first) that explode into fireworks. Plain
JavaScript ES modules with JSDoc types; `.d.ts` generated from the JSDoc.

## Commands

- `npm run dev`: serves the repo root; demo at `/demo/` (loads `src/` directly, no build). `PORT` env var changes the
  port (default 8000).
- `npm run check`: lint, typecheck, unit tests, build, browser tests. Run before every merge.
- `npm test`: Vitest, Node only (`test/*.test.js`): pure logic, no DOM.
- `npm run test:browser`: Playwright against the demo on port 8123 (it starts and stops its own server). Uses
  `dist/`, so build first.
- `npm run build`: esbuild writes `dist/xploders.mjs` (ESM) and `dist/xploders.min.js` (IIFE, global `Xploders`),
  then `tsc` writes `dist/*.d.ts`.

## Structure

- `src/index.js`: public API (`Xploders` class, projectile registry). Everything exported here is public.
- `src/engine.js`: canvas, DPR scaling, fixed-step (1/60 s) loop, live projectiles and particles.
- `src/projectile.js`: base class for launched objects; `src/projectiles/` holds the built-in ones.
- `src/particle.js`, `src/sprite.js`, `src/random.js` (seedable RNG: use it, never `Math.random`, so seeded shows and
  tests repeat).
- `demo/`: the dev page; the browser tests drive it through `window.show`.

## Rules

- No runtime dependencies. Dev dependencies pinned exactly.
- Source stays plain JS that runs in the browser unbuilt; types come from JSDoc and must pass `tsc --noEmit`
  (strict, checkJs).
- Art: only original or properly licensed assets. No sprites ripped from games.
- Publishing is `npm publish` by the maintainer; nothing in this repo publishes on push (no CI workflows yet).
- Roadmap and decisions: `upcoming-changes.md`.
