// Serves the repo root so the demo loads src/ directly as ES modules.
// Usage: npm run dev  (PORT=8123 npm run dev to start from another port)
// If the port is taken, the next free one is used; the URL printed is the real one.
import { context } from 'esbuild'

const first = Number(process.env.PORT) || 8000
const tries = 20
const ctx = await context({})

for (let port = first; port < first + tries; port++) {
  try {
    const { hosts } = await ctx.serve({ servedir: '.', port, host: '127.0.0.1' })
    if (port !== first) console.log(`port ${first} is in use, using ${port}`)
    console.log(`xploders demo: http://${hosts[0]}:${port}/demo/`)
    break
  } catch (error) {
    if (!String(error).includes('address already in use')) throw error
    if (port === first + tries - 1) {
      console.error(`ports ${first}-${port} are all in use; set PORT to start elsewhere`)
      await ctx.dispose()
      process.exit(1)
    }
  }
}
