# yamleer

YAML-first design pipeline. Authors describe screens as YAML composed of
**blocks** that contain **primitives** and live inside **templates**. Tokens
(colours, spacing, type) and tones (neutral / emphasis / muted) keep the
visual layer consistent across screens. A renderer compiles every screen
to standalone HTML and a multi-screen storyboard for review.

The pipeline is deliberately small: ~6 source files of validator/builder,
~4 stylesheets, ~10 dictionary YAMLs. Nothing is generated dynamically at
runtime — `npm run build` produces a fully static `dist/` directory.

## Run

```
npm install
npm run build         # validate + compile screens → dist/
npm run serve         # python http server on :8000, root dist/
```

Other scripts:

- `npm run validate -- design/screens/<file>.yaml` — validate one file
- `npm run tokens` — emit `dist/styles/tokens.css` from `design/tokens/`
- `node tests/fixtures/array-form-ref-type.smoke.mjs` — schema regression
- `node tests/visual-audit.js` — Playwright screenshots into `dist/audit/`
- `node render/yaml-explorer.js` — generate `dist/yaml.html` (visual tree
  of every YAML in the repo, with wireframe diagrams)

After `npm run serve`, the storyboard lives at `http://localhost:8000/`
and each screen at `http://localhost:8000/screens/<id>.html`.

## Layout

```
design/
  screens/          authored screens (one YAML per screen)
  tokens/           colour/spacing/typography/radius/role tokens

system/
  primitives/       action, icon, toggle — leaf interaction units
  blocks/           card, cta-bar, hero-text, section, setting-row
  templates/        dashboard-grid (slotted), single-column (sequence)
  schemas/          block/primitive/template/tokens JSON Schemas
  styles/           reset, base, blocks, storyboard CSS
  lib/              escape() and other shared helpers

render/
  render.js                build orchestrator (validate → compile → write)
  validator.js             shared validation contract (schema + walkers)
  validate.js              CLI wrapper over validator.js
  load-schemas.js          schema loaders + injection
  screen-schema-builder.js per-template screen schema generator
  tokens-to-css.js         tokens YAML → CSS custom properties
  walkers/                 cross-file validation walkers
  yaml-explorer.js         dev tool — visual YAML tree generator

tests/
  fixtures/         permanent regression tests (smoke + walkers)
  visual-audit.js   Playwright screenshot capture

notes/
  architecture-decisions.md   meta-principles for dictionary growth
  vocabulary-gaps.md          reality-check report + gap closure log
  v0.2-design-debt.md         deferred items with revisit triggers
  audit/                      frozen reality-check artifacts (outside build)
```

## Architecture

Four meta-principles govern how the dictionary grows; read them before
proposing new primitives or blocks:

→ [`notes/architecture-decisions.md`](notes/architecture-decisions.md)

Cliff-notes:

1. **Categories before members** — when a new primitive has no natural
   home, declare the host block first, then add members.
2. **Splitting cheaper than un-splitting** — two honest blocks beat one
   many-faced block.
3. **Section as universal grouping container** — widen
   `section.body.allows`; do not introduce `section-X` variants.
4. **Three-tier block roles** — `leaf` / `atomic` / `structural` flow
   from where a block lives, not the other way.

## Status

**v0.1.1-controls** (current tag) — controls category landed:

- `toggle` primitive (state-bearing button, aria-pressed)
- `setting-row` block (label + description + control)
- Array-form `ref-type` infrastructure (discriminated union for
  primitive references)
- Boolean field-type support for primitives

This closed **gap 7** from the reality-check on a sample product
(`focus`, a minimalist todo app). Six gaps from that report remain open
and have proposed solutions documented:

→ [`notes/vocabulary-gaps.md`](notes/vocabulary-gaps.md)

The next likely steps, in increasing scope:
- gap 8 — `destructive` intent on `action` primitive (~30 min)
- gap 3 — `text-input` primitive in the `setting-row.control` union (~1 h)
- gap 1 — `task-item` block + collection container (~1 day)

Deferred-by-design items live in
[`notes/v0.2-design-debt.md`](notes/v0.2-design-debt.md) with explicit
revisit triggers.
