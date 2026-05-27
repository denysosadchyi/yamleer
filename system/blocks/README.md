# Blocks

Visual building shells composed by screen YAML and rendered to HTML by the
block renderers in `index.js`. Blocks are referenced by `type` from screens
and from slots of other blocks.

## Three-level composition hierarchy

```
atomic blocks      (card, text-block, list-item)
        ↑ nest into
structural blocks  (section)
        ↑ placed in
templates          (single-column, dashboard-grid)
```

Each level has a distinct role. Crossing levels — e.g., placing a `card`
directly inside a template, or a `hero-text` inside a `section` — is either
a validation error or a signal that an intermediate block type is missing.

## Field vs slot decision tree

```
need to attach something to a block?
├── it's a primitive (action, icon, badge)  → field-ref
├── it's exactly one block                  → slot with cardinality: one
└── it's an arbitrary list of blocks        → slot with cardinality: many
```

**field-ref never points at a block.** Block composition is exclusively
through slots, even for single-block slots. No exceptions.

## `allows` is normative, not permissive

`allows: [...]` declares **which composition we consider semantically
correct**, not which is technically possible. Each entry in `allows` is
a deliberate design decision.

When tempted to widen `allows` to satisfy an immediate use case, prefer
introducing a new block (e.g., `feature-spotlight`) over relaxing an
existing slot constraint.

## Variants: tokenRef vs enum

Two variant flavors, chosen by intent:

- **Semantic (token-driven):** `tone`, `color-role`, `size` → `tokenRef`.
  Token-backed values stay in sync when the design system evolves.
- **Structural (block-internal):** `density`, `direction`, `alignment` →
  `enum`. Layout-shape options that have no token meaning.

If a variant could plausibly belong to either, prefer `tokenRef` — the
token system absorbs the change rather than fragmenting it across blocks.

## Adding a new block

A system-level decision. Open a `block-rfc` describing:

1. Which existing composition cannot express this need.
2. Where in the hierarchy it sits (atomic vs structural).
3. Full field/slot/variant shape with rationale for each `allows` entry.
