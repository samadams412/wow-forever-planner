---
type: project
created: 2026-09-30
updated: 2026-09-30
tags: [forevercraft, roadmap]
status: active
---

# Roadmap

Back to [[Overview]] · See [[Architecture]].

This is now the living roadmap. `CLAUDE.md` "Open items" is a shorter, older subset of it and does not yet reflect the 2026-09-30 decisions below (KV instead of Postgres+Auth, map paused, Nov 4 extraction deadline). Keep the two in sync when `CLAUDE.md` is next edited.

**Task convention:** [Tasks plugin](https://publish.obsidian.md/tasks/) syntax. Every checkbox carries a priority emoji (🔺 Highest · ⏫ High · 🔼 Medium · 🔽 Low · ⏬ Lowest) plus tags. `📅` is a due date. Items marked *(priority unconfirmed)* got a provisional priority during the 2026-09-30 audit and need an owner's call.

## Launch-critical (hard deadline: Nov 4, 2026)
- [ ] **HARD DEADLINE — Nov 4, 2026 (launch).** Use wow.export to extract full game data: icons, dungeon loot, all items, tooltips. #data #wow-export #launch 🔺 📅 2026-11-04
  - Supersedes the narrower "export FileDataID 1121272 for real dungeon/raid/battleground icons" item, which is listed under Map (paused) below and could be folded into this extraction.
  - Current data is scraped (foreverchanges.pro, wowtbc.gg, talentsforever), not client-extracted; see [[Architecture]] "Data pipelines".
- [ ] Data-refresh passes as beta patches land (expect 2–3+ before launch): run `node scripts/diff-talentsforever.js`, read the vendor changelog by hand, apply by name-match. ⏫ 📅 2026-11-04 #data #recurring #launch *(priority unconfirmed; it was listed under "Recurring" with no priority)*

## Next up
- [ ] Saved/shared builds via **Vercel KV** (simple key-value storage) instead of Postgres + Auth, enabling a browsable "most used builds" list. ⏫ #planner #kv #feature
  - Design notes and open questions in [[Architecture]] "Saved builds". Not started: no KV dependency in `package.json` yet.
- [ ] Update the professions guides (1–300) for optimization. 🔼 #professions #content
  - Interpreted as the **Leveling 1–300** tab data (`data/professions/*` → `data/professions-catalog/*`) and the matching blog write-ups. Confirm that's the intended scope.
- [ ] Review `data/professions-catalog/uncertain.json` (101 low-confidence recipe category guesses, mostly Engineering). 🔼 #professions #data *(priority unconfirmed)*
- [ ] Author the first real guide(s). `content/guides/` does not exist and there are zero guide MDX files; `/guides` currently only links to the profession leveling pages. A real gap against the "hub" positioning. 🔼 #content #guides *(priority unconfirmed)*

## Map (paused)
**Status: paused 2026-09-30.** The feature is live at `/reference/map/[continent]` and nothing is broken; further work is on hold. Git history shows it well past proof-of-concept (see [[Overview]] "World map"): both continents have a full z0–z6 tile pyramid, zone borders/labels, dungeon/raid/battleground entrance markers, flight-master markers, sidebar, and URL-hash state.

Open questions, as they stand:
- **Full-continent tiling** — *resolved for the Forever-era art* (Eastern Kingdoms + Kalimdor, 2026-09-25). Remaining wart: Kalimdor shows the GM Island ADT block as a stray island in the NW corner.
- **Tile storage strategy** — *decided for now*: tiles are committed to git (2,406 `.webp` files, ~69 MB under `public/map/`). `docs/map-tile-cdn-plan.md` (status: not started) says that stops being viable once Classic-era tiles exist (source PNGs are 114–183 MB each); object storage + CDN is the plan for then.

### Paused — future scope when resumed
- [ ] In-game parchment-style map skin (vs. the current map style). 🔽 #map #paused
- [ ] "Classic Era" toggle to switch between the Classic Era map and the current Forever map (needs the CDN plan above first). 🔽 #map #paused
  - A Classic/Forever *pin-set* toggle over SVG art was built and then reverted on 2026-09-24 (`8484ad0`); this is the tile-based successor, not a restart of that.
- [ ] Additional map markers: class trainers, graveyards, mailboxes. 🔽 #map #paused
  - **Illustrative, not exhaustive** — add more marker types (innkeepers, flight paths already done, vendors, etc.) here as they come up.
- [ ] "Where to level" filter. 🔽 #map #paused *(carried over from CLAUDE.md "not yet built")*
- [ ] Selection info card. 🔽 #map #paused *(carried over)*
- [ ] Real dungeon/raid/battleground icon art (client texture atlas FileDataID 1121272; SVG placeholders until then). 🔽 #map #paused #wow-export *(carried over; overlaps the Nov 4 extraction item)*
- [ ] Resolve the duplicate Naxxramas Map row and the Emerald Dream-on-the-map question in `data/map-entrances.json`. 🔽 #map #data #paused *(carried over)*
- [ ] Re-tile Kalimdor with the GM Island 3×3 ADT block excluded. 🔽 #map #paused *(carried over)*

## Small cleanup
Home for small text-content and per-page UI fixes (default 🔽 Low), so they stop getting scattered.
- [ ] Crafting calculator: sort the recipe list alphabetically instead of ascending by rank. 🔽 #crafting-calculator #ui
  - `components/professions/CraftingCalculator.tsx` has no explicit sort on the recipe list (categories and shopping-list rows are already alphabetical), so it follows catalog order.
- [ ] Mobile pass for `DungeonInlinePanel`'s boss/quest two-column sub-layout. 🔽 #mobile #ui *(priority unconfirmed)*
- [ ] Mobile pass for Legacy Perks' touch interactions (`LegacyPerkNode` already uses `lib/active-tooltip.ts` as of 2026-09-30). 🔽 #mobile #ui *(CLAUDE.md: low priority unless the page gets real mobile traffic)*
- [ ] Give `/` (home) its own `metadata` export; it currently inherits the root layout's. 🔽 #seo #text *(from the 2026-09-20 audit; re-verified 2026-09-30)*
- [ ] Add `opengraph-image.tsx` for `/reference/items`, `/reference/dungeons/loot` (+ `[slug]`), and `/items/[itemId]`; they fall back to the static site image. 🔽 #seo *(from audit; re-verified 2026-09-30)*

## Tech debt
- [ ] Migrate `lib/blog.ts` onto the shared `lib/content.ts` loader (it still has its own `fs`/`gray-matter` calls). 🔽 #tech-debt
- [ ] Extend the item normalization (itemId + name references into master `items.json`) to the structures that still embed full item records: dungeon boss/quest loot (`data/dungeons/*.json`, 28 files) and the gathering-profession catalogs. 🔽 #tech-debt #data *(priority unconfirmed; see [[Architecture]] "Data normalization" for what's done)*
- [ ] Decide whether `RacePicker.tsx` stays on disk. Confirmed unused; kept deliberately after an earlier "don't touch it". ⏬ #tech-debt *(from audit; re-verified 2026-09-30)*

## Data & content quality (low priority, from the 2026-09-20 audit)
- [ ] Backfill `classicDescription`/`classicStatus` so "Compare to Classic" works everywhere. 🔽 #data #spellbooks
  - Re-checked 2026-09-30: 954 of 1,017 spells with `classicStatus: "changed"` carry a Classic text; about 63 remain. Much better than the audit's "7+" claim.
- [ ] Visually verify the spellbook mobile bottom-sheet on a real narrow viewport. 🔽 #mobile #spellbooks *(unknown whether it was verified during the later mobile sweeps)*
- [ ] Distinguish directly-observed vs. inferred spell-tooltip sourcing (`TooltipSourceNote` is a strict binary). 🔽 #data #spellbooks
- [x] Priest's Renewed Hope highlights "Heal" when it is really the tail of "Greater Heal", a spell not tracked in `spellbooks.json`. #data #spellbooks 🔽 ✅ 2026-09-30
- [x] Racials "Requires Shadowform / Spirit of Redemption" lines: unresolvable, since neither phrase exists in any current data. Needs a screenshot or a different source if raised again. #data #racials ⏬ ✅ 2026-09-30

## Later
- [ ] Lightweight admin view for editing `/data` and drafting posts without a code editor. ⏬ #admin #later *(priority unconfirmed. It was listed under Phase 2 next to Auth/Postgres but doesn't inherently depend on accounts; not assumed shelved with them.)*

## Shelved / Reconsidered
Kept for the reasoning, not scheduled. Reopen only on an explicit decision. Shelved tasks use the cancelled status (`[-]`) so Tasks queries for open work skip them.

- [-] Auth (NextAuth) + Postgres for account-backed saved builds, a "My builds" page, and cross-device sync. 🔽 #shelved #auth #postgres
  - **Shelved 2026-09-30: opting for a simpler approach.** The need is "share a build and see which builds are popular", which a key-value store covers. Accounts, sessions, a relational schema, migrations, and the security surface they bring were judged more than the feature warrants. Replaced by the Vercel KV item under "Next up".
  - What would bring it back: users asking for private, cross-device build libraries, or per-user data that doesn't fit key-value storage.
- Not shelved, for clarity: the client-side per-device "save builds" feature (`lib/saved-builds.ts`, `localStorage`) already ships and stays.
