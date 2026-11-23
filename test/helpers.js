// Stand-ins for the browser: a canvas whose 2D context records what it is
// told, and a scheduler the test drives frame by frame.

export function fakeCanvas(width = 800, height = 600) {
  /** @type {{fills: string[]}} */
  const log = { fills: [] }
  const ctx = new Proxy(
    { log },
    {
      get: (t, k) => (k in t ? t[k] : () => {}),
      set: (t, k, v) => {
        if (k === 'fillStyle') log.fills.push(v)
        t[k] = v
        return true
      },
    },
  )
  return { clientWidth: width, clientHeight: height, width: 0, height: 0, getContext: () => ctx, ctx }
}

export function fakeScheduler() {
  let time = 0
  /** @type {((now: number) => void) | null} */
  let pending = null
  const s = {
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
