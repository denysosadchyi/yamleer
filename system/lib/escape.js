// HTML-escape utility — single source of truth.
//
// Imported directly by primitive and block renderers. The render context
// (built by render.js) also exposes this as `ctx.escape` so renderers
// can write either `escape(x)` or `ctx.escape(x)` — both point at the
// same function. Symmetric with how walker context exposes helpers
// without owning their implementation.
//
// null and undefined collapse to '' so renderers can safely interpolate
// optional fields without explicit guards.

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const PATTERN = /[&<>"']/g

export const escape = (input) => {
  if (input === null || input === undefined) return ''
  return String(input).replace(PATTERN, (c) => ENTITIES[c])
}
