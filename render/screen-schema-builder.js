// Per-template screen schema builder.
//
// There is no static `system/schemas/screen.schema.yaml`. The screen schema
// is fully dynamic: each compiled schema is bound to one specific template
// and is constructed by walking template -> slots -> allowed blocks ->
// their fields/variants/nested slots, recursively, and emitting JSON Schema
// $defs for each block-instance and primitive-instance shape encountered.
//
// Caching of compiled validators happens at the load-schemas layer
// (Map<templateName, compiledValidator>).
//
// Per-template injection points (all happen here, not via mutation):
//   - top-level template.const         <- template name
//   - top-level slots OR blocks shape  <- template.mode
//   - per-slot cardinality and allows  <- template.slots.<x> or template.allows
//   - per-block-instance fields/variants/slots
//   - variant enum values              <- resolved via TOKEN_REF_MAP

import { TOKEN_REF_MAP, loadYaml } from './load-schemas.js'

const buildFieldInstanceSchema = (fieldSpec, registerPrimitive) => {
  switch (fieldSpec.type) {
    case 'string': {
      const s = { type: 'string' }
      if (fieldSpec['max-length'] !== undefined) s.maxLength = fieldSpec['max-length']
      if (fieldSpec['min-length'] !== undefined) s.minLength = fieldSpec['min-length']
      return s
    }
    case 'number': {
      const s = { type: 'number' }
      if (fieldSpec.min !== undefined) s.minimum = fieldSpec.min
      if (fieldSpec.max !== undefined) s.maximum = fieldSpec.max
      return s
    }
    case 'enum':
      return { enum: [...fieldSpec.values] }
    case 'boolean':
      return { type: 'boolean' }
    case 'ref': {
      if (fieldSpec['ref-kind'] !== 'primitive') {
        throw new Error(
          `field-ref must have ref-kind=primitive, got "${fieldSpec['ref-kind']}"`
        )
      }
      // ref-type is `string | string[]` after the array-form extension.
      // Normalize to array, register each primitive, emit single $ref for
      // length-1 (cheap) or oneOf for length>1 (discriminator: every
      // primitive-N schema has `primitive: { const: <name> }`, so exactly
      // one branch matches per instance — same pattern as slot allows).
      const rawRefType = fieldSpec['ref-type']
      const refTypes = Array.isArray(rawRefType) ? rawRefType : [rawRefType]
      for (const t of refTypes) registerPrimitive(t)
      if (refTypes.length === 1) {
        return { $ref: `#/$defs/primitive-${refTypes[0]}` }
      }
      return { oneOf: refTypes.map(t => ({ $ref: `#/$defs/primitive-${t}` })) }
    }
    default:
      throw new Error(`Unknown field type: "${fieldSpec.type}"`)
  }
}

const resolveTokenRef = (refKey) => {
  const entry = TOKEN_REF_MAP[refKey]
  if (!entry) throw new Error(`Unknown tokenRef key: "${refKey}"`)
  const data = loadYaml(entry.file)
  const target = entry.path === '$' ? data : data[entry.path]
  if (!target || typeof target !== 'object') {
    throw new Error(
      `tokenRef "${refKey}" path "${entry.path}" missing in ${entry.file}`
    )
  }
  return Object.keys(target).sort()
}

const buildVariantInstanceSchema = (variantSpec) => {
  if ('enum' in variantSpec) return { enum: [...variantSpec.enum] }
  if ('tokenRef' in variantSpec) return { enum: resolveTokenRef(variantSpec.tokenRef) }
  throw new Error('variant must declare tokenRef or enum')
}

const buildSlotInstanceSchema = (slotSpec) => {
  const allowed = slotSpec.allows
  const itemSchema = allowed.length === 1
    ? { $ref: `#/$defs/block-${allowed[0]}` }
    : { oneOf: allowed.map(name => ({ $ref: `#/$defs/block-${name}` })) }

  if (slotSpec.cardinality === 'one') return itemSchema

  const s = { type: 'array', items: itemSchema }
  if (slotSpec.min !== undefined) s.minItems = slotSpec.min
  if (slotSpec.max !== undefined) s.maxItems = slotSpec.max
  return s
}

const buildBlockInstanceSchema = (blockName, blocks, registerBlock, registerPrimitive) => {
  const block = blocks[blockName]
  if (!block) throw new Error(`Unknown block: "${blockName}"`)

  const props = { block: { const: blockName } }
  const required = ['block']

  for (const [fieldName, fieldSpec] of Object.entries(block.fields || {})) {
    props[fieldName] = buildFieldInstanceSchema(fieldSpec, registerPrimitive)
    if (fieldSpec.required) required.push(fieldName)
  }

  for (const [variantName, variantSpec] of Object.entries(block.variants || {})) {
    props[variantName] = buildVariantInstanceSchema(variantSpec)
  }

  if (block.role === 'structural' && block.slots) {
    const slotsProps = {}
    const slotsRequired = []
    for (const [slotName, slotSpec] of Object.entries(block.slots)) {
      for (const allowedName of slotSpec.allows) registerBlock(allowedName)
      slotsProps[slotName] = buildSlotInstanceSchema(slotSpec)
      if (slotSpec.required) slotsRequired.push(slotName)
    }
    props.slots = {
      type: 'object',
      properties: slotsProps,
      required: slotsRequired,
      additionalProperties: false,
    }
    required.push('slots')
  }

  return {
    type: 'object',
    required,
    additionalProperties: false,
    properties: props,
  }
}

const buildPrimitiveInstanceSchema = (primitiveName, primitives) => {
  const primitive = primitives[primitiveName]
  if (!primitive) throw new Error(`Unknown primitive: "${primitiveName}"`)

  const props = { primitive: { const: primitiveName } }
  const required = ['primitive']

  for (const [fieldName, fieldSpec] of Object.entries(primitive.fields || {})) {
    props[fieldName] = buildFieldInstanceSchema(fieldSpec, () => {
      throw new Error(`Primitive "${primitiveName}" cannot have ref fields (no nesting)`)
    })
    if (fieldSpec.required) required.push(fieldName)
  }

  return {
    type: 'object',
    required,
    additionalProperties: false,
    properties: props,
  }
}

export const buildScreenSchema = (templateName, templates, blocks, primitives) => {
  const template = templates[templateName]
  if (!template) {
    throw new Error(
      `Unknown template: "${templateName}". Known: ${Object.keys(templates).sort().join(', ')}.`
    )
  }

  const blockDefs = {}
  const primitiveDefs = {}
  const visitedBlocks = new Set()
  const visitedPrimitives = new Set()
  const blockQueue = []

  const registerBlock = (name) => {
    if (visitedBlocks.has(name)) return
    visitedBlocks.add(name)
    blockQueue.push(name)
  }

  const registerPrimitive = (name) => {
    if (visitedPrimitives.has(name)) return
    visitedPrimitives.add(name)
    primitiveDefs[`primitive-${name}`] = buildPrimitiveInstanceSchema(name, primitives)
  }

  // Top-level shell — shape depends on template.mode
  let topProperties
  let topRequired

  if (template.mode === 'slotted') {
    const slotsProps = {}
    const slotsRequired = []
    for (const [slotName, slotSpec] of Object.entries(template.slots)) {
      for (const allowedName of slotSpec.allows) registerBlock(allowedName)
      slotsProps[slotName] = buildSlotInstanceSchema(slotSpec)
      if (slotSpec.required) slotsRequired.push(slotName)
    }
    topProperties = {
      template: { const: templateName },
      slots: {
        type: 'object',
        properties: slotsProps,
        required: slotsRequired,
        additionalProperties: false,
      },
    }
    topRequired = ['template', 'slots']
  } else {
    // sequence
    for (const allowedName of template.allows) registerBlock(allowedName)
    const allowed = template.allows
    const itemsSchema = allowed.length === 1
      ? { $ref: `#/$defs/block-${allowed[0]}` }
      : { oneOf: allowed.map(name => ({ $ref: `#/$defs/block-${name}` })) }
    const blocksSchema = { type: 'array', items: itemsSchema }
    if (template['min-blocks'] !== undefined) blocksSchema.minItems = template['min-blocks']
    if (template['max-blocks'] !== undefined) blocksSchema.maxItems = template['max-blocks']
    topProperties = {
      template: { const: templateName },
      blocks: blocksSchema,
    }
    topRequired = ['template', 'blocks']
  }

  // Drain queue: build instance schemas for every transitively reachable block
  while (blockQueue.length > 0) {
    const name = blockQueue.shift()
    blockDefs[`block-${name}`] = buildBlockInstanceSchema(
      name, blocks, registerBlock, registerPrimitive
    )
  }

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `yamleer://screen-${templateName}.schema.json`,
    type: 'object',
    required: topRequired,
    additionalProperties: false,
    properties: topProperties,
    $defs: { ...blockDefs, ...primitiveDefs },
  }
}
