---
type: project
created: 2026-09-30
tags: [forevercraft, roadmap]
status: active
---

# Roadmap

Back to [[Overview]] · See [[Architecture]]. Open items mirror `CLAUDE.md` "Open items"; if they diverge, CLAUDE.md wins.

## Open items (as of 2026-09-30)
- Export FileDataID 1121272 from wow.export; crop real dungeon/raid/battleground icons (SVG placeholders until then)
- Resolve duplicate-Naxxramas-Map-row and Emerald-Dream-on-the-map questions in `data/map-entrances.json`
- Review `data/professions-catalog/uncertain.json` (101 low-confidence category guesses)
- Migrate `lib/blog.ts` onto `lib/content.ts`
- Re-tile Kalimdor excluding the GM Island ADT block
- Mobile pass: `DungeonInlinePanel` two-column layout, Legacy Perks touch interactions

## Not yet built (map)
"Where to level" filter · selection info card · in-game/parchment style toggle · Classic-era map toggle (CDN plan: `docs/map-tile-cdn-plan.md`)

## Content gaps (from [[Site-Audit-2026-09-20]] §3c/§4, dated — re-verify)
- No guides authored yet (pipeline ready) — a real gap against the "hub" positioning
- Profession hero images missing on disk
- `opengraph-image.tsx` missing for items/dungeon-loot pages
- Partial `classicDescription` backfill limits "Compare to Classic"

## Recurring
- 2–3+ data-refresh passes before launch (2026-11-04): run `node scripts/diff-talentsforever.js`, read vendor changelog by hand.

## Later — Phase 2
Auth (NextAuth), Postgres, account-backed saved builds (distinct from existing client-side `lib/saved-builds.ts`), admin content editor.
