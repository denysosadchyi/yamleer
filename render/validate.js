import { readFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import yaml from 'js-yaml'
import Ajv from 'ajv/dist/2020.js'
import {
  ROOT,
  buildTokensValidators,
  buildPrimitiveValidator,
  buildBlockValidator,
  buildTemplateValidator,
  buildScreenValidator,
} from './load-schemas.js'

const usage = (code = 2) => {
  console.error('Usage: node render/validate.js <path> [--as <schema-name>]')
  console.error('  Convention by path:')
  console.error('    design/tokens/<name>.yaml  -> tokens.<name>')
  console.error('  Override with --as, e.g.: --as tokens.colors')
  process.exit(code)
}

const args = process.argv.slice(2)
const asIdx = args.indexOf('--as')
const explicitAs = asIdx >= 0 ? args[asIdx + 1] : null
const positional = asIdx >= 0
  ? args.filter((_, i) => i !== asIdx && i !== asIdx + 1)
  : args
const targetPath = positional[0]
if (!targetPath) usage()

const absPath = resolve(targetPath)
const relPath = relative(ROOT, absPath)

const pickSchema = () => {
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

const spec = pickSchema()
if (!spec) {
  console.error(`Cannot determine schema for "${relPath}".`)
  console.error('Provide --as <schema-name>, or place file under a known convention path.')
  process.exit(2)
}

const ajv = new Ajv({ allErrors: true, strict: false })
const data = yaml.load(readFileSync(absPath, 'utf8'))

let validator
let label
if (spec.kind === 'tokens') {
  const validators = buildTokensValidators(ajv)
  validator = validators[spec.sub]
  if (!validator) {
    console.error(`Unknown tokens schema: "${spec.sub}".`)
    console.error(`Known: ${Object.keys(validators).join(', ')}.`)
    process.exit(2)
  }
  label = `${spec.kind}.${spec.sub}`
} else if (spec.kind === 'primitive') {
  validator = buildPrimitiveValidator(ajv)
  label = spec.kind
} else if (spec.kind === 'block') {
  validator = buildBlockValidator(ajv)
  label = spec.kind
} else if (spec.kind === 'template') {
  validator = buildTemplateValidator(ajv)
  label = spec.kind
} else if (spec.kind === 'screen') {
  if (!data || typeof data.template !== 'string') {
    console.error('Screen YAML must declare top-level "template": <string>.')
    process.exit(2)
  }
  try {
    validator = buildScreenValidator(ajv, data.template)
    label = `screen[${data.template}]`
  } catch (e) {
    console.error(`FAIL  ${relPath}  cannot build screen validator: ${e.message}`)
    process.exit(2)
  }
} else {
  console.error(`Schema kind "${spec.kind}" not wired yet.`)
  console.error('Wired: tokens.{colors,spacing,typography,radius,roles}, primitive, block, template, screen.')
  process.exit(2)
}

const ok = validator(data)

if (ok) {
  console.log(`OK    ${relPath}  validates as ${label}`)
  process.exit(0)
}

console.error(`FAIL  ${relPath}  failed validation as ${label}:`)
for (const e of validator.errors) {
  const path = e.instancePath || '/'
  const params = JSON.stringify(e.params)
  console.error(`      ${path}  ${e.message}  ${params}`)
}
process.exit(1)
