---
type: project
created: 2026-09-30
tags: [forevercraft, architecture]
status: active
---

# Architecture

Source of truth: `CLAUDE.md` (repo root, auto-loaded each session). This note is a map into it, not a copy — don't duplicate content here.

Back to [[Overview]] · Next: [[Roadmap]]

## Areas (see CLAUDE.md "Active architecture" for each)
- **Planner** — `/planner/<classId>/<buildCode>`; race is reference-only. Build codes are **versioned** (`lib/build-code.ts`): bump `CURRENT_VERSION` whenever a tree's talent membership/order changes.
- **Talent tree UI** — mobile tap/long-press model, desktop sizing (square cells, deliberate), single-tooltip-owner (`lib/active-tooltip.ts`).
- **Spellbooks** — shared `SpellbookBook`/`ClassAbilitiesSection`, Classic word-diff.
- **Content** — `lib/content.ts` shared loader (`lib/blog.ts` not yet migrated).
- **Reference** — racials, legacy perks, spellbooks, dungeons (two-source reconciliation), items catalog (server-side filtered), professions.
- **World map** — Leaflet tile pyramid, zone areas, entrance markers, URL-hash state.
- **Data workflows** — daily talentsforever snapshot diff (snapshots are immutable), `scripts/build-*.js` pipelines, `data/sources/` layout.
- **Phase 2 (not started)** — auth + Postgres + saved builds; do not begin early.

## Deeper references
- Full file-by-file audit (routes, data, components, lib, scripts, security, SEO): [[Site-Audit-2026-09-20]] — dated; parts predate the profession/items/map buildouts.
- Repo docs: `docs/adding-content.md`, `docs/map-tile-cdn-plan.md`, `docs/map-reference-foreverchanges.md`
- Historical session detail: `03-Handoffs/archive/2026-09-30-claude-md-archive`
