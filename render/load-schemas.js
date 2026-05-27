import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const ROOT = join(__dirname, '..')

export const loadYaml = (relPath) =>
  yaml.load(readFileSync(join(ROOT, relPath), 'utf8'))

export const loadDictionary = (relDir) => {
  const files = readdirSync(join(ROOT, relDir))
    .filter(f => f.endsWith('.yaml'))
  const out = {}
  for (const f of files) {
    const data = loadYaml(`${relDir}/${f}`)
    const declaredType = data?.type
    const fileBase = f.replace(/\.yaml$/, '')
    if (declaredType !== fileBase) {
      throw new Error(
        `${relDir}/${f}: declared type "${declaredType}" does not match filename "${fileBase}"`
      )
    }
    out[declaredType] = data
  }
  return out
}

export const loadTokens = () => ({
  colors: loadYaml('design/tokens/colors.yaml'),
  spacing: loadYaml('design/tokens/spacing.yaml'),
  typography: loadYaml('design/tokens/typography.yaml'),
  radius: loadYaml('design/tokens/radius.yaml'),
  roles: loadYaml('design/tokens/roles.yaml'),
})

export const loadSchema = (name) =>
  loadYaml(`system/schemas/${name}.schema.yaml`)

const TOKEN_SUBSCHEMAS = ['colors', 'spacing', 'typography', 'radius', 'roles']

export const buildTokensValidators = (ajv) => {
  const tokensSchema = loadSchema('tokens')
  const validators = {}
  for (const sub of TOKEN_SUBSCHEMAS) {
    validators[sub] = ajv.compile({
      $id: `yamleer://tokens-${sub}.schema.json`,
      $defs: tokensSchema.$defs,
      $ref: `#/$defs/${sub}`,
    })
  }
  return validators
}

export const buildPrimitiveValidator = (ajv) => {
  const schema = loadSchema('primitive')
  return ajv.compile(schema)
}

export const TOKEN_REF_MAP = {
  spacing:      { file: 'design/tokens/spacing.yaml',    path: '$' },
  radius:       { file: 'design/tokens/radius.yaml',     path: '$' },
  typography:   { file: 'design/tokens/typography.yaml', path: 'style' },
  tone:         { file: 'design/tokens/roles.yaml',      path: 'tone' },
  'color-role': { file: 'design/tokens/roles.yaml',      path: 'color-role' },
}

const requireArray = (label, value) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`schema injection failed: ${label} is not a non-empty array`)
  }
}

export const buildBlockValidator = (ajv) => {
  const schema = loadSchema('block')
  const blocks = loadDictionary('system/blocks')
  const primitives = loadDictionary('system/primitives')

  const blockNames = Object.keys(blocks).sort()
  const primitiveNames = Object.keys(primitives).sort()
  const tokenRefKeys = Object.keys(TOKEN_REF_MAP).sort()

  schema.$defs['slot-spec'].properties.allows.items.enum = blockNames
  schema.$defs['field-ref'].properties['ref-type'].enum = primitiveNames
  schema.$defs['variant-token-ref'].properties.tokenRef.enum = tokenRefKeys

  requireArray('block.slot-spec.allows.items.enum',
    schema.$defs['slot-spec'].properties.allows.items.enum)
  requireArray('block.field-ref.ref-type.enum',
    schema.$defs['field-ref'].properties['ref-type'].enum)
  requireArray('block.variant-token-ref.tokenRef.enum',
    schema.$defs['variant-token-ref'].properties.tokenRef.enum)

  return ajv.compile(schema)
}

export const buildTemplateValidator = (ajv) => {
  const schema = loadSchema('template')
  const blocks = loadDictionary('system/blocks')
  const blockNames = Object.keys(blocks).sort()

  schema.properties.allows.items.enum = blockNames
  schema.$defs['slot-spec'].properties.allows.items.enum = blockNames

  requireArray('template.allows.items.enum',
    schema.properties.allows.items.enum)
  requireArray('template.slot-spec.allows.items.enum',
    schema.$defs['slot-spec'].properties.allows.items.enum)

  return ajv.compile(schema)
}

import { buildScreenSchema } from './screen-schema-builder.js'

const screenValidatorCache = new Map()

export const buildScreenValidator = (ajv, templateName) => {
  if (screenValidatorCache.has(templateName)) {
    return screenValidatorCache.get(templateName)
  }

  const templates = loadDictionary('system/templates')
  const blocks = loadDictionary('system/blocks')
  const primitives = loadDictionary('system/primitives')

  const schema = buildScreenSchema(templateName, templates, blocks, primitives)
  const validator = ajv.compile(schema)
  screenValidatorCache.set(templateName, validator)
  return validator
}
