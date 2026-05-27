// Generate dist/styles/tokens.css from design/tokens/.
//
// One custom property per token, grouped by source file. The only CSS
// expression synthesized here is clamp() for fluid type sizes — every
// other token is emitted verbatim. fluid-range itself appears only as a
// header comment, not as a runtime custom property.
//
// Three-level cascade:
//   palette  (--color-<name>)
//      ↓
//   tone-set (--tone-<n>-{surface,text,border}: var(--color-<x>))
//      ↓
//   block CSS uses --role-* / --tone-* indirection (see blocks.css)

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadTokens } from './load-schemas.js'

const REM_BASE = 16

const round = (n, places = 4) => Number(n.toFixed(places))

/**
 * Synthesize a CSS clamp() expression for a fluid type size.
 * Inputs are unitless px numbers from typography.yaml plus the global
 * fluid-range (also px).
 *
 *   y = m*x + b   with  y@from = min, y@max = max
 *   m = (max - min) / (to - from)
 *   b = min - m * from
 *
 * Emitted as rem (sizes divided by REM_BASE) with vw for the slope so
 * the value scales with viewport width.
 */
const clampSize = (size, fluidRange) => {
  const { min, max } = size
  const { from, to } = fluidRange
  const slope = (max - min) / (to - from)
  const intercept = min - slope * from
  const minRem = round(min / REM_BASE)
  const maxRem = round(max / REM_BASE)
  const interceptRem = round(intercept / REM_BASE)
  const slopeVw = round(slope * 100, 3)
  return `clamp(${minRem}rem, calc(${interceptRem}rem + ${slopeVw}vw), ${maxRem}rem)`
}

const generate = () => {
  const tokens = loadTokens()
  const out = []

  const fluid = tokens.typography['fluid-range']
  out.push('/* Generated from design/tokens/. Do not edit by hand. */')
  out.push(`/* fluid range: ${fluid.from}px → ${fluid.to}px (typography only) */`)
  out.push('')
  out.push(':root {')

  // ---- palette ----
  out.push('  /* palette */')
  for (const [name, value] of Object.entries(tokens.colors)) {
    out.push(`  --color-${name}: ${value};`)
  }

  // ---- spacing ----
  out.push('')
  out.push('  /* spacing */')
  for (const [name, value] of Object.entries(tokens.spacing)) {
    out.push(`  --spacing-${name}: ${value};`)
  }

  // ---- radius ----
  out.push('')
  out.push('  /* radius */')
  for (const [name, value] of Object.entries(tokens.radius)) {
    out.push(`  --radius-${name}: ${value};`)
  }

  // ---- typography: families ----
  out.push('')
  out.push('  /* typography: families */')
  for (const [name, value] of Object.entries(tokens.typography.family)) {
    out.push(`  --font-${name}: ${value};`)
  }

  // ---- typography: styles (fluid sizes via clamp) ----
  out.push('')
  out.push('  /* typography: type styles (size synthesised via clamp from fluid-range) */')
  for (const [name, style] of Object.entries(tokens.typography.style)) {
    out.push(`  --type-${name}-size: ${clampSize(style.size, fluid)};`)
    out.push(`  --type-${name}-weight: ${style.weight};`)
    out.push(`  --type-${name}-leading: ${style['line-height']};`)
    if (style['letter-spacing'] !== undefined) {
      out.push(`  --type-${name}-tracking: ${style['letter-spacing']}em;`)
    }
  }

  // ---- tone roles (palette → tone-set) ----
  out.push('')
  out.push('  /* tone roles (resolve to palette via var()) */')
  for (const [toneName, toneSpec] of Object.entries(tokens.roles.tone)) {
    for (const aspect of ['surface', 'text', 'border']) {
      const refName = toneSpec[aspect].token
      out.push(`  --tone-${toneName}-${aspect}: var(--color-${refName});`)
    }
  }

  // ---- color roles ----
  out.push('')
  out.push('  /* color roles (brand-level semantic names) */')
  for (const [roleName, roleSpec] of Object.entries(tokens.roles['color-role'])) {
    out.push(`  --role-${roleName}: var(--color-${roleSpec.token});`)
  }

  out.push('}')
  out.push('')

  const outDir = join(ROOT, 'dist', 'styles')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'tokens.css')
  const body = out.join('\n')
  writeFileSync(outPath, body)
  return { outPath, lines: out.length, bytes: body.length }
}

const { outPath, lines, bytes } = generate()
const rel = outPath.startsWith(ROOT) ? outPath.slice(ROOT.length + 1) : outPath
console.log(`OK    ${rel}  ${lines} lines, ${bytes} bytes`)
