# Templates

Page-level composition shells. Each template chooses one of two **modes**:

- **`mode: sequence`** — a linear ordered list of blocks. The template
  declares an `allows` whitelist and optional `min-blocks` / `max-blocks`.
  Screen YAML supplies `blocks: [...]`.
- **`mode: slotted`** — named zones with per-zone constraints. The template
  declares `slots: { header, main, footer, ... }`, each with its own
  `allows`, `cardinality`, `required`, and (for `cardinality: many`)
  `min` / `max`. Screen YAML supplies `slots: { header: ..., main: ... }`.

The two shapes are mutually exclusive — schema enforces that via
`if/then/else`. `sequence` mode rejects `slots` at validation; `slotted`
mode rejects `allows` / `min-blocks` / `max-blocks`.

## `allows` is structural, not contentful

The list of block types a template (or a slot inside a template) accepts
is **structural** — only blocks that play a structural role in page
composition belong there. Atomic content blocks never appear directly in a
template's `allows`; they reach the page by being nested inside a
structural block.

Concrete rule for `single-column`:

```
single-column.allows: [hero-text, section, cta-bar]   ← yes
single-column.allows: [card, ...]                     ← no
```

`card` is atomic — it lives inside `section.slots.body`, never directly in
the template flow. The same principle applies to any future atomic block
(`text-block`, `list-item`).

Slotted templates follow the same discipline per slot. In `dashboard-grid`:

```
header.allows:  [hero-text]    ← structural entry
main.allows:    [section]      ← structural body container
footer.allows:  [cta-bar]      ← structural close
```

No atomic types appear in any slot's `allows`.

## Adding a new template

A system-level decision. Open a `template-rfc` describing:

1. Why existing templates cannot express the layout.
2. Which mode (`sequence` or `slotted`) and why.
3. Full `allows` for each slot (slotted) or for the sequence, with
   rationale for each entry.

Templates are deliberately few. Five-ish layout primitives cover the vast
majority of B2B SaaS pages.
