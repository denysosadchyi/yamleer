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
}
