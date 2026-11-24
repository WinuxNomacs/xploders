var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/particle.js
var Particle = class {
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

// src/random.js
var Random = class {
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
function inRange(random, { min, max }, integer = false) {
  return integer ? random.int(min, max) : random.range(min, max);
}

// src/bursts.js
function particle({ x, y, hue, options: o, random: r }, overrides = {}) {
  return new Particle({
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
  });
}
var bursts = {
  peony: (c) => Array.from({ length: c.count }, () => particle(c)),
  // Evenly spaced angles and one shared speed: friction and gravity act the same
  // on every particle, so the ring stays a circle as it drifts and fades.
  ring: (c) => {
    const speed = c.random.range(6, 9);
    const decay = inRange(c.random, c.options.decay);
    const offset = c.random.range(0, Math.PI * 2);
    return Array.from(
      { length: c.count },
      (_, i) => particle(c, { angle: offset + i / c.count * Math.PI * 2, speed, decay })
    );
  },
  // Long-lived gold strands that droop further than a peony.
  willow: (c) => Array.from(
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
  ),
  // Flickers, then each particle pops into a few tiny sparks near the end.
  crackle: (c) => Array.from({ length: c.count }, () => particle(c, { flicker: true, crackleAt: c.random.range(0.2, 0.4) }))
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

// src/sprite.js
function parsePixels(frames, palette2) {
  if (frames.length === 0) throw new Error("xploders: a sprite needs at least one frame");
  const frameHeight = frames[0].length;
  const frameWidth = frames[0][0]?.length ?? 0;
  if (frameWidth === 0) throw new Error("xploders: empty sprite frame");
  const width = frameWidth * frames.length;
  const data = new Uint8ClampedArray(width * frameHeight * 4);
  const colours = /* @__PURE__ */ new Map();
  for (const [ch, css] of Object.entries(palette2)) colours.set(ch, css === null ? null : hexToRgb(css));
  frames.forEach((rows, f) => {
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
  return { frameWidth, frameHeight, frames: frames.length, data };
}
function hexToRgb(css) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css);
  if (!m) throw new Error(`xploders: palette colour "${css}" is not #rgb or #rrggbb`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function createCanvas(w, h) {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function isReady(image) {
  if (typeof HTMLImageElement === "function" && image instanceof HTMLImageElement) {
    return image.complete && image.naturalWidth > 0;
  }
  return true;
}
var Sprite = class _Sprite {
  /**
   * @param {CanvasImageSource | null} image null when built lazily from pixels
   * @param {object} opts
   * @param {number} opts.frameWidth
   * @param {number} opts.frameHeight
   * @param {number} opts.frames number of frames in the sheet
   * @param {number} [opts.fps]
   */
  constructor(image, { frameWidth, frameHeight, frames, fps = 8 }) {
    this.image = image;
    this.flashImage = null;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frames = frames;
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
  static fromPixels(frames, palette2, fps = 8) {
    const pixels = parsePixels(frames, palette2);
    const sprite2 = new _Sprite(null, { ...pixels, fps });
    sprite2.pixels = pixels;
    return sprite2;
  }
  /** Makes the sheet (and its flash silhouette) from pixels, once. */
  build() {
    if (this.image || !this.pixels) return;
    const { frameWidth, frameHeight, frames, data } = this.pixels;
    const w = frameWidth * frames;
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
   */
  draw(ctx, frame, x, y, { scale = 1, flip = false, flash = false, alpha = 1 } = {}) {
    this.build();
    const image = flash && this.flashImage ? this.flashImage : this.image;
    if (!image || !isReady(image)) return;
    const w = this.frameWidth * scale;
    const h = this.frameHeight * scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(image, frame % this.frames * this.frameWidth, 0, this.frameWidth, this.frameHeight, -Math.round(w / 2), -Math.round(h / 2), w, h);
    ctx.restore();
  }
};

// src/engine.js
var STEP_MS = 1e3 / 60;
var MAX_FRAME_MS = 250;
var Engine = class {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./options.js').Options} options live options object (updated in place)
   * @param {Random} random seeded generator for everything that shapes the show
   * @param {Partial<Env>} [env] injectable for tests
   */
  constructor(canvas, options, random, env = {}) {
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
    while (this.accumulator >= STEP_MS) {
      this.step();
      this.accumulator -= STEP_MS;
      this.pendingSteps++;
    }
    if (this.pendingSteps > 0) {
      this.draw(this.pendingSteps);
      this.pendingSteps = 0;
    }
    if (this.running) this.frameId = this.raf(this.tick);
    if (this.empty && this.onEmpty) this.onEmpty();
  }
  /** One fixed 1/60 s step of the whole show. */
  step() {
    const o = this.options;
    if (this.pointer?.active && o.mouse.click && this.projectiles.length < o.mouse.max) {
      this.launch(1, this.resolve(o.mouse.projectile));
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
    for (const p of particles) {
      if (p.update() && p instanceof Particle) {
        const sparks = crackleSparks(p, this.random, Math.floor(this.options.maxParticles) - live + 1);
        this.particles.push(...sparks);
        live += sparks.length;
      }
      if (p.dead) live--;
      else this.particles.push(p);
    }
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
    for (let i = 0; i < count; i++) {
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
   */
  burst(x, y, hue, style) {
    const o = this.options;
    const choice = style ?? (Array.isArray(o.burst) ? this.random.pick(o.burst) : o.burst);
    const make = bursts[choice] ?? bursts.peony;
    const count = Math.min(Math.floor(o.particles), this.capacity());
    if (count <= 0) return;
    this.particles.push(...make({ x, y, hue, count, options: o, random: this.random }));
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
    if (width <= 0 || height <= 0) return;
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
    for (const p of this.projectiles) {
      if (p.layer !== layer) continue;
      try {
        p.draw(ctx);
      } catch (error) {
        console.error("xploders: removed a projectile that threw while drawing", error);
        this.projectiles = this.projectiles.filter((q) => q !== p);
      }
    }
    for (const p of this.particles) if ((p.layer ?? "trail") === layer) p.draw(ctx, this.flickerRandom);
  }
};

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
    mouse: { click: false, move: false, max: 1, projectile: "rocket" },
    reducedMotion: "auto"
  };
}
var isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function deepMerge(target, source) {
  const t = target;
  for (const [key, value] of Object.entries(source)) {
    if (value === void 0) continue;
    if (isPlainObject(value) && isPlainObject(t[key])) deepMerge(t[key], value);
    else t[key] = Array.isArray(value) ? [...value] : value;
  }
  return target;
}

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
/** Downward acceleration of the default arc, px/step^2. */
__publicField(_Projectile, "gravity", 0.15);
var Projectile = _Projectile;

// src/projectiles/rocket.js
var Rocket = class extends Projectile {
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

// src/pointer.js
var Pointer = class {
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

// src/index.js
var registry = /* @__PURE__ */ new Map();
registry.set("rocket", Rocket);
registry.set("chicken", Chicken);
var isCanvas = (el) => typeof /** @type {any} */
el.getContext === "function";
var Xploders = class {
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
   * Resizes the canvas, by default to the container's size.
   * @param {{width?: number, height?: number}} [size] CSS pixels
   */
  updateSize({ width = this.container.clientWidth, height = this.container.clientHeight } = {}) {
    this.engine.resize(width, height);
    return this;
  }
  /** @param {Partial<import('./options.js').Boundaries>} boundaries */
  updateBoundaries(boundaries) {
    deepMerge(this.options.boundaries, boundaries);
    return this;
  }
};
var index_default = Xploders;
export {
  Chicken,
  Feather,
  Particle,
  Projectile,
  Random,
  Rocket,
  Sprite,
  Xploders,
  bursts,
  index_default as default,
  defaultOptions,
  parsePixels
};
//# sourceMappingURL=xploders.mjs.map
