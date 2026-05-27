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

// ----- Test 5: real setting-row negative tests via dashboard-grid -----
// Exercises the production wiring: real setting-row block, real toggle/action
// primitives, real section.body.allows widening, real dashboard-grid template.
// No in-memory mutation — pure end-to-end on the shipped dictionary.
{
  const blocks = loadDictionary('system/blocks')
  const primitives = loadDictionary('system/primitives')
  const templates = loadDictionary('system/templates')

  const schema = buildScreenSchema('dashboard-grid', templates, blocks, primitives)
  const ajv = new Ajv({ strict: false, allErrors: true })
  const validator = ajv.compile(schema)

  const baseScreen = (settingRow) => ({
    template: 'dashboard-grid',
    slots: {
      header: { block: 'hero-text', title: 'Settings' },
      main: [{
        block: 'section',
        heading: 'Prefs',
        slots: { body: [settingRow] },
      }],
    },
  })

  // 5a — setting-row with toggle control (positive, exercises union branch 1)
  const screenToggle = baseScreen({
    block: 'setting-row',
    label: 'Notifications',
    control: {
      primitive: 'toggle',
      on: true,
      name: 'notif',
      'aria-label': 'Notifications',
    },
  })
  results.push({
    name: '5a. setting-row with control: toggle validates',
    ok: validator(screenToggle),
    errors: validator.errors,
  })

  // 5b — setting-row with action control (positive, exercises union branch 2)
  const screenAction = baseScreen({
    block: 'setting-row',
    label: 'Export',
    control: { primitive: 'action', label: 'Download', intent: 'secondary' },
  })
  results.push({
    name: '5b. setting-row with control: action validates',
    ok: validator(screenAction),
    errors: validator.errors,
  })

  // 5c — setting-row with primitive NOT in union (icon) → reject
  const screenBadPrim = baseScreen({
    block: 'setting-row',
    label: 'X',
    control: { primitive: 'icon', name: 'star' },
  })
  const okBadPrim = validator(screenBadPrim)
  results.push({
    name: '5c. setting-row rejects control: icon (not in [toggle, action] union)',
    ok: !okBadPrim,
    errors: okBadPrim ? ['expected rejection, got accept'] : null,
  })

  // 5d — setting-row missing required control → reject
  const screenNoControl = baseScreen({
    block: 'setting-row',
    label: 'X',
    // control omitted
  })
  const okNoControl = validator(screenNoControl)
  results.push({
    name: '5d. setting-row rejects missing required control field',
    ok: !okNoControl,
    errors: okNoControl ? ['expected rejection, got accept'] : null,
  })
}

// ----- Test 6: new v0.2 vocab (page-header, task-item, text-input) -----
// page-header lives at template header; task-item lives in section.body;
// text-input is a primitive (not yet hosted by any production block but
// must validate when authored). Tests confirm the widenings landed and
// the new schemas accept correct instances + reject bad ones.
{
  const blocks = loadDictionary('system/blocks')
  const primitives = loadDictionary('system/primitives')
  const templates = loadDictionary('system/templates')

  const schema = buildScreenSchema('dashboard-grid', templates, blocks, primitives)
  const ajv = new Ajv({ strict: false, allErrors: true })
  const validator = ajv.compile(schema)

  // 6a — dashboard-grid.header accepts page-header (widened from hero-text only)
  const screenPageHeader = {
    template: 'dashboard-grid',
    slots: {
      header: { block: 'page-header', title: 'Today', tone: 'neutral' },
      main: [{
        block: 'section',
        heading: 'X',
        slots: { body: [{ block: 'card', heading: 'a' }] },
      }],
    },
  }
  results.push({
    name: '6a. dashboard-grid.header accepts page-header (widened allows)',
    ok: validator(screenPageHeader),
    errors: validator.errors,
  })

  // 6b — section.body accepts task-item (widened from [card, setting-row])
  const screenTaskItem = {
    template: 'dashboard-grid',
    slots: {
      header: { block: 'page-header', title: 'Today', tone: 'neutral' },
      main: [{
        block: 'section',
        heading: 'Up next',
        slots: { body: [
          { block: 'task-item', title: 'A task', done: false, priority: 'high' },
        ] },
      }],
    },
  }
  results.push({
    name: '6b. section.body accepts task-item with done:bool + priority:enum',
    ok: validator(screenTaskItem),
    errors: validator.errors,
  })

  // 6c — task-item without required done field → reject
  const screenNoDone = {
    template: 'dashboard-grid',
    slots: {
      header: { block: 'page-header', title: 'Today', tone: 'neutral' },
      main: [{
        block: 'section',
        heading: 'X',
        slots: { body: [
          { block: 'task-item', title: 'A task' },  // done missing
        ] },
      }],
    },
  }
  const okNoDone = validator(screenNoDone)
  results.push({
    name: '6c. task-item rejects missing required done:bool',
    ok: !okNoDone,
    errors: okNoDone ? ['expected rejection, got accept'] : null,
  })

  // 6d — task-item with bad priority enum → reject
  const screenBadPriority = {
    template: 'dashboard-grid',
    slots: {
      header: { block: 'page-header', title: 'Today', tone: 'neutral' },
      main: [{
        block: 'section',
        heading: 'X',
        slots: { body: [
          { block: 'task-item', title: 'A task', done: false, priority: 'urgent' },
        ] },
      }],
    },
  }
  const okBadPri = validator(screenBadPriority)
  results.push({
    name: '6d. task-item rejects priority outside [low, normal, high]',
    ok: !okBadPri,
    errors: okBadPri ? ['expected rejection, got accept'] : null,
  })

  // 6e — text-input primitive validates standalone (in a synth block field)
  {
    const blocksLocal = { ...blocks }
    blocksLocal['synth-input-holder'] = {
      type: 'synth-input-holder',
      description: 'synth',
      role: 'leaf',
      fields: {
        input: { type: 'ref', 'ref-kind': 'primitive', 'ref-type': 'text-input', required: true },
      },
    }
    const templatesLocal = {
      ...templates,
      'single-column': {
        ...templates['single-column'],
        allows: [...templates['single-column'].allows, 'synth-input-holder'],
      },
    }
    const schema2 = buildScreenSchema('single-column', templatesLocal, blocksLocal, primitives)
    const v2 = new Ajv({ strict: false, allErrors: true }).compile(schema2)
    const okInput = v2({
      template: 'single-column',
      blocks: [{
        block: 'synth-input-holder',
        input: {
          primitive: 'text-input',
          'input-type': 'search',
          'aria-label': 'Search tasks',
          placeholder: 'Search…',
        },
      }],
    })
    results.push({
      name: '6e. text-input primitive validates with required input-type + aria-label',
      ok: okInput,
      errors: v2.errors,
    })
  }
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
