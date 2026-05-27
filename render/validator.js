// Validation as a library function.
//
// Both render/validate.js (CLI) and render/render.js (orchestrator)
// consume this module. Single source of truth for:
//   - convention-by-path schema dispatch
//   - per-kind validator construction (delegates to load-schemas.js)
//   - walker invocation post-AJV
//
// Contract: `validatePath()` NEVER throws on invalid input YAML.
// Invalid YAML is a structured result (`ok: false` with schemaErrors
// or walkerErrors). The function throws ONLY on system errors:
//   - file is unreadable
//   - schema kind cannot be determined and no explicit `as` override
//   - screen YAML lacks `template` field (cannot build per-template schema)
//
// Caller (validate.js CLI or render.js orchestrator) decides how to
// format the result and what exit code to use.

import { readFileSync } from 'node:fs'
import { relative } from 'node:path'
import yaml from 'js-yaml'
import Ajv from 'ajv/dist/2020.js'
import {
  ROOT,
  loadContext,
  buildTokensValidators,
  buildPrimitiveValidator,
  buildBlockValidator,
  buildTemplateValidator,
  buildScreenValidator,
} from './load-schemas.js'
import { walkers } from './walkers/index.js'

const pickSchemaSpec = (relPath, explicitAs) => {
  if (explicitAs) {
    const [kind, sub] = explicitAs.split('.')
    return { kind, sub }
  }
  const tokensMatch = relPath.match(/^design\/tokens\/([^/]+)\.yaml$/)
  if (tokensMatch) return { kind: 'tokens', sub: tokensMatch[1] }
  if (relPath.match(/^system\/primitives\/[^/]+\.yaml$/)) return { kind: 'primitive' }
  if (relPath.match(/^system\/blocks\/[^/]+\.yaml$/)) return { kind: 'block' }
  if (relPath.match(/^system\/templates\/[^/]+\.yaml$/)) return { kind: 'template' }
  if (relPath.match(/^design\/screens\/[^/]+\.yaml$/)) return { kind: 'screen' }
  return null
}

const buildValidator = (ajv, spec, data) => {
  if (spec.kind === 'tokens') {
    const validators = buildTokensValidators(ajv)
    const v = validators[spec.sub]
    if (!v) {
      throw new Error(
        `Unknown tokens schema: "${spec.sub}". Known: ${Object.keys(validators).join(', ')}`
      )
    }
    return { validator: v, label: `${spec.kind}.${spec.sub}` }
  }
  if (spec.kind === 'primitive') return { validator: buildPrimitiveValidator(ajv), label: 'primitive' }
  if (spec.kind === 'block')     return { validator: buildBlockValidator(ajv),     label: 'block' }
  if (spec.kind === 'template')  return { validator: buildTemplateValidator(ajv),  label: 'template' }
  if (spec.kind === 'screen') {
    if (!data || typeof data.template !== 'string') {
      throw new Error('Screen YAML must declare top-level "template": <string>.')
    }
    return { validator: buildScreenValidator(ajv, data.template), label: `screen[${data.template}]` }
  }
  throw new Error(`Schema kind "${spec.kind}" not wired.`)
}

/**
 * Validate a YAML file against its schema and post-validation walkers.
 *
 * @param {string} absPath - absolute path to the YAML file
 * @param {object} [opts]
 * @param {string} [opts.explicitAs]   - override convention dispatch
 * @param {boolean} [opts.skipWalkers] - run AJV only, skip walkers
 * @param {string} [opts.onlyWalker]   - run a single walker by name
 * @returns {object} {
 *   ok: boolean,
 *   label: string,
 *   relPath: string,
 *   data: any,            // the parsed YAML object (useful for callers like render.js)
 *   schemaErrors: array,
 *   walkerErrors: array
 * }
 */
export const validatePath = (absPath, opts = {}) => {
  const relPath = relative(ROOT, absPath)
  const spec = pickSchemaSpec(relPath, opts.explicitAs)
  if (!spec) {
    throw new Error(
      `Cannot determine schema for "${relPath}". Provide explicitAs or place under a known convention path.`
    )
  }

  const ajv = new Ajv({ allErrors: true, strict: false })
  const data = yaml.load(readFileSync(absPath, 'utf8'))

  const { validator, label } = buildValidator(ajv, spec, data)

  const ok = validator(data)
  if (!ok) {
    return {
      ok: false,
      label,
      relPath,
      data,
      schemaErrors: validator.errors || [],
      walkerErrors: [],
    }
  }

  // AJV passed. Run walkers unless suppressed.
  const walkerErrors = []
  if (!opts.skipWalkers) {
    const context = loadContext()
    const walkersToRun = opts.onlyWalker
      ? walkers.filter((w) => w.name === opts.onlyWalker)
      : walkers
    for (const w of walkersToRun) {
      try {
        const errs = w.fn(data, context)
        if (Array.isArray(errs)) walkerErrors.push(...errs)
      } catch (e) {
        walkerErrors.push({ walker: w.name, message: `walker crashed: ${e.message}` })
      }
    }
  }

  return {
    ok: walkerErrors.length === 0,
    label,
    relPath,
    data,
    schemaErrors: [],
    walkerErrors,
  }
}
