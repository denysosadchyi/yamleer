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
