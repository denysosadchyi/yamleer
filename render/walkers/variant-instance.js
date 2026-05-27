// Walker 2: variant-instance.
//
// Block.schema already validates the SHAPE of a variant (oneOf tokenRef/enum
// + tokenRef enum injected with TOKEN_REF_MAP keys). What the schema cannot
// reach is the RESOLVABILITY of a tokenRef into a non-empty set of values.
//
// For each block.variants[*]:
//   - if tokenRef: the named key must resolve through TOKEN_REF_MAP to a file
//     + path that exists and yields a non-empty object whose keys are the
//     final variant enum. This walker proves the resolution would succeed
//     before screen-schema build tries it.
//   - if enum: values must be a non-empty array of strings (schema enforces
//     minItems:1, but defensive).
//
// Variant-instance checking AT SCREEN level is fully covered by the
// per-template screen schema (variant values constrained by resolved enum).
// No screen walk is needed here.

import { TOKEN_REF_MAP, loadYaml } from '../load-schemas.js'

const looksLikeBlock = (y) =>
  y && typeof y === 'object' && typeof y.type === 'string' && typeof y.role === 'string'

export function variantInstance(yamlContent, context) {
  if (!looksLikeBlock(yamlContent) || !yamlContent.variants) return []
  return checkBlockVariants(yamlContent)
}

function checkBlockVariants(block) {
  const errors = []
  const blockName = block.type

  for (const [variantName, variantSpec] of Object.entries(block.variants || {})) {
    if (variantSpec && typeof variantSpec === 'object' && 'tokenRef' in variantSpec) {
      errors.push(...checkTokenRefVariant(blockName, variantName, variantSpec.tokenRef))
    } else if (variantSpec && typeof variantSpec === 'object' && 'enum' in variantSpec) {
      if (!Array.isArray(variantSpec.enum) || variantSpec.enum.length === 0) {
        errors.push({
          walker: 'variant-instance',
          path: `${blockName}.variants.${variantName}.enum`,
          message: `enum variant must declare a non-empty values array`,
        })
      }
    }
  }

  return errors
}

function checkTokenRefVariant(blockName, variantName, refKey) {
  const errors = []
  const path = `${blockName}.variants.${variantName}.tokenRef`

  const mapEntry = TOKEN_REF_MAP[refKey]
  if (!mapEntry) {
    errors.push({
      walker: 'variant-instance',
      path,
      message: `tokenRef "${refKey}" not registered in TOKEN_REF_MAP. Known: ${Object.keys(TOKEN_REF_MAP).sort().join(', ')}`,
    })
    return errors
  }

  let data
  try {
    data = loadYaml(mapEntry.file)
  } catch (e) {
    errors.push({
      walker: 'variant-instance',
      path,
      message: `tokenRef "${refKey}" — cannot read ${mapEntry.file}: ${e.message}`,
    })
    return errors
  }

  const target = mapEntry.path === '$' ? data : data?.[mapEntry.path]
  if (!target || typeof target !== 'object') {
    errors.push({
      walker: 'variant-instance',
      path,
      message: `tokenRef "${refKey}" — path "${mapEntry.path}" not found or not an object in ${mapEntry.file}`,
    })
    return errors
  }

  const keys = Object.keys(target)
  if (keys.length === 0) {
    errors.push({
      walker: 'variant-instance',
      path,
      message: `tokenRef "${refKey}" — resolves to empty set in ${mapEntry.file}#${mapEntry.path}`,
    })
  }

  return errors
}
