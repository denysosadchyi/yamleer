// Primitive renderers.
//
// Signature: (data, ctx) => htmlString
//   data: the screen-yaml primitive instance object, e.g.
//         { primitive: 'action', label: 'Schedule a demo', intent: 'primary' }
//   ctx:  the render context (unused by primitives — they are leaves —
//         but the signature stays uniform with block renderers).
//
// Discipline:
//   - Every interpolated field passes through escape().
//   - data-primitive on the root element.
//   - data-<variant>="<value>" on the root for any visible variant.
//   - No class, no inline style.

import { escape } from '../lib/escape.js'

export const primitives = {
  // Action — button by default, link if `href` is present.
  // intent variants are styled in blocks.css via [data-intent].
  action: (data, _ctx) => {
    const intent = escape(data.intent)
    const label = escape(data.label)
    if (data.href) {
      const href = escape(data.href)
      return `<a href="${href}" data-primitive="action" data-intent="${intent}">${label}</a>`
    }
    return `<button type="button" data-primitive="action" data-intent="${intent}">${label}</button>`
  },

  // Text-input — inline data-entry field. `input-type` becomes the HTML
  // type attribute; state behaves like other state-bearing primitives —
  // 'disabled' writes the HTML attribute; 'focused' is design-time only
  // (simulates :focus for storyboard); 'error' adds aria-invalid.
  'text-input': (data, _ctx) => {
    const inputType = escape(data['input-type'])
    const ariaLabel = escape(data['aria-label'])
    const state = escape(data.state ?? 'default')
    const placeholderAttr = data.placeholder
      ? ` placeholder="${escape(data.placeholder)}"` : ''
    const valueAttr = data.value !== undefined
      ? ` value="${escape(data.value)}"` : ''
    const nameAttr = data.name ? ` name="${escape(data.name)}"` : ''
    const disabledAttr = state === 'disabled' ? ' disabled' : ''
    const ariaInvalidAttr = state === 'error' ? ' aria-invalid="true"' : ''
    return `<input type="${inputType}" data-primitive="text-input" data-state="${state}" aria-label="${ariaLabel}"${nameAttr}${placeholderAttr}${valueAttr}${disabledAttr}${ariaInvalidAttr}>`
  },

  // Checkbox — two-state checkbox circle (empty / filled with check).
  // Sibling pattern to toggle: both are aria-pressed buttons, just
  // different visual. Used inside task-item (and any future list block
  // that needs a per-row completion control).
  checkbox: (data, _ctx) => {
    const on = data.on === true
    const ariaLabel = escape(data['aria-label'])
    const state = escape(data.state ?? 'default')
    const disabledAttr = state === 'disabled' ? ' disabled' : ''
    return `<button type="button" data-primitive="checkbox" data-on="${on}" data-state="${state}" aria-label="${ariaLabel}" aria-pressed="${on}"${disabledAttr}></button>`
  },

  // Toggle — two-state on/off control rendered as <button> with
  // aria-pressed (the standard accessible toggle pattern, not a checkbox).
  // `state` is design-time only: 'focused' simulates the :focus ring for
  // storyboard demonstration; 'disabled' also writes the HTML disabled
  // attribute. Runtime focus continues to work via :focus pseudo-class.
  toggle: (data, _ctx) => {
    const on = data.on === true
    const name = escape(data.name)
    const ariaLabel = escape(data['aria-label'])
    const state = escape(data.state ?? 'default')
    const disabledAttr = state === 'disabled' ? ' disabled' : ''
    return `<button type="button" data-primitive="toggle" data-on="${on}" data-state="${state}" name="${name}" aria-label="${ariaLabel}" aria-pressed="${on}"${disabledAttr}></button>`
  },
}
