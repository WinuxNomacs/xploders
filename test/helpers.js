// Stand-ins for the browser: a canvas whose 2D context records what it is
// told, and a scheduler the test drives frame by frame.

export function fakeCanvas(width = 800, height = 600) {
  /** @type {{fills: string[]}} */
  const log = { fills: [] }
  const ctx = new Proxy(
    { log },
    {
      get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}),
      set: (t, k, v) => {
        if (k === 'fillStyle') log.fills.push(v)
        t[k] = v
        return true
      },
    },
  )
  /** @type {Map<string, Set<(e: any) => void>>} */
  const listeners = new Map()
  /** @type {Set<number>} */
  const captured = new Set()
  return {
    clientWidth: width,
    clientHeight: height,
    width: 0,
    height: 0,
    style: { touchAction: '' },
    getContext: () => ctx,
    ctx,
    /** The canvas's on-page box; tests change it to mimic CSS scaling or scrolling. */
    rect: { left: 0, top: 0, width, height },
    getBoundingClientRect() {
      return this.rect
    },
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    listenerCount: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    /** Dispatches a pointer event; pointerup and pointercancel release capture first, as browsers do. */
    fire(type, props = {}) {
      const e = { pointerId: 1, clientX: 0, clientY: 0, ...props }
      if (type === 'pointerup' || type === 'pointercancel') {
        for (const fn of listeners.get(type) ?? []) fn(e)
        captured.delete(e.pointerId)
        return
      }
      for (const fn of listeners.get(type) ?? []) fn(e)
    },
  }
}

/** A stand-in for window.matchMedia with one query whose `matches` the test flips. */
export function fakeMatchMedia(matches = false) {
  /** @type {Set<() => void>} */
  const listeners = new Set()
  const query = {
    matches,
    addEventListener: (_type, fn) => listeners.add(fn),
    removeEventListener: (_type, fn) => listeners.delete(fn),
    /** Changes the visitor's setting and notifies, like the browser does. */
    set(value) {
      query.matches = value
      for (const fn of listeners) fn()
    },
    get listenerCount() {
      return listeners.size
    },
  }
  return { query, matchMedia: () => query }
}

/** A stand-in for the engine's environment: frames, clock and canvas creation. */
export function fakeScheduler() {
  let time = 0
  /** @type {((now: number) => void) | null} */
  let pending = null
  const s = {
    /** Trail layers the engine created. */
    layers: [],
    createCanvas: () => {
      const c = fakeCanvas()
      s.layers.push(c)
      return c
    },
    raf: (cb) => {
      pending = cb
      return 1
    },
    caf: () => {
      pending = null
    },
    now: () => time,
    /** Advances the clock and runs the pending frame. */
    frame(ms = 1000 / 60) {
      time += ms
      const cb = pending
      pending = null
      cb?.(time)
    },
    /** Runs `n` frames of one step each. */
    steps(n) {
      for (let i = 0; i < n; i++) s.frame(1000 / 60 + 0.001)
    },
    get scheduled() {
      return pending !== null
    },
  }
  return s
}
