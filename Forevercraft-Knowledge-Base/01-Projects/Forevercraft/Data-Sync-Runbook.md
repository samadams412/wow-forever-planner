---
type: project
created: 2026-10-31
updated: 2026-10-31
tags: [forevercraft, data-pipeline, runbook]
status: active
---

# Data sync runbook

Back to [[Overview]] · Backlog: [[Roadmap]] · Architecture: [[Architecture]]

The canonical order of operations for the two recurring data syncs. It replaces
the scattered notes that used to live in CLAUDE.md ("Daily data-diff workflow",
the `/reference/items` pull notes), [[Architecture]] "Data pipelines" and the
per-session handoffs. When a sync teaches you something new, fix it **here**,
then mention it in that sync's handoff.

Both syncs: run every script from the repo root, never hand-edit a generated
file (`data/items.json`, `data/dungeons/*`, `data/professions-catalog/*`,
`data/quests/*`, `data/spellbooks.json`, `data/talent-spell-links.json`,
`data/gear/presets/*`, `public/gear-pool/*`), and finish with `npm test`,
`npx tsc --noEmit`, `npm run lint` and `npm run build` (the build runs
`prebuild`: `check-raid-buffs.js` and friends). Restart a running dev server
afterwards: `lib/items.ts` caches the catalog per process.

---

## 1. talentsforever.com talent / spell sync

**Trigger:** a new `data/sources/talentsforever/talentsforever-YYYY-MM-DD.json`
(a verbatim save of `https://talentsforever.com/data.json`). Snapshots are
immutable: a new pull is always a new dated file.

**Inputs:** the new snapshot and the previous one (the newest older dated file
in that folder). **Outputs:** `data/talents/<class>.json`, `data/racials.json`,
`data/legacy-perks.json`, `data/spellbooks.json`,
`data/talent-spell-links.json`, `data/raid-buffs.json` (hand-curated),
`lib/build-code.ts` (only on a tree-shape change), the diff in
`data/sources/talentsforever/diffs/`.

### Steps
1. **Diff:** `node scripts/diff-talentsforever.js [old] [new]` (no arguments =
   the two newest snapshots). Writes `diffs/<old>_to_<new>.{md,json}`. Read all
   of it, then read the vendor's `changelog` array by hand.
2. **Cover the diff's blind spots by hand:**
   - **Tree moves are invisible.** The script matches talents by name and
     reports a talent that changed tree as a row/col change in its *old* tree
     (2026-10-30: Holy Conduit, Divine Intellect, Unyielding Faith, Furor,
     Heart of the Wild). Compare each tree's membership yourself.
   - **Renames look like remove + add.** Check every added talent's
     `classic.renamed` and the vendor's hotfix notes (2026-10-30: Twist of
     Light → Unsealed Wrath was only on talentsforever's hotfix sheet).
   - `spellbooks.<Class>.icons` aren't diffed; `racials` is reported only as
     "changed" (diff per race and ability name); talent `asis` notes and
     per-class `class_abilities` aren't diffed (we don't ingest
     `class_abilities` or the `hotfix` field).
3. **Apply talents.** Match by name across the whole class (never array index;
   Legacy Perks by tree + row + col). Field mapping: `row→tier`, `col`,
   `max→maxRank`, `desc→ranks`, `icon`, `passive`, `cost` (delete if absent),
   `req` → `prereq: {id, ranks: <required talent's max>}`, `classic.status`
   (`same→unchanged`) for both `status` and `classic.status`; when any classic
   field changed, rewrite the whole `classic` block (`row→tier`, `max→maxRank`,
   `renamed→renamedFrom`, keep `replaces`, keep an existing `note`). New
   talents: id `<treePrefix>_<snake_name>`, `confidence: "confirmed"`. A talent
   that moved tree or was renamed gets a new id.
   - **Gap: the apply script is not in the repo.** Every sync so far used a
     scratchpad one-off (`apply-talent-diff.js`, rewritten 2026-10-31 as
     `apply-talent-sync.js`, which handles class-wide name matching, renames,
     tree moves and prints an id map). It is gone with each session. Until it is
     promoted to `scripts/`, validate any rewrite first by applying the
     *previous* snapshot to HEAD: it must reproduce every talent file byte for
     byte.
4. **Build codes, if any tree's membership or order changed** (`lib/build-code.ts`):
   - bump `CURRENT_VERSION`;
   - add `V<old>_TREE_ORDER` with each affected tree's tier/col-sorted ids
     **generated from HEAD's talent files**, not typed by hand. A pure order
     swap counts (2026-10-30 Hunter BM: Pathfinding and Improved Revive Pet,
     though talentsforever said Hunter links were unaffected, because its codec
     isn't positional);
   - add `LEGACY_ID_TRANSLATION` entries: removed → `null`, renamed or moved
     tree → new id (points carry over);
   - wire the new snapshot into `decodeBuild`'s merge chain (older snapshots of
     the same tree win) and the legacy fallback;
   - add a decode test for the old version in `lib/build-code.test.ts`.
   - **Pitfall:** `LEGACY_ID_TRANSLATION` is one table for all classes, so a
     removed id can equal a live id in another class (Warrior's removed
     `protection_toughness` is Paladin's Toughness). `translateId()` never
     translates an id the class still has; keep it that way.
5. **Racials / Legacy Perks:** apply by race + ability name / tree + row + col.
   `legacy-perks.json` doesn't round-trip through `JSON.stringify`; edit strings
   in place.
6. **Regenerate:** `node scripts/build-spellbooks.js` (newest snapshot by
   default), then `node scripts/build-talent-spell-links.js`. Compare against a
   rebuild from the *old* snapshot to see the real spell changes, ignoring the
   `source`/`src` strings.
7. **Bump the planner's snapshot import** in
   `components/planner/TalentTreeGrid.tsx` to the new file.
8. **Raid comp:** `node scripts/check-raid-buffs.js` (names only), then re-read
   every effect's Forever text for changed numbers and scope, remove effects
   whose spells left the spellbook (and fix `lib/raid-comp.test.ts`), and update
   `build` in `data/raid-buffs.json`.

### Done when
The diff (and its blind spots) is reviewed; a field check of every talent
against the new snapshot (tree, tier, col, maxRank, ranks, icon, passive, cost,
status, classic, prereq) shows 0 mismatches with no duplicate positions or ids;
build codes are bumped if needed, with a test; the derived files are
regenerated; the four checks pass; a handoff is in `03-Handoffs/talents/`.

---

## 2. foreverchanges.pro item sync

**Trigger:** foreverchanges publishes a new build (check `forever_build` in
`https://foreverchanges.pro/items/new.json`; the page is
`https://foreverchanges.pro/items?level=all`).

**Inputs:** `https://foreverchanges.pro/items/{new,changed,same,missing,sources}.json`.
**Outputs:** `data/sources/foreverchanges/items/*` plus `archive/` and `diffs/`,
then every consumer in step 6.

### Steps
1. **Archive** the current five files to
   `data/sources/foreverchanges/items/archive/<forever_build>-<forever_build_date>/`.
2. **Fetch** the five files over them, verbatim (`curl`). Check that all five carry
   the same `forever_build`.
3. **Diff:** `node scripts/diff-foreverchanges-items.js` (no arguments = newest
   archive vs live files; or `<oldDir> <newDir>`). Read every section. It
   truncates tooltips at 160 characters and doesn't diff `sources.json` or the
   `p/d/v/t/o` fields; write a full report by hand if those matter.
4. **Possible duplicates** (the "⚠" section: a new id whose name matches an
   existing item). The profession recipe resolver
   (`scripts/lib/profession-item-resolver.js`) is first-match-wins and reads
   `new.json` first, so a duplicate silently steals the recipe link. Compare
   the two records. If the new one is a re-issued id, add
   `newId → {canonicalId, name}` to `items/known-duplicate-ids.json` (21
   entries as of 2026-10-31). If it's a genuinely different item that happens to
   share a name (2026-10-31: Serrated Knife), leave it. Don't change the resolver's
   precedence: a blanket "prefer Classic" rule relinked correct Forever recipes
   (Crusader's Boots, Radiant Gloves).
5. **Build the catalog:** `node scripts/build-items.js` (count = previous + added
   − removed − newly skipped duplicates).
6. **Propagate**, in this order:
   1. **Renames.** `data/professions/*.json` (raw recipes, leveling and
      Merchant's Favor) store item **names only**. For every rename whose old
      name no longer exists anywhere in the catalog, rename it there too, and in
      `scripts/lib/profession-categories/*` name lists. Rename whole JSON string
      values only (`Name`, `Nx Name`, `Namex2`), never substrings. Skip
      ambiguous renames (old name still on another item).
   2. `node scripts/check-dungeon-drift.js` (read-only, exit 1 on drift), then
      `node scripts/fetch-foreverchanges-dungeon-loot.js --slugs=<printed list>`
      for whatever drifted. Re-pulling is safe: `build-dungeons.js` always takes
      the catalog's record for an item it has.
   3. `node scripts/build-dungeons.js` (bakes item records into all 35 files).
   4. `node scripts/build-professions.js` and
      `node scripts/build-gathering-professions.js`.
   5. `node scripts/build-quests.js` and
      `node scripts/build-quest-dungeon-index.js` (quest shards bake reward
      items).
   6. `node scripts/report-item-stat-coverage.js` (equipment must stay at 0
      unparsed lines; a test enforces it).
   7. `node scripts/build-gear-enchants.js`,
      `node scripts/build-gear-presets.js`,
      `node scripts/build-gear-pool.js warrior` (one per class in
      `GEAR_PLANNER_CLASSES`).
7. **Removed items** drop out with the feed (their `/items/<id>` page 404s).
   Check that no dungeon, quest, profession, gear file or code references them
   (`git grep` the ids, excluding `data/sources/`). On foreverchanges some are
   "Hidden item" pages.
8. **Compare generated outputs with HEAD:** walk every `itemId` in
   `data/dungeons/*` and `data/professions-catalog/*` for ids gone, ids added
   and recipe/reagent links whose id changed. Recipe names repeat, so key by
   recipe *and* position, not by name alone. Diff preset loadouts per variant
   and side. Every change should trace back to the item diff.
9. **Spot-check** a sample of changed and new items against
   `https://foreverchanges.pro/item/<id>` (name plus every tooltip line).

### Done when
The diff is reviewed in full; duplicates and removals are decided; the catalog
count adds up; renames resolve; drift reports 30/30 raw files matching; every
consumer is rebuilt and the HEAD comparison is explained; the spot-checks
match; the four checks pass; a handoff is in `03-Handoffs/data-pipeline/`.

---

## Not automated yet
One command per pipeline (`npm run sync-items` / `sync-dungeons`), diff-script
fixes and a `verify-data.ts` are designed but not built:
`03-Handoffs/data-pipeline/2026-10-06-pipeline-automation-design.md`. Tracked on
the [[Roadmap]], along with promoting the talent apply script.
