// validate.js — thin CLI wrapper over render/validator.js.
//
// Owns ONLY:
//   - argv parsing (--as, --skip-walkers, --only-walker=)
//   - ANSI colour output formatting (TTY-aware)
//   - exit code mapping
//
// All actual validation logic lives in render/validator.js so render.js
// (the build orchestrator) can call it with the same contract.

import { resolve } from 'node:path'
import { walkers, findWalker } from './walkers/index.js'
import { validatePath } from './validator.js'

// --- ANSI colors with TTY/NO_COLOR detection ---
const useColor =
  !process.env.NO_COLOR &&
  process.stdout.isTTY &&
  process.stderr.isTTY

const ansi = (code, s) => useColor ? `\x1b[${code}m${s}\x1b[0m` : s
const c = {
  red: (s) => ansi('31', s),
  green: (s) => ansi('32', s),
  yellow: (s) => ansi('33', s),
  cyan: (s) => ansi('36', s),
  bold: (s) => ansi('1', s),
  dim: (s) => ansi('2', s),
}

const usage = (code = 2) => {
  console.error('Usage: node render/validate.js <path> [flags]')
  console.error('  Convention picks schema kind from path; override with --as <kind>[.sub]')
  console.error('  Flags:')
  console.error('    --as <kind>             override schema dispatch (e.g. --as tokens.colors)')
  console.error('    --skip-walkers          run AJV only, skip post-validation walkers')
  console.error('    --only-walker=<name>    run a single walker; valid: ' +
    walkers.map(w => w.name).join(', '))
  process.exit(code)
}

const args = process.argv.slice(2)
const asIdx = args.indexOf('--as')
const explicitAs = asIdx >= 0 ? args[asIdx + 1] : null
const skipWalkers = args.includes('--skip-walkers')
const onlyWalkerArg = args.find(a => a.startsWith('--only-walker='))
const onlyWalker = onlyWalkerArg ? onlyWalkerArg.split('=')[1] : null

const positional = args.filter((arg, i) => {
  if (arg === '--as') return false
  if (arg === '--skip-walkers') return false
  if (arg.startsWith('--only-walker=')) return false
  if (asIdx >= 0 && i === asIdx + 1) return false
  return true
})
const targetPath = positional[0]
if (!targetPath) usage()

if (onlyWalker && !findWalker(onlyWalker)) {
  console.error(`Unknown walker: "${onlyWalker}".`)
  console.error(`Known: ${walkers.map(w => w.name).join(', ')}`)
  process.exit(2)
}

const absPath = resolve(targetPath)

let result
try {
  result = validatePath(absPath, { explicitAs, skipWalkers, onlyWalker })
} catch (e) {
  console.error(`${c.red('FAIL')}  ${absPath}  ${e.message}`)
  process.exit(2)
}

const printPair = (label, value) => {
  console.error(`    ${c.dim(label.padEnd(9))} ${value}`)
}

if (result.schemaErrors.length > 0) {
  console.error(`${c.red('FAIL')}  ${result.relPath}  ${c.dim('schema:')} ${result.label}`)
  console.error(`        ${result.schemaErrors.length} schema issue(s):`)
  for (const e of result.schemaErrors) {
    const path = e.instancePath || '/'
    const params = e.params && Object.keys(e.params).length
      ? c.dim('(' + Object.entries(e.params).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ') + ')')
      : ''
    console.error(`    ${c.dim(path.padEnd(36))} ${e.message} ${params}`)
  }
  process.exit(1)
}

if (result.walkerErrors.length > 0) {
  console.error(`${c.red('FAIL')}  ${result.relPath}  ${c.dim('schema:')} ${result.label}  ${c.dim('— schema OK, walkers found ' + result.walkerErrors.length + ' issue(s):')}`)
  for (const e of result.walkerErrors) {
    console.error('')
    console.error(`  ${c.yellow('[' + e.walker + ']')}`)
    if (e.path) printPair('PATH:', e.path)
    if (e.expected) printPair('EXPECTED:', c.cyan(e.expected))
    if (e.found) printPair('FOUND:', c.red(e.found))
    if (e.message) printPair('MESSAGE:', e.message)
  }
  process.exit(1)
}

let tail = ''
if (skipWalkers) tail = c.dim(' (walkers skipped)')
else if (onlyWalker) tail = c.dim(` (only walker: ${onlyWalker})`)
console.log(`${c.green('OK')}    ${result.relPath}  ${c.dim('schema:')} ${result.label}${tail}`)
process.exit(0)
