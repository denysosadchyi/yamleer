// Block renderers.
//
// Signature: (data, ctx) => htmlString
//   data: the screen-yaml block instance object, e.g.
//         { block: 'hero-text', title: 'Welcome', tone: 'emphasis', cta: {...} }
//   ctx:  the render context, providing:
//         - escape(s):              XSS-safe text interpolation
//         - renderPrimitive(ref):   render a primitive instance to HTML
//         - renderBlock(ref):       render a nested block (slots inside section)
//
// Type scale usage:
//   hero-text title → heading-lg   (NOT display; display reserved for plain
//                                   <h1> outside the block system)
//   section heading → heading-md
//   card heading    → heading-sm
//   cta-bar heading → heading-md
//   --type-display is for marketing-grade pages outside blocks. Do not
//   introduce it into block renderers without explicit decision.
//
// HTML tag mapping (semantics independent from visual sizing):
//   hero-text → <article>, title → <h1>
//   section   → <section>, heading → <h2>
//   card      → <article>, heading → <h3>
//   cta-bar   → <article>, heading → <h2>
//
// Discipline (enforce on every renderer):
//   - data-block="<name>" on root
//   - data-tone="<value>" + data-density="<value>" on root with EXPLICIT
//     defaults — never omit. Selectors like
//     [data-block][data-tone="neutral"] would be silently dead otherwise.
//   - data-field="<name>" on every field-wrapping element
//   - All interpolated text goes through escape() — no exceptions
//   - Primitive refs go through ctx.renderPrimitive
//   - Nested-block slots iterate and call ctx.renderBlock per item
//   - No class. No inline style.

import { escape } from '../lib/escape.js'

export const blocks = {
  'hero-text': (data, ctx) => {
    const tone = escape(data.tone ?? 'neutral')
    const density = escape(data.density ?? 'comfortable')
    const leadFrag = data.lead
      ? `\n  <p data-field="lead">${escape(data.lead)}</p>`
      : ''
    const ctaFrag = data.cta
      ? `\n  <div data-field="cta">${ctx.renderPrimitive(data.cta)}</div>`
      : ''
    return `<article data-block="hero-text" data-tone="${tone}" data-density="${density}">
  <h1 data-field="title">${escape(data.title)}</h1>${leadFrag}${ctaFrag}
</article>`
  },

  section: (data, ctx) => {
    const tone = escape(data.tone ?? 'neutral')
    const density = escape(data.density ?? 'comfortable')
    const descriptionFrag = data.description
      ? `\n  <p data-field="description">${escape(data.description)}</p>`
      : ''
    const bodyItems = (data.slots?.body ?? [])
      .map((b) => ctx.renderBlock(b))
      .map((html) => html.split('\n').map((line) => `    ${line}`).join('\n'))
      .join('\n')
    const bodyFrag = bodyItems ? `\n${bodyItems}\n  ` : ''
    return `<section data-block="section" data-tone="${tone}" data-density="${density}">
  <h2 data-field="heading">${escape(data.heading)}</h2>${descriptionFrag}
  <div data-field="body">${bodyFrag}</div>
</section>`
  },

  card: (data, ctx) => {
    const tone = escape(data.tone ?? 'neutral')
    const iconFrag = data.icon
      ? `\n  <div data-field="icon">${ctx.renderPrimitive(data.icon)}</div>`
      : ''
    const bodyFrag = data.body
      ? `\n  <p data-field="body">${escape(data.body)}</p>`
      : ''
    const ctaFrag = data.cta
      ? `\n  <div data-field="cta">${ctx.renderPrimitive(data.cta)}</div>`
      : ''
    return `<article data-block="card" data-tone="${tone}">${iconFrag}
  <h3 data-field="heading">${escape(data.heading)}</h3>${bodyFrag}${ctaFrag}
</article>`
  },

  'cta-bar': (data, ctx) => {
    const tone = escape(data.tone ?? 'neutral')
    const bodyFrag = data.body
      ? `\n  <p data-field="body">${escape(data.body)}</p>`
      : ''
    return `<article data-block="cta-bar" data-tone="${tone}">
  <h2 data-field="heading">${escape(data.heading)}</h2>${bodyFrag}
  <div data-field="cta">${ctx.renderPrimitive(data.cta)}</div>
</article>`
  },
}
