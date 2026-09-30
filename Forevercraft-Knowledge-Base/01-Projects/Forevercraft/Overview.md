---
type: project
created: 2026-09-30
tags: [forevercraft, overview, dashboard]
status: active
---

# Forevercraft — Overview

Free, fan-made hub site for **World of Warcraft: Forever** (launches 2026-11-04): a race/class/talent planner, a reference section, and guides/blog. Not monetized, not affiliated with Blizzard. Live at forevercraft.app.

The always-loaded, authoritative architecture file is `CLAUDE.md` at the repo root — this vault links to it rather than copying it.

## Dashboard
- Architecture → [[Architecture]] (deep audit: [[Site-Audit-2026-09-20]])
- Roadmap / open items → [[Roadmap]]
- Agent instructions & prompts → `02-Agents/` (local-only)
- Templates → `99-Templates/` ([[Handoff-Template]])

### Active handoffs (local-only, `03-Handoffs/`)
- `2026-09-30-map-ui-cleanup` — map legend icons, mobile auto-close, loot → map link
- `2026-09-30-racials-ui` — Racials reference UI patterns
- `2026-09-30-talent-spell-levels` — talent-granted spell level corrections
- Archive: `03-Handoffs/archive/` (CLAUDE.md history log, map toolbar, spellbooks UI, professions data)

## Tech stack
Next.js 16.3.5 (App Router) · React 19.2 · TypeScript · Tailwind 4 · MDX via `next-mdx-remote` + `gray-matter` · Leaflet (world map) · `sharp` (OG images) · Vercel + Vercel Analytics. No database — static JSON + MDX (Phase 1).

## Branches (from `git branch -a`, 2026-09-30)
Every local branch is **fully merged into `main`**; nothing is actively diverged.
- Most recent: `feature/map-ui-cleanup`, `wip/map-refactor-session`, `feature/ui-polish`, remote `claude/gracious-curie-gj22x9` (all 2026-09-30)
- Older, merged: `feature/privacy-policy`, `feature/professions-data`, `feature/feedback-form`, `feature/crafting-calc`, `design-refresh`
- Candidates for pruning — not done automatically.
