# Vocabulary gaps — focus product

Reality-check log from building four screens for **focus** (a single-user
todo app) using the v0.1 dictionary (card / cta-bar / hero-text / section
+ action / icon primitives + single-column / dashboard-grid templates).

Each entry follows the template asked for: blocker → closest existing →
proposed block → can we live without it.

The screens *render* — but several of them only render because I made the
existing blocks pretend to be things they are not. Those pretences are
catalogued here so we don't ship the pretence as the design.

---

## focus-today

### gap 1 — task item with toggleable completion state

**Blocker.** A todo list's core interaction is "tap the checkbox, task
flips between pending and done". I need to render rows with
{checked: bool, title, due-time, priority} and a toggle affordance.

**Closest from existing.** `card` — has `heading` (≈ title), `body` (free
text), `icon` (decorative, `aria-hidden="true"` per the renderer), and
`cta` (action → button or link). None of these model a *toggleable
boolean state*. `data-tone` is a presentational variant, not a state.

**What I actually did.** Used `card` per task. Stuffed "Pending · due
11:00 · high priority" into `body` as free text, used `icon` name=`circle`
vs `check-circle` to *visually suggest* completion state, used a
"Mark complete" action CTA as the toggle. This is wrong on three axes:
the icon is `aria-hidden` (screen reader gets no state), the CTA is a
one-way button (no toggle semantics), and the "completed" version on
*today* sits in a separate `section heading="Already done"` rather than
flipping state in place.

**Proposed block.**
```yaml
type: task-item
role: leaf
fields:
  title: { type: string, required: true, max-length: 80 }
  due-time: { type: string, max-length: 16 }   # "11:00" or "14:00–14:45"
  priority: { type: enum, values: [low, normal, high] }
  status: { type: enum, values: [pending, scheduled, completed], required: true }
  completed-at: { type: string, max-length: 16 }
variants:
  tone: { tokenRef: tone }
```
Plus a `toggle` primitive (or a `status-toggle` field on `task-item`)
for the actual flip affordance — `action` primitive is intent-typed
(primary/secondary/ghost), not state-typed.

**Can we live without it?** No. Toggling complete is the *only* core
interaction of this product. Faking it with `card + action CTA` works
for a screenshot but not for the product. Card's icon being explicitly
decorative (`aria-hidden`) is the strongest signal that this isn't the
right block.

---

### gap 2 — no list / collection container

**Blocker.** "Tasks for today" is a flat list. I want one container
called "Today" with N task-items in it.

**Closest from existing.** `section` — but `section.body` slot has
`allows: [card]` only. So even if `task-item` existed, the slot wouldn't
accept it without a schema change.

**What I actually did.** Used `section` with `card` children, grouped
artificially into "Morning / Afternoon / Already done" so each section
had a believable heading. The grouping is invented to make `section`
look like the right container — a real focus user would see one flat
list of "today", not three time-of-day buckets they didn't ask for.

**Proposed block / change.** Either
(a) widen `section.body.allows` to `[card, task-item]` (smallest change),
or
(b) introduce `task-list` block: structural, with `slots.body.allows:
[task-item]`, plus `empty-state` field/slot for "nothing today".

**Can we live without it?** Partially — you can fake the list shape with
sections, but you can't represent an *empty* state ("no tasks today")
because `section.body` has `min: 1`. The empty list is a meaningful UI
moment for a focus product (the day starts here, congratulations), and
the current dictionary literally cannot render it.

---

### gap 3 — inline "add task" affordance

**Blocker.** Adding a task is the second core interaction. Standard
patterns: an inline input field at the top of the list, or a
floating "+" button.

**Closest from existing.** `action` primitive — a button with a label.
No input primitive exists; no field primitive exists; no form block
exists.

**What I actually did.** Put `cta: { label: "Add a task", intent: primary }`
on the hero-text header. This is the wrong block — `hero-text` is
"primary entry hero — title, lead, and optional call-to-action" per its
description. A page-title-with-CTA is a different pattern from a
marketing hero, and the CTA in a hero is not where users look for
"add task" in any todo app I've ever seen.

**Proposed block / primitive.**
- `text-input` primitive: { placeholder, max-length, name } — at minimum,
  even without backing form semantics, so screens can *show* the input
  affordance.
- `add-item-row` block: a single-row input with submit, scoped to "list
  capture" semantics. Could live above a `task-list`.

**Can we live without it?** No. Without an input primitive the dictionary
cannot express *any* data-entry surface — not just add-task, but also
login, search, settings text fields, the lot.

---

### gap 4 — page header that isn't a marketing hero

**Blocker.** `dashboard-grid.header` requires `hero-text`. But `hero-text`
is sized and semantically scoped for marketing entry — it has a `lead`
field for evocative subtitle copy.

**Closest from existing.** `hero-text` itself.

**What I actually did.** Used hero-text with title "Wednesday, May 27"
and a `lead` that reads like a status update. It works because the lead
is just a paragraph, but the type scale (heading-lg per the block
renderer) and the marketing connotation make it feel oversized for a
dashboard chrome.

**Proposed block.** `page-header`: { title, subtitle, primary-action,
secondary-action, breadcrumb } — slotted into dashboard-grid.header as
an alternative to hero-text.

**Can we live without it?** Yes for now — it's a *misfit* not a *failure*.
But it's the misfit that makes every dashboard screen look slightly
marketing-coded.

---

## focus-archive

### gap 5 — grouped list with date grouping primitive

**Blocker.** Archive is "completed tasks, grouped by day". Each group
header needs: date, count, optional summary.

**Closest from existing.** `section` heading is a string. I jammed the
count into the heading: "Tuesday, May 26 — 4 completed". The `—` and
the count are content, not structure — a future feature like "sort by
duration" or "filter to last 7 days" has nowhere to render.

**What I actually did.** String-jam in the section heading.

**Proposed block.** `list-group` block with structured `date` and
`count` fields, plus a `body` slot of `task-item` (see gap 1).

**Can we live without it?** Yes for v1 if archive is read-only and
unsorted. But the moment we add filtering/sorting controls (which a
real archive needs), `section` has nowhere to put them — `section` has
no slot for header controls, only `body` (and that's cards-only).

---

### gap 6 — restore / undo on archived item

**Blocker.** Each archived task needs a "restore to today" affordance
(common pattern — accidental completion, recurring work).

**Closest from existing.** `card.cta` with intent=ghost.

**What I actually did.** Exactly that. It looks fine in a screenshot,
but it presents as "a button labelled 'Restore to today'" on every card
— and a real archive would either inline this on hover (no hover
primitive in v0.1) or put it behind an overflow menu (no menu primitive).
The current rendering is honest but visually noisy.

**Proposed primitive.** `overflow-menu` (kebab menu with action list) —
or a `card.actions` slot with cardinality:many.

**Can we live without it?** Yes for v1 — single inline ghost button is
acceptable, just loud.

---

## focus-settings

### gap 7 — setting row with control ✅ CLOSED (v0.1.1)

**Status.** Closed in v0.1.1-controls. The "controls" category was
introduced as a new vocabulary tier (per
`notes/architecture-decisions.md` principle 1 — categories before
members). `setting-row` block + `toggle` primitive landed together,
exercising the array-form discriminated union on `setting-row.control`
(accepts `[toggle, action]`).

**Original blocker.** Settings need rows of: label + current value +
control (toggle, dropdown, radio, button-to-modal). Each setting is "a
single preference and its affordance", not "a card".

**Resolution.**

| New artifact | Location |
|--------------|----------|
| `toggle` primitive | `system/primitives/toggle.yaml`, renderer in `system/primitives/index.js`, CSS in `system/styles/blocks.css` |
| `setting-row` block | `system/blocks/setting-row.yaml`, renderer in `system/blocks/index.js`, CSS in `system/styles/blocks.css` |
| array-form `ref-type` infrastructure | `system/schemas/block.schema.yaml` (field-ref `oneOf: [string, array]`), `render/load-schemas.js` (enum injection both branches), `render/screen-schema-builder.js` (array → AJV `oneOf` with `primitive: const` discriminator) |
| boolean field-type | `system/schemas/primitive.schema.yaml` (`field-boolean`), `render/screen-schema-builder.js` (`case 'boolean'`) |
| `section.body.allows` | widened to `[card, setting-row]` |

**Before/after.** `notes/audit/focus-settings-v0.1.yaml` preserved as
the v0.1 rendering (cards with value-in-body-text). Current
`design/screens/focus-settings.yaml` rewritten on `setting-row` —
booleans use `toggle` (value lives in `toggle.on`), triggers use
`action`.

**Why both members from day one.** `action` was included in the
initial control union (`[toggle, action]`) because half the
focus-settings rows are "open further UI" triggers (Change email,
Download archive) rather than booleans. Forcing toggle-only would have
made the screen rewrite contrived.

**What's still open under this banner.**
- `select` and `radio-group` primitives — needed for 3-state and
  N-state settings (theme: system/light/dark). Today rendered as
  `action` "Change to X" buttons (acceptable workaround).
- `aria-labelledby` plumbing between `setting-row.label` and
  `toggle.aria-label` — currently duplicated (see v0.2 debt).

**Regression coverage.** `tests/fixtures/array-form-ref-type.smoke.mjs`
exercises the schema/builder layer that makes the discriminated union
possible. Full `npm run build` validates focus-settings end-to-end.

---

### gap 8 — destructive action distinction

**Blocker.** "Delete account" needs to be visually distinct from "Change
email". The `action.intent` enum is `[primary, secondary, ghost]` — no
`destructive` value. Tones `danger` and `success` exist in
`design/tokens/roles.yaml` but are not exposed on `action` (only on
blocks via the tone variant).

**Closest from existing.** `intent: ghost`.

**What I actually did.** Used `intent: ghost` on "Delete permanently"
— which makes the most dangerous button on the page render *quieter*
than "Change email" (secondary). Backwards.

**Proposed change.** Add `destructive` to `action.intent` enum. (Already
have palette tokens for `text-danger`/`surface-danger`/`border-danger` —
this is a 1-line schema change + a renderer/CSS hookup.)

**Can we live without it?** No, not for a screen with a real
destructive action. The v0.2-design-debt note already flags this kind of
"behavioral states defined but unused" — this is the use case.

---

## focus-landing

(No gaps. The landing page is what this dictionary was built for and it
shows — every block fits its intended role, no pretence required.)

---

## summary

| screen          | gaps blocking product | gaps cosmetic | status         |
|-----------------|-----------------------|---------------|----------------|
| focus-landing   | 0                     | 0             | clean          |
| focus-today     | 1, 2, 3               | 4             | open           |
| focus-archive   | (inherits 1, 2)       | 5, 6          | open           |
| focus-settings  | ~~7~~                 | 8             | gap 7 closed in v0.1.1 |

**Reading.** The dictionary is fit for marketing-coded B2B SaaS surfaces
(landing pages, dashboards-as-overview). The moment a screen needs a
*data-entry, toggleable, or state-bearing* interaction — which is most of
any real product — the available blocks model only the *visual frame*
around the interaction, not the interaction itself.

The smallest unblock to ship focus would be:
1. `task-item` block (gap 1) + widening `section.body.allows` (gap 2)
2. `text-input` primitive (gap 3)
3. ~~`toggle` primitive + a `setting-row` block (gap 7)~~ — **done v0.1.1**
4. `destructive` added to `action.intent` enum (gap 8)

With 3 closed and the array-form ref-type infrastructure in place,
`text-input` (gap 3) is now mechanically trivial — add the primitive,
extend `setting-row.control` from `[toggle, action]` to `[toggle, action,
text-input]`. The hard architectural work (host block + discriminated
union mechanic) is done.

Next likely step: **gap 8** (`destructive` intent — ~30 min, isolated
schema + CSS), then **gap 1** (task-item block + new template) as the
serious next vertical slice.
