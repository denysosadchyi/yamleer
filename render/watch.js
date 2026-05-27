// watch.js — dev file-watcher. Reruns the build pipeline whenever a YAML
// (or CSS in system/styles) changes under design/ or system/.
//
// Usage:  npm run watch
// Pairs naturally with `npm run serve` in another terminal.
//
// No external deps: uses fs.watch with recursive:true (Linux 6.x supports it).
// Debounces bursts of editor save-events so we don't double-build.

import { watch } from 'node:fs'
import { spawn } from 'node:child_process'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

const WATCH_DIRS = ['design', 'system']
const RELEVANT_EXT = new Set(['.yaml', '.yml', '.css'])

// Steps run in sequence on every change. yaml-explorer is cheap and always
// safe to run; render.js validates and may fail — its failure is logged but
// doesn't stop the watcher.
const STEPS = [
  { label: 'render',       script: 'render/render.js'        },
  { label: 'yaml-explorer', script: 'render/yaml-explorer.js' },
]

const DEBOUNCE_MS = 150
let pending = null
let running = false
let rerunRequested = false

const stamp = () => new Date().toTimeString().slice(0, 8)

const runStep = (step) => new Promise((resolve) => {
  const child = spawn(process.execPath, [step.script], {
    cwd: ROOT,
    stdio: 'inherit',
  })
  child.on('exit', (code) => resolve(code ?? 0))
  child.on('error', (err) => {
    console.error(`  ✗ ${step.label}: ${err.message}`)
    resolve(1)
  })
})

const runAll = async () => {
  if (running) { rerunRequested = true; return }
  running = true
  console.log(`\n[${stamp()}] rebuild…`)
  const t0 = Date.now()
  for (const step of STEPS) {
    const code = await runStep(step)
    if (code !== 0) {
      console.log(`  · ${step.label} exited with code ${code} (continuing)`)
    }
  }
  console.log(`[${stamp()}] done in ${Date.now() - t0}ms`)
  running = false
  if (rerunRequested) {
    rerunRequested = false
    runAll()
  }
}

const schedule = (relPath) => {
  if (pending) clearTimeout(pending)
  pending = setTimeout(() => {
    pending = null
    console.log(`[${stamp()}] change: ${relPath}`)
    runAll()
  }, DEBOUNCE_MS)
}

for (const dir of WATCH_DIRS) {
  const abs = join(ROOT, dir)
  try {
    watch(abs, { recursive: true }, (_event, filename) => {
      if (!filename) return
      const ext = extname(filename)
      if (!RELEVANT_EXT.has(ext)) return
      schedule(relative(ROOT, join(abs, filename)))
    })
    console.log(`watching ${dir}/`)
  } catch (err) {
    console.error(`could not watch ${dir}/: ${err.message}`)
  }
}

console.log('initial build…')
runAll()
