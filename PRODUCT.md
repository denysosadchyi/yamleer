# Product

## Register

product

## Users

People doing deep, focused work — writers, researchers, engineers,
designers, founders, indie operators. Single-user, b2c, no teams.
They open focus in short, frequent sessions during the workday:
glance at today's commitments, mark something complete, close the
tab. The dominant context is mid-flow: a brief visit between blocks
of real work, not a dedicated planning session.

Primary task on opening: **scan today's list and mark what's done**.
Secondary: add a task when one surfaces. Tertiary: look back at the
archive when curious about a past day or week.

## Product Purpose

A todo list for people who don't want a todo system. focus stores
one list per day, an archive of what got finished, and four
settings. There are no projects, labels, tags, sub-tasks, recurring
schedules, reminders, notifications, attachments, integrations,
collaborators, comments, AI suggestions, streaks, productivity
scores, or activity graphs.

Success: a user opens focus, gets clarity in under three seconds on
what they committed to today, marks something done, and closes the
tab. The product disappears from their mind until the next visit.

Anti-success: the product becomes a place to spend time on its own.
Tagging tasks. Reorganising. Reading dashboards. If focus becomes
"interesting", it has failed.

## Brand Personality

**Quiet · calm · respectful.**

- **Quiet** — visual weight, colour saturation, motion energy, and
  copy emphasis all dialled down by default. Loudness only where it
  earns its place (the destructive action; the trial-ending banner).
- **Calm** — no urgency manufactured by the product itself. No "you
  haven't checked in today!" prompts, no streak-loss anxiety, no
  bouncing badges. The user owns the urgency.
- **Respectful** — the product never assumes it deserves the user's
  attention. Every visit is short by design, not by friction.

Closest existing reference: **Things.app**. Generous spacing, custom
checkboxes, soft borders, craft-grade detail without ornament.

## Anti-references

- **Jira / Asana / Monday** — overweight project management dressed
  as personal todo. Sub-tasks, status fields, custom workflows.
- **Todoist** — gamified ("Karma points"), streak-driven, achievement
  badges. Turns a finite list into an infinite loop.
- **Notion as todo** — todo trapped inside a documents app, requiring
  the user to assemble their own system from blocks.
- **Microsoft To Do / Google Tasks** — feature-sprawled corporate
  defaults. Multiple lists, sub-lists, smart suggestions.
- **Productivity-influencer aesthetics** — neon accent colours,
  bold "PRODUCTIVITY UNLEASHED" copy, dark-mode-only "focus mode"
  themes that scream rather than whisper.

## Design Principles

1. **Attention is finite; the product takes none uninvited.** No
   notifications, no badges, no banners that interrupt. The product
   exists when the user opens it and not before.

2. **Show what's there, not what could be.** Surface today's list,
   the count, the date. Don't surface filters, views, project
   pickers, label clouds, or recurring-task editors the user didn't
   ask for.

3. **No rewards, no punishments.** Completion is its own reward.
   Missed days don't roll into guilt. Long streaks aren't
   celebrated. Volume isn't displayed as virtue.

4. **Defaults reflect intended use.** Settings exist only for
   genuine misfits (start-of-week preference, confirmation prompts).
   Every default is the choice we'd make for the user and stand
   behind. Settings count is a maintenance cost, not a feature.

5. **Stillness over motion.** Animation is reserved for clarifying
   state change (a task toggling done). Decorative motion, parallax,
   scroll-driven reveals, and hover-pop effects do not belong here.

## Accessibility & Inclusion

**WCAG AA target across all production surfaces**, with reduced-motion
respect.

- Colour contrast: text on background ≥ 4.5:1; large text and
  interactive borders ≥ 3:1. Audit at every tone (neutral, muted,
  emphasis) and every state (default, focused, error, disabled).
- Motion: every transition gated by `prefers-reduced-motion: reduce`.
  The done-state toggle should remain visually distinct without
  animation.
- Keyboard: every interactive element reachable via Tab; focus ring
  always visible (`:focus-visible`); no keyboard traps.
- Screen reader: `aria-pressed` on toggle/checkbox buttons (already
  in renderers); meaningful `aria-label` on every control; landmark
  elements via semantic HTML (article, section, header).
