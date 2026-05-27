---
name: focus
description: A quiet todo list for people doing deep work.
colors:
  paper:           "oklch(99% 0.003 250)"
  paper-warm:      "oklch(96% 0.005 250)"
  page-canvas:     "oklch(94% 0.005 250)"
  deep-indigo:     "oklch(23% 0.04 250)"
  ink-primary:     "oklch(18% 0.01 250)"
  ink-secondary:   "oklch(45% 0.015 250)"
  rule-subtle:     "oklch(92% 0.005 250)"
  accent-blue:     "oklch(52% 0.16 250)"
  accent-amber:    "oklch(70% 0.18 60)"
  surface-danger:  "oklch(96% 0.03 25)"
  text-danger:     "oklch(40% 0.18 25)"
  border-danger:   "oklch(70% 0.15 25)"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.375rem, 4.5vw, 4.5rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2.625rem)"
    fontWeight: 700
    lineHeight: 1.15
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.375rem, 2vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(0.9375rem, 1.2vw, 1.0625rem)"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "clamp(0.75rem, 1vw, 0.875rem)"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
  xxl: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "0 0"
  toggle-off:
    backgroundColor: "{colors.paper-warm}"
    rounded: "{rounded.pill}"
    width: "2.5rem"
    height: "1.35rem"
  toggle-on:
    backgroundColor: "{colors.accent-blue}"
    rounded: "{rounded.pill}"
    width: "2.5rem"
    height: "1.35rem"
  text-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  task-item:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    padding: "1rem 1.5rem"
  setting-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    padding: "1rem 1.5rem"
  page-header:
    backgroundColor: "{colors.page-canvas}"
    textColor: "{colors.ink-primary}"
    padding: "2.5rem 2.5rem 1.5rem"
  section:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-primary}"
    padding: "1.5rem"
  cta-bar:
    backgroundColor: "{colors.deep-indigo}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "1.5rem 2.5rem"
---

# Design System: focus

## 1. Overview

**Creative North Star: "The Quiet Companion"**

focus is paper, ink, and one quiet accent. The interface is a single
sheet rendered at desk-sized width, holding a finite list and nothing
else. The visual register sits at the corner of *editorial-minimal*
and *Apple-craft* (Things.app rather than Linear): generous spacing,
soft borders, custom toggles tuned to feel like fountain-pen marks
rather than checkbox glyphs. No motion that decorates, no shadows
that perform depth, no colour that competes for attention.

What this system rejects, taken directly from PRODUCT.md
anti-references: productivity-influencer aesthetics (neon accents,
"PRODUCTIVITY UNLEASHED" copy, dark-mode-only "focus mode" themes
that scream rather than whisper); gamified surfaces (streaks, points,
badges); feature-sprawled corporate defaults (Microsoft To Do,
Google Tasks); Notion-as-todo (a todo trapped in a documents app).

**Key Characteristics:**
- Paper-cool background with near-black ink. Single accent kept rare.
- Flat surfaces with tonal layering for depth — no shadows.
- Type scale fluid via `clamp()` from 320px to 1200px viewport.
- Container queries everywhere; components adapt to their parent
  width, not the device viewport.
- Custom-built toggle and checkbox primitives, not native controls.
- Border-based dividers between row items, not shadowed cards.

## 2. Colors

A paper-and-ink palette tinted toward blue (OKLCH hue 250), with one
saturated accent at hue 250 used sparingly and a warm amber accent
reserved for system-level emphasis. The entire neutral stack stays in
a narrow chroma band (0.003–0.04) so the brand colour, when it lands,
reads as the singular voice on the screen.

### Primary
- **Accent Blue** (`oklch(52% 0.16 250)`): The one saturated colour
  in the system. Lives on the primary `action` button background and
  the active state of `toggle`. The toggle knob and the checkbox fill
  in `task-item[data-done="true"]` both use this colour as the
  *signal of completion*. Should never appear as decoration.
- **Accent Amber** (`oklch(70% 0.18 60)`): Reserved for focus rings
  (`:focus-visible` outlines) and the input ring on `text-input`.
  Warm hue counterbalances the cool neutral stack so focus rings
  read against any tone.

### Neutral
- **Paper** (`oklch(99% 0.003 250)`): The base surface for most
  blocks. Near-white tinted faintly cool. Used by `setting-row`,
  `task-item`, `text-input`.
- **Paper Warm** (`oklch(96% 0.005 250)`): Off-state toggle track,
  disabled-input background, muted-tone block surfaces, storyboard
  frame body background. One step darker than Paper, same hue.
- **Page Canvas** (`oklch(94% 0.005 250)`): The page background
  behind block content. Header occupies this surface; sections lift
  to Paper above it. The tonal step between Canvas and Paper is the
  primary depth signal in the system (see Elevation).
- **Deep Indigo** (`oklch(23% 0.04 250)`): Reserved for `cta-bar`
  with `tone: emphasis` — the one block that intentionally inverts
  to dark. Used to draw attention to a single page-level call (trial
  expiry, conversion).
- **Ink Primary** (`oklch(18% 0.01 250)`): Body text, headings. Near
  black but tinted blue — never `#000`.
- **Ink Secondary** (`oklch(45% 0.015 250)`): Metadata, captions,
  meta line in page-header. Used via `opacity: 0.7` on Ink Primary
  in practice rather than as a separate colour.
- **Rule Subtle** (`oklch(92% 0.005 250)`): Borders between rows in
  task-item and setting-row stacks; toggle track border. The lightest
  visible line.

### State (used only by danger/success tones, currently unwired)
- **Surface Danger** / **Text Danger** / **Border Danger** — defined
  for error-state visuals but not yet exercised by any screen.
  destructive `action` intent is unimplemented (gap 8 in
  vocabulary-gaps.md).

### Named Rules

**The One Accent Rule.** Accent Blue carries no more than 10% of any
given screen by area. Two toggles on, one primary button is the
*upper* limit. If accent shows up four times on one page, drop one.

**The No Black Rule.** No `#000`, no `#fff`. Every neutral is tinted
toward the brand hue (chroma ≥ 0.003) so that the paper and ink read
as one family rather than as two raw extremes.

## 3. Typography

**Display Font:** `system-ui, -apple-system, 'Segoe UI', sans-serif`
**Body Font:** same system stack.
**Label/Mono Font:** `ui-monospace, 'SF Mono', Menlo, monospace`
(used only for due times on `task-item`).

**Character:** A single system-sans stack so the interface inherits
the operating system's native typography (San Francisco on macOS,
Segoe on Windows). Mono is the secondary voice, reserved for times
and identifiers that should read as data, not prose. No custom
webfonts. No loading cost.

### Hierarchy

- **Display** (700, `clamp(2.375rem, 4.5vw, 4.5rem)`, leading 1.05,
  tracking -0.02em): Not used by any current block. Reserved for
  future marketing-grade pages outside the product surface.
- **Headline** (700, `clamp(1.75rem, 3vw, 2.625rem)`, leading 1.15):
  `page-header.title` — the page identity ("Today", "Archive",
  "Settings"). One per screen.
- **Title** (600, `clamp(1.375rem, 2vw, 1.875rem)`, leading 1.25):
  `section.heading`, `cta-bar.heading`. Sets group identity within a
  page.
- **Body** (400, `clamp(0.9375rem, 1.2vw, 1.0625rem)`, leading 1.55):
  All prose, all task titles, all setting labels. Max line length
  60ch (set on `[data-field="description"]` and `[data-field="lead"]`).
- **Label** (400, `clamp(0.75rem, 1vw, 0.875rem)`, leading 1.45):
  `page-header.eyebrow` (uppercase, tracking 0.08em, opacity 0.55),
  `task-item.due` (mono), `task-item.note`.

### Named Rules

**The Fluid Scale Rule.** Every typographic step is `clamp()` against
viewport width (320–1200px). No fixed-pixel font sizes. The same
component reads at the right size on a phone preview and a 1366
desktop frame without breakpoints.

**The Eyebrow Whisper Rule.** When eyebrow text appears above a
headline, it sits at Label size, all caps, tracking 0.08em, opacity
0.55. Never larger, never bolder. Its job is to give context
quietly — if it competes with the headline, it has failed.

## 4. Elevation

**Flat by default. Tonal layering for depth.** This system uses no
shadows at any block, primitive, or surface level. Hierarchy is
expressed by stepping through neutral surface tokens (Page Canvas →
Paper Warm → Paper) and by 1px subtle-rule borders.

The page-header sits on Page Canvas. Sections sit on Paper, one tonal
step lighter, creating a sheet-on-a-desk impression. Inside a section,
task-item and setting-row rows share the Paper surface and are
separated only by `border-top: 1px solid {rule-subtle}` — except for
the first child, which has no border so the stack reads as one
continuous list rather than as boxed cards.

The single shadow currently in the system is the toggle knob's
inner depth cue: `box-shadow: 0 1px 2px rgb(0 0 0 / 0.18)`. This is
**component-level**, not surface-level, and serves to differentiate
the moving knob from the static track. There is no ambient or
elevation shadow on cards, sections, or buttons.

### Named Rules

**The Flat Surface Rule.** Surfaces never lift. No
`box-shadow: 0 1px 3px rgba(0,0,0,0.1)` on cards or sections. If a
block needs depth, it is the wrong block or the wrong tone.

**The Border-First Divider Rule.** Row dividers are always 1px solid
borders in `rule-subtle`, never shadows, never "underline-style"
dashed lines. First-child rows lose the top border; otherwise the
divider doubles up against the section edge.

## 5. Components

### Buttons (`action` primitive, three intents)

- **Shape:** rounded corners (`rounded.md` = 8px).
- **Primary:** Accent Blue background, Paper text, 1px transparent
  border. Used at one place per screen — the page-header action, or
  the cta-bar conversion call. Padding `spacing.sm spacing.md`
  (8px × 16px).
- **Secondary:** Transparent background, Ink Primary text, 1px
  `role-border` outline. Same padding. Used for non-decisive actions
  (Change email, Export as text).
- **Ghost:** Transparent background, Ink Primary text, underlined
  with `0.05em` thickness. No padding. Used for tertiary calls
  (Change to Sunday, Restore to today, Delete permanently — note:
  destructive currently borrows ghost, see Don'ts).
- **Hover / Focus:** All buttons brighten 8% (`filter: brightness(1.08)`)
  on hover, dim 8% on active. Focus ring is 2px Accent Amber via
  `:focus-visible`, offset 2px from the button bounds.

### Toggle (`toggle` primitive)

- **Track:** Pill-shaped (radius 999px), 2.5rem × 1.35rem. Off state:
  Paper Warm fill with 1px Rule Subtle border. On state: Accent Blue
  fill and border.
- **Knob:** Circular pseudo-element, 1.05rem diameter, 0.15rem inset.
  Paper colour with subtle inner shadow. Slides on `transform`
  (translateX) with 120ms ease-out transition. Never animates layout
  properties (`left`, `right`).
- **States:** `aria-pressed` mirrors `data-on`. `:focus-visible` and
  `[data-state="focused"]` both produce a 2px Accent Amber outline
  offset 2px. `[data-state="disabled"]` and `:disabled` drop opacity
  to 0.55 with `cursor: not-allowed`.

### Custom checkbox (inside `task-item`)

- **Off:** 1.1rem circle, 1.5px Rule Subtle border, transparent
  background.
- **On:** Filled with Accent Blue, white check-mark pseudo-element
  drawn from two borders (`border-left` + `border-bottom`, rotated
  -45°). The check is hand-tuned, not a glyph or SVG.
- **Hover:** Border colour shifts to Ink Primary, drawing the eye
  before commitment.
- **Focus:** 2px Accent Amber outline.

### Text-input (`text-input` primitive)

- **Style:** Paper background, Rule Subtle 1px border, `rounded.md`
  (8px), Body typography, padding `spacing.sm spacing.md`. Minimum
  width 16rem.
- **Placeholder:** Ink Primary at opacity 0.45.
- **Focus:** Border swaps to Accent Amber, plus a 3px low-opacity
  Amber ring outside the border (`box-shadow: 0 0 0 3px
  oklch(70% 0.18 60 / 0.18)`).
- **Error:** Border Danger + Text Danger. Focus ring shifts to a
  danger-hue ring at the same opacity.
- **Disabled:** Paper Warm background, opacity 0.55, `cursor:
  not-allowed`.

### Task-item

- **Shape:** Three-column grid (checkbox auto, title flex, due auto)
  × two rows (title row + optional note row). Padding
  `spacing.md spacing.lg` (16px × 24px).
- **Background:** Paper at default tone; Paper Warm at muted tone
  (used for "Done today" section).
- **Border:** 1px top border in Rule Subtle, no border on
  `:first-child`, no bottom border anywhere. Stack forms one
  continuous list.
- **Done state:** Checkbox fills, title strikes through
  (`text-decoration: line-through 0.06em`), title opacity drops to
  0.5, row opacity drops to 0.85.
- **Priority:** `data-priority="high"` adds `box-shadow:
  inset 2px 0 0 {text-danger}` — an inset stripe inside the row's
  left edge, drawn with shadow not border so it doesn't disturb the
  row's grid (see Don'ts on side-stripe borders).
- **Due:** Right-aligned, Label size, mono font, opacity 0.6,
  `white-space: nowrap` so times like "14:00–14:45" don't wrap.

### Setting-row

- **Shape:** Two-column grid (`1fr auto`) with label-group on the
  left and a single control primitive on the right. Container query
  collapses to single-column stack below 500px container width.
- **Background:** Paper. 1px top border, no border on first-child.
- **Internal:** Label uses Title size (heading-sm in tokens, weight
  500), description uses Body size at opacity 0.8 with max-width
  60ch. Control field renders one of toggle / action primitives.

### Page-header

- **Shape:** Two-column grid (`1fr auto`) × three-row baseline
  (eyebrow, title, meta). Padding `spacing.xl spacing.xl spacing.lg`
  (40px × 40px × 24px). Bottom 1px Rule Subtle border separates from
  the main content.
- **Eyebrow:** Label size, uppercase, tracking 0.08em, opacity 0.55.
  Sits above the title, spans both columns.
- **Title:** Headline size + weight, takes the left column.
- **Meta:** Body size, opacity 0.7, takes the left column below the
  title. Single line.
- **Action:** Right column, vertically centred to the title row.
  Optional.

### Section

- **Shape:** Container with padding `spacing.lg` (24px). Optional
  description below heading.
- **Body slot:** Default `display: grid` (auto-fit minmax 220px
  columns) for `card` children. Switches to `display: block` via
  `:has([data-block="task-item"])` and `:has([data-block="setting-row"])`
  when row-type atoms are present, so rows stack edge-to-edge with
  their own borders forming the list. Cards continue to tile.

### CTA-bar

- **Shape:** Container query at ≥600px container width switches from
  stacked to 2-column grid (heading + body left, action right
  spanning both rows). Padding `spacing.lg spacing.xl` (24px × 40px).
- **Default tone:** Paper background, standard text. Used quietly in
  footers (the "Nine completed this week" footer in archive).
- **Emphasis tone:** Deep Indigo background, Paper text. Used at most
  once per session in product (trial-expiry banner). When used,
  contains the primary action of the page.

## 6. Do's and Don'ts

### Do:
- **Do** keep Accent Blue at ≤10% of any screen by area. Two toggles
  on plus one primary button is the upper limit.
- **Do** use OKLCH for every colour value; never hex, never named CSS
  colours.
- **Do** use container queries for responsive behaviour. Every block
  with layout variants (cta-bar, setting-row) responds to its parent
  width, not the viewport.
- **Do** express depth through tonal layering (Page Canvas → Paper
  Warm → Paper) and 1px borders, not shadows.
- **Do** use mono font (`ui-monospace, SF Mono, Menlo`) for due
  times and any data identifier. Body sans for everything that reads
  as prose.
- **Do** preserve `:first-child` border removal on row stacks so the
  top of a list joins seamlessly with its section.
- **Do** gate every transition with
  `@media (prefers-reduced-motion: reduce)` once motion is added
  (currently the toggle and button hover transitions are unguarded —
  v0.2 debt).

### Don't:
- **Don't** use `#000` or `#fff`. Every neutral is tinted toward
  hue 250 with chroma ≥ 0.003.
- **Don't** use `border-left` or `border-right` greater than 1px as
  a coloured accent stripe on cards or rows. The task-item priority
  indicator is `box-shadow: inset 2px 0 0`, not a left border,
  precisely because of this rule.
- **Don't** add `box-shadow` for elevation or depth at the block or
  section level. The Flat Surface Rule. The only shadow in the
  system is the toggle knob's 0 1px 2px inner depth cue.
- **Don't** use gradient text (`background-clip: text` on a gradient
  background). Decorative, never meaningful here. Emphasis through
  weight or size.
- **Don't** introduce productivity-influencer aesthetics — neon
  accent colours, all-caps "PRODUCTIVITY UNLEASHED" copy, dark-mode
  "focus mode" themes that perform intensity. PRODUCT.md
  anti-reference.
- **Don't** add streaks, points, badges, completion graphs, weekly
  charts. Gamified surfaces are PRODUCT.md anti-reference. The
  archive shows what was done; it doesn't celebrate it.
- **Don't** reach for a modal as the first thought for any flow.
  Exhaust inline / progressive alternatives first.
- **Don't** use `intent="ghost"` for destructive actions. Currently
  "Delete permanently" uses ghost — this is documented as gap 8 in
  vocabulary-gaps.md. When destructive intent lands, swap to it.
- **Don't** introduce native `<input type="checkbox">`. The task-item
  custom checkbox is part of the system's craft signature and is
  consistent with the toggle's aria-pressed pattern.
- **Don't** use em dashes (`—`) in UI copy. Commas, colons,
  semicolons, periods, or parentheses. (The codebase currently uses
  em dashes in body prose — that's allowed in long-form description
  text, but not in UI labels or microcopy.)
