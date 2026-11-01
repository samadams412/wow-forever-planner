---
type: project
created: 2026-09-30
updated: 2026-10-31
tags:
  - forevercraft
  - overview
  - dashboard
status: active
---

# Forevercraft — Overview

Free, fan-made hub site for **World of Warcraft: Forever** (launches 2026-11-04): a talent planner, raid and gear planners, a reference section, and guides/blog. Not monetized, not affiliated with Blizzard. Live at forevercraft.app.

## Start here (new session)
Read in this order:
1. **`CLAUDE.md`** (repo root, always loaded): architecture rules and gotchas that are true now.
2. **This note**: what's live and where everything else is.
3. **[[Roadmap]]**: the only backlog, including every partially built feature with its real state.
4. **[[Data-Sync-Runbook]]**: the order of operations for the talentsforever and foreverchanges syncs. Use it for any data refresh.
5. The latest handoff for the area you're touching, in `03-Handoffs/<category>/` (local-only, newest date first).

At the end of a substantive session, write a handoff with [[Handoff-Template]] into the matching `03-Handoffs/<category>/` folder, put new backlog items on the [[Roadmap]], and fix the [[Data-Sync-Runbook]] if a sync taught you something.

## Where things live
- Architecture, current rules: `CLAUDE.md`. Deeper background and the build-tracking design: [[Architecture]].
- Backlog: [[Roadmap]]. Sync order: [[Data-Sync-Runbook]].
- Feature designs: `04-Features/` ([[BIS-Builder-Design]]).
- Dated audits (snapshots, not maintained): [[Site-Audit-2026-09-20]], [[Performance-Audit-2026-10-03]], [[Database-Migration-Tradeoffs-2026-10-03]], [[Site-Overview-2026-10-06]], [[Weekly-Audit-2026-10-06]].
- Handoffs (local-only, gitignored): `03-Handoffs/` by category: `data-pipeline/`, `dungeons-loot/`, `gear-planner/`, `infrastructure/`, `items/`, `maps/`, `planning/`, `project-history/` (CLAUDE.md archives: 2026-09-30 and 2026-10-31), `quests/`, `reference-ui/`, `talents/`. Notes with no matching category sit in the folder root (raid comp, Beta Wrapped, the 10-08 audit fixes, the 10-31 docs cleanup).
- Templates: `99-Templates/` ([[Handoff-Template]], [[Guide-Content-Template]]). Agent prompts: `02-Agents/` (local-only).

## What's live (checked 2026-10-31)
| Area | Route(s) | State |
|---|---|---|
| Talent planner | `/planner/<class>/<buildCode>` | All 9 classes; versioned build codes (v8); talent order; local saved builds; per-build OG image. Data: talentsforever 2026-10-30 (build 70630 + 28/30 Oct hotfixes) |
| Raid comp | `/raid-comp` | 10/20/40 rosters, buff/debuff coverage from `data/raid-buffs.json` (47 effects), share link, saved rosters |
| Gear planner | `/gear/warrior` | **Partial**: Warrior, level 30 only; not in nav or sitemap (see [[Roadmap]]) |
| Reference | `/reference/racials`, `/legacy-perks`, `/class-spellbooks`, `/dungeons`, `/dungeons/loot/[slug]`, `/professions/[profession]`, `/crafting-calculator`, `/items`, `/map/[continent]`, `/quests` | Live. 35 dungeon files (30 with loot, 5 not open in beta); items catalog 21,809 (foreverchanges 1.60.1.70707); 5,210 quests; map paused |
| Items, quests | `/items/[itemId]`, `/quests/[questId]` | Item pages rendered on demand; quest pages prerendered |
| Beta Wrapped | `/beta-wrapped` | Dated archive page; homepage banner + footer link |
| Guides | `/guides` | **No guides yet** (`content/guides/` doesn't exist) |
| Blog | `/blog` | 13 posts |
| What's New | `/whats-new` | In Game tab stops at build 70291; On the Site changelog |
| Build tracking | `/api/builds/track`, daily rollup cron | Collecting only; no Popular Builds UI |

## Tech stack
Next.js 16.3.8 (App Router) · React 19.2 · TypeScript · Tailwind 4 · MDX (`next-mdx-remote` + `gray-matter`) · Leaflet (world map) · `motion` 14.2.0 (Beta Wrapped only) · Upstash Redis via the Vercel Marketplace (build tracking) · Vercel. Game data is static JSON; no relational database.
