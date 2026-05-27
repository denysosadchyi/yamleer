// Walker 1: role composition.
//
// Three rules, applied based on what the YAML under validation represents:
//
// 1. (template) template.allows entries must have role in [leaf, structural]
// 2. (structural block) block.slots[*].allows entries must have role: atomic
// 3. (screen) each block placement's role must match its containing slot's
//    role expectation (template-slot accepts leaf|structural, block-slot
//    accepts atomic).
//
// Schema cannot enforce these because role lives in a different file from
// the allows list. The walker resolves the cross-file lookup against
// `context.blocks`.

const looksLikeTemplate = (y) =>
  y && typeof y === 'object' && typeof y.type === 'string' && typeof y.mode === 'string'

const looksLikeBlock = (y) =>
  y && typeof y === 'object' && typeof y.type === 'string' && typeof y.role === 'string'

const looksLikeScreen = (y) =>
  y && typeof y === 'object' && typeof y.template === 'string'

const TEMPLATE_SCOPE_ROLES = ['leaf', 'structural']
const BLOCK_SLOT_SCOPE_ROLES = ['atomic']

export function roleComposition(yamlContent, context) {
  const errors = []

  if (looksLikeTemplate(yamlContent)) {
    errors.push(...checkTemplate(yamlContent, context))
  }

  if (looksLikeBlock(yamlContent) && yamlContent.role === 'structural') {
    errors.push(...checkStructuralBlock(yamlContent, context))
  }

  if (looksLikeScreen(yamlContent)) {
    errors.push(...checkScreenPlacements(yamlContent, context))
  }

  return errors
}

function checkTemplate(template, context) {
  const errors = []
  const tplName = template.type

  const reportIfWrongRole = (blockName, locationPath) => {
    const block = context.blocks[blockName]
    if (!block) return
    if (!TEMPLATE_SCOPE_ROLES.includes(block.role)) {
      errors.push({
        walker: 'role-composition',
        path: locationPath,
        expected: `role ∈ ${JSON.stringify(TEMPLATE_SCOPE_ROLES)}`,
        found: `${blockName}.role = ${block.role}`,
        message: `template scope cannot allow block of this role`,
      })
    }
  }

  if (template.mode === 'sequence' && Array.isArray(template.allows)) {
    for (const blockName of template.allows) {
      reportIfWrongRole(blockName, `${tplName}.allows`)
    }
  } else if (template.mode === 'slotted' && template.slots) {
    for (const [slotName, slotSpec] of Object.entries(template.slots)) {
      for (const blockName of slotSpec.allows || []) {
        reportIfWrongRole(blockName, `${tplName}.slots.${slotName}.allows`)
      }
    }
  }

  return errors
}

function checkStructuralBlock(block, context) {
  const errors = []
  const blockName = block.type

  for (const [slotName, slotSpec] of Object.entries(block.slots || {})) {
    for (const innerName of slotSpec.allows || []) {
      const innerBlock = context.blocks[innerName]
      if (!innerBlock) continue
      if (!BLOCK_SLOT_SCOPE_ROLES.includes(innerBlock.role)) {
        errors.push({
          walker: 'role-composition',
          path: `${blockName}.slots.${slotName}.allows`,
          expected: `role ∈ ${JSON.stringify(BLOCK_SLOT_SCOPE_ROLES)}`,
          found: `${innerName}.role = ${innerBlock.role}`,
          message: `structural-block slot cannot allow block of this role`,
        })
      }
    }
  }

  return errors
}

function checkScreenPlacements(screen, context) {
  const errors = []
  const template = context.templates[screen.template]
  if (!template) return errors

  for (const { placement, path, scope } of iterateScreenPlacements(screen, template, context)) {
    const block = context.blocks[placement.block]
    if (!block) continue

    const expectedRoles = scope === 'block-slot' ? BLOCK_SLOT_SCOPE_ROLES : TEMPLATE_SCOPE_ROLES
    if (!expectedRoles.includes(block.role)) {
      errors.push({
        walker: 'role-composition',
        path,
        expected: `role ∈ ${JSON.stringify(expectedRoles)}`,
        found: `${placement.block}.role = ${block.role}`,
        message: `block placement violates ${scope} role constraint`,
      })
    }
  }

  return errors
}

function* iterateScreenPlacements(screen, template, context) {
  if (template.mode === 'slotted') {
    for (const [slotName, value] of Object.entries(screen.slots || {})) {
      const slotSpec = template.slots[slotName]
      if (!slotSpec) continue
      const items = Array.isArray(value) ? value : [value]
      for (let i = 0; i < items.length; i++) {
        const path = Array.isArray(value) ? `slots.${slotName}[${i}]` : `slots.${slotName}`
        yield* iterateBlock(items[i], path, 'template-slot', context)
      }
    }
  } else {
    for (let i = 0; i < (screen.blocks || []).length; i++) {
      yield* iterateBlock(screen.blocks[i], `blocks[${i}]`, 'template-sequence', context)
    }
  }
}

function* iterateBlock(placement, path, scope, context) {
  if (!placement || typeof placement !== 'object') return
  yield { placement, path, scope }

  const blockDef = context.blocks[placement.block]
  if (!blockDef || !blockDef.slots || !placement.slots) return

  for (const [slotName, value] of Object.entries(placement.slots)) {
    const items = Array.isArray(value) ? value : [value]
    for (let i = 0; i < items.length; i++) {
      const nestedPath = Array.isArray(value)
        ? `${path}.slots.${slotName}[${i}]`
        : `${path}.slots.${slotName}`
      yield* iterateBlock(items[i], nestedPath, 'block-slot', context)
    }
  }
}
