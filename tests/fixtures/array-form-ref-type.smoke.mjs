// Smoke test for array-form field-ref support.
//
// Exercises the three-layer schema infrastructure that supports
// discriminated-union ref-type (e.g. setting-row.control = [toggle, action]):
//   1. block.schema.yaml — field-ref.ref-type accepts string | array
//   2. load-schemas.js   — enum injection into BOTH oneOf branches
//   3. screen-schema-builder.js — array ref-type → AJV oneOf with
//                                 `primitive: const` as discriminator
//
// Run from project root:
//   node tests/fixtures/array-form-ref-type.smoke.mjs
//
// Exit 0 = all pass. Exit 1 = regression — investigate which layer broke.
//
// Why permanent: array form is exercised by setting-row in production, but
// the schema/builder code paths are subtle (two oneOf branches; discriminator
// via const). A silent refactor regression here would manifest as "screens
// stop validating control fields correctly" — caught here, not in storyboard.

import Ajv from 'ajv/dist/2020.js'
import { loadDictionary, buildBlockValidator } from '../../render/load-schemas.js'
import { buildScreenSchema } from '../../render/screen-schema-builder.js'

const fmt = (label, ok) => `${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label}`
const results = []

// ----- Test 1: block.schema accepts array-form field-ref -----
{
  const ajv = new Ajv({ strict: false, allErrors: true })
  const blockValidator = buildBlockValidator(ajv)
  const synthBlock = {
    type: 'synth-block',
    description: 'synthetic test block',
    role: 'atomic',
    fields: {
      'multi-control': {
        type: 'ref',
        'ref-kind': 'primitive',
        'ref-type': ['action', 'icon'],
        required: true,
      },
    },
  }
  const ok = blockValidator(synthBlock)
  results.push({
    name: '1. block.schema accepts array-form ref-type [action, icon]',
    ok,
    errors: blockValidator.errors,
  })
}

// ----- Test 2: block.schema rejects array with unknown primitive -----
{
  const ajv = new Ajv({ strict: false, allErrors: true })
  const blockValidator = buildBlockValidator(ajv)
  const badBlock = {
    type: 'bad-block',
    description: 'bad test block',
    role: 'atomic',
    fields: {
      bad: {
        type: 'ref',
        'ref-kind': 'primitive',
        'ref-type': ['action', 'nonexistent-primitive'],
        required: true,
      },
    },
  }
  const ok = blockValidator(badBlock)
  results.push({
    name: '2. block.schema rejects array containing unknown primitive name',
    ok: !ok,
    errors: ok ? ['expected rejection, got accept'] : null,
  })
}

// ----- Test 3: block.schema still accepts legacy string form -----
{
  const ajv = new Ajv({ strict: false, allErrors: true })
  const blockValidator = buildBlockValidator(ajv)
  const legacyBlock = {
    type: 'legacy-block',
    description: 'legacy form test',
    role: 'atomic',
    fields: {
      cta: {
        type: 'ref',
        'ref-kind': 'primitive',
        'ref-type': 'action',
        required: true,
      },
    },
  }
  const ok = blockValidator(legacyBlock)
  results.push({
    name: '3. block.schema still accepts legacy string form ref-type: action',
    ok,
    errors: blockValidator.errors,
  })
}

// ----- Test 4: screen-schema-builder emits oneOf for array ref-type -----
{
  const blocks = loadDictionary('system/blocks')
  const primitives = loadDictionary('system/primitives')
  const templates = loadDictionary('system/templates')

  // Inject synthetic leaf with array ref-type, widen single-column to allow it
  blocks['synth-leaf'] = {
    type: 'synth-leaf',
    description: 'synthetic leaf for smoke test',
    role: 'leaf',
    fields: {
      payload: {
        type: 'ref',
        'ref-kind': 'primitive',
        'ref-type': ['action', 'icon'],
        required: true,
      },
    },
  }
  templates['single-column'] = {
    ...templates['single-column'],
    allows: [...templates['single-column'].allows, 'synth-leaf'],
  }

  const schema = buildScreenSchema('single-column', templates, blocks, primitives)
  const ajv = new Ajv({ strict: false, allErrors: true })
  const validator = ajv.compile(schema)

  // 4a — first branch of union
  const screenA = {
    template: 'single-column',
    blocks: [{
      block: 'synth-leaf',
      payload: { primitive: 'action', label: 'Click', intent: 'primary' },
    }],
  }
  results.push({
    name: '4a. screen validates synth-leaf.payload = action (one branch of union)',
    ok: validator(screenA),
    errors: validator.errors,
  })

  // 4b — second branch of union
  const screenB = {
    template: 'single-column',
    blocks: [{
      block: 'synth-leaf',
      payload: { primitive: 'icon', name: 'star' },
    }],
  }
  results.push({
    name: '4b. screen validates synth-leaf.payload = icon (other branch of union)',
    ok: validator(screenB),
    errors: validator.errors,
  })

  // 4c — primitive not in union
  const screenBad = {
    template: 'single-column',
    blocks: [{
      block: 'synth-leaf',
      payload: { primitive: 'nonexistent', label: 'X' },
    }],
  }
  const okBad = validator(screenBad)
  results.push({
    name: '4c. screen rejects synth-leaf.payload = nonexistent primitive',
    ok: !okBad,
    errors: okBad ? ['expected rejection, got accept'] : null,
  })
}

// ----- Report -----
console.log('\nSmoke test — array form field-ref:\n')
let allOk = true
for (const r of results) {
  console.log(fmt(r.name, r.ok))
  if (!r.ok) {
    allOk = false
    console.log('   errors:', JSON.stringify(r.errors, null, 2))
  }
}
console.log()
console.log(allOk ? '\x1b[32mALL SMOKE TESTS PASSED\x1b[0m' : '\x1b[31mSMOKE TEST FAILURES\x1b[0m')
process.exit(allOk ? 0 : 1)
