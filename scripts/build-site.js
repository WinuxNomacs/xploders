// Builds the demo site into site/: the demo and bench pages loading the built library,
// so it runs from any static host (GitHub Pages serves it from gh-pages).
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

execFileSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' })

rmSync('site', { recursive: true, force: true })
mkdirSync('site')

const from = "from '../src/index.js'"
for (const name of ['main', 'bench']) {
  const script = readFileSync(`demo/${name}.js`, 'utf8')
  if (!script.includes(from)) throw new Error(`build-site: demo/${name}.js no longer imports ${from}`)
  writeFileSync(`site/${name}.js`, script.replace(from, "from './xploders.mjs'"))
}
copyFileSync('demo/index.html', 'site/index.html')
copyFileSync('demo/bench.html', 'site/bench.html')
copyFileSync('dist/xploders.mjs', 'site/xploders.mjs')
writeFileSync('site/.nojekyll', '') // serve files as they are, no Jekyll

console.log('site/ built')
