// Builds site/ and commits it to the gh-pages branch, through a temporary git
// worktree so the current checkout is untouched. Never pushes: push with
//   git push origin gh-pages
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts }).trim()

execFileSync(process.execPath, ['scripts/build-site.js'], { stdio: 'inherit' })

const source = git(['rev-parse', '--short', 'HEAD'])
const dirty = git(['status', '--porcelain']) !== ''
const dir = mkdtempSync(join(tmpdir(), 'xploders-gh-pages-'))
const exists = git(['branch', '--list', 'gh-pages']) !== ''

try {
  if (exists) git(['worktree', 'add', dir, 'gh-pages'])
  else git(['worktree', 'add', '--orphan', '-b', 'gh-pages', dir])
  const inTree = (args) => git(['-C', dir, ...args])
  for (const name of readdirSync(dir)) if (name !== '.git') rmSync(join(dir, name), { recursive: true, force: true })
  cpSync('site', dir, { recursive: true })
  inTree(['add', '--all'])
  if (inTree(['status', '--porcelain']) === '') {
    console.log('gh-pages already matches the site; nothing to commit')
  } else {
    inTree(['commit', '--quiet', '-m', `Publish site from ${source}${dirty ? ' (with uncommitted changes)' : ''}`])
    console.log(`gh-pages updated: ${inTree(['log', '--oneline', '-1'])}`)
    console.log('Push it with: git push origin gh-pages')
  }
} finally {
  git(['worktree', 'remove', '--force', dir])
}
