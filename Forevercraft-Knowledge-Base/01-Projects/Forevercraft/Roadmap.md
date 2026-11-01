---
type: project
created: 2026-09-30
updated: 2026-10-31
tags: [forevercraft, roadmap]
status: active
---

# Roadmap

Back to [[Overview]] · See [[Architecture]] · Sync order: [[Data-Sync-Runbook]].

This is the **only** backlog. Since the 2026-10-31 docs cleanup, `CLAUDE.md` keeps no open-items list of its own; everything it carried moved here (verbatim originals: `03-Handoffs/project-history/2026-10-31-claude-md-archive.md`). Sections dated before 2026-10-31 were not re-verified in that pass unless marked.

**Task convention:** [Tasks plugin](https://publish.obsidian.md/tasks/) syntax. Every checkbox carries a priority emoji (🔺 Highest · ⏫ High · 🔼 Medium · 🔽 Low · ⏬ Lowest) plus tags. `📅` is a due date. Items marked *(priority unconfirmed)* got a provisional priority during the 2026-09-30 audit and need an owner's call.

## Week of 2026-10-07 – 2026-10-14
Added 2026-10-06. Design/scoping work this week; build items are called out as such.

- [ ] **BIS builder — design doc (this week); build scheduled after level-60 data lands.** Design written: [[BIS-Builder-Design]] (with [[Competitor-Analysis-2026-10-06]]). The architecture decisions (reuse URL + localStorage persistence, `itemId`-keyed `data/bis/` schema, custom builder before presets) are settled; rankings and level-specific lists are not, and wait for level-60 data. Don't start the BIS UI this week. #planner #bis #design 🔼 📅 2026-10-14
  - Blocked on level-60 data: per-slot rankings, per-level candidate lists, drop-rate figures, PvP variant scope. See the table in the design doc.
  - Prerequisite regardless of BIS: a slot-mapping table for `data/items.json` (inconsistent slot strings; 9,479 items have `slot: null`).
- [ ] **YouTube-transcript blog pipeline — scope as synthesis + commentary, NOT transcript dumps.** #blog #content #scoping 🔽 📅 2026-10-14
  - **Caveat, do not drop:** a pure recap of a video (transcript → post) is thin, duplicate content, with a high risk of search penalties and low reader value. Every auto-generated post must add something the video doesn't: an analysis, a comparison against Classic or other sources, or the author's own verdict. A "transcript dump" script should not be built as a shortcut.
  - Scope for now: a pipeline that drafts a synthesis from a transcript for an author to edit, with a required commentary section. Not a publish-on-ingest job.
- [ ] **Profession leveling guide refresh (1–300), cross-referenced against other sites — split into one session per profession.** #professions #content #large 🔼 📅 2026-10-14
  - Too large for one pass. Each profession needs its own session: source cross-referencing, recipe-by-recipe checks, and the 1–300 curve. Start with one profession to set the template, then repeat. Expect 8 crafting + 3 gathering professions as separate work items.
  - Overlaps the existing "Update the professions guides (1–300)" item under Next up. Treat that item as this one.
- [ ] **Class guide enhancements: useful macros + a "changed from Classic" blog-style section per class.** #guides #content #class 🔼 📅 2026-10-14
  - Per class: a short macros section (useful macros only, each one explained) and a "changed from Classic" section written as a blog post, not a table. Uses `classicStatus`/`classicDescription` data already in `spellbooks.json`.
  - Depends on the Classic-description backfill (see Data & content quality), so expect gaps for the spells still missing Classic text.

## Partially built (audited 2026-10-31 against the code and data)
Every feature that is live but incomplete, with its real state. Re-check when one moves.

- [ ] **Gear planner (`/gear/<class>`): Warrior only, level 30 only.** `GEAR_PLANNER_CLASSES = ["warrior"]`, `GEAR_LEVELS = [30]` (`lib/gear-config.ts`); only `public/gear-pool/30/warrior.json` exists. Presets are generated for all 9 classes (`data/gear/presets/*.json`), pending the owner's review. Missing: pools and pages for the other 8 classes (`node scripts/build-gear-pool.js <class>` + add to `GEAR_PLANNER_CLASSES`), nav link, sitemap, `robots` (disallow `/gear/*?`), OG image, set name / race / talents in the share link, other levels. ⏫ #gear-planner
  - Data gaps: the "of Eluding" suffix effect (ItemEffect 213334 needs the ItemEffect, Spell and SpellEffect exports; the item page says "not decoded yet"), 50 "Restored …" nested-tree items, 47 tree items not in our catalog. 🔽 #gear-planner #data
  - 46 preset slots moved to City of Dalaran BoE drops in the 70707 item pull (kept; see `03-Handoffs/data-pipeline/2026-10-31-foreverchanges-item-sync.md`). 🔽 #gear-planner
- [ ] **Popular builds: collection only.** Share/save/open events are recorded (`/api/builds/track`, daily rollup cron) but nothing reads them; no Popular Builds UI. The reader must rank by the per-day HyperLogLogs, not the raw `builds:agg:*` counts (one IP can add 50/day). ⏫ #planner #kv
- [ ] **Guides: `/guides` has zero guides.** `content/guides/` doesn't exist; the page links to profession leveling pages. 🔼 #content #guides
- [ ] **Profession leveling 1–300: 2 of 11 verified.** `LEVELING_VERIFIED_PROFESSION_IDS` = Blacksmithing, First Aid; every other path renders under the "under construction" overlay (`LevelingUnderConstruction`). Skinning has no leveling data at all, and First Aid has no Merchant's Favor data (that tab shows "coming soon"). Review each path, then add its id. Decide whether the "Browse" links on the in-the-works cards stay. 🔼 #professions
- [ ] **What's New "In Game" stops at build 70291.** `data/patch-notes/` has no entry for 70374, 70425, 70630, the 26–27 Oct racial pass or the 28/30 Oct hotfixes. Entries need an official Blizzard source (`sourceUrl` only for a Blizzard forum post; dev notes quoted verbatim). 🔼 #whats-new #content
- [ ] **World map: paused, 6 marker categories stubbed.** Town services, graveyards, rare elites, library books, trade camps, boats & zeppelins render greyed with a `blockedReason` (`lib/map-layers.ts`). Entrances: 32 of 52 placed. The client extract behind map data is build 70009; whether it changed since is unknown. Touch users only see "No data" for blocked rows (native `title`); towns aren't in sidebar search; layer rows are 30px (under 44px). See "Map (paused)" for the rest. 🔽 #map
- [ ] **Dungeons not open in beta:** drowned-city, kroldok-stronghold, alcaz-prison, blackmaw-hold, shapers-terrace have roster stubs only (no loot, no quests); onboarding steps are in `03-Handoffs/data-pipeline/2026-10-14-build-70374-data-refresh.md`. New-in-Forever dungeons without extracted maps show "Map coming soon". 🔼 #dungeons #launch
- [ ] **Raid comp: stacking rules still `estimated`** in `data/raid-buffs.json`: `minor-armor`, `attack-power-reduction`, `hit-reduction`, `armor-proc`, `shaman-air-totems`, `shaman-water-totems`, `hunter-pets`, and the pet-sourced effects (Furious Howl, Dust Cloud, Demoralizing Screech, Blood Pact). Lead not modelled: Furious Howl vs Battle Shout. Deferred: optional linked talent build per slot (needs a new link version), a phone coverage summary. 🔽 #raid-comp
- [ ] **BIS builder (level 60): design only.** [[BIS-Builder-Design]]; scheduled after level-60 data. The level-30 gear planner above is its first slice. 🔼 #bis
- [ ] **Data pipeline automation: design only.** See [[Data-Sync-Runbook]] "Not automated yet". Also: **promote the talentsforever apply script into `scripts/`** (every sync so far used a scratchpad one-off), and fix the diff scripts' blind spots (talent tree moves, `spellbooks.*.icons`, per-ability racials, `asis`, `class_abilities`; item tooltips truncated at 160 chars, `sources.json` and `p/d/v/t/o` not diffed). ⏫ #data #automation

## Review later (owner unsure, 2026-10-31)
- [ ] Paladin spellbook: Blessing of Light, Greater Blessing of Light, Salvation, Mass Salvation and Revoke are gone as of the 30 Oct hotfix data, unexplained. Raid comp dropped `blessing-of-light` and `salvation`; restore them if the spells come back. 🔽 #data #raid-comp
- [ ] Leader of the Pack and Moonkin Form both give plain crit since 30 Oct; whether they stack is unknown, so they stay separate effects with no `onlyOneCounts` set. 🔽 #raid-comp

## Known issues (moved from CLAUDE.md "Open items", 2026-10-31)
- [ ] **`lib/quest-detail.ts` reads `data/quests/detail/<variable>.json`**, the runtime-variable path the standing rule forbids (Turbopack warns the pattern matches 10,420 files; the build still passes). Fix with a generated literal-path map or a route-scoped `outputFileTracingExcludes`, then recheck `.nft.json` sizes. ⏫ #tech-debt #vercel
- [ ] **`lib/dungeon-loot.ts` reads the whole `data/dungeons/` directory**, tracing ~4.9 MB of non-JSON files (map images, `Classic-Classic.lua`) into 10 functions. Move them out or exclude them from traces. See [[Weekly-Audit-2026-10-06]] §3.4. 🔼 #tech-debt #vercel
- [ ] **Item quality colors in Light mode are low contrast:** Uncommon `#1eff00` is about 1.4:1 on `#f4f4f5`. Fix in the quality-color tokens (Light variants per quality, like Common), not per component. 🔼 #a11y #ui
- [ ] **Sell-price-only "changed" items stay indexable:** `isIndexableItemStatus` (sitemap, robots) reads the stored status, not `displayStatus` (104 items). Decide which one it should use. 🔽 #seo
- [ ] **Design the November data layout** (items / loot / tooltips: per-item shards vs Postgres) before importing the full wow.export dataset; the single 10 MB `data/items.json` won't scale. ⏫ #data #launch
- [ ] **Vercel function sizes:** 24.2 MB each, but the dashboard's uniform sizes don't match local traces; cause unexplained (`03-Handoffs/infrastructure/2026-09-30-vercel-function-size.md`). 🔽 #vercel
- [ ] **`check-dungeon-drift.js`** doesn't cover `.mapdata.json` / `.quests.json` yet. 🔽 #data
- [ ] `app/not-found.tsx` has a "TODO: change logo". ⏬ #ui

## Launch-critical (hard deadline: Nov 4, 2026)
- [ ] **HARD DEADLINE — Nov 4, 2026 (launch).** Use wow.export to extract full game data: icons, dungeon loot, all items, tooltips. #data #wow-export #launch 🔺 📅 2026-11-04
  - Supersedes the narrower "export FileDataID 1121272 for real dungeon/raid/battleground icons" item, which is listed under Map (paused) below and could be folded into this extraction.
  - Current data is scraped (foreverchanges.pro, wowtbc.gg, talentsforever), not client-extracted; see [[Architecture]] "Data pipelines".
- [ ] Data-refresh passes as beta patches land (expect 2–3+ before launch): follow [[Data-Sync-Runbook]]. ⏫ 📅 2026-11-04 #data #recurring #launch *(priority unconfirmed; it was listed under "Recurring" with no priority)*

## Next up
- [ ] **Data pipeline automation: `npm run sync-items` / `npm run sync-dungeons`** (fetch, archive, diff, build, verify in one command), diff-script fixes, shared verification + sentinels, fail-loudly `dungeon_overrides.json`, weekly drift check. Design only so far: `03-Handoffs/data-pipeline/2026-10-06-pipeline-automation-design.md`. Do phases 1–2 (diff-script fixes, `verify-data.ts`) before the next beta patch. ⏫ #data #automation #pipeline *(added 2026-10-06; priority provisional)*
- [ ] Saved/shared builds via **Vercel KV** (simple key-value storage) instead of Postgres + Auth, enabling a browsable "most used builds" list. ⏫ #planner #kv #feature
  - Design notes and open questions in [[Architecture]] "Saved builds". Not started: no KV dependency in `package.json` yet.
- [ ] Update the professions guides (1–300) for optimization. 🔼 #professions #content
  - Interpreted as the **Leveling 1–300** tab data (`data/professions/*` → `data/professions-catalog/*`) and the matching blog write-ups. Confirm that's the intended scope.
- [ ] Review `data/professions-catalog/uncertain.json` (95 low-confidence recipe category guesses as of 2026-10-31, 77 of them Engineering). 🔼 #professions #data *(priority unconfirmed)*
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
- [x] Crafting calculator: sort the recipe list alphabetically instead of ascending by rank. 🔽 #crafting-calculator #ui *(done 2026-10-01)*
  - Done: `components/professions/CraftingCalculator.tsx` sorts each profession's recipes once (a `useMemo` at the top of the component, `localeCompare` with `sensitivity: "base"`, stable so same-name recipes keep catalog order). The drop-down uses the sorted copy (the first-load/profession-swap default was changed to catalog order, see the next item). `recipesByOutput`/`choices` still use catalog order (`catalogProfessions`) so plan calculations are unchanged.
- [x] Crafting calculator: default to the first catalog recipe (simplest/lowest rank) on first load and on profession switch, while the drop-down stays alphabetical. 🔽 #crafting-calculator #ui *(done 2026-10-01)*
  - Done: `defaultRecipeId()` in `components/professions/CraftingCalculator.tsx` reads `catalogProfessions[...].recipes[0]` (original data order), not the sorted copy. The selection is keyed by recipe id (`<profession>:<catalog index>`), so sorting can't change which recipe is selected. No URL/saved-state selection exists yet; if one is added, it should win over this default.
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
