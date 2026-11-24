// Builds the demo site into site/: the demo page loading the built library,
// so it runs from any static host (GitHub Pages serves it from gh-pages).
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

execFileSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' })

rmSync('site', { recursive: true, force: true })
mkdirSync('site')

const main = readFileSync('demo/main.js', 'utf8')
const from = "from '../src/index.js'"
if (!main.includes(from)) throw new Error(`build-site: demo/main.js no longer imports ${from}`)
writeFileSync('site/main.js', main.replace(from, "from './xploders.mjs'"))
copyFileSync('demo/index.html', 'site/index.html')
copyFileSync('dist/xploders.mjs', 'site/xploders.mjs')
writeFileSync('site/.nojekyll', '') // serve files as they are, no Jekyll

console.log('site/ built')
