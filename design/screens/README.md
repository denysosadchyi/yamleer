# Screens

Production screens for the project live here. They are authored as YAML,
validated against a per-template schema (see `render/screen-schema-builder.js`)
plus three post-validation walkers, and rendered to HTML by the renderer
(Etap 4+).

## Sample screens — `sample-*.yaml`

Files prefixed `sample-` are demonstration screens used to:

1. Verify that the dictionary (blocks + primitives + templates) is
   expressive enough to describe realistic B2B SaaS content without
   reaching for ad-hoc additions.
2. Exercise variant coverage (tone, density, intent, icon.size).
3. Serve as reference for new screen authors.

Sample screens are kept alongside production screens (rather than under
`tests/fixtures/`) because they validate through the same dispatch as real
screens and rendering them is part of the storyboard.

### Fictional brand: Harbor

Sample screens use a fictional maritime-adjacent B2B product named
**Harbor**. The brand is deliberately not the project's real product —
samples should illustrate the *system*, not stand in for the *product*.

This is a convention borrowed from design-system reference docs
(e.g., Anthropic uses "Acme Logistics" for the same purpose): keep
demonstration content realistic enough to feel natural, generic enough
that another reader can drop the system into a different domain without
mental friction.

When adding new sample screens:

- Use Harbor for product-level naming (logos, brand voice).
- Keep tone serious-B2B; no metaphors (`navigating challenges`, etc.).
- Test something the existing samples do not — a new layout, a new
  variant combination, a new state.

When adding **real** screens for the actual project, name them after the
real feature (`fleet-overview.yaml`, `voyage-detail.yaml`) — no
`sample-` prefix.
