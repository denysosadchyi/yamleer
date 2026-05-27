# Render — architectural draft (Etap 3.5.b, pre-Etap 4)

This document is a contract for Etap 4 implementation. It does not contain
production code. Each question is answered as **Proposal · Alternatives ·
Why** so the trade-offs are visible before any line of HTML or CSS is
written.

---

## 1. `render.js` shape and top-level flow

**Proposal.** `render/render.js` is a thin orchestrator. It does not own
block, primitive, or template knowledge — it dispatches.

```
render.js
  1. loadContext()                          [reuse load-schemas]
  2. validate every screen file             [reuse validate logic]
     fail-fast if anything is broken (schema or walker) — ABORT, no partial output
  3. tokensToCss()                          → dist/styles/tokens.css
  4. for each screen in design/screens/:
       a. resolve template renderer (templates[screen.template])
       b. build per-screen renderContext (closures bound, currentScreen set)
       c. produce per-screen HTML via that context
       d. write dist/screens/<name>.html (standalone, single-screen)
  5. compose dist/index.html (storyboard — inline embedding of all screens)
  6. print summary: N screens rendered, M tokens compiled
```

`renderContext` is built **per screen**, not once globally. The MVP may
look like one shared object (closures don't change per screen at first),
but per-screen construction is the right shape — it leaves room for
`ctx.currentScreen` (used in error messages: "in screen X, slot Y, …")
and for future per-screen render flags without retrofitting.

Each kind of asset lives where its data lives:

```
system/blocks/index.js        block renderers      { 'card': (data, ctx) => '...' }
system/primitives/index.js    primitive renderers  { 'action': (data, ctx) => '...' }
system/templates/index.js     template renderers   { 'single-column': (screen, ctx) => '...' }
render/render.js              orchestrator
render/tokens-to-css.js       tokens → CSS custom properties
```

**Alternatives.**

- **(a)** Single `render/render.js` with switch-case dispatch on block/
  primitive/template names. Fewer files, more cohesion.
- **(b)** One file per block (`system/blocks/card.js`), per primitive
  (`system/primitives/action.js`). Symmetric with yaml files, easy to
  diff one renderer change. More file proliferation.

**Why proposal.** A single `index.js` per kind (proposal) keeps the
renderer map next to the dictionary it shadows — `system/blocks/index.js`
sits beside the four `*.yaml` files it serves. Adding a new block is one
yaml + one entry in the map, both in the same directory. Per-file
renderers (b) double the file count without buying isolation. Switch-case
dispatch (a) collapses the map into one giant function, hard to grep for
a single block's renderer.

Renderer validates first (reuses validate logic) so day-1 errors surface
through one consistent channel. The cost is tens of milliseconds; the
benefit is no class of "schema valid but renderer crashes" surprises.

---

## 2. Render context

**Proposal.** Closure-style context object passed into every renderer:

```js
const renderContext = {
  // Loaded dictionaries (reference data)
  blocks, primitives, templates, tokens,

  // Closures over dictionaries
  renderBlock: (placement) => htmlString,
  renderPrimitive: (placement) => htmlString,

  // Pure utilities
  escape: (s) => htmlSafe(s),
}
```

`renderBlock` looks at `placement.block`, finds `blocks[name]` in the
dictionary, dispatches to `blockRenderers[name]`, and recurses into nested
slots automatically. The block renderer itself doesn't know how to dispatch;
it just composes its own HTML and asks `ctx.renderBlock(child)` for nested
content.

**Alternatives.**

- **(a)** Pass raw dictionaries; each block renderer dispatches its own
  children by importing the renderers map. Requires every block file to
  import the registry → circular-import risk.
- **(b)** Global mutable renderer state (initialized once). Stateful,
  hard to test, no thread of accountability for who set what.

**Why proposal.** The closure pattern means each block renderer is a
**pure function of `(data, ctx)`** with no imports beyond `ctx`. The
context is built once in `render.js` and threaded through. Block
renderers become trivially unit-testable: pass a mock `ctx` with the
helpers stubbed, assert the HTML string. The dispatch table is
constructed once at the orchestrator level — no circular imports.

This mirrors the walker context pattern from Etap 3.3 — the symmetry
helps a future maintainer.

---

## 3. Block renderer interface

**Proposal.** Each block renderer is `(placement, ctx) => htmlString`,
exported by name from `system/blocks/index.js`:

```js
'card': (data, ctx) => `
  <article data-block="card"
           data-tone="${ctx.escape(data.tone ?? 'neutral')}">
    ${data.icon
      ? `<div data-field="icon">${ctx.renderPrimitive(data.icon)}</div>`
      : ''}
    <h3 data-field="heading">${ctx.escape(data.heading)}</h3>
    ${data.body
      ? `<p data-field="body">${ctx.escape(data.body)}</p>`
      : ''}
    ${data.cta
      ? `<div data-field="cta">${ctx.renderPrimitive(data.cta)}</div>`
      : ''}
  </article>
`
```

Rules every block renderer follows:

1. Root element has `data-block="<name>"`.
2. **Defaults are always written.** A block with no `tone` in the screen
   YAML still gets `data-tone="neutral"` on output. Same for `density`.
   Non-negotiable: without explicit defaults, selectors like
   `[data-block="card"][data-tone="neutral"]` don't match and the
   neutral-state CSS is silently dead. The default fallback lives in the
   renderer (`data.tone ?? 'neutral'`), nowhere else.
3. Variants beyond the default emit as `data-<variant>="<value>"` on the
   root.
4. Every field interpolated as text goes through `ctx.escape`. No
   exceptions — uniform XSS posture.
5. Field references to primitives go through `ctx.renderPrimitive(ref)`,
   not inline.
6. Nested-block slots (structural blocks only) iterate over
   `data.slots[name]` and call `ctx.renderBlock(child)` per item.
7. No `class` attributes. No inline `style`. Selectors hit `data-*` only.

**Alternatives.**

- **(a)** JSX-like virtual nodes that a serializer converts to HTML.
  Adds a layer of indirection without buying us anything at MVP scale.
- **(b)** Template files (`.html` with placeholders) loaded at runtime.
  Splits one block's logic into two files; data flow becomes harder to
  trace.

**Why proposal.** Template literals are the lowest-ceremony way to
produce small, well-shaped HTML strings. The whole renderer for a block
fits on one screen, reads top-to-bottom, and grep'ing for `data-block="card"`
finds both the renderer and its CSS selector. The discipline (no class,
no inline style, escape everything, defaults explicit) is enforced
manually but the surface is so small that a code review catches drift.

---

## 4. Template renderer pattern

**Proposal.** Templates are thin structural wrappers. They place blocks
into semantic HTML containers (`<header>`, `<main>`, `<footer>`,
`<section>`) and add `data-template="<name>"` plus `data-slot="<name>"`
where applicable. They do not own visual layout — that lives in
`system/styles/blocks.css` keyed off `[data-template]` and `[data-slot]`.

```js
'dashboard-grid': (screen, ctx) => `
  <main data-template="dashboard-grid">
    <header data-slot="header">
      ${ctx.renderBlock(screen.slots.header)}
    </header>
    <section data-slot="main">
      ${(screen.slots.main || []).map(b => ctx.renderBlock(b)).join('\n')}
    </section>
    ${screen.slots.footer
      ? `<footer data-slot="footer">${ctx.renderBlock(screen.slots.footer)}</footer>`
      : ''}
  </main>
`,

'single-column': (screen, ctx) => `
  <main data-template="single-column">
    <section data-slot="blocks">
      ${(screen.blocks || []).map(b => ctx.renderBlock(b)).join('\n')}
    </section>
  </main>
`,
```

Both modes give CSS a uniform target shape: `main[data-template] >
section[data-slot]`. A sequence template wraps its body in
`<section data-slot="blocks">` so selectors don't need a mode-specific
fork (`> *` for sequence vs `> section[data-slot="main"]` for slotted).

**Alternatives.**

- **(a)** Templates emit no HTML wrappers — blocks just stack into a
  bare container in `render.js`. Loses the `<header>/<main>/<footer>`
  semantics for slotted templates.
- **(b)** Templates own visual layout (CSS-in-JS or inline styles per
  template). Couples structure and presentation; harder to restyle for
  themes.

**Why proposal.** Templates already declare `mode: slotted | sequence`.
Mirroring that into HTML — slotted gets named-slot wrappers, sequence
gets a bare `<main>` — produces semantically richer output and lets
`system/styles/` write predictable selectors:
`[data-template="dashboard-grid"] [data-slot="main"]`. Visual layout
stays declarative in CSS; renderers stay structural.

---

## 5. Tokens → CSS strategy

**Proposal.** Every token in `design/tokens/` becomes a CSS custom
property in `dist/styles/tokens.css`. Nothing in the token files is
YAML-only — if it's in tokens, it's reachable from CSS.

Mapping:

| token file        | becomes                                                   |
|-------------------|-----------------------------------------------------------|
| colors.yaml       | `--color-<name>: <value>`                                 |
| spacing.yaml      | `--spacing-<name>: <value>`                               |
| radius.yaml       | `--radius-<name>: <value>`                                |
| typography.family | `--font-<name>: <stack>`                                  |
| typography.fluid-range | written as a comment at the top of `tokens.css`; not a runtime custom property |
| typography.style.<name> | `--type-<name>-size: clamp(<min>px, <interp>, <max>px)` <br> `--type-<name>-weight`, `--type-<name>-leading`, `--type-<name>-tracking` (if letter-spacing present) |
| roles.tone        | `--tone-<name>-surface`, `-text`, `-border` (resolved to `var(--color-…)`) |
| roles.color-role  | `--role-<name>: var(--color-<token>)`                     |

The `clamp(...)` expression for typography style sizes is generated from
`fluid-range` + `min/ideal/max` in `tokens-to-css.js`. Formula:
`clamp(<min>px, <ideal>px + slope·vw, <max>px)`. This is the **only**
place a CSS expression is synthesized — block/primitive YAML stays
intent-level, exactly as the typography refactor promised.

Three-level cascade for tone in CSS:

```css
[data-block="card"] {
  --role-surface: var(--tone-neutral-surface);
  --role-text:    var(--tone-neutral-text);
  --role-border:  var(--tone-neutral-border);

  background: var(--role-surface);
  color: var(--role-text);
  border: 1px solid var(--role-border);
}
[data-block="card"][data-tone="emphasis"] {
  --role-surface: var(--tone-emphasis-surface);
  --role-text:    var(--tone-emphasis-text);
  --role-border:  var(--tone-emphasis-border);
}
```

palette → tone-set → block-bound role → property. Variant flips the
tone-set; block does not know which colors are inside.

**Alternatives.**

- **(a)** Tailwind-style utility classes generated from tokens. Class
  attributes are forbidden by HTML convention; dead-end.
- **(b)** Compile screens directly to fixed CSS (per-screen bundle, no
  custom properties). Loses runtime themability and bloats output.
- **(c)** Keep some tokens YAML-only (e.g., `fluid-range` as metadata,
  not as CSS). Reasonable but breaks the simple rule "every token
  reaches CSS" — adds a "is this token CSS-bound?" lookup at maintenance
  time.

**Why proposal.** Universal mapping ("every token reaches CSS") removes
a category of questions ("can I read this token from CSS?"). The
three-level cascade (palette → tone-set → role) is the same three-level
that already exists in YAML (`colors.yaml` → `roles.yaml` → block
variant) — the CSS faithfully mirrors the YAML semantics, so editing
`roles.yaml` has predictable visual consequences.

---

## 6. Storyboard composition

**Proposal.** `dist/index.html` inlines every screen into a CSS-grid
storyboard. Per Etap 3.2's day-1 decision: **no iframes** for MVP.
Per-screen standalone files are also emitted for direct linking.

```
dist/
  index.html              ← storyboard, inline embedding
  screens/
    sample-dashboard.html ← single-screen page (full chrome, just one screen)
    sample-landing.html
  styles/
    tokens.css            ← generated
```

`dist/index.html` skeleton:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="../system/styles/reset.css">
  <link rel="stylesheet" href="../system/styles/base.css">
  <link rel="stylesheet" href="../system/styles/blocks.css">
  <link rel="stylesheet" href="../system/styles/storyboard.css">
  <link rel="stylesheet" href="./styles/tokens.css">
  <title>yamleer storyboard</title>
</head>
<body>
  <main data-storyboard>
    <article data-screen-frame data-screen-id="sample-dashboard">
      <header data-frame-caption>
        <span data-frame-name>sample-dashboard</span>
        <span data-frame-meta>dashboard-grid · slotted</span>
        <details data-frame-debug>
          <summary>debug</summary>
          <!-- variants / tokens used: empty for MVP, populated later -->
        </details>
      </header>
      <div data-frame-body>
        ${ rendered HTML for sample-dashboard }
      </div>
    </article>
    <article data-screen-frame data-screen-id="sample-landing">
      ...
    </article>
  </main>
</body>
</html>
```

Zero `class` and zero inline `style` throughout — storyboard chrome
follows the same `data-*` discipline as rendered screen content. The
principle holds **everywhere**, not just inside the screen body.

Each `[data-frame-body]` has `container-type: inline-size` so container
queries inside blocks scope to the frame (not the page). This preserves
per-screen responsive behavior without iframes.

Storyboard CSS (in `system/styles/storyboard.css`):

```css
[data-storyboard] {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(800px, 1fr));
  gap: 2rem;
  padding: 2rem;
}
[data-screen-frame] {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px oklch(20% 0.02 250 / 0.08);
  overflow: hidden;
}
[data-frame-body] {
  container-type: inline-size;
}
```

**Alternatives.**

- **(a)** Iframes per screen. Provides CSS isolation, full viewport
  context per screen. Day-2+ direction; deferred per Etap 3.2 decision
  (auto-height iframes are non-trivial without postMessage).
- **(b)** One long scroll, screens stacked vertically without grid.
  Loses the figma-canvas feel; harder to compare side-by-side.
- **(c)** Per-screen standalone HTML only, no storyboard. Removes the
  "see everything at once" affordance that justifies the system.

**Why proposal.** The grid storyboard answers the question that
motivated the whole project: *do all my screens look like they're from
the same product?* Side-by-side is the only way to answer that visually.
`container-type: inline-size` on the frame body keeps per-screen
responsive behavior without the iframe height-resize ceremony, and the
absence of `class` attributes inside the rendered screen means CSS leak
risk between frames is structurally low. Iframes can be reintroduced in
day-2 once the renderer is proven; deferring them now keeps day-4 work
bounded.

---

## Resolved questions (post-review)

1. **`render.js` re-validates.** Defensive guard ~100 ms in exchange for
   a class of "schema valid but renderer crashes" errors that never
   occur. Symmetric with how future SwiftUI/Android renderers will also
   re-validate at their boundary.

2. **Render failure aborts the whole build.** Partial output is worse
   than no output — a storyboard with 4 of 5 screens looks complete to
   the user. `npm run build` is all-or-nothing; every successful build
   yields a consistent dist state.

3. **`escape` lives in `system/lib/escape.js` as the single source of
   truth.** Block and primitive renderers import it directly; `ctx`
   exposes it as a convenience proxy so renderers can write
   `ctx.escape(x)` or `escape(x)` interchangeably. Symmetric with how
   walker context provides helpers without owning their implementation.

4. **Caption content for MVP**: `data-frame-name` + `data-frame-meta`
   (template name + mode) + an empty `<details data-frame-debug>`
   collapsed by default. The details block is the seam for later
   debug output (active variants, token references used) without
   restructuring caption HTML.

## Deferred to day 2+

- **`ctx.escape` lint check.** A small AST or regex scan of
  `system/blocks/index.js` and `system/primitives/index.js` for
  `${data.<field>}` interpolations missing `ctx.escape`. Catches the
  one mistake humans make under pressure. ~30 lines of code.

---

## Definition of done for Etap 4 (proposal)

`npm run build && npm run serve` opens `http://localhost:8000/` and shows
both sample screens side-by-side in the grid storyboard. The output:

- Validates AJV + walkers before rendering.
- Uses zero `class` and zero inline `style` **throughout the entire
  document** — rendered screen content AND storyboard chrome. All
  selectors hit `data-*` only.
- Tokens.css contains custom properties for every token (palette, tone,
  role, spacing, radius, typography). Type sizes use `clamp()` from
  fluid-range. `fluid-range` itself appears only as a header comment.
- Each screen-frame has independent container-query context.
- The whole thing reads as one product — `tone` differences are visible
  and tasteful, `density: compact` is perceptibly tighter than
  `comfortable`, the heading hierarchy clicks together.

If point 5 (visual cohesion) fails on first render, we don't ship; we
iterate on `system/styles/` (and only there) until it does.
