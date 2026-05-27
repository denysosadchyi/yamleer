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

import { readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'
import { ROOT } from './load-schemas.js'
import { validatePath } from './validator.js'
import { templates } from '../system/templates/index.js'
import { blocks } from '../system/blocks/index.js'
import { primitives } from '../system/primitives/index.js'
import { escape } from '../system/lib/escape.js'

const PROJECT_NAME = 'yamleer'
const BUILD_TS = Date.now()

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

// ---------- build renderContext (closures bound) ----------

const renderContext = {
  escape,
  renderPrimitive: (data) => {
    const fn = primitives[data.primitive]
    if (!fn) throw new Error(`No primitive renderer for "${data.primitive}"`)
    return fn(data, renderContext)
  },
  renderBlock: (data) => {
    const fn = blocks[data.block]
    if (!fn) throw new Error(`No block renderer for "${data.block}"`)
    return fn(data, renderContext)
  },
}

// ---------- 5. per-screen render → dist/screens/<id>.html ----------

const distDir = join(ROOT, 'dist')
const distScreensDir = join(distDir, 'screens')
mkdirSync(distScreensDir, { recursive: true })

const standaloneHtml = (id, templateName, mainHtml) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(id)} — ${PROJECT_NAME}</title>
  <link rel="stylesheet" href="../styles/tokens.css?v=${BUILD_TS}">
  <link rel="stylesheet" href="../styles/reset.css?v=${BUILD_TS}">
  <link rel="stylesheet" href="../styles/base.css?v=${BUILD_TS}">
  <link rel="stylesheet" href="../styles/blocks.css?v=${BUILD_TS}">
</head>
<body>
${mainHtml}
</body>
</html>
`

const rendered = []
for (const r of results) {
  const id = basename(r.relPath, '.yaml')
  const templateName = r.data.template
  const tplFn = templates[templateName]
  if (!tplFn) {
    console.error(`${c.red('FAIL')}  ${r.relPath}  no template renderer for "${templateName}"`)
    process.exit(1)
  }
  const mainHtml = tplFn(r.data, renderContext)
  const html = standaloneHtml(id, templateName, mainHtml)
  const outPath = join(distScreensDir, `${id}.html`)
  writeFileSync(outPath, html)
  rendered.push({ id, templateName, mainHtml, bytes: html.length })
}

// ---------- 3, 4, 6, 7 placeholder ----------
//
// Still pending: tokens.css generation, system/styles copy, storyboard
// composition, friendly summary. tokens.css and reset/base/blocks.css
// must be in dist/styles/ for the standalone screens above to actually
// render with styles. Next commit.

console.log(`${c.green('✓')} ${rendered.length} screen(s) rendered to dist/screens/`)
for (const r of rendered) {
  const rel = `dist/screens/${r.id}.html`
  console.log(`  ${c.dim(rel.padEnd(36))} ${r.templateName}  ${c.dim('(' + r.bytes + ' B)')}`)
}
console.log('')
console.log(c.dim('  (steps 6.4 [css copy], 6.5 [storyboard], 6.6 [summary] pending)'))
