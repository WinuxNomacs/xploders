# xploders

Fireworks, and things that explode into fireworks, on an HTML canvas. Plain JavaScript, zero runtime dependencies.

> Early development. The engine is a working skeleton: rockets and a placeholder chicken fly up and burst into
> particles. Proper fireworks and the pixel-art chicken come in the next phases (see
> [upcoming-changes.md](upcoming-changes.md)).

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
<canvas id="sky" style="width: 100%; height: 100vh"></canvas>
```

```js
import { Xploders } from 'xploders'

const show = new Xploders(document.getElementById('sky'), { gravity: 300, particles: 80 })
show.start()
show.launch('rocket', 5) // five fireworks
show.launch('chicken') // a chicken that explodes into fireworks

addEventListener('resize', () => show.resize())
```

### Options

| Option      | Default    | Meaning                                       |
| ----------- | ---------- | --------------------------------------------- |
| `gravity`   | `300`      | Downward acceleration, px/s²                  |
| `friction`  | `0.6`      | Share of particle speed kept per second (0-1) |
| `hue`       | `[0, 360]` | Hue range explosions pick from                |
| `particles` | `80`       | Particles per explosion                       |
| `seed`      | random     | Seed for a repeatable show                    |

### Methods

`start()`, `stop()`, `clear()`, `resize()`, `launch(type = 'rocket', count = 1)`. All return the instance.

### Custom projectiles

Extend `Projectile`, override `draw(ctx)` (and optionally `update(dt, gravity)` and `shouldExplode()`), then register
it:

```js
import { Xploders, Projectile } from 'xploders'

class Box extends Projectile {
  draw(ctx) {
    ctx.fillStyle = 'orange'
    ctx.fillRect(this.x - 5, this.y - 5, 10, 10)
  }
}
Xploders.register('box', Box)
show.launch('box')
```

## Development

Needs Node 20 or newer.

```sh
npm install
npx playwright install chromium   # once, for the browser tests
npm run dev                       # demo at http://127.0.0.1:8000/demo/ (PORT=... to change)
npm run check                     # lint, typecheck, unit tests, build, browser tests
```

Individual steps: `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npm run build` (writes `dist/`),
`npm run test:browser` (Playwright, starts its own server on port 8123; needs `npm run build` first).

## Credits

Inspired by [fireworks-js](https://fireworks.js.org/) (MIT) by Vitalij Ryndin; xploders is a separate implementation
that borrows its option names where they fit.

## Licence

MIT
