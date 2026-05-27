# Blocks

Visual building shells composed by screen YAML and rendered to HTML by the
block renderers in `index.js`. Blocks are referenced by `type` from screens
and from slots of other blocks.

## Role: every block declares one

Each block file MUST declare `role` as one of three values:

- **`atomic`** — self-contained content unit. Nests into a structural block
  via that block's slot. Never appears directly in a template, never has
  its own slots.
  Examples: `card`, `text-block` (future), `list-item` (future).

- **`structural`** — container with its own slots. Composes atomic blocks
  into a region. Placed directly in a template slot or sequence. MUST have
  at least one slot.
  Examples: `section`.

- **`leaf`** — full-width screen-level component. Placed directly in a
  template but does not compose anything further. No slots.
  Examples: `hero-text`, `cta-bar`.

Mapping for the current four blocks:

| block     | role       |
|-----------|------------|
| hero-text | leaf       |
| section   | structural |
| card      | atomic     |
| cta-bar   | leaf       |

## What the schema enforces directly

- `role` is required and must be one of the three values.
- `structural` blocks MUST have `slots`.
- `atomic` and `leaf` blocks MUST NOT have `slots`.

## Two-level role validation

Role rules split across two enforcement layers by **what context they need**:

1. **Schema-level** (block.yaml is self-contained):
   `role: structural` ⟺ `slots` is present and non-empty.
   `role: atomic | leaf` ⟹ `slots` is absent.
   Checked by AJV at `load-schemas` time. Fails fast at block authoring.

2. **Walker-level** (screen.yaml read in context of template + block roles):
   Template `allows` contains only `leaf | structural` blocks.
   Structural-block `slots.<x>.allows` contains only `atomic` blocks.
   Checked post-validation, catches composition errors at screen authoring.

Schema validates **internal consistency of a block**; walker validates
**correctness of where the block is placed**. The two layers do not overlap.

## What the post-validation walker enforces (Etap 3.3)

The schema cannot reach across files to check role-vs-role composition. A
walker that runs after `ajv` validates these two cross-file rules:

1. **Template `allows`** (top-level for sequence mode, slot-level for
   slotted mode) may contain only blocks with `role: leaf` or
   `role: structural`. Atomic blocks never appear in a template.
2. **A structural block's `slots.<x>.allows`** may contain only blocks
   with `role: atomic`. Structural blocks compose atomic content, never
   other structural blocks.

These rules are normative — they encode the three-level composition
hierarchy. The walker fails loud with the offending block name, its role,
and the slot expectation.

## Three-level composition hierarchy

```
atomic blocks      (card, text-block, list-item)
        ↑ nest into
structural blocks  (section)
        ↑ placed in (alongside leaf blocks)
templates          (single-column, dashboard-grid)
        ↑ which contain
leaf blocks        (hero-text, cta-bar)
```

Each level has a distinct role. Crossing levels — e.g., placing a `card`
directly inside a template, or a `hero-text` inside a `section` — is a
walker error (or, for `slots` absence violations, a schema error).

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
