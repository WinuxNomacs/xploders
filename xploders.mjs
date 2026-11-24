var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/particle.js
var _Particle = class _Particle {
  /** @param {ParticleInit} init */
  constructor(init) {
    this.x = init.x;
    this.y = init.y;
    this.angle = init.angle;
    this.speed = init.speed;
    this.hue = init.hue;
    this.brightness = init.brightness;
    this.decay = init.decay;
    this.friction = init.friction;
    this.gravity = init.gravity;
    this.lineWidth = init.lineWidth;
    this.flicker = init.flicker ?? false;
    this.crackleAt = init.crackleAt ?? 0;
    this.alpha = 1;
    this.coordinates = Array.from({ length: Math.max(1, Math.floor(init.trail)) }, () => [init.x, init.y]);
    this.dead = false;
    this.layer = "trail";
  }
  /**
   * Advances one step.
   * @returns {boolean} true when it should pop into sparks now (crackle)
   */
  update() {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.friction;
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed + this.gravity;
    this.alpha -= this.decay;
    if (this.crackleAt > 0 && this.alpha <= this.crackleAt) {
      this.dead = true;
      return true;
    }
    if (this.alpha <= this.decay) this.dead = true;
    return false;
  }
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {() => number} flickerRandom a [0, 1) source not tied to the simulation's seed
   */
  draw(ctx, flickerRandom) {
    const [tx, ty] = this.coordinates[this.coordinates.length - 1];
    const light = this.flicker ? flickerRandom() * this.brightness : this.brightness;
    ctx.beginPath();
    ctx.lineWidth = this.lineWidth;
    ctx.moveTo(tx, ty);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = `hsla(${this.hue}, 100%, ${light}%, ${this.alpha})`;
    ctx.stroke();
  }
};
__name(_Particle, "Particle");
var Particle = _Particle;

// src/random.js
var _Random = class _Random {
  /** @param {number} [seed] */
  constructor(seed) {
    this.state = (seed ?? Math.floor(Math.random() * 2 ** 32)) >>> 0;
  }
  /** @returns {number} a float in [0, 1) */
  next() {
    let t = this.state = this.state + 1831565813 >>> 0;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  /**
   * @param {number} min
   * @param {number} max
   * @returns {number} a float in [min, max)
   */
  range(min, max) {
    return min + (max - min) * this.next();
  }
  /**
   * @param {number} min
   * @param {number} max
   * @returns {number} an integer in [min, max]
   */
  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }
  /**
   * @template T
   * @param {readonly T[]} items non-empty
   * @returns {T}
   */
  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }
};
__name(_Random, "Random");
var Random = _Random;
function inRange(random, { min, max }, integer = false) {
  return integer ? random.int(min, max) : random.range(min, max);
}
__name(inRange, "inRange");

// src/sprite.js
function parsePixels(frames2, palette4) {
  if (frames2.length === 0) throw new Error("xploders: a sprite needs at least one frame");
  const frameHeight = frames2[0].length;
  const frameWidth = frames2[0][0]?.length ?? 0;
  if (frameWidth === 0) throw new Error("xploders: empty sprite frame");
  const width = frameWidth * frames2.length;
  const data = new Uint8ClampedArray(width * frameHeight * 4);
  const colours = /* @__PURE__ */ new Map();
  for (const [ch, css] of Object.entries(palette4)) colours.set(ch, css === null ? null : hexToRgb(css));
  frames2.forEach((rows, f) => {
    if (rows.length !== frameHeight) throw new Error(`xploders: frame ${f} has ${rows.length} rows, expected ${frameHeight}`);
    rows.forEach((row, y) => {
      if (row.length !== frameWidth) {
        throw new Error(`xploders: frame ${f} row ${y} is ${row.length} wide, expected ${frameWidth}`);
      }
      for (let x = 0; x < frameWidth; x++) {
        const ch = row[x];
        if (!colours.has(ch)) throw new Error(`xploders: frame ${f} row ${y} uses "${ch}", which is not in the palette`);
        const rgb = colours.get(ch);
        if (!rgb) continue;
        const i = (y * width + f * frameWidth + x) * 4;
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
        data[i + 3] = 255;
      }
    });
  });
  return { frameWidth, frameHeight, frames: frames2.length, data };
}
__name(parsePixels, "parsePixels");
function hexToRgb(css) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css);
  if (!m) throw new Error(`xploders: palette colour "${css}" is not #rgb or #rrggbb`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
__name(hexToRgb, "hexToRgb");
function createCanvas(w, h) {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
__name(createCanvas, "createCanvas");
function isReady(image) {
  if (typeof HTMLImageElement === "function" && image instanceof HTMLImageElement) {
    return image.complete && image.naturalWidth > 0;
  }
  return true;
}
__name(isReady, "isReady");
var _Sprite = class _Sprite {
  /**
   * @param {CanvasImageSource | null} image null when built lazily from pixels
   * @param {object} opts
   * @param {number} opts.frameWidth
   * @param {number} opts.frameHeight
   * @param {number} opts.frames number of frames in the sheet
   * @param {number} [opts.fps]
   */
  constructor(image, { frameWidth, frameHeight, frames: frames2, fps = 8 }) {
    this.image = image;
    this.flashImage = null;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frames = frames2;
    this.fps = fps;
    this.pixels = null;
  }
  /**
   * Builds a sprite from text grids. The sheet is made on first draw, so this
   * also works where there is no canvas (Node, server rendering).
   * @param {string[][]} frames
   * @param {Record<string, string | null>} palette
   * @param {number} [fps]
   */
  static fromPixels(frames2, palette4, fps = 8) {
    const pixels = parsePixels(frames2, palette4);
    const sprite2 = new _Sprite(null, { ...pixels, fps });
    sprite2.pixels = pixels;
    return sprite2;
  }
  /** Makes the sheet (and its flash silhouette) from pixels, once. */
  build() {
    if (this.image || !this.pixels) return;
    const { frameWidth, frameHeight, frames: frames2, data } = this.pixels;
    const w = frameWidth * frames2;
    const sheet = createCanvas(w, frameHeight);
    const flash = createCanvas(w, frameHeight);
    const white = new Uint8ClampedArray(data);
    for (let i = 0; i < white.length; i += 4) {
      if (white[i + 3]) white.fill(255, i, i + 3);
    }
    const sheetCtx = sheet.getContext("2d");
    const flashCtx = flash.getContext("2d");
    sheetCtx.putImageData(new ImageData(new Uint8ClampedArray(data), w, frameHeight), 0, 0);
    flashCtx.putImageData(new ImageData(white, w, frameHeight), 0, 0);
    this.image = sheet;
    this.flashImage = flash;
  }
  /**
   * @param {number} time seconds since the animation started
   * @returns {number} the frame index to show
   */
  frameAt(time) {
    return Math.floor(time * this.fps) % this.frames;
  }
  /**
   * Draws one frame centred on (x, y), snapped to whole pixels.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} frame
   * @param {number} x
   * @param {number} y
   * @param {object} [opts]
   * @param {number} [opts.scale] CSS pixels per sprite pixel
   * @param {boolean} [opts.flip] mirror horizontally
   * @param {boolean} [opts.flash] draw the white silhouette instead
   * @param {number} [opts.alpha]
   * @param {number} [opts.rotation] radians, clockwise, about the centre
   */
  draw(ctx, frame, x, y, { scale = 1, flip = false, flash = false, alpha = 1, rotation = 0 } = {}) {
    this.build();
    const image = flash && this.flashImage ? this.flashImage : this.image;
    if (!image || !isReady(image)) return;
    const w = this.frameWidth * scale;
    const h = this.frameHeight * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (rotation) ctx.rotate(rotation);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(image, frame % this.frames * this.frameWidth, 0, this.frameWidth, this.frameHeight, -Math.round(w / 2), -Math.round(h / 2), w, h);
    ctx.restore();
  }
};
__name(_Sprite, "Sprite");
var Sprite = _Sprite;

// src/fireball.js
var DOT = 64;
var dots = /* @__PURE__ */ new Map();
function softDot(key, stops) {
  let dot = dots.get(key);
  if (!dot) {
    dot = createCanvas(DOT, DOT);
    const c = dot.getContext("2d");
    const g = c.createRadialGradient(DOT / 2, DOT / 2, 0, DOT / 2, DOT / 2, DOT / 2);
    for (const [at, colour] of stops) g.addColorStop(at, colour);
    c.fillStyle = g;
    c.fillRect(0, 0, DOT, DOT);
    dots.set(key, dot);
  }
  return dot;
}
__name(softDot, "softDot");
function drawDot(ctx, dot, x, y, r, alpha) {
  if (!(alpha > 0) || !(r > 0)) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.drawImage(dot, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}
__name(drawDot, "drawDot");
var FLAME_STEPS = 24;
var BLUE_LEVELS = 4;
var COOLING = (
  /** @type {[number, [number, number, number]][]} */
  [
    [0, [255, 245, 200]],
    // white-yellow
    [0.15, [255, 185, 50]],
    // bright orange-yellow
    [0.55, [235, 90, 20]],
    // orange-red
    [1, [140, 25, 5]]
    // deep red
  ]
);
var BLUE_WHITE = (
  /** @type {[number, number, number]} */
  [185, 210, 255]
);
function flameColour(t, hold) {
  const keys = (
    /** @type {[number, [number, number, number]][]} */
    [
      [0, BLUE_WHITE],
      ...COOLING.map(([at, c]) => (
        /** @type {[number, [number, number, number]]} */
        [hold + at * (1 - hold), c]
      ))
    ]
  );
  let i = 1;
  while (i < keys.length - 1 && t > keys[i][0]) i++;
  const [a, ca] = keys[i - 1];
  const [b, cb] = keys[i];
  const f = b > a ? Math.min(1, Math.max(0, (t - a) / (b - a))) : 1;
  return (
    /** @type {[number, number, number]} */
    ca.map((v, k) => Math.round(v + (cb[k] - v) * f))
  );
}
__name(flameColour, "flameColour");
var _Flame = class _Flame {
  /** @param {FlameInit} init */
  constructor({ x, y, angle, speed, radius, life, buoyancy = _Flame.BUOYANCY, blue = 0 }) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius0 = radius;
    this.life = life;
    this.buoyancy = buoyancy;
    this.hold = 0.06 + 0.24 * (Math.round(Math.min(1, Math.max(0, blue)) * (BLUE_LEVELS - 1)) / (BLUE_LEVELS - 1));
    this.age = 0;
    this.dead = false;
    this.layer = "trail";
  }
  /** @returns {number} 0 at birth, 1 at death */
  get t() {
    return Math.min(1, this.age / this.life);
  }
  /** @returns {[number, number, number]} red, green, blue now */
  get colour() {
    return flameColour(this.t, this.hold);
  }
  get radius() {
    return this.radius0 * (0.6 + 0.9 * this.t);
  }
  get alpha() {
    return _Flame.MAX_ALPHA * (1 - this.t) ** 1.5;
  }
  /** @returns {boolean} never pops */
  update() {
    this.vx *= _Flame.FRICTION;
    this.vy = this.vy * _Flame.FRICTION - this.buoyancy * Math.min(1, this.age / _Flame.RISE_AFTER);
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    if (this.age >= this.life) this.dead = true;
    return false;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const step = Math.min(FLAME_STEPS - 1, Math.floor(this.t * FLAME_STEPS));
    const colour = flameColour(step / (FLAME_STEPS - 1), this.hold).join(", ");
    const dot = softDot(`flame${colour}`, [
      [0, `rgba(${colour}, 1)`],
      [1, `rgba(${colour}, 0)`]
    ]);
    drawDot(ctx, dot, this.x, this.y, this.radius, this.alpha);
  }
};
__name(_Flame, "Flame");
__publicField(_Flame, "BUOYANCY", 0.06);
// upward px/step^2
__publicField(_Flame, "FRICTION", 0.9);
/** Below 1 so the yellow shows where only a few flames overlap, not just white. */
__publicField(_Flame, "MAX_ALPHA", 0.8);
/** Steps before it rises at full buoyancy, so the blast stays round first. */
__publicField(_Flame, "RISE_AFTER", 15);
var Flame = _Flame;
var _Flash = class _Flash {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius px at its biggest
   */
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.maxRadius = radius;
    this.age = 0;
    this.dead = false;
    this.layer = "trail";
  }
  get t() {
    return Math.min(1, this.age / _Flash.LIFE);
  }
  /** @returns {boolean} never pops */
  update() {
    this.age++;
    if (this.age >= _Flash.LIFE) this.dead = true;
    return false;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const t = this.t;
    const dot = softDot("flash", [
      [0, "rgba(255, 255, 255, 1)"],
      [0.35, "rgba(255, 255, 255, 0.9)"],
      [1, "rgba(255, 255, 255, 0)"]
    ]);
    drawDot(ctx, dot, this.x, this.y, this.maxRadius * (0.6 + 0.4 * t), (1 - t) ** 2);
  }
};
__name(_Flash, "Flash");
__publicField(_Flash, "LIFE", 9);
var Flash = _Flash;
var _Core = class _Core {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} reach px it grows to, following the flames
   * @param {number} radius px at the start
   */
  constructor(x, y, reach, radius) {
    this.x = x;
    this.y = y;
    this.reach = reach;
    this.radius0 = radius;
    this.age = 0;
    this.dead = false;
    this.layer = "sprite";
    this.behind = true;
  }
  get t() {
    return Math.min(1, this.age / _Core.LIFE);
  }
  get alpha() {
    return _Core.MAX_ALPHA * Math.min(1, this.age / 2) * (1 - this.t) ** 1.5;
  }
  get radius() {
    return this.radius0 + this.reach * (1 - Flame.FRICTION ** this.age);
  }
  /** @returns {boolean} never pops */
  update() {
    this.age++;
    if (this.age >= _Core.LIFE) this.dead = true;
    return false;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const dot = softDot("core", [
      [0, "rgba(120, 170, 255, 1)"],
      [0.55, "rgba(70, 120, 255, 0.7)"],
      [1, "rgba(50, 90, 255, 0)"]
    ]);
    drawDot(ctx, dot, this.x, this.y, this.radius, this.alpha);
  }
};
__name(_Core, "Core");
__publicField(_Core, "LIFE", 26);
__publicField(_Core, "MAX_ALPHA", 0.75);
var Core = _Core;
var _Glow = class _Glow {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius px when fully swollen
   */
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.maxRadius = radius;
    this.age = 0;
    this.dead = false;
    this.layer = "trail";
  }
  get t() {
    return Math.min(1, this.age / _Glow.LIFE);
  }
  /** @returns {boolean} never pops */
  update() {
    this.age++;
    if (this.age >= _Glow.LIFE) this.dead = true;
    return false;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const t = this.t;
    const dot = softDot("glow", [
      [0, "hsla(50, 100%, 90%, 1)"],
      [0.4, "hsla(30, 100%, 60%, 0.6)"],
      [1, "hsla(15, 100%, 50%, 0)"]
    ]);
    drawDot(ctx, dot, this.x, this.y, this.maxRadius * (1 - (1 - t) ** 3) + 1, 0.55 * (1 - t));
  }
};
__name(_Glow, "Glow");
__publicField(_Glow, "LIFE", 28);
var Glow = _Glow;
var _Smoke = class _Smoke {
  /** @param {SmokeInit} init */
  constructor({ x, y, delay, life, drift, rise, radius }) {
    this.x = x;
    this.y = y;
    this.delay = delay;
    this.life = life;
    this.vx = drift;
    this.vy = -rise;
    this.radius0 = radius;
    this.age = -delay;
    this.dead = false;
    this.layer = "sprite";
    this.behind = true;
  }
  /** @returns {boolean} never pops */
  update() {
    this.age++;
    if (this.age > 0) {
      this.vx *= 0.98;
      this.x += this.vx;
      this.y += this.vy;
    }
    if (this.age >= this.life) this.dead = true;
    return false;
  }
  get alpha() {
    if (this.age <= 0) return 0;
    return _Smoke.MAX_ALPHA * Math.min(1, this.age / 12) * (1 - this.age / this.life);
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const dot = softDot("smoke", [
      [0, "hsla(20, 6%, 38%, 1)"],
      [1, "hsla(20, 6%, 38%, 0)"]
    ]);
    drawDot(ctx, dot, this.x, this.y, this.radius0 * (1 + 1.5 * this.age / this.life), this.alpha);
  }
};
__name(_Smoke, "Smoke");
__publicField(_Smoke, "MAX_ALPHA", 0.35);
var Smoke = _Smoke;

// src/bursts.js
var GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
var FIREBALL_SPEED = 6;
function particle({ x, y, hue, options: o, random: r, size = 1 }, overrides = {}) {
  const init = {
    x,
    y,
    angle: r.range(0, Math.PI * 2),
    speed: r.int(1, 10),
    hue,
    brightness: inRange(r, o.brightness, true),
    decay: inRange(r, o.decay),
    friction: o.friction,
    gravity: o.gravity,
    trail: o.explosion,
    lineWidth: inRange(r, o.lineWidth.explosion),
    flicker: r.int(0, 100) <= o.flickering,
    ...overrides
  };
  return new Particle({ ...init, speed: init.speed * size });
}
__name(particle, "particle");
var bursts = {
  peony: /* @__PURE__ */ __name((c) => Array.from({ length: c.count }, () => particle(c)), "peony"),
  // Evenly spaced angles and one shared speed: friction and gravity act the same
  // on every particle, so the ring stays a circle as it drifts and fades.
  ring: /* @__PURE__ */ __name((c) => {
    const speed = c.random.range(6, 9);
    const decay = inRange(c.random, c.options.decay);
    const offset = c.random.range(0, Math.PI * 2);
    return Array.from(
      { length: c.count },
      (_, i) => particle(c, { angle: offset + i / c.count * Math.PI * 2, speed, decay })
    );
  }, "ring"),
  // Long-lived gold strands that droop further than a peony.
  willow: /* @__PURE__ */ __name((c) => Array.from(
    { length: c.count },
    () => particle(c, {
      hue: c.random.range(35, 48),
      speed: c.random.range(2, 8),
      decay: inRange(c.random, c.options.decay) * 0.4,
      friction: Math.max(c.options.friction, 0.96),
      gravity: c.options.gravity * 0.5,
      trail: c.options.explosion * 3,
      brightness: c.random.range(55, 70),
      flicker: false
    })
  ), "willow"),
  // Flickers, then each particle pops into a few tiny sparks near the end.
  crackle: /* @__PURE__ */ __name((c) => Array.from({ length: c.count }, () => particle(c, { flicker: true, crackleAt: c.random.range(0.2, 0.4) })), "crackle"),
  // A ball of fire: a white flash and a glow, then flames blasting out as a
  // round ball (a sunflower spread fills the disc evenly; one shared friction
  // keeps it round as it grows) around a blue heart; then they rise
  // and cool to red, with gold embers, then smoke as the flames die. Its own
  // colours; the hue is unused. Under reduced motion there is no flash of light.
  fireball: /* @__PURE__ */ __name((c) => {
    const r = c.random;
    const s = c.size ?? 1;
    const smoke = Math.floor(c.count * 0.15);
    const embers = Math.floor(c.count * 0.25);
    const flames = Math.max(1, c.count - smoke - embers - (c.calm ? 1 : 3));
    const offset = r.range(0, Math.PI * 2);
    return [
      ...c.calm ? [] : [new Flash(c.x, c.y, 45 * s), new Glow(c.x, c.y, 120 * s)],
      new Core(c.x, c.y, FIREBALL_SPEED * 10 * 0.6 * s, 20 * s),
      ...Array.from({ length: flames }, (_, i) => {
        const reach = Math.sqrt((i + 0.5) / flames);
        return new Flame({
          x: c.x + r.range(-4, 4) * s,
          y: c.y + r.range(-4, 4) * s,
          angle: offset + i * GOLDEN_ANGLE + r.range(-0.15, 0.15),
          speed: FIREBALL_SPEED * reach * r.range(0.92, 1.08) * s,
          radius: r.range(14, 28) * s,
          life: r.int(45, 80),
          buoyancy: Flame.BUOYANCY * s,
          blue: 1 - reach
        });
      }),
      ...Array.from(
        { length: embers },
        () => particle(c, {
          hue: r.range(25, 45),
          speed: r.range(2, 9),
          brightness: r.range(60, 75),
          decay: r.range(0.02, 0.04),
          gravity: c.options.gravity * 0.6,
          flicker: true
        })
      ),
      ...Array.from(
        { length: smoke },
        () => new Smoke({
          x: c.x + r.range(-35, 35) * s,
          y: c.y + r.range(-30, 5) * s,
          delay: r.int(25, 45),
          life: r.int(60, 90),
          drift: r.range(-0.6, 0.6) * s,
          rise: r.range(0.4, 0.9) * s,
          radius: r.range(16, 26) * s
        })
      )
    ];
  }, "fireball")
};
function crackleSparks(parent, r, max) {
  return Array.from(
    { length: Math.max(0, Math.min(max, r.int(3, 5))) },
    () => new Particle({
      x: parent.x,
      y: parent.y,
      angle: r.range(0, Math.PI * 2),
      speed: r.range(1, 3),
      hue: parent.hue,
      brightness: 85,
      decay: r.range(0.06, 0.1),
      friction: 0.9,
      gravity: parent.gravity * 0.5,
      trail: 2,
      lineWidth: 1,
      flicker: true
    })
  );
}
__name(crackleSparks, "crackleSparks");

// src/engine.js
var STEP_MS = 1e3 / 60;
var MAX_FRAME_MS = 250;
var _Engine = class _Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./options.js').Options} options live options object (updated in place)
   * @param {Random} random seeded generator for everything that shapes the show
   * @param {Partial<Env>} [env] injectable for tests
   */
  constructor(canvas, options, random, env = {}) {
    /** @type {string | undefined} the unknown mouse.projectile already warned about */
    __publicField(this, "warnedProjectile");
    /** @type {ProjectileClass | undefined} set by Xploders */
    __publicField(this, "defaultProjectile");
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("xploders: canvas 2D context unavailable");
    this.ctx = ctx;
    this.options = options;
    this.random = random;
    this.calm = false;
    const flicker = new Random();
    this.flickerRandom = () => this.calm ? 1 : flicker.next();
    this.pointer = null;
    this.resolve = () => void 0;
    this.raf = env.raf ?? ((cb) => requestAnimationFrame(cb));
    this.caf = env.caf ?? ((id) => cancelAnimationFrame(id));
    this.now = env.now ?? (() => performance.now());
    this.trail = (env.createCanvas ?? createCanvas)(1, 1);
    const trailCtx = this.trail.getContext("2d");
    if (!trailCtx) throw new Error("xploders: canvas 2D context unavailable");
    this.trailCtx = /** @type {any} */
    trailCtx;
    this.projectiles = [];
    this.particles = [];
    this.width = 0;
    this.height = 0;
    this.running = false;
    this.autoLaunch = false;
    this.launchClock = 0;
    this.launchAt = 0;
    this.accumulator = 0;
    this.lastTime = 0;
    this.pendingSteps = 0;
    this.frameId = null;
    this.onEmpty = null;
    this.tick = this.tick.bind(this);
  }
  /**
   * Sets the drawing size in CSS pixels and the matching backing store.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    const dpr = globalThis.devicePixelRatio || 1;
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    for (
      const [c, ctx] of
      /** @type {const} */
      [
        [this.canvas, this.ctx],
        [this.trail, this.trailCtx]
      ]
    ) {
      c.width = Math.round(this.width * dpr);
      c.height = Math.round(this.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.options.boundaries.width = this.width;
    this.options.boundaries.height = this.height;
  }
  get empty() {
    return this.projectiles.length === 0 && this.particles.length === 0;
  }
  startLoop() {
    if (this.running) return;
    this.running = true;
    this.lastTime = this.now();
    this.accumulator = 0;
    this.frameId = this.raf(this.tick);
  }
  stopLoop() {
    this.running = false;
    if (this.frameId !== null) this.caf(this.frameId);
    this.frameId = null;
  }
  clear() {
    this.projectiles.length = 0;
    this.particles.length = 0;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.trailCtx.clearRect(0, 0, this.width, this.height);
  }
  /** @param {number} now */
  tick(now) {
    if (!this.running) return;
    this.accumulator += Math.min(Math.max(0, now - this.lastTime), MAX_FRAME_MS);
    this.lastTime = now;
    try {
      while (this.accumulator >= STEP_MS) {
        this.step();
        this.accumulator -= STEP_MS;
        this.pendingSteps++;
      }
      if (this.pendingSteps > 0) this.draw(this.pendingSteps);
    } catch (error) {
      console.error("xploders: a frame failed", error);
      this.accumulator = 0;
    }
    this.pendingSteps = 0;
    if (this.running) this.frameId = this.raf(this.tick);
    if (this.empty && this.onEmpty) this.onEmpty();
  }
  /** One fixed 1/60 s step of the whole show. */
  step() {
    const o = this.options;
    if (this.pointer?.active && o.mouse.click && this.projectiles.length < o.mouse.max) {
      const Cls = this.resolve(o.mouse.projectile);
      if (Cls) this.launch(1, Cls);
      else if (this.warnedProjectile !== o.mouse.projectile) {
        this.warnedProjectile = o.mouse.projectile;
        console.warn(`xploders: mouse.projectile "${o.mouse.projectile}" is not a registered type; nothing launched`);
      }
    }
    if (this.autoLaunch && !this.calm && o.intensity > 0) {
      this.launchClock += STEP_MS * o.intensity * Math.PI / 1e3;
      if (this.launchClock > this.launchAt) {
        this.launch(1);
        this.launchClock = 0;
        this.launchAt = inRange(this.random, o.delay, true);
      }
    }
    const projectiles = this.projectiles;
    this.projectiles = [];
    for (const p of projectiles) {
      if (p.exploded) continue;
      try {
        p.update();
        if (p.shouldExplode()) {
          p.exploded = true;
          p.explode(this);
        } else {
          this.projectiles.push(p);
        }
      } catch (error) {
        console.error("xploders: removed a projectile that threw", error);
      }
    }
    const particles = this.particles;
    this.particles = [];
    let live = particles.length;
    let failed = 0;
    let firstError;
    for (const p of particles) {
      try {
        if (p.update() && p instanceof Particle) {
          const sparks = crackleSparks(p, this.random, Math.floor(this.options.maxParticles) - live + 1);
          this.particles.push(...sparks);
          live += sparks.length;
        }
      } catch (error) {
        if (!failed++) firstError = error;
        live--;
        continue;
      }
      if (p.dead) live--;
      else this.particles.push(p);
    }
    if (failed) console.error(`xploders: removed ${failed} particle(s) that threw`, firstError);
  }
  /** @returns {number} how many more particles fit under maxParticles */
  capacity() {
    return Math.max(0, Math.floor(this.options.maxParticles) - this.particles.length);
  }
  /**
   * Launches projectiles from `rocketsPoint` at the bottom edge towards random
   * targets inside the boundaries, as fireworks-js does.
   * @param {number} count
   * @param {ProjectileClass} [Cls] defaults to the class registered as 'rocket'
   * @param {Record<string, any>} [extra] merged into each projectile's init (e.g. chicken options)
   */
  launch(count, Cls = this.defaultProjectile, extra = {}) {
    if (!Cls || this.width <= 0 || this.height <= 0) return;
    const o = this.options;
    const r = this.random;
    const b = o.boundaries;
    for (let i = 0; i < count && this.projectiles.length < o.maxProjectiles; i++) {
      const x = this.width * inRange(r, o.rocketsPoint, true) / 100;
      const target = this.pointer?.target() ?? {
        x: r.int(Math.min(b.x, b.width - b.x * 2), Math.max(b.x, b.width - b.x * 2)),
        y: r.int(Math.min(b.y, b.height * 0.5), Math.max(b.y, b.height * 0.5))
      };
      const size = { width: this.width, height: this.height };
      const hue = inRange(r, o.hue, true);
      this.projectiles.push(new Cls({ x, y: this.height, target, size, hue, options: o, random: r, engine: this, ...extra }));
    }
  }
  /**
   * Adds an explosion's particles, trimmed to fit under `maxParticles`.
   * @param {number} x
   * @param {number} y
   * @param {number} hue
   * @param {import('./options.js').BurstStyle} [style] defaults to the `burst` option
   * @param {number} [size] how far it spreads, 1 by default
   */
  burst(x, y, hue, style, size = 1) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const o = this.options;
    const choice = style ?? (Array.isArray(o.burst) ? this.random.pick(o.burst) : o.burst);
    const make = bursts[choice] ?? bursts.peony;
    const count = Math.min(Math.floor(o.particles), this.capacity());
    if (count <= 0) return;
    this.particles.push(...make({ x, y, hue, count, options: o, random: this.random, calm: this.calm, size }).slice(0, this.capacity()));
  }
  /**
   * Adds particles of any kind (feathers...), as many as fit under `maxParticles`.
   * @param {ParticleLike[]} particles
   */
  addParticles(particles) {
    this.particles.push(...particles.slice(0, this.capacity()));
  }
  /** @param {number} steps physics steps since the last draw */
  draw(steps) {
    const { ctx, trailCtx: tc, width, height, options: o } = this;
    if (width <= 0 || height <= 0 || this.canvas.width === 0 || this.canvas.height === 0) return;
    const fade = 1 - (1 - o.opacity) ** steps;
    tc.globalCompositeOperation = "destination-out";
    tc.fillStyle = `rgba(0, 0, 0, ${fade})`;
    tc.fillRect(0, 0, width, height);
    tc.globalCompositeOperation = "lighter";
    tc.lineCap = o.lineStyle;
    tc.lineJoin = "round";
    this.drawLayer(tc, "trail");
    tc.globalCompositeOperation = "source-over";
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.trail, 0, 0);
    ctx.restore();
    if (o.boundaries.debug) {
      const b = o.boundaries;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.width - b.x * 3, b.height * 0.5 - b.y);
    }
    this.drawLayer(ctx, "sprite");
  }
  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {'trail' | 'sprite'} layer
   */
  drawLayer(ctx, layer) {
    const mine = this.particles.filter((p) => (p.layer ?? "trail") === layer);
    let failed = this.drawParticles(ctx, mine.filter((p) => p.behind));
    for (const p of this.projectiles) {
      if (p.layer !== layer) continue;
      try {
        p.draw(ctx);
      } catch (error) {
        console.error("xploders: removed a projectile that threw while drawing", error);
        this.projectiles = this.projectiles.filter((q) => q !== p);
      }
    }
    failed += this.drawParticles(ctx, mine.filter((p) => !p.behind));
    if (failed) this.particles = this.particles.filter((p) => !p.dead);
  }
  /**
   * Draws particles; one that throws is marked dead and the first error logged.
   * @param {CanvasRenderingContext2D} ctx
   * @param {ParticleLike[]} list
   * @returns {number} how many failed
   */
  drawParticles(ctx, list) {
    let failed = 0;
    for (const p of list) {
      try {
        p.draw(ctx, this.flickerRandom);
      } catch (error) {
        if (!failed++) console.error("xploders: removed a particle that threw while drawing", error);
        p.dead = true;
      }
    }
    return failed;
  }
};
__name(_Engine, "Engine");
var Engine = _Engine;

// src/options.js
function defaultOptions() {
  return {
    intensity: 30,
    delay: { min: 30, max: 60 },
    rocketsPoint: { min: 50, max: 50 },
    traceSpeed: 10,
    acceleration: 1.05,
    traceLength: 3,
    hue: { min: 0, max: 360 },
    particles: 50,
    explosion: 5,
    friction: 0.95,
    gravity: 1.5,
    decay: { min: 0.015, max: 0.03 },
    brightness: { min: 50, max: 80 },
    flickering: 50,
    lineWidth: { trace: { min: 1, max: 2 }, explosion: { min: 1, max: 3 } },
    lineStyle: "round",
    opacity: 0.5,
    boundaries: { x: 50, y: 50, width: 0, height: 0, debug: false },
    autoresize: true,
    burst: "peony",
    maxParticles: 4e3,
    maxProjectiles: 100,
    mouse: { click: false, move: false, max: 1, projectile: "rocket" },
    reducedMotion: "auto"
  };
}
__name(defaultOptions, "defaultOptions");
var UNSAFE_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
var isPlainObject = /* @__PURE__ */ __name((v) => typeof v === "object" && v !== null && !Array.isArray(v), "isPlainObject");
function deepMerge(target, source) {
  const t = target;
  for (const [key, value] of Object.entries(source)) {
    if (value === void 0 || UNSAFE_KEYS.has(key)) continue;
    if (isPlainObject(value) && isPlainObject(t[key])) deepMerge(t[key], value);
    else t[key] = Array.isArray(value) ? [...value] : value;
  }
  return target;
}
__name(deepMerge, "deepMerge");

// src/projectile.js
var _Projectile = class _Projectile {
  /** @param {ProjectileInit} init */
  constructor({ x, y, target, size, hue, options, random, engine }) {
    this.engine = engine;
    this.x = x;
    this.y = y;
    this.target = target;
    this.size = size;
    this.layer = "trail";
    this.hue = hue;
    this.options = options;
    this.random = random;
    this.age = 0;
    this.exploded = false;
    this.burst = void 0;
    const g = _Projectile.gravity;
    const rise = Math.max(0, y - target.y);
    const v = (g + Math.sqrt(g * g + 8 * g * rise)) / 2;
    this.vy = -v;
    const steps = rise > 0 ? v / g : 1;
    this.vx = (target.x - x) / steps;
  }
  update() {
    this.vy += _Projectile.gravity;
    this.moveTo(this.x + this.vx, this.y + this.vy);
    this.age++;
  }
  /**
   * Subclasses move through this rather than assigning `x`/`y` (in a JS
   * subclass, that assignment would declare a new property for the type checker).
   * @param {number} x
   * @param {number} y
   */
  moveTo(x, y) {
    this.x = x;
    this.y = y;
  }
  /** Default trigger: the top of the arc. */
  shouldExplode() {
    return this.vy >= 0;
  }
  /**
   * Called once when `shouldExplode` first returns true.
   * @param {import('./engine.js').Engine} engine
   */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst);
  }
  /**
   * @param {CanvasRenderingContext2D} _ctx
   */
  draw(_ctx) {
  }
};
__name(_Projectile, "Projectile");
/** Downward acceleration of the default arc, px/step^2. */
__publicField(_Projectile, "gravity", 0.15);
var Projectile = _Projectile;

// src/projectiles/rocket.js
var _Rocket = class _Rocket extends Projectile {
  /** @param {import('../projectile.js').ProjectileInit} init */
  constructor(init) {
    super(init);
    const { options: o } = init;
    this.sx = init.x;
    this.sy = init.y;
    this.speed = o.traceSpeed;
    this.acceleration = o.acceleration;
    this.angle = Math.atan2(init.target.y - init.y, init.target.x - init.x);
    this.totalDistance = Math.hypot(init.target.x - init.x, init.target.y - init.y);
    this.brightness = init.random.int(50, 70);
    this.arrived = false;
    this.lineWidth = inRange(init.random, o.lineWidth.trace);
    this.coordinates = Array.from({ length: Math.max(1, Math.floor(o.traceLength)) }, () => [init.x, init.y]);
  }
  update() {
    this.coordinates.pop();
    this.coordinates.unshift([this.x, this.y]);
    this.speed *= this.acceleration;
    const vx = Math.cos(this.angle) * this.speed;
    const vy = Math.sin(this.angle) * this.speed;
    if (Math.hypot(this.x + vx - this.sx, this.y + vy - this.sy) >= this.totalDistance) {
      this.moveTo(this.target.x, this.target.y);
      this.arrived = true;
    } else {
      this.moveTo(this.x + vx, this.y + vy);
    }
    this.age++;
  }
  shouldExplode() {
    return this.arrived;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const [tx, ty] = this.coordinates[this.coordinates.length - 1];
    ctx.beginPath();
    ctx.lineWidth = this.lineWidth;
    ctx.moveTo(tx, ty);
    ctx.lineTo(this.x, this.y);
    ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, 1)`;
    ctx.stroke();
  }
};
__name(_Rocket, "Rocket");
var Rocket = _Rocket;

// src/feather.js
var sprite = Sprite.fromPixels(
  [
    ["...w", "..wg", ".wg.", "g..."],
    ["....", "wwww", ".ggg", "...."],
    ["w...", "gw..", ".gw.", "...g"]
  ],
  { ".": null, w: "#ffffff", g: "#c8c6d8" }
);
var _Feather = class _Feather {
  /** @param {FeatherInit} init */
  constructor({ x, y, scale, random: r }) {
    const angle = r.range(0, Math.PI * 2);
    const speed = r.range(2.5, 6);
    this.baseX = x;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5;
    this.scale = scale;
    this.swayAmp = r.range(6, 12);
    this.swayFreq = r.range(0.05, 0.08);
    this.phase = r.range(0, Math.PI * 2);
    this.life = r.int(120, 180);
    this.age = 0;
    this.dead = false;
    this.layer = "sprite";
  }
  /** @returns {boolean} never pops */
  update() {
    this.vx *= 0.92;
    this.vy = Math.min(this.vy * 0.92 + 0.05, _Feather.FALL_SPEED);
    this.baseX += this.vx;
    this.y += this.vy;
    this.age++;
    this.x = this.baseX + Math.sin(this.age * this.swayFreq + this.phase) * this.swayAmp;
    if (this.age >= this.life) this.dead = true;
    return false;
  }
  /** Which pose: the way it is swinging. */
  get frame() {
    const swing = Math.cos(this.age * this.swayFreq + this.phase);
    return swing > 0.35 ? 0 : swing < -0.35 ? 2 : 1;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = Math.min(1, (this.life - this.age) / _Feather.FADE_STEPS);
    sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, alpha });
  }
};
__name(_Feather, "Feather");
__publicField(_Feather, "FALL_SPEED", 0.7);
// px/step, slow and steady
__publicField(_Feather, "FADE_STEPS", 40);
var Feather = _Feather;

// src/art/chicken.js
var palette = {
  ".": null,
  k: "#2b1e24",
  // outline
  w: "#ffffff",
  // feathers
  g: "#c8c6d8",
  // shade
  s: "#8f8ca8",
  // deep shade
  r: "#e8323a",
  // comb and wattle
  y: "#f7b02f",
  // beak and feet
  o: "#c86f14"
  // beak and feet shade
};
var body = [
  "................",
  "..........r.r...",
  ".........krrrk..",
  "........kwwwwwk.",
  "........kwwwkwyy",
  "........kwwwwwko",
  ".kk.....kwwwwrk.",
  "kwwk....kwwwwrk.",
  "kwgwk..kwwwwwk..",
  "kwggwkkwwwwwwk..",
  ".kwgwwwwwwwwwk..",
  ".kwggwwwwwwwgk..",
  "..kgggwwwwwggk..",
  "...kkgggggggk...",
  ".....kykkyk.....",
  ".....yo..yo....."
];
var wingMid = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....kkkkk.......",
  "...kwwwwgk......",
  "...kwwwggk......",
  "....kgggk.......",
  ".....kkk........",
  "................",
  "................"
];
var wingUp = [
  "................",
  "................",
  "...k.k.k........",
  "..kwkwkwk.......",
  "..kwwwwgk.......",
  "...kwwggk.......",
  "...kwggsk.......",
  "....kgssk.......",
  "....kssk........",
  ".....kk.........",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];
var wingDown = [
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "....kkkkkk......",
  "....kwwwwgk.....",
  ".....kwggsk.....",
  "......kgsk......",
  ".......kk.......",
  "................"
];
var panicFace = [
  ".........r.r.r..",
  "................",
  "................",
  "................",
  "...........kk.yy",
  "...........kk..y",
  "..............yo",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................"
];
var ruffle = [
  "................",
  "................",
  "..............w.",
  "................",
  "................",
  "................",
  "w...............",
  "................",
  "................",
  "................",
  "...............w",
  "................",
  "................",
  "..............w.",
  "................",
  "................"
];
function compose(base, ...overlays) {
  return base.map(
    (row, y) => [...row].map((ch, x) => {
      let out = ch;
      for (const o of overlays) {
        const c = o[y][x];
        if (c === " ") out = ".";
        else if (c !== ".") out = c;
      }
      return out;
    }).join("")
  );
}
__name(compose, "compose");
var flapFrames = [compose(body, wingUp), compose(body, wingMid), compose(body, wingDown), compose(body, wingMid)];
var panicFrames = [compose(body, wingUp, panicFace, ruffle), compose(body, wingDown, panicFace)];

// src/projectiles/chicken.js
var FLAP_FPS = 12;
var PANIC_FPS = 20;
var _Chicken = class _Chicken extends Projectile {
  /** @param {import('../projectile.js').ProjectileInit & ChickenOptions} init */
  constructor(init) {
    super(init);
    const d = _Chicken.defaults;
    const r = init.random;
    this.layer = /** @type {const} */
    "sprite";
    this.scale = init.scale ?? d.scale;
    this.speed = init.speed ?? d.speed;
    this.panicSteps = init.panicSteps ?? d.panicSteps;
    this.featherCount = init.feathers ?? d.feathers;
    const flight = init.flight ?? d.flight;
    this.flight = flight === "random" ? r.next() < 0.5 ? "rise" : "cross" : flight;
    const half = _Chicken.sprite.frameWidth * this.scale / 2;
    if (this.flight === "cross") {
      const fromLeft = r.next() < 0.5;
      const startY = init.target.y + r.range(-40, 40);
      this.startX = fromLeft ? -half : init.size.width + half;
      this.startY = Math.min(Math.max(startY, half), Math.max(half, init.size.height * 0.6));
    } else {
      this.startX = init.x;
      this.startY = init.y + half;
    }
    this.moveTo(this.startX, this.startY);
    const dx = init.target.x - this.startX;
    const dy = init.target.y - this.startY;
    this.distance = Math.hypot(dx, dy);
    this.dirX = this.distance ? dx / this.distance : 0;
    this.dirY = this.distance ? dy / this.distance : -1;
    this.travelled = 0;
    this.flip = dx < 0 || dx === 0 && r.next() < 0.5;
    this.bobAmp = this.scale;
    this.bobRate = FLAP_FPS / 4 * 2 * Math.PI / 60;
    this.panicAge = -1;
    this.flash = false;
  }
  get panicking() {
    return this.panicAge >= 0;
  }
  update() {
    this.age++;
    if (this.panicking) {
      this.panicAge++;
      const r = this.random;
      const shake = Math.max(1, this.scale / 2);
      this.moveTo(this.target.x + r.range(-shake, shake), this.target.y + r.range(-shake, shake));
      this.flash = !this.engine?.calm && this.panicAge % 6 < 2;
      return;
    }
    this.travelled = Math.min(this.distance, this.travelled + this.speed);
    const bob = Math.sin(this.age * this.bobRate) * this.bobAmp;
    this.moveTo(
      this.startX + this.dirX * this.travelled - this.dirY * bob,
      this.startY + this.dirY * this.travelled + this.dirX * bob
    );
    if (this.travelled >= this.distance) this.panicAge = 0;
  }
  shouldExplode() {
    return this.panicking && this.panicAge >= this.panicSteps;
  }
  /** @param {import('../engine.js').Engine} engine */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst);
    engine.addParticles(
      Array.from(
        { length: this.featherCount },
        () => new Feather({ x: this.x, y: this.y, scale: Math.max(1, this.scale - 1), random: this.random })
      )
    );
  }
  /** Index into `Chicken.sprite` for the current step. */
  get frame() {
    if (this.panicking) return 4 + Math.floor(this.panicAge * PANIC_FPS / 60) % 2;
    return Math.floor(this.age * FLAP_FPS / 60) % 4;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    _Chicken.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, flip: this.flip, flash: this.flash });
  }
};
__name(_Chicken, "Chicken");
/** Defaults for every chicken; per launch: `show.launch('chicken', 1, {flight: 'cross'})`. */
__publicField(
  _Chicken,
  "defaults",
  /** @type {Required<ChickenOptions>} */
  {
    flight: "random",
    scale: 3,
    speed: 3,
    panicSteps: 30,
    feathers: 16
  }
);
/** Frames 0-3 flap (up, mid, down, mid), 4-5 panic. Replace with your own art in the same layout. */
__publicField(_Chicken, "sprite", Sprite.fromPixels([...flapFrames, ...panicFrames], palette));
var Chicken = _Chicken;

// src/art/font.js
var font = {
  J: ["..#", "..#", "..#", "#.#", ".##"],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  "-": ["...", "...", "###", "...", "..."],
  "!": [".#.", ".#.", ".#.", "...", ".#."]
};
function stamp(grid, text, ink, x0, y0) {
  for (const ch of text) {
    const glyph = font[ch];
    if (!glyph) throw new Error(`xploders: no glyph for "${ch}"`);
    glyph.forEach((line, dy) => {
      for (let dx = 0; dx < line.length; dx++) if (line[dx] === "#") grid[y0 + dy][x0 + dx] = ink;
    });
    x0 += glyph[0].length + 1;
  }
}
__name(stamp, "stamp");
function textWidth(text) {
  return [...text].reduce((w, ch) => w + (font[ch]?.[0].length ?? 3) + 1, -1);
}
__name(textWidth, "textWidth");

// src/art/jug.js
var palette2 = {
  ".": null,
  k: "#2b1e24",
  // outline
  B: "#7a3f1d",
  // brown glaze
  b: "#a35a2a",
  // glaze highlight
  d: "#4f2611",
  // glaze shade
  c: "#efe2c0",
  // cream stoneware
  h: "#fbf4e0",
  // cream highlight
  s: "#c9b48a",
  // cream shade
  u: "#2f4fa8",
  // cobalt lettering
  m: "#c8281e",
  // red lettering
  n: "#b98a4e",
  // cork
  N: "#8a6232",
  // cork shade
  r: "#d8d0b8",
  // rag
  q: "#a39a80",
  // rag shade
  R: "#e8401c",
  // flame edge
  o: "#ffa21f",
  // flame
  y: "#fff27a",
  // flame core
  w: "#ffffff"
  // flame heart
};
var WIDTH = 31;
var CENTER = 15;
var CORK_ROW = 9;
var halfWidths = [2, 2, 2, 3, 4, 6, 8, 10, 11, 12, 13, ...Array(16).fill(14), 13, 13, 12, 10];
var HEIGHT = CORK_ROW + halfWidths.length;
var GLAZE_END = CORK_ROW + 11;
var lettering = [
  { text: "JUG-O-", colour: "u", row: 23 },
  { text: "BOOM", colour: "m", row: 29 }
];
var flameA = ["...R...", "..RoR..", ".RoyoR.", ".oywyo.", ".oywyo.", "..oyo..", "...o..."];
var flameB = ["..R....", ".RoR...", ".Royo..", ".oywyoR", ".oywyo.", "..oyo..", "...o..."];
var flameC = flameB.map((row) => [...row].reverse().join(""));
function blank() {
  return Array.from({ length: HEIGHT }, () => Array(WIDTH).fill("."));
}
__name(blank, "blank");
function paintJug() {
  const g = blank();
  halfWidths.forEach((hw, i) => {
    const y = CORK_ROW + i;
    const left = CENTER - hw;
    const right = CENTER + hw;
    const last = i === halfWidths.length - 1;
    for (let x = left; x <= right; x++) {
      if (y < CORK_ROW + 3) {
        g[y][x] = x === left || x === right ? "k" : x === right - 1 ? "N" : "n";
        continue;
      }
      if (last || x === left || x === right) {
        g[y][x] = "k";
        continue;
      }
      const drip = y === GLAZE_END && [4, 5, 11, 18, 19, 24].includes(x);
      const glazed = y < GLAZE_END || drip;
      if (glazed) g[y][x] = x === left + 1 || x === left + 2 ? "b" : x >= right - 2 ? "d" : "B";
      else g[y][x] = x === left + 1 ? "h" : x >= right - 2 || y >= HEIGHT - 3 ? "s" : "c";
    }
  });
  for (let x = CENTER - 2; x <= CENTER + 2; x++) g[CORK_ROW + 3][x] = "d";
  for (const [dy, x] of [
    [3, 19],
    [3, 20],
    [3, 21],
    [3, 22],
    [3, 23],
    [4, 24],
    [5, 25],
    [6, 26],
    [7, 27],
    [8, 28],
    [9, 28]
  ]) {
    const y = CORK_ROW + dy;
    g[y][x] = "k";
    if (g[y][x + 1] === ".") g[y][x + 1] = "d";
  }
  g[CORK_ROW - 1][CENTER - 1] = "r";
  g[CORK_ROW - 1][CENTER] = "q";
  g[CORK_ROW - 1][CENTER + 1] = "r";
  g[CORK_ROW - 2][CENTER] = "r";
  for (const { text, colour, row } of lettering) stamp(g, text, colour, CENTER - Math.floor(textWidth(text) / 2), row);
  return g;
}
__name(paintJug, "paintJug");
function withFlame(jug2, flame) {
  const g = jug2.map((row) => [...row]);
  const x0 = CENTER - 3;
  flame.forEach((line, y) => {
    for (let dx = 0; dx < line.length; dx++) if (line[dx] !== ".") g[y][x0 + dx] = line[dx];
  });
  return g.map((row) => row.join(""));
}
__name(withFlame, "withFlame");
var jug = paintJug();
var frames = [withFlame(jug, flameA), withFlame(jug, flameB), withFlame(jug, flameC)];
var shardFrames = [
  ["kB.", "BBb", ".Bk"],
  [".kB", "kBB", "Bd."],
  ["Bb.", "dBk", "..."],
  ["kc.", "cch", ".ck"],
  [".kc", "kcs", "cs."],
  ["ch.", "sck", "..."]
];

// src/shard.js
var jugShards = Sprite.fromPixels(shardFrames, palette2);
var _Shard = class _Shard {
  /** @param {ShardInit} init */
  constructor({ x, y, scale, random: r, sprite: sprite2 = jugShards }) {
    const angle = r.range(0, Math.PI * 2);
    const speed = r.range(2, 7);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2.5;
    this.scale = scale;
    this.sprite = sprite2;
    this.frame = r.int(0, sprite2.frames - 1);
    this.rotation = r.range(0, Math.PI * 2);
    this.spin = r.range(-0.3, 0.3);
    this.life = r.int(70, 110);
    this.age = 0;
    this.dead = false;
    this.layer = "sprite";
  }
  /** @returns {boolean} never pops */
  update() {
    this.vx *= 0.99;
    this.vy += _Shard.GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.spin;
    this.age++;
    if (this.age >= this.life) this.dead = true;
    return false;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = Math.min(1, (this.life - this.age) / _Shard.FADE_STEPS);
    this.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, alpha, rotation: this.rotation });
  }
};
__name(_Shard, "Shard");
__publicField(_Shard, "GRAVITY", 0.22);
// px/step^2
__publicField(_Shard, "FADE_STEPS", 30);
var Shard = _Shard;

// src/projectiles/jug.js
var FLAME_FPS = 12;
var WICK = 17;
var _Jug = class _Jug extends Projectile {
  /** @param {import('../projectile.js').ProjectileInit & JugOptions} init */
  constructor(init) {
    const d = _Jug.defaults;
    const scale = init.scale ?? d.scale;
    const r = init.random;
    const x = init.size.width * inRange(r, init.launchPoint ?? d.launchPoint) / 100;
    super({ ...init, x, y: init.y + _Jug.sprite.frameHeight * scale / 2 });
    this.layer = /** @type {const} */
    "sprite";
    this.scale = scale;
    this.shardCount = init.shards ?? d.shards;
    this.burst = init.burst ?? "fireball";
    this.burstSize = init.burstSize ?? d.burstSize;
    const direction = this.vx > 0 ? 1 : this.vx < 0 ? -1 : r.next() < 0.5 ? 1 : -1;
    this.spin = direction * (init.spin ?? d.spin) * r.range(0.7, 1.3);
    this.rotation = r.range(-0.3, 0.3);
  }
  /** Where the wick flame is now, after the tumble. */
  get wick() {
    const reach = WICK * this.scale;
    return { x: this.x + Math.sin(this.rotation) * reach, y: this.y - Math.cos(this.rotation) * reach };
  }
  update() {
    super.update();
    this.rotation += this.spin;
    if (this.age % 3 === 0) this.engine?.addParticles([this.ember()]);
  }
  /** A spark off the burning wick, left behind as a trail. */
  ember() {
    const r = this.random;
    const { x, y } = this.wick;
    return new Particle({
      x,
      y,
      angle: r.range(0, Math.PI * 2),
      speed: r.range(0.3, 1.2),
      hue: r.range(25, 45),
      brightness: r.range(55, 70),
      decay: r.range(0.05, 0.09),
      friction: 0.92,
      gravity: -0.4,
      // drifts up, like sparks off a flame
      trail: 3,
      lineWidth: r.range(1, 2),
      flicker: true
    });
  }
  /** @param {import('../engine.js').Engine} engine */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst, this.burstSize);
    engine.addParticles(
      Array.from({ length: this.shardCount }, () => new Shard({ x: this.x, y: this.y, scale: this.scale, random: this.random }))
    );
  }
  /** Index into `Jug.sprite` for the current step. */
  get frame() {
    return Math.floor(this.age * FLAME_FPS / 60) % 3;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    _Jug.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, rotation: this.rotation });
  }
};
__name(_Jug, "Jug");
/** Defaults for every jug; per launch: `show.launch('jug', 1, {spin: 0})`. */
__publicField(
  _Jug,
  "defaults",
  /** @type {Required<Omit<JugOptions, 'burst'>>} */
  {
    scale: 2,
    spin: 0.05,
    shards: 12,
    burstSize: 3,
    launchPoint: { min: 10, max: 90 }
  }
);
/** Frames 0-2: the wick flame flickering. Replace with your own art in the same layout. */
__publicField(_Jug, "sprite", Sprite.fromPixels(frames, palette2));
var Jug = _Jug;

// src/milk.js
var _Milk = class _Milk {
  /** @param {MilkInit} init */
  constructor({ x, y, scale, random: r }) {
    const angle = r.range(0, Math.PI * 2);
    const speed = r.range(2, 8);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 2;
    this.radius = r.range(0.6, 1.3) * scale;
    this.life = r.int(40, 70);
    this.age = 0;
    this.dead = false;
    this.layer = "sprite";
  }
  get alpha() {
    return Math.min(1, (this.life - this.age) / _Milk.FADE_STEPS);
  }
  /** @returns {boolean} never pops */
  update() {
    this.vx *= 0.98;
    this.vy += _Milk.GRAVITY;
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    if (this.age >= this.life) this.dead = true;
    return false;
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    const alpha = this.alpha;
    if (!(alpha > 0)) return;
    const speed = Math.hypot(this.vx, this.vy);
    const stretch = 1 + Math.min(1, speed / 8);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.atan2(this.vy, this.vx));
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * stretch, this.radius, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#fbfdff";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(120, 140, 170, 0.6)";
    ctx.stroke();
    ctx.restore();
  }
};
__name(_Milk, "Milk");
__publicField(_Milk, "GRAVITY", 0.25);
// px/step^2
__publicField(_Milk, "FADE_STEPS", 20);
var Milk = _Milk;

// src/art/cow.js
var palette3 = {
  ".": null,
  k: "#2b1e24",
  // outline and spots
  w: "#ffffff",
  // hide
  g: "#c8c6d8",
  // hide shade
  p: "#f4a3b4",
  // nose, ear, udder
  P: "#c8607a",
  // nostrils, tongue
  h: "#efe2c0",
  // horns
  n: "#5a4636",
  // hooves
  r: "#e8323a",
  // open mouth
  // steak
  D: "#8a4a22",
  // grilled meat
  d: "#5e2e12",
  // grill marks
  f: "#e9c79a",
  // fat rim
  b: "#f6f0e2"
  // bone
};
var WIDTH2 = 24;
var HEIGHT2 = 16;
var body2 = [
  "........................",
  ".................h....h.",
  ".............kk.kkkkkkkk",
  ".............kpkkwkkwwwk",
  "..kkkkkkkkkkkkkkkwkwwkwk",
  ".kwwkkkwwwwwkkwwwwwwwwwk",
  "kkwkkkkwwwwkkkwwwwpppppk",
  "kkgwkkwwwwwwkkwwwkpPpPpk",
  "kkgwwwwwwkwwwwwwwkpppppk",
  "kkggwwwwwwwwwwwggkkkkkk.",
  ".kgggwwwwwwwwwgggk......",
  "..kgggggggppggggkk......"
];
var excitedHead = (
  /** @type {[number, number, string][]} */
  [
    [21, 4, "k"],
    [21, 5, "k"],
    [17, 8, "kpkrrk"],
    [17, 9, ".krPPk"],
    [18, 10, "kkkk"]
  ]
);
var LEGS = [2, 6, 11, 15];
function paintLegs(g, kick) {
  LEGS.forEach((x, i) => {
    const shift = [0, 0, kick[i] > 0 ? 1 : kick[i] < 0 ? -1 : 0, kick[i]];
    for (let row = 12; row < HEIGHT2; row++) {
      const dx = shift[row - 12];
      const hoof = row === HEIGHT2 - 1;
      g[row][x + dx] = "k";
      g[row][x + dx + 1] = hoof ? "n" : "w";
      g[row][x + dx + 2] = "k";
    }
    g[11][x + 1] = g[11][x + 1] === "p" ? "p" : "g";
  });
}
__name(paintLegs, "paintLegs");
function cow(kick, excited = false) {
  const g = [...body2.map((row) => [...row]), ...Array.from({ length: HEIGHT2 - body2.length }, () => Array(WIDTH2).fill("."))];
  paintLegs(g, kick);
  if (excited) {
    for (const [x, y, line] of excitedHead) {
      for (let dx = 0; dx < line.length; dx++) if (line[dx] !== ".") g[y][x + dx] = line[dx];
    }
  }
  return g.map((row) => row.join(""));
}
__name(cow, "cow");
var floatFrames = [cow([0, 0, 0, 0]), cow([-1, 1, -1, 1]), cow([0, 0, 0, 0]), cow([1, -1, 1, -1])];
var mooFrames = [cow([-1, -1, 1, 1], true), cow([1, 1, -1, -1], true)];
var HEAD = { x: 20, y: 4 };
var MOO = "MOO!";
var BUBBLE_BODY = 5 + 4;
var BUBBLE_WIDTH = textWidth(MOO) + 6;
var BUBBLE_HEIGHT = BUBBLE_BODY + 3;
function bubble(side) {
  const w = BUBBLE_WIDTH;
  const g = Array.from({ length: BUBBLE_HEIGHT }, () => Array(w).fill("."));
  const last = BUBBLE_BODY - 1;
  for (let y = 0; y < BUBBLE_BODY; y++) {
    for (let x = 0; x < w; x++) {
      const outerCorner = (y === 0 || y === last) && (x === 0 || x === w - 1);
      const innerCorner = (y === 1 || y === last - 1) && (x === 1 || x === w - 2);
      const edge = y === 0 || y === last || x === 0 || x === w - 1;
      if (!outerCorner) g[y][x] = edge || innerCorner ? "k" : "w";
    }
  }
  stamp(g, MOO, "k", 3, 2);
  const tail = (
    /** @type {[number, number, string][]} */
    [
      [4, last, "w"],
      [5, last, "w"],
      [3, last + 1, "k"],
      [4, last + 1, "w"],
      [5, last + 1, "k"],
      [2, last + 2, "k"],
      [3, last + 2, "k"],
      [4, last + 2, "k"],
      [1, last + 3, "k"]
    ]
  );
  for (const [x, y, px] of tail) g[y][side === "left" ? x : w - 1 - x] = px;
  return g.map((row) => row.join(""));
}
__name(bubble, "bubble");
var bubbleFrames = [bubble("left"), bubble("right")];
var steak = ["..kkkkkk.", ".kfbbbbDk", "kDDdbDdDk", "kDdDbDDdk", "kdDDbdDDk", ".kDdbDdk.", "..kkkkk.."];
var steakFrames = [steak, steak.map((row) => [...row].reverse().join(""))];

// src/projectiles/cow.js
var LEG_FPS = 10;
var MOO_FPS = 12;
var steakSprite = Sprite.fromPixels(steakFrames, palette3);
var _Cow = class _Cow extends Projectile {
  /** @param {import('../projectile.js').ProjectileInit & CowOptions} init */
  constructor(init) {
    const d = _Cow.defaults;
    const r = init.random;
    const scale = init.scale ?? d.scale;
    const x = init.size.width * inRange(r, init.launchPoint ?? d.launchPoint) / 100;
    super({ ...init, x });
    this.layer = /** @type {const} */
    "sprite";
    this.scale = scale;
    this.speed = init.speed ?? d.speed;
    this.hoverSteps = init.hoverSteps ?? d.hoverSteps;
    this.mooSteps = init.mooSteps ?? d.mooSteps;
    this.steakCount = init.steaks ?? d.steaks;
    this.milkCount = init.milk ?? d.milk;
    this.startX = x;
    this.startY = init.y + _Cow.sprite.frameHeight * scale / 2;
    this.moveTo(this.startX, this.startY);
    const distance = Math.hypot(init.target.x - this.startX, init.target.y - this.startY);
    this.floatSteps = Math.max(30, Math.round(distance / this.speed));
    this.flip = init.target.x < this.startX;
    this.bobRate = 2 * Math.PI / 50;
    this.phase = "float";
    this.phaseAge = 0;
  }
  get mooing() {
    return this.phase === "moo";
  }
  update() {
    if (this.phase === "float" && this.phaseAge >= this.floatSteps) this.next("hover");
    if (this.phase === "hover" && this.phaseAge >= this.hoverSteps) this.next("moo");
    this.age++;
    this.phaseAge++;
    const bob = Math.sin(this.age * this.bobRate) * this.scale;
    if (this.phase === "float") {
      const p = this.phaseAge / this.floatSteps;
      const eased = 1 - (1 - p) ** 3;
      this.moveTo(
        this.startX + (this.target.x - this.startX) * eased,
        this.startY + (this.target.y - this.startY) * eased + bob * p
      );
    } else if (this.phase === "hover") {
      this.moveTo(this.target.x, this.target.y + bob);
    } else if (this.engine?.calm) {
      this.moveTo(this.target.x, this.target.y);
    } else {
      const r = this.random;
      const shake = this.scale / 2;
      const bounce = -Math.abs(Math.sin(this.phaseAge * 0.5)) * this.scale * 2;
      this.moveTo(this.target.x + r.range(-shake, shake), this.target.y + bounce + r.range(-shake, shake));
    }
  }
  /** @param {'hover' | 'moo'} phase */
  next(phase) {
    this.phase = phase;
    this.phaseAge = 0;
  }
  shouldExplode() {
    return this.mooing && this.phaseAge >= this.mooSteps;
  }
  /** @param {import('../engine.js').Engine} engine */
  explode(engine) {
    engine.burst(this.x, this.y, this.hue, this.burst);
    const { x, y, random } = this;
    engine.addParticles([
      ...Array.from({ length: this.steakCount }, () => new Shard({ x, y, scale: Math.max(1, this.scale - 1), random, sprite: steakSprite })),
      ...Array.from({ length: this.milkCount }, () => new Milk({ x, y, scale: this.scale, random }))
    ]);
  }
  /** Index into `Cow.sprite` for the current step. */
  get frame() {
    if (this.mooing) return 4 + Math.floor(this.phaseAge * MOO_FPS / 60) % 2;
    return Math.floor(this.age * LEG_FPS / 60) % 4;
  }
  /**
   * Where the speech bubble goes: above the head on the side the cow faces, or the
   * other side if that runs off the canvas, then kept inside it.
   * @returns {{x: number, y: number, frame: number, scale: number}} its centre, frame and scale
   */
  bubblePlace() {
    const s = this.scale;
    const pop = Math.min(1, 0.6 + 0.1 * this.phaseAge);
    const headX = this.x + (this.flip ? -1 : 1) * (HEAD.x + 0.5 - _Cow.sprite.frameWidth / 2) * s;
    const headY = this.y + (HEAD.y + 0.5 - _Cow.sprite.frameHeight / 2) * s;
    const w = BUBBLE_WIDTH * s;
    const h = BUBBLE_HEIGHT * s;
    const reach = w / 2 - s;
    let right = !this.flip;
    if (right && headX + reach + w / 2 > this.size.width) right = false;
    else if (!right && headX - reach - w / 2 < 0) right = true;
    const x = Math.min(Math.max(headX + (right ? reach : -reach), w / 2), Math.max(w / 2, this.size.width - w / 2));
    const y = Math.max(headY - 2 * s - h / 2, h / 2);
    return { x, y, frame: right ? 0 : 1, scale: s * pop };
  }
  /** @param {CanvasRenderingContext2D} ctx */
  draw(ctx) {
    _Cow.sprite.draw(ctx, this.frame, this.x, this.y, { scale: this.scale, flip: this.flip });
    if (this.mooing) {
      const b = this.bubblePlace();
      _Cow.bubble.draw(ctx, b.frame, b.x, b.y, { scale: b.scale });
    }
  }
};
__name(_Cow, "Cow");
/** Defaults for every cow; per launch: `show.launch('cow', 1, {scale: 4})`. */
__publicField(
  _Cow,
  "defaults",
  /** @type {Required<CowOptions>} */
  {
    scale: 3,
    speed: 3,
    hoverSteps: 18,
    mooSteps: 30,
    steaks: 8,
    milk: 16,
    launchPoint: { min: 10, max: 90 }
  }
);
/** Frames 0-3 legs kicking, 4-5 excited (mouth open). Replace with your own art in the same layout. */
__publicField(_Cow, "sprite", Sprite.fromPixels([...floatFrames, ...mooFrames], palette3));
/** Frame 0 with its tail on the left (for a bubble right of the head), 1 on the right. */
__publicField(_Cow, "bubble", Sprite.fromPixels(bubbleFrames, palette3));
var Cow = _Cow;

// src/pointer.js
var _Pointer = class _Pointer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./options.js').Options} options live options
   * @param {() => {width: number, height: number}} size the drawing size in CSS px
   * @param {() => void} onPress called when a hold starts with `click` on
   */
  constructor(canvas, options, size, onPress) {
    this.canvas = canvas;
    this.options = options;
    this.size = size;
    this.onPress = onPress;
    this.x = 0;
    this.y = 0;
    this.known = false;
    this.active = false;
    this.savedTouchAction = null;
    this.down = this.down.bind(this);
    this.up = this.up.bind(this);
    this.move = this.move.bind(this);
    this.leave = this.leave.bind(this);
    canvas.addEventListener("pointerdown", this.down);
    canvas.addEventListener("pointerup", this.up);
    canvas.addEventListener("pointercancel", this.up);
    canvas.addEventListener("pointermove", this.move);
    canvas.addEventListener("pointerleave", this.leave);
    this.sync();
  }
  /** Applies option changes: `touch-action: none` only while `click` is on, so dragging doesn't scroll. */
  sync() {
    const style = this.canvas.style;
    if (this.options.mouse.click && this.savedTouchAction === null) {
      this.savedTouchAction = style.touchAction ?? "";
      style.touchAction = "none";
    } else if (!this.options.mouse.click && this.savedTouchAction !== null) {
      style.touchAction = this.savedTouchAction;
      this.savedTouchAction = null;
    }
    if (!this.options.mouse.click) this.active = false;
  }
  /** @param {PointerEvent} e */
  locate(e) {
    const rect = this.canvas.getBoundingClientRect();
    const { width, height } = this.size();
    this.x = rect.width ? (e.clientX - rect.left) * width / rect.width : 0;
    this.y = rect.height ? (e.clientY - rect.top) * height / rect.height : 0;
    this.known = true;
  }
  /** @param {PointerEvent} e */
  down(e) {
    const { click, move } = this.options.mouse;
    if (!click && !move) return;
    this.locate(e);
    if (!click) return;
    this.active = true;
    try {
      this.canvas.setPointerCapture?.(e.pointerId);
    } catch {
    }
    this.onPress();
  }
  /** @param {PointerEvent} e */
  up(e) {
    if (this.active || this.options.mouse.move) this.locate(e);
    this.active = false;
  }
  /** @param {PointerEvent} e */
  move(e) {
    if (this.options.mouse.click || this.options.mouse.move) this.locate(e);
  }
  /** @param {PointerEvent} e */
  leave(e) {
    if (!this.canvas.hasPointerCapture?.(e.pointerId)) this.active = false;
    this.known = false;
  }
  /** @returns {{x: number, y: number} | null} where pointer-aware launches should aim */
  target() {
    const { move } = this.options.mouse;
    return this.active || move && this.known ? { x: this.x, y: this.y } : null;
  }
  dispose() {
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.down);
    c.removeEventListener("pointerup", this.up);
    c.removeEventListener("pointercancel", this.up);
    c.removeEventListener("pointermove", this.move);
    c.removeEventListener("pointerleave", this.leave);
    if (this.savedTouchAction !== null) c.style.touchAction = this.savedTouchAction;
    this.savedTouchAction = null;
    this.active = false;
  }
};
__name(_Pointer, "Pointer");
var Pointer = _Pointer;

// src/index.js
var registry = /* @__PURE__ */ new Map();
registry.set("rocket", Rocket);
registry.set("chicken", Chicken);
registry.set("jug", Jug);
registry.set("cow", Cow);
var isCanvas = /* @__PURE__ */ __name((el) => typeof /** @type {any} */
el.getContext === "function", "isCanvas");
var _Xploders = class _Xploders {
  /**
   * @param {Element} target a canvas, or a container to create a canvas in
   * @param {XplodersOptions} [options]
   * @param {Partial<import('./engine.js').Env> & {matchMedia?: (query: string) => MediaQueryList}} [env]
   *   for tests: stand-ins for requestAnimationFrame, the clock, canvas creation and matchMedia
   */
  constructor(target, options = {}, env) {
    this.options = deepMerge(defaultOptions(), options);
    this.container = target;
    this.ownsCanvas = !isCanvas(target);
    if (isCanvas(target)) {
      this.canvas = target;
    } else {
      this.canvas = document.createElement("canvas");
      Object.assign(this.canvas.style, { display: "block", width: "100%", height: "100%" });
      target.append(this.canvas);
    }
    this.random = new Random(this.options.seed);
    this.engine = new Engine(this.canvas, this.options, this.random, env);
    this.engine.defaultProjectile = registry.get("rocket");
    this.engine.resolve = (name) => registry.get(name);
    this.pointer = new Pointer(this.canvas, this.options, () => this.engine, () => this.pressed());
    this.engine.pointer = this.pointer;
    const matchMedia = env?.matchMedia ?? globalThis.matchMedia;
    this.reducedMotionQuery = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.syncMotion = this.syncMotion.bind(this);
    this.reducedMotionQuery?.addEventListener?.("change", this.syncMotion);
    this.syncMotion();
    this.waiters = [];
    this.updateSize();
    this.resizeObserver = null;
    if (typeof ResizeObserver === "function") {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.options.autoresize) this.updateSize();
      });
      this.resizeObserver.observe(this.container);
    }
  }
  /**
   * Make a projectile type available to `launch` by name.
   * @param {string} name
   * @param {ProjectileClass} cls
   */
  static register(name, cls) {
    registry.set(name, cls);
  }
  /** Calm mode on or off, from the `reducedMotion` option and the visitor's setting. */
  syncMotion() {
    const mode = this.options.reducedMotion;
    this.engine.calm = mode === "always" || mode === "auto" && Boolean(this.reducedMotionQuery?.matches);
  }
  /** True while reduced motion has calmed the show. */
  get calm() {
    return this.engine.calm;
  }
  /** A pointer hold started: on a stopped show, run until the sky is empty, as `launch` does. */
  pressed() {
    if (!this.engine.running) {
      this.engine.autoLaunch = false;
      this.engine.onEmpty = () => this.stop();
      this.engine.startLoop();
    }
  }
  get isRunning() {
    return this.engine.running;
  }
  /** The live options object. */
  get currentOptions() {
    return this.options;
  }
  /** Runs the show, auto-launching at `intensity`. */
  start() {
    this.engine.onEmpty = null;
    this.engine.autoLaunch = true;
    this.engine.startLoop();
    return this;
  }
  /**
   * Stops and clears the show.
   * @param {boolean} [dispose] also stop following the size and remove a canvas this show created
   */
  stop(dispose = false) {
    this.engine.stopLoop();
    this.engine.autoLaunch = false;
    this.engine.onEmpty = null;
    this.engine.clear();
    if (dispose) {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.pointer.dispose();
      this.reducedMotionQuery?.removeEventListener?.("change", this.syncMotion);
      if (this.ownsCanvas) this.canvas.remove();
    }
    for (const resolve of this.waiters.splice(0)) resolve();
    return this;
  }
  /** Freezes or resumes the show, keeping everything in the sky. */
  pause() {
    if (this.engine.running) this.engine.stopLoop();
    else this.engine.startLoop();
    return this;
  }
  /** Removes everything in the sky; the show keeps running. */
  clear() {
    this.engine.clear();
    return this;
  }
  /**
   * Launches rockets (`launch(5)`) or any registered type (`launch('chicken', 2)`).
   * `init` goes to each projectile, e.g. `launch('chicken', 1, {flight: 'cross'})`.
   * On a stopped show the loop runs until the sky is empty, without auto-launch.
   * @param {string | number} [typeOrCount]
   * @param {number} [count]
   * @param {Record<string, any>} [init]
   */
  launch(typeOrCount = 1, count = 1, init = {}) {
    const type = typeof typeOrCount === "string" ? typeOrCount : "rocket";
    const n = typeof typeOrCount === "number" ? typeOrCount : count;
    const Cls = registry.get(type);
    if (!Cls) throw new Error(`xploders: unknown projectile type "${type}"`);
    if (!this.engine.running) {
      this.engine.autoLaunch = false;
      this.engine.onEmpty = () => this.stop();
      this.engine.startLoop();
    }
    this.engine.launch(n, Cls, init);
    return this;
  }
  /**
   * Launches one projectile that explodes at (x, y), in CSS pixels from the canvas's top left.
   * @param {number} x
   * @param {number} y
   * @param {string} [type]
   * @param {Record<string, any>} [init]
   */
  launchAt(x, y, type = "rocket", init = {}) {
    return this.launch(type, 1, { ...init, target: { x, y } });
  }
  /**
   * Stops auto-launching and resolves once everything in the sky has burnt out.
   * @param {boolean} [dispose] as for `stop`
   * @returns {Promise<void>}
   */
  waitStop(dispose = false) {
    this.engine.autoLaunch = false;
    return new Promise((resolve) => {
      this.waiters.push(resolve);
      if (!this.engine.running || this.engine.empty) this.stop(dispose);
      else this.engine.onEmpty = () => this.stop(dispose);
    });
  }
  /** @param {XplodersOptions} options merged into the live options */
  updateOptions(options) {
    deepMerge(this.options, options);
    this.pointer.sync();
    this.syncMotion();
    return this;
  }
  /**
   * Resizes the drawing, by default to the canvas's own size on the page.
   * @param {{width?: number, height?: number}} [size] CSS pixels
   */
  updateSize(size = {}) {
    const measured = size.width === void 0 && size.height === void 0;
    const { width = this.canvas.clientWidth, height = this.canvas.clientHeight } = size;
    this.engine.resize(width, height);
    if (measured) {
      if (this.canvas.clientWidth !== width) this.canvas.style.width = `${width}px`;
      if (this.canvas.clientHeight !== height) this.canvas.style.height = `${height}px`;
    }
    return this;
  }
  /** @param {Partial<import('./options.js').Boundaries>} boundaries */
  updateBoundaries(boundaries) {
    deepMerge(this.options.boundaries, boundaries);
    return this;
  }
};
__name(_Xploders, "Xploders");
var Xploders = _Xploders;
var index_default = Xploders;
export {
  Chicken,
  Cow,
  Feather,
  Flame,
  Glow,
  Jug,
  Milk,
  Particle,
  Projectile,
  Random,
  Rocket,
  Shard,
  Smoke,
  Sprite,
  Xploders,
  bursts,
  index_default as default,
  defaultOptions,
  parsePixels
};
//# sourceMappingURL=xploders.mjs.map
