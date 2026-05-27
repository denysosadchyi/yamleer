// Template renderers.
//
// Signature: (screen, ctx) => htmlString
//   screen: parsed screen YAML, already validated by schema + walkers.
//   ctx:    render context — { escape, renderBlock, renderPrimitive }.
//
// Each template renderer returns ONLY its <main> wrapper and contents.
// Doctype, <html>, <head>, <body> are owned by render.js (the
// orchestrator), not here. This keeps templates reusable for both
// standalone screen pages (dist/screens/<id>.html) and storyboard
// composition (where the template output is embedded inside a
// [data-frame-body] container).
//
// Fail-loud discipline: templates trust their declared schema. If a
// required slot is absent, that is a pipeline bug — schema and walker
// must have caught it. No defensive null guards here. Only legitimate
// OPTIONAL slots (footer in dashboard-grid) use `? :` ternaries.
//
// Tag mapping:
//   <main data-template="<name>">      root, always
//   <header data-slot="header">        slotted: header zone
//   <section data-slot="main">         slotted: main zone
//   <footer data-slot="footer">        slotted: footer zone
//   <section data-slot="blocks">       sequence: linear flow wrapper
//
// Sequence wraps blocks in <section data-slot="blocks"> so CSS targets
// uniform structure across modes: main[data-template] > section[data-slot].

const indent = (s, spaces) =>
  s.split('\n').map((line) => ' '.repeat(spaces) + line).join('\n')

export const templates = {
  'dashboard-grid': (screen, ctx) => {
    // header: cardinality one (required) → single block object
    const headerHtml = indent(ctx.renderBlock(screen.slots.header), 4)

    // main: cardinality many (required, min:1) → array
    const mainHtml = screen.slots.main
      .map((b) => indent(ctx.renderBlock(b), 4))
      .join('\n')

    // footer: cardinality one (optional) → object or undefined
    const footerHtml = screen.slots.footer
      ? `
  <footer data-slot="footer">
${indent(ctx.renderBlock(screen.slots.footer), 4)}
  </footer>`
      : ''

    return `<main data-template="dashboard-grid">
  <header data-slot="header">
${headerHtml}
  </header>
  <section data-slot="main">
${mainHtml}
  </section>${footerHtml}
</main>`
  },

  'single-column': (screen, ctx) => {
    // blocks: required array, min-blocks: 1
    const blocksHtml = screen.blocks
      .map((b) => indent(ctx.renderBlock(b), 4))
      .join('\n')

    return `<main data-template="single-column">
  <section data-slot="blocks">
${blocksHtml}
  </section>
</main>`
  },
}
