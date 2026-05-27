// render.js — build orchestrator (Etap 4 step 6).
//
// Flow:
//   1. Discover design/screens/*.yaml
//   2. Validate every screen through validator.validatePath (schema + walkers).
//      All failures collected; build aborts before writing any output.
//   3. tokensToCss() → dist/styles/tokens.css
//   4. Copy system/styles/*.css → dist/styles/  (so dist/ is self-contained
//      under http server rooted at dist/)
//   5. For each validated screen: template renderer → standalone HTML →
//      dist/screens/<id>.html
//   6. Compose storyboard → dist/index.html
//   7. Print friendly summary
//
// Single entry point for `npm run build`. Reuses validator.validatePath()
// so render and validate share the exact same validation contract.

import { readdirSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { ROOT } from './load-schemas.js'
import { validatePath } from './validator.js'

// --- ANSI (same TTY/NO_COLOR detection as validate.js) ---
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

// ---------- 1. discover screens ----------

const screensDir = join(ROOT, 'design', 'screens')
const screenFiles = readdirSync(screensDir)
  .filter((f) => f.endsWith('.yaml'))
  .sort()

if (screenFiles.length === 0) {
  console.error(`${c.red('FAIL')}  no screens found in design/screens/`)
  process.exit(1)
}

// ---------- 2. validate all ----------

const results = []
for (const file of screenFiles) {
  const absPath = resolve(screensDir, file)
  try {
    const r = validatePath(absPath)
    results.push(r)
  } catch (e) {
    results.push({
      ok: false,
      relPath: `design/screens/${file}`,
      label: 'screen',
      data: null,
      schemaErrors: [],
      walkerErrors: [{ walker: 'validator', message: e.message }],
    })
  }
}

const failed = results.filter((r) => !r.ok)
if (failed.length > 0) {
  console.error(`${c.red('✗')} Build aborted: ${failed.length} file(s) failed validation`)
  console.error('')
  for (const r of failed) {
    console.error(`${c.bold(r.relPath)}  ${c.dim('(' + r.label + ')')}`)
    if (r.schemaErrors.length > 0) {
      console.error(`  ${c.dim(r.schemaErrors.length + ' schema issue(s):')}`)
      for (const e of r.schemaErrors) {
        const path = e.instancePath || '/'
        const params = e.params && Object.keys(e.params).length
          ? c.dim('(' + Object.entries(e.params).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ') + ')')
          : ''
        console.error(`    ${c.dim(path.padEnd(36))} ${e.message} ${params}`)
      }
    }
    for (const e of r.walkerErrors) {
      console.error(`  ${c.yellow('[' + e.walker + ']')}`)
      if (e.path)     console.error(`    ${c.dim('PATH:    ')} ${e.path}`)
      if (e.expected) console.error(`    ${c.dim('EXPECTED:')} ${c.cyan(e.expected)}`)
      if (e.found)    console.error(`    ${c.dim('FOUND:   ')} ${c.red(e.found)}`)
      if (e.message)  console.error(`    ${c.dim('MESSAGE: ')} ${e.message}`)
    }
    console.error('')
  }
  console.error(c.dim('Fix the errors above and re-run `npm run build`.'))
  process.exit(1)
}

// ---------- 3..7 placeholder ----------
//
// Steps 3 (tokens), 4 (copy CSS), 5 (per-screen render), 6 (storyboard),
// 7 (summary) land in subsequent commits. For now, print a confirming
// dry-run summary so the validation pipeline is visible end-to-end.

console.log(`${c.green('✓')} Validation OK: ${results.length} screen(s) ready to render`)
for (const r of results) {
  console.log(`  ${c.dim(r.relPath.padEnd(40))} ${r.label}`)
}
console.log('')
console.log(c.dim('  (steps 6.3–6.7 not yet implemented; no files written to dist/)'))
