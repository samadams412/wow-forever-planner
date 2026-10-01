---
type: project
created: 2026-09-30
updated: 2026-09-30
tags:
  - forevercraft
  - overview
  - dashboard
status: active
---

# Forevercraft — Overview

Free, fan-made hub site for **World of Warcraft: Forever** (launches 2026-11-04): a race/class/talent planner, a reference section, and guides/blog. Not monetized, not affiliated with Blizzard. Live at forevercraft.app.

The always-loaded architecture file is `CLAUDE.md` at the repo root; this vault's [[Architecture]] and [[Roadmap]] are the living docs for decisions newer than it. Where they differ, see the note at the top of [[Roadmap]].

## Dashboard
- Architecture → [[Architecture]] (dated audit, now folded forward: [[Site-Audit-2026-09-20]])
- Roadmap / open items → [[Roadmap]]
- Agent instructions & prompts → `02-Agents/` (local-only)
- Templates → `99-Templates/` ([[Handoff-Template]], [[Guide-Content-Template]])

### Active handoffs (local-only, `03-Handoffs/`)
<!--
  TODO: this should become a Dataview query once the Dataview plugin is enabled.
  Dataview is installed (.obsidian/plugins/dataview/) but NOT enabled: there is no
  .obsidian/community-plugins.json listing it (checked 2026-09-30). Once enabled, replace
  the manual list below with:

  ```dataview
  TABLE created, tags
  FROM "03-Handoffs"
  WHERE status = "active" AND !contains(file.folder, "archive")
  SORT created DESC
  ```

  Query on the `status` frontmatter field (active | archived), not folder alone, so
  reorganizing folders doesn't silently break it; the folder exclusion is a second guard.
  Convention: every handoff note carries `status: active` or `status: archived`
  (Handoff-Template already sets it). Flip it to `archived` in the same step that moves a
  note into archive/.
-->
- `2026-09-30-map-ui-cleanup` — map legend icons, mobile auto-close, loot → map link
- `2026-09-30-racials-ui` — Racials reference UI patterns
- `2026-09-30-talent-spell-levels` — talent-granted spell level corrections
- Archive: `03-Handoffs/archive/` (CLAUDE.md history log, map toolbar, spellbooks UI, professions data)

## What's live (verified against git history and the `app/` tree, 2026-09-30)
| Area | Route(s) | State |
|---|---|---|
| Planner | `/planner/<class>/<buildCode>` | Live, all nine classes; versioned shareable build codes; per-device `localStorage` saved builds; OG image per build |
| Racials, Legacy Perks, Class Spellbooks | `/reference/racials`, `/legacy-perks`, `/class-spellbooks` | Live; spellbooks also embedded in the planner |
| Dungeon level ranges | `/reference/dungeons` | Live (desktop timeline plus a dedicated mobile list) |
| **Dungeon loot** | `/reference/dungeons/loot`, `/[slug]` | Live. 35 `data/dungeons/*.json` files; **28 have loot data**, 7 have none in the beta yet. foreverchanges.pro primary, wowtbc.gg fallback (per dungeon per data type). Quest chains, boss portraits, rewards. Files still embed full item records (see Architecture "Data normalization") |
| Items catalog | `/reference/items`, `/items/[itemId]` | Live: 21,458 items, server-side filters (rarity, item/required level, category, dungeon drop), paginated; individual item pages on demand |
| Professions | `/reference/professions`, `/[profession]` | Live: 8 crafting professions (Recipes / Leveling 1–300 with Items Needed shopping list / Merchant's Favor / Camp tabs, recipe search) and 3 gathering professions (separate page type) |
| **Crafting calculator** | `/reference/crafting-calculator` | **Live**, added 2026-09-28 (`f37f252`); reads the normalized profession catalogs, has OG image, in nav and sitemap. Recipe search is quality-colored. Recipe list (and the default recipe on load / profession swap) is alphabetical as of 2026-10-01 |
| **World map** | `/reference/map/[continent]` | **Live but development paused** (see below) |
| Guides | `/guides` | Pipeline live; **zero guide MDX files**. Page links to the profession leveling pages |
| Blog | `/blog` | 12 posts, including the 7 profession write-ups |
| What's New | `/whats-new` | In Game (per-build patch notes) and On the Site tabs; footer link only |
| Contact, Privacy | `/contact`, `/privacy` | Contact embeds a Google feedback form (2026-09-28) |
| Site chrome | — | Light/Themed mode toggle, reference nav dropdown, SEO pass (sitemap, canonicals, item indexability) 2026-09-24 and 2026-09-29 |

### World map — actual state
Past proof-of-concept. Shipped 2026-09-25: real wow.export tiles in a committed z0–z6 pyramid for **both** Eastern Kingdoms and Kalimdor (2,406 tiles, ~69 MB in git), zone borders and labels, dungeon/raid/battleground entrance markers (grouped by proximity), flight-master markers (from client `TaxiNodes`), sidebar with zone list/search/layer toggles, URL-hash state. 2026-09-30: layer legend icons, mobile zone auto-close, "View entrance on map" link from dungeon loot pages. Linked from the Reference nav and Reference landing. The earlier SVG-art MVP with a Classic/Forever pin-set toggle was **reverted** (`8484ad0`) in favor of the tile approach. Paused 2026-09-30; future scope and open questions are in [[Roadmap]].

### Data normalization — actual state
`data/items.json` is the master item catalog. Crafting-profession catalogs now reference items by `{itemId, name}` instead of embedding records (`e98233c`, 2026-09-29). Gathering-profession catalogs and dungeon loot still embed full records. Details and scope table in [[Architecture]].

## Tech stack
Next.js 16.3.5 (App Router) · React 19.2 · TypeScript · Tailwind 4 · MDX via `next-mdx-remote` + `gray-matter` · Leaflet (world map) · `sharp` (OG images) · Vercel + Vercel Analytics. No database; static JSON + MDX. Saved/shared builds are planned on Vercel KV (decided 2026-09-30, not built), replacing the shelved Postgres + Auth plan.

## Branches (from `git branch -a`, 2026-09-30)
Every local branch is **fully merged into `main`**; nothing is actively diverged.
- Most recent: `feature/map-ui-cleanup`, `wip/map-refactor-session`, `feature/ui-polish`, remote `claude/gracious-curie-gj22x9` (all 2026-09-30)
- Older, merged: `feature/privacy-policy`, `feature/professions-data`, `feature/feedback-form`, `feature/crafting-calc`, `design-refresh`
- Candidates for pruning — not done automatically.
