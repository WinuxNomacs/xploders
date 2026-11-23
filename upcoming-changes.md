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

Rockets launched from the bottom with a trail, bursting into particles with gravity, friction, fade and a hue range.

- Options mirroring fireworks-js where they fit: `intensity` (auto-launch rate), `hue`, `gravity`, `friction`,
  `explosion` (particle count), `traceLength`, `autoresize`, `boundaries`, `opacity`/trail fade.
- `start/stop/pause/clear/launch(count)`, auto-launch mode, `waitStop()`-style graceful end.
- Burst styles (sphere, ring, willow...) per projectile; particle trails; DPR-correct rendering.
- Performance: object pooling for particles, a cap on live particles.
- Open: which burst styles to ship first.

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
