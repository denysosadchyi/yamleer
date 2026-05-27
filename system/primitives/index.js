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

  // Icon — placeholder until a real glyph library lands. The name is
  // exposed as data-name; CSS pseudo-elements render the visual token
  // ('◆ <name>'). aria-hidden because the label is decorative until a
  // real icon arrives.
  icon: (data, _ctx) => {
    const name = escape(data.name)
    const sizeAttr = data.size ? ` data-size="${escape(data.size)}"` : ''
    return `<span data-primitive="icon" data-name="${name}"${sizeAttr} aria-hidden="true"></span>`
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
