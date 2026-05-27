# Architecture decisions — dictionary growth

Meta-principles for how the design dictionary grows. These are the rules
that get applied **before** new primitives, blocks, or schema changes are
written — they catch architectural mistakes at proposal time, not at
"why does this feel wrong" time three commits later.

Each principle records the rule, the why, and the trigger that would
make us revisit it.

---

## 1. Categories before members

**Rule.** When a new primitive has no natural home in the existing
dictionary, do **not** add the primitive first and find a home for it.
Declare the **category** first (host block + ref-union mechanism), then
populate the category with members.

**Why.** A primitive with no consumer is dead code — no screen can
reach it. The pressure to "find any consumer" leads to stretching an
existing block past its intent (e.g., wedging an input into `card.cta`
because cta is the only ref-field nearby). Stretched blocks accumulate
into franken-types that nobody trusts.

**How to apply.** Before adding a new primitive, ask: which existing
block can host it without semantic distortion? If the answer is "none,
but I can make X work" — stop, design the host block for the category,
then add the primitive as one of N members of that category's union.

**Trigger to revisit.** If we ever ship a primitive without a host
block (truly orphan utility), we'll need a separate convention for
that case. Not foreseen.

**Origin.** Reality-check on focus product (May 2026) — gap 7 analysis
forced this principle into existence. Was about to wedge text-input
into card.cta before catching it.

---

## 2. Splitting cheaper than un-splitting

**Rule.** When uncertain whether two use-cases should share one block
or split into two — split. Two honest blocks beat one many-faced block.
Splitting is cheaper than un-splitting (de-duplicating later).

**Why.** A merged block carries the union of both use-cases'
constraints. Every author has to navigate the irrelevant half. When
the use-cases diverge later (and they always do), un-merging means
migrating every existing instance, which touches every screen.

**How to apply.** When proposing a new block, ask: am I tempted to
make this serve more than one pattern (settings + login forms +
search)? If yes, split into N blocks now, even if one is a
near-duplicate of another. Discover the abstraction empirically after
3+ real consumers exist, not at design time with zero consumers.

**Trigger to revisit.** When 3+ blocks share >70% of their field
schema, consider extracting a shared base. Not before.

**Origin.** Same reality-check — almost named `setting-row` as
`form-row` to "future-proof" it. Caught: form-row would carry settings
overhead (prose description) that login/search inputs don't need.
Better to ship setting-row now, ship form-row separately when needed.

---

## 3. Section as universal grouping container

**Rule.** `section` is the one block-level grouping container. When a
new atomic block needs grouping under a heading, widen
`section.body.allows: [card, setting-row, ...]` rather than introducing
`section-cards`, `section-settings`, or other typed-section variants.

**Why.** Fragmenting section into N typed variants breaks the
"one grouping primitive, content varies" model. Authors then have to
choose between section-types based on the content, doubling the
mental model. The allowlist whitelist is cheap and explicit.

**How to apply.** Any new atomic block: extend `section.body.allows`
to include it. Do not introduce `section-X` blocks.

**Trigger to revisit.** When `section.body.allows` reaches **8+
entries**, the section abstraction has stopped earning its keep —
consider section variants or split sections into typed containers at
that point. Not before.

**Origin.** Same reality-check + this design step. Considered
introducing `form-section` to host setting-rows separately; rejected
on the splitting/grouping symmetry argument.

---

## 4. Three-tier block roles

**Rule.** Every block declares one of three roles, and role flows from
**where the block lives**, not the other way:

- **`leaf`** — top-level template entry. Sits directly in a template
  slot (e.g., hero-text in dashboard-grid.header, cta-bar in
  dashboard-grid.footer). Self-contained, full-width-ish.
- **`atomic`** — content unit inside a structural block. Sits in
  `section.body` or another structural block's slot. Examples: card,
  setting-row.
- **`structural`** — has its own slots. Currently only `section`.

**Why.** The role system is enforced by `render/walkers/role-composition.js`,
which encodes the cross-file constraint that schema cannot express:
template scopes accept `leaf | structural`, block-slot scopes accept
`atomic`. Choosing the wrong role at design time gets caught at
validation time with a cross-reference error — but only if the author
reasoned about role from placement first.

**How to apply.** When introducing a new block, ask:
- Does it live at template level? → `leaf`
- Does it live inside section.body (or another structural slot)? → `atomic`
- Does it have nested slots of its own? → `structural`

Then declare role to match. Do not pick role first.

**Trigger to revisit.** If we ever need a block that legitimately
lives in both template slots AND structural slots (e.g., a "note" that
can stand alone or sit grouped), the role system will need a fourth
tier or a multi-role declaration. Not foreseen for v0.x.

**Origin.** Discovered during setting-row design: original draft had
`role: leaf`, would have failed role-composition walker (which
restricts `section.body.allows` to atomic). Caught before writing code
because the walker rule was read.

---

## Where historical artifacts live

`notes/audit/` is the standard location for **frozen reality-check
artifacts** — files preserved outside the build pipeline as before/after
diffs, migration snapshots, or audit history.

- Files in `notes/audit/` are **not** validated, **not** rendered, **not**
  built. They are filesystem-only snapshots.
- Use cases: keep `focus-settings-v0.1.yaml` before rewriting it on
  new dictionary syntax; keep a `dashboard-grid-v0.1.yaml` if we ever
  redesign that template; keep audit reports.
- Live `design/screens/` and `system/` paths continue to be the
  authoritative pipeline inputs. `notes/audit/` is a museum.

Reach for `notes/audit/` whenever you are about to **rewrite** an
authoritative file and want the "before" preserved for comparison
without polluting the build.
