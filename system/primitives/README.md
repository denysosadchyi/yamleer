# Primitives

Inline leaf elements referenced inside blocks via
`{ type: ref, ref-kind: primitive, ref-type: <name> }`.

## Rules

- **No slots.** Primitives are not containers. If you need nesting, use a block.
- **No variants.** Visual states are expressed as enum-typed fields
  (e.g., `intent: { type: enum, values: [primary, secondary, ghost] }`).
  Variants are reserved for blocks where one content shape renders in multiple
  visual modes.
- **Referenced, not embedded.** Block fields point at primitives by type; the
  actual data is supplied in screen YAML.

## Adding a new primitive

A system-level decision, not a content decision. Open an RFC stating:

1. Why this primitive cannot be composed from existing primitives.
2. Which block(s) will reference it.
3. The full field shape.

Ad-hoc additions are forbidden; otherwise the dictionary grows past discipline.
