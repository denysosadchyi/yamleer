// Walker registry.
//
// Each walker is a pure function `(yamlContent, context) => Error[]`.
// - yamlContent: parsed YAML object of the file being validated (may be
//   a dictionary file, a screen, or anything else). Walkers that don't
//   need it ignore the argument.
// - context: { tokens, primitives, blocks, templates } from
//   load-schemas.loadContext().
//
// Error shape:
//   { walker: string, path?: string, message: string }
//
// Walkers must be SIDE-EFFECT-FREE — no fs reads, no globals.
// All data they need comes from context.

import { roleComposition } from './role-composition.js'
import { variantInstance } from './variant-instance.js'
import { tokenReferences } from './token-references.js'

export const walkers = [
  {
    name: 'role-composition',
    fn: roleComposition,
    description:
      'Dictionary integrity: template.allows entries must be leaf|structural; ' +
      'structural-block slot.allows entries must be atomic. ' +
      'Screen placements: each block role matches its containing slot.',
  },
  {
    name: 'variant-instance',
    fn: variantInstance,
    description:
      'Dictionary integrity: every block variant.tokenRef resolves to a ' +
      'non-empty set of values via TOKEN_REF_MAP; every variant.enum is ' +
      'a non-empty string array.',
  },
  {
    name: 'token-references',
    fn: tokenReferences,
    description:
      'Walks any YAML for `{ token: <name> }` references and verifies ' +
      'each <name> exists in design/tokens/colors.yaml.',
  },
]

export const findWalker = (name) => walkers.find(w => w.name === name) || null
