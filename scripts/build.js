// Builds dist/: an ES module, a minified script-tag build (global `Xploders`)
// and .d.ts files generated from the JSDoc in src/.
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

rmSync('dist', { recursive: true, force: true })

const common = {
  entryPoints: ['src/index.js'],
  bundle: true,
  target: 'es2020',
  sourcemap: true,
  // Classes keep their own names (esbuild renames classes with static fields, and minifying mangles them).
  keepNames: true,
  logLevel: 'info',
}

await build({ ...common, format: 'esm', outfile: 'dist/xploders.mjs' })
await build({
  ...common,
  format: 'iife',
  globalName: 'Xploders',
  // Expose the class itself as the global, with the other exports as properties.
  footer: { js: 'Xploders = Object.assign(Xploders.default, Xploders);' },
  minify: true,
  outfile: 'dist/xploders.min.js',
})

// Through node rather than npx, which execFileSync can't start on Windows (npx.cmd needs a shell).
const tsc = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))
execFileSync(process.execPath, [tsc], { stdio: 'inherit' })
