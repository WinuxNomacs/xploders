// Serves the repo root so the demo loads src/ directly as ES modules.
// Usage: npm run dev  (PORT=8123 npm run dev for another port)
import { context } from 'esbuild'

const port = Number(process.env.PORT) || 8000
const ctx = await context({})
const { hosts } = await ctx.serve({ servedir: '.', port, host: '127.0.0.1' })
console.log(`xploders demo: http://${hosts[0]}:${port}/demo/`)
