// Visual audit via Playwright + Chromium.
//
// Loads the live storyboard from the host's HTTP server (started by
// `npm run serve`) and captures full-page screenshots at three
// viewport widths. Saved into dist/audit/ for human review and for
// the agent's multi-modal Read inspection.

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUTPUT_DIR = join(ROOT, 'dist', 'audit')
mkdirSync(OUTPUT_DIR, { recursive: true })

const HOST = 'http://192.168.31.210:8000'

const URLS = {
  storyboard:       `${HOST}/`,
  'sample-dashboard': `${HOST}/screens/sample-dashboard.html`,
  'sample-landing':   `${HOST}/screens/sample-landing.html`,
}

const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '768',  width: 768,  height: 1024 },
  { name: '375',  width: 375,  height: 812 },
]

// Storyboard skipped at 375 per the audit prompt — mobile storyboard is
// not a target use case; standalone screens at 375 are.
const SKIP = new Set(['storyboard:375'])

const browser = await chromium.launch()
const captured = []

for (const [name, url] of Object.entries(URLS)) {
  for (const vp of VIEWPORTS) {
    if (SKIP.has(`${name}:${vp.name}`)) continue
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })
    const out = join(OUTPUT_DIR, `${name}-${vp.name}.png`)
    await page.screenshot({ path: out, fullPage: true })
    const stat = (await import('node:fs/promises')).statSync || null
    captured.push({ name, vp: vp.name, path: out, url })
    await context.close()
  }
}

await browser.close()

console.log(`captured ${captured.length} screenshots → ${OUTPUT_DIR}`)
for (const c of captured) {
  console.log(`  ${c.name}-${c.vp}.png   ${c.url}  @ ${c.vp}`)
}
