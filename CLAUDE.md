@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever — a race/class/talent
planner, a reference section, and guides/blog content. Not affiliated with
Blizzard, not monetized. This file is the living architecture reference for
the codebase; it's kept in sync with what's actually implemented (verified
against real files, not assumed from an earlier description) rather than
serving as a fixed project brief.

## Session handoff — 2026-09-24/25 (What's New rebuilt)

`/whats-new` went from a shelved placeholder to an active, nav-linked
feature; full structure in the "What's New (/whats-new)" architecture note
below (search for it). Highlights: Blizzard's September 24 notes are on the
forum at https://us.forums.blizzard.com/en/wow/t/2360696 (readable as
`.json` -- the first post's `cooked` HTML), which is how the full text was
finally read; the earlier two "patch-note sessions" were the same build
(1.60.1.70009), not two builds. Known-open from this work: Bastion/Focused
Rage swap and Crusade are in the notes/client but not both in our data (see
the corrected item 4 below), Tauren Cultivation's level requirement and
Retribution Aura/Thorns spell-power scaling are shown on /whats-new but not
edited into racial/spell tooltip text (no confirmed in-game tooltip wording
to copy). Not verified in a browser.

## Session handoff — 2026-09-24 (talentsforever 09-24 pull + Blizzard patch notes)

New snapshot `data/sources/talentsforever/talentsforever-2026-09-24.json`
(beta build 1.60.1.70009), diffed against 09-21
(`diffs/2026-09-21_to_2026-09-24.{md,json}`) and applied. **The full Blizzard
patch-notes text was never pasted into this session** (the placeholder was
left in the prompt), so every patch-note item was checked against the pull
and the prompt's own summary of it, not the primary source itself.

**Step 2 reconciliation:**
1. *Mangle -> Primal Bite*: already in the pull as an in-place rename.
   Applied (`feral_primal_bite`, Bite text, icon `ability_racial_cannibalize`),
   plus Ferocity/Berserk text, the spellbook entry (Mangle removed, Primal Bite
   added via `build-spellbooks.js`) and `talent-spell-links.json` (0 stale
   "Mangle" references remain).
2. *Primal Fury -> Blood Frenzy*: Druid only (not Warrior). Applied with the
   pull's own icon `ability_ghoulfrenzy` and its Classic block (Feral 4.3).
3. *Improved Holy Strike removed*: applied, build-code v3 (above). Holy
   Strike baseline (10 sec CD; 25/29/32/36/39/43/46/50% weapon damage) came
   through `build-spellbooks.js` and matches the notes exactly.
4. *Bastion / Focused Rage*: **CORRECTION -- this is NOT a no-op.** An
   earlier version of this note said our rows already matched. They
   don't: Blizzard's notes SWAP the two (Bastion is Row 5, Focused Rage is
   Row 6 now; after the swap Focused Rage comes first, per the developer
   note "give players Focused Rage sooner"). The 09-24 pull does not have
   the swap yet (foreverchanges says the client data lags too), so it is
   deliberately NOT applied to `data/talents/warrior.json` -- the exact
   post-swap columns aren't known, and forcing it early risks a wrong
   layout plus another build-code bump. Apply it when a pull carries it (it
   needs a frozen Warrior Protection order in `lib/build-code.ts`). It is
   listed under "Not yet reflected in our planner data" on /whats-new.
5. *Elemental Fury / Alacrity swap*: applied incl. prerequisite chain
   (Alacrity 3.3 -> Call of Thunder 4.3 -> Fury 6.3); build-code v3.
6. *Eureka!*: **there was never per-class variant scaffolding** -- Gnome's
   Eureka! and Expansive Mind are each one prose string in
   `data/racials.json`; nothing to collapse. Text updated to the new wording,
   which still has a separate healer clause (so it is not fully class-flat).
   Expansive Mind untouched.

**Also applied (in the pull, not listed in the task):** Paladin Retribution
**Crusade removed** (same build-code handling), Holy Strike/Light's Vigil/etc.
text, Lava Burst, Strider Kick, Wake of Fire, Hot Streak, Devouring Contagion
wording, class-abilities.json (Holy Strike 10 sec, Slam 18 sec), Touch of the
Grave text, Legacy Perk Reagent Economy text, plus several spellbook value
changes (Lightning Bolt, Windfury Totem range, etc.) that came through the
regenerated `data/spellbooks.json`. Five single-rank spells (Greater Blessing
of Light, Multi-Shot, Scorpid Sting, Prayer of Shadow Protection, Arcane
Brilliance) lost their "Rank 1" label in the vendor data (now `rank: null`).

**Fixed:** `scripts/build-talent-spell-links.js` was hardcoded to the
2026-09-18-v3-spelldesc snapshot, so every non-talent spell's Ctrl-hold text
was frozen at that pull. Now reads the newest plain-dated snapshot.

**Not in this pull (patch-note items to expect in a later one):** Retribution
Aura / Thorns spell-power scaling, Tauren Cultivation's per-herb level
requirement.

**Deliberately not applied -- pre-existing, still open:** Shaman Restoration
Totemic Focus (now 1.3) / Tidal Mastery (now 4.1) position swap. The vendor
has had it since 09-18; the 09-18 ingest deferred it "pending visual
verification" and it was never resolved, so our data still has the old
positions (Tidal Mastery 1.3, Totemic Focus 4.1). Applying it needs another
build-code frozen-order entry for Restoration.

**Item-data addendum (same session, separate commit):** the bulk item export
(`data/sources/foreverchanges/items/*.json`) was stale against the live site,
which tracks beta build 1.60.1.70009. New `scripts/fetch-item-refresh.js`
re-fetches live pages for a scoped set (all Wizard Oils, all 132 wands, all
269 dungeon-quest items -- 406 fetches), and writes only items whose tooltip
or item level differs to `data/sources/foreverchanges/item-refresh-<date>.json`.
`scripts/lib/fc-item.js` (`applyItemRefresh`) merges every such file onto the
raw record (x/l) so a rebuild can't revert it -- the fix for the hall-of-thanes
class of problem, not a hand-edit of generated JSON. Result: 20 real changes --
Minor/Lesser/plain Wizard Oil now 8/16/24 (Brilliant unchanged, as the notes
say), 8 wands (Ember, Umbral, Ivory, Wizard's Hand, Glowstar Rod, Dragon
Finger, Lunar, Deepblaze) with changed stat lines, and 9 quest rewards with
changed stats. **Zero item-level (`l`) changes across all 406 items**, so the
patch note's "quest rewards updated to the correct item level" line is not
reproduced as item levels in the live data; the changed quest-reward stats
above are the closest observable effect and it is unconfirmed they correspond
to that line. No wand tooltip states a spell-damage scaling clause, so
"wands no longer gain damage from spell damage" needed no text edit.
**Latent bug fixed in `scripts/lib/fetch-item-tooltip.js`:** its line regex
required `it-line it-<colour>">` and silently skipped any line with an extra
class (`it-add`, i.e. exactly the lines the beta added). The 2026-09-23
`item-tooltip-overlay` (only for "same" items) was built with the old regex;
it probably rarely hit this but was not re-checked.

**Verification gap:** the browser extension was not connected, so structural
changes were verified by `tsc`, build-code round-trip tests, and dev-server
HTTP/SSR checks only -- **not visually** (connector arrows for the new
Elemental prerequisite chain, Holy/Ret layout after the removals).

## Session handoff — 2026-09-24 (world map MVP reverted)

**Reverted, not lost:** the two sessions immediately prior to this one built
a single-zone world map MVP -- `/reference/map`, `components/map/*`
(`ZoneMap`, `DungeonPinMarker`, `WorldMapZone`, `zoneShapes`),
`data/dungeon-locations.json`, `lib/dungeon-locations.ts` -- originally-
drawn SVG zone art (Loch Modan, then corrected to Badlands once the
Uldaman/Loch Modan pairing was found to be wrong), a dungeon-entrance pin
with click-through to its loot page, and a Classic/Forever pin-set toggle.
All of it was removed in this session at explicit request: the SVG-zone-art
approach isn't the direction being pursued, not a quality problem with what
was built. Every file the feature touched was a pure addition (confirmed via
`git diff --stat` across the whole range before deleting anything), so the
revert was a clean `git rm`, not a partial unwind -- no other file was ever
edited to reference the feature, confirmed by grepping the full codebase for
every identifier and route path before committing this revert. The commits
themselves (`b0b6685`..`b10e7bc`) are untouched in git history if any of
that art or the toggle mechanism turns out to be worth reviving later.
**This gap is deliberate, not an oversight** -- the map feature is being
reconsidered with a different approach/tooling, not currently in progress.
The existing "foreverchanges.pro/map recon" architecture note further down
this file (real 2D tile map via Leaflet, real coordinate/POI data) is still
accurate background for whatever comes next and was deliberately left
in place.

## Session handoff — 2026-09-24 (Merchant's Favor fixes, profession nav/polish, SEO pass, OG legibility, item filter layout)

**Stable and shipped this session** (8 commits, each independently
verified live before committing):

- **`data/dungeons/hall-of-thanes.json` quest-96403 faction bug closed
  out -- with a correction to the premise.** The prior session's own
  handoff (below) said the generated file's hand-patched "Alliance" was
  the correct value and the source (still "Both") needed to catch up.
  Live-checked foreverchanges.pro/dungeons/hall-of-thanes directly before
  touching anything: "Important Heirlooms" (quest-96403) is listed under
  "Both factions" (with "An Ancient Grudge"), not the Alliance-only group
  ("Old Ironforge Incursion", "The Restless Dead") -- matching the source
  file exactly. The hand-patch was the actual error. Re-ran
  `build-dungeons.js` from the untouched source, which correctly reverted
  the field to `"Both"` -- verified this was the only change across all
  35 regenerated dungeon files.
- **Merchant's Favor data gaps fixed.** Root cause for one of three
  reported issues: `buildFavorSection()` in `scripts/build-professions.js`
  resolved favor items **by name** against the item catalog, but a favor
  item's display name on foreverchanges.pro (e.g. "Gloves - Holy Power")
  often doesn't match the catalog item's own full name (e.g. "Formula:
  Enchant Gloves - Holy Power") -- silently falling back to
  `unresolvedItemRef` and a "Slot/Type Unknown" tooltip even though the
  linked item has full data. Every favor item already carries a real
  `/item/<id>` url (0 missing across all 8 professions) -- switched to
  `resolveItemByUrl` (the id-over-name-match convention already used for
  camp milestones and quest rewards). Separately, Blacksmithing was
  missing everything past its 30-favor tier and Alchemy was missing its
  240/1000 tiers entirely -- re-scraped both live via
  `fetchProfessionPage` (reusing last session's scraper), merging fresh
  `favor_section` data onto their existing hand-provided `leveling_section`
  (left untouched). Verified against each profession's own live-page
  totals: Alchemy 30 Merchant's Favor recipes (8+6+13+2+1), Blacksmithing
  61 (29+10+17+4+1) -- both match exactly. First Aid confirmed to have no
  Merchant's Favor vendor at all on its live page (not a scrape gap) --
  added `hasFavor: false` to its `professions-config.js` entry and a new
  `favorSupported` catalog field so the page hides that tab entirely for
  First Aid only, instead of showing an empty "coming soon" state.
- **Cross-profession nav row** (`components/professions/
  ProfessionCrossLinks.tsx`) added to the bottom of every profession page
  -- crafting and gathering alike -- linking to all 8 crafting
  professions with icons, so a visitor can jump between professions
  without returning to the `/reference/professions` index. Also
  de-duplicated the `PROFESSION_ICON` map (previously hand-copied
  identically in two files) into `lib/profession-icons.ts`.
- **Subtle alternating row shading** on the Leveling 1-300 step list
  (`ProfessionLevelingGuide.tsx`) -- `even:bg-surface-hover/30` per step,
  reusing the same token this card's own rank-header divider already uses
  for contrast against the card's `bg-surface` background. Restarts per
  rank group automatically (CSS `nth-child` scoped to each rank's own
  steps container), so it doesn't fight the rank dividers.
- **Tab icons** added to the 4 profession-page tabs (Recipes/Leveling/
  Merchant's Favor/Camp) -- `inv_scroll_03`, `achievement_level_10`,
  `inv_misc_coin_02`, `spell_fire_fire`, each checked against
  wow.zamimg.com for existence first. Scoped to the crafting-profession
  tab bar only; gathering pages' own tab set is untouched.
- **SEO pass** across everything shipped in recent sessions
  (professions/items/dungeon-loot):
  - `app/sitemap.ts` now includes `/reference/dungeons/loot` plus all 28
    dungeon loot detail pages that actually have data (matching
    `generateStaticParams`'s own `getDungeonLootIndex()`), and
    `/reference/items`.
  - Individual `/items/[itemId]` pages: explicit decision to sitemap-list
    and index only "new"/"changed" items (9,606 of 21,458) -- real
    informational value, genuinely distinct from Classic. "same"/
    "missing" items (~11,850) are thin/duplicate-ish content, excluded
    from the sitemap and explicitly noindexed (`robots: {index: false,
    follow: true}` -- `follow: true` keeps link equity flowing from
    dungeon-loot/profession-reagent pages that link to them). The shared
    rule lives in `lib/items.ts`'s new `isIndexableItemStatus` so the
    sitemap and the item page's own `generateMetadata` can't drift apart.
  - Canonical tags added to `/reference/items` and `/reference/
    professions/[profession]`, both of which render many `?status=`/
    `?category=`/`?page=`/`?view=` permutations through one title/
    description -- canonicalized to the bare URL, same reasoning as the
    planner's own existing build-code canonical.
  - Every other route type already had `generateMetadata` or a static
    `metadata` export -- no further gaps found.
- **OG image subtitle legibility fixed.** The subtitle line (e.g. "Every
  dungeon, one level-range timeline." on `/reference/dungeons`) rendered
  in `EBGaramond-Italic` at 30px -- legible as browser body text, but
  noticeably harder to read once actually rendered as a flat OG-card
  image (checked live). Switched to `EBGaramond-Regular` (already sitting
  in `assets/fonts/` for exactly this future use per its own header
  comment, never wired into `ImageResponse` until now), bumped to 32px,
  lightened slightly. Title's Cinzel Bold treatment untouched.
- **`/reference/items` filter UI cleanup:** category filters moved out of
  an inline pill row into a new `ItemCategorySidebar`, matching
  `ProfessionCategorySidebar`'s own layout/styling for visual consistency
  between the site's two big filterable-catalog pages (widened the page's
  `max-w` from `4xl` to `5xl` to match). Rarity filter pills now always
  render in their real WoW quality color (Poor gray/Common white/
  Uncommon green/Rare blue/Epic purple/Legendary orange/Artifact gold),
  not just when selected, with a ring+background for the active state
  instead of relying on color alone.

**Open / not done this session:** none flagged -- all 8 items verified
live and committed separately.

**Suggested next:**
- None of `/reference/items`, `/reference/dungeons/loot`,
  `/reference/dungeons/loot/[slug]`, or `/items/[itemId]` have their own
  `opengraph-image.tsx` yet (still 11 OG image routes total, unchanged
  this session) -- worth adding if these pages ever get shared on social
  platforms; not part of this session's task list so not built.
- `docs/site-overview.md` was last fully audited 2026-09-20, before
  nearly all of the professions/items/dungeon-loot buildout -- updated
  this session to correct the most significant drift (routing table,
  SEO section, professions content-type note), but it is not a full
  re-audit at the same depth as its original pass. A fresh from-scratch
  audit pass would still find more to tighten.

## Session handoff — 2026-09-24 (quick-fix batch + item filters + map recon)

**Stable and shipped this session** (13 commits, each independently
verified live before committing -- see individual commit messages for
full detail, summarized here):

- **Regenerated `data/talent-spell-links.json`** (`e02bbe5`) -- it hadn't
  been rebuilt since 2026-09-18 despite `data/spellbooks.json` gaining
  spells on 2026-09-20, so Priest's Renewed Hope only linked a bare
  "Heal" where the real text says "Greater Heal" (now a real candidate
  name once rebuilt). Root cause was staleness, not a matching-logic bug
  -- the longest-match-first algorithm in both `scripts/build-talent-
  spell-links.js` and `lib/talent-spell-links.ts` already handles this
  correctly; confirmed via a sitewide sweep across all 9 classes that
  found no other short-name-inside-long-name collisions.
- **Profession Leveling 1-300 rows** (`7ddd977`) -- a long vendor source
  string (e.g. Cooking's multi-vendor lines) used to wrap onto its own
  line at the row's left edge, disconnected from its item. Split into two
  rows (range+item, then source/count/mats indented under it) in
  `ProfessionLevelingGuide.tsx`.
- **Reference landing page** (`bd92b0e`) now uses the same
  `sm:grid-cols-2` card-grid convention `app/page.tsx` already has,
  instead of a single column mostly-empty at desktop width.
- **Hero banners** on `/reference`, `/guides`, `/blog` (`2bcc90c`)
  shrunk from `min-h-64`/`sm:min-h-80` to `min-h-48`/`sm:min-h-64` --
  all three share identical markup, kept in sync.
- **Profession category sidebar icons** (`5110c68`) -- all 50 unique
  category names across the 8 crafting professions got a small Wowhead-
  hotlinked icon. Every slug was checked against wow.zamimg.com for
  existence (a bad slug returns 200 with a ~146-byte placeholder, not a
  404 -- checked by size), but a handful are approximate/best-guess
  matches flagged inline in `ProfessionCategorySidebar.tsx`'s
  `CATEGORY_ICON` map -- worth a human pass if exact-icon accuracy
  matters here: Transmutes, Oils and Other, Shield Spikes/Chain/Spurs,
  Off-Hand, Goggles and Helms, Fireworks and Toys, Anti-Venoms and
  Potions, Bolts of Cloth, and all 6 Cooking stat-buckets.
- **Double-cursor bug fixed** (`c249e6d`) -- two independent causes: (1)
  Tailwind v4 layer ordering means any element's own `cursor-pointer`/
  `cursor-default` utility always beats this site's `html.js-custom-
  cursor {cursor: none}` rules (deliberately in `@layer base` so
  `disabled:cursor-not-allowed` can still win -- see that rule's own
  comment in `globals.css`), so the JS gauntlet overlay drew on top of
  the item search input, LootItemPill pills, and LegacyPerkNode
  placeholders. Fixed generically in `CustomCursor.tsx`'s
  `resolveState()` rather than patching each call site -- see that
  file's own new comment. (2) `DungeonsTimeline.tsx`'s dungeon buttons
  carried a stray `data-cursor="gauntlet-active"`, not a real state;
  removed.
- **Guides page** (`df449e1`) gets one card linking to the Professions
  index (leveling guides), not 8+ per-profession cards -- sits above the
  guide-post list since it isn't a post itself.
- **`data/sources/` reorganized by source** (`9742559`) --
  `{talentsforever,wowtbc,foreverchanges}/` subfolders instead of one
  flat directory. Every script and `lib/whats-new.ts` updated in the
  same commit; verified by re-running every offline build script and
  confirming zero unintended output changes. Full new layout in
  `data/sources/README.md`'s "Layout" section and this file's own
  "`data/sources/` reorganization" architecture note (search for it).
  **Surfaced a real pre-existing issue**: re-running `build-dungeons.js`
  reverted a hand-edit to generated `data/dungeons/hall-of-thanes.json`
  (quest-96403's faction) because the prior commit patched that
  generated file directly instead of its foreverchanges source
  (`data/sources/foreverchanges/dungeon_data/hall-of-thanes.quests.json`,
  which still says "Both" and was open in the editor at session start).
  Restored via `git checkout` each time this happened rather than acted
  on -- **if that quest's faction still needs to be "Alliance", it needs
  to change in the source file**, or the next `build-dungeons.js` run
  will silently revert it back to "Both" again.
- **Item filters on `/reference/items`**, built and verified
  incrementally (`f4615e6`, `596ef67`, `3bf01a9`, `dc45a39`):
  - Rarity (Poor through Legendary, plus a new Artifact/quality-6 tier --
    added to `lib/wow-data.ts`'s `ITEM_QUALITY_COLOR`/`NAME` maps, real
    in this catalog: both Warglaives of Azzinoth, the Twin Blades, etc.)
  - Item level and required level min/max ranges (a plain GET `<form>`,
    no client JS -- null level/reqLevel is excluded from a range rather
    than treated as 0)
  - Full 12-category item-type taxonomy (Weapon/Armor/Container/
    Consumable/Trade Goods/Projectile/Quiver/Recipe/Reagent/
    Miscellaneous/Quest/Key) -- derived from `raw.c` (Blizzard's item-
    class id), which `fc-item.js` already read internally for
    `categoryLabelFor` but never exposed. Now a real `itemClass` field
    on every `LootItem` everywhere on the site (dungeon loot, quest
    rewards, profession recipes included, not just the catalog), added
    to all 4 `LootItem`-construction sites. New `lib/wow-data.ts`
    `ITEM_CLASS_NAME` map verified against this catalog's actual `c`
    distribution -- matches foreverchanges.pro/items' own sidebar counts
    exactly. Required rebuilding `data/items.json`, every
    `data/dungeons/*.json`, and every profession catalog -- each
    rebuild verified purely additive before trusting it (this is where
    the hall-of-thanes issue above was caught).
  - Dungeon-drop filter: a "Drops in" dropdown, cross-referenced via a
    new lazy itemId -> dungeon-id reverse index in `lib/items.ts`
    (`getAllDungeonData()`, a new export from `lib/dungeon-loot.ts`,
    scans every dungeon's boss loot + quest rewards). Verified against
    Ragefire Chasm: 18 items either way, matching
    `/reference/dungeons/loot/ragefire-chasm`'s own 18 unique item links.

**Investigated, no code changes (as instructed)**: foreverchanges.pro/map,
for a future decision on whether to build an equivalent. Full findings
below in a new "foreverchanges.pro/map recon" note -- headline: the 2D
view is a normal, very achievable Leaflet.js tile map; the 3D view is a
genuine custom WebGL heightmap-terrain-streaming engine (736 terrain
chunks per continent, its own data pipeline) and would be a much larger,
separate undertaking. Recommend treating 2D and 3D as two different
decisions, not one feature, if this comes up again.

**Suggested next:**
- Review the flagged-approximate category icons above if exact accuracy
  matters (item 5's own commit message and `CATEGORY_ICON`'s comments
  have the full list).
- Resolve the hall-of-thanes quest-96403 faction question in its actual
  source file (see above) before the next `build-dungeons.js` run
  silently reverts the generated file's hand-edit again.
- If a world map ever gets built: start with the 2D view only (see the
  recon note below) -- it reuses this project's existing "hotlink icons,
  own theme" discipline and Leaflet is a mature, well-documented library;
  the 3D view is a separate, much bigger decision requiring its own
  terrain-data pipeline this project has no equivalent of yet.

## Session handoff — 2026-09-23 (gathering professions + reagent-qty fix)

**Stable and shipped this session:**
- **Reagent-quantity parsing bug fixed across every profession's Leveling
  1-300 tab.** Root cause: foreverchanges.pro embeds a leveling mat's
  quantity in its `aria-label` text ("5 Light Leather") plus a separate
  `<b>5</b>` icon-overlay badge -- `scripts/lib/parse-profession-page.js`'s
  mats extraction only ever read the aria-label as a raw item name, so
  every such reagent both failed to resolve (no real item is named "5
  Light Leather") and silently fell back to a hardcoded "x1". Scoped to
  the 6 professions scraped in the prior session (Cooking, Enchanting,
  Engineering, First Aid, Leatherworking, Tailoring) -- Alchemy/
  Blacksmithing's hand-provided data already had a clean `quantity`
  field, confirmed unaffected before assuming otherwise. Fixed by reading
  the `<b>N</b>` badge directly (immune to a reagent name that happens to
  start with a digit); verified 0 remaining "N Name"-shaped names across
  all 8 professions' 223 leveling-step reagents afterward.
- **Reagent counts now render as an icon-overlay badge**, matching
  foreverchanges' own convention (studied live: a `<b>` badge on the
  icon corner, present only when qty > 1 -- no "x1" ever shown) --
  `LootItemPill` gained an optional `qty` prop for this, used only by
  profession recipes/leveling mats. A *different* convention, deliberately
  untouched: a recipe's own crafted-**output** count ("Roasted Kodo Meat
  ×2") renders as plain text next to the name on foreverchanges too, not
  an icon badge -- `ProfessionRecipeTable`'s `makesQty` label stays as-is.
- **New "Camp, Skill Rewards and Perks" tab** on every one of the 8
  crafting profession pages: Legacy-point skill-rank milestones
  (Journeyman/Expert/Artisan + the account-wide Certification item),
  placeable camp objects with their unlock skill and Blueprint item, and
  the Legacy Perks relevant to professions. The perks part is deliberately
  **not** scraped per-profession -- checked live against multiple
  professions and found byte-identical content on every one (it's just
  the same "Professions" Legacy tree, not a per-profession reward) --
  reused directly from `data/legacy-perks.json` by perk id.
- **Added the 3 gathering professions (Mining, Herbalism, Skinning) as
  their own page type**, not squeezed into the crafting schema. Checked
  each one live before assuming the crafting scraper/shape would work
  unmodified (it wouldn't): no reagent-based recipes, no category
  sidebar, no Merchant's Favor, no Legacy-point milestone track; Mining
  alone gets an extra Smelting chapter; Skinning has no separate "nodes"
  chapter at all -- its single level-band list doubles as both node list
  and leveling guide. Gathering pages also show a *different* Legacy Perk
  trio (Bountiful Harvest in place of crafting's Performance Bonus).
  Extracted `itemRef`/`unresolvedItemRef`/`buildCampMilestones`/
  `loadLegacyPerks` out of `build-professions.js` into `scripts/lib/
  item-ref.js` and `scripts/lib/camp-section.js` so the new gathering
  pipeline doesn't duplicate them -- verified behavior-preserving (zero
  diff on the 8 existing catalogs) before building on top of it.
- Full architecture detail for both of the above lives in the "Professions
  recipe catalog" note below (search for "gathering" and "camp section").
- **Reference source note (not acted on beyond a sanity check):**
  wago.tools publishes structured Blizzard DB2 table exports per beta
  build -- `https://wago.tools/db2/Item?build=1.60.1.69913` (the raw item
  table: ClassID/SubclassID are exactly the `c`/`u` fields this project's
  own item-category-label work already derived from foreverchanges,
  cross-checked directly for item 2455 and 765 and both agreed) and
  `https://wago.tools/db2/TraitCurrencySource?build=1.60.1.69913` (how
  Legacy Points are actually earned -- by player level, quest, or
  achievement; useful if `data/legacy-perks.json`'s earn-source data ever
  needs expanding past its current prose `earnCapNote`). A legitimate
  citable public source, comparable to talentsforever.com's own beta
  export -- known and available for future item/legacy-perk data gaps,
  not something this session did a full import from.

**Two real class-matching bugs caught before trusting scraped output,
same failure class as last session's "en3-lv-step en3-lv-rod" fix:**
- A gathering node past the beta's current skill cap carries an extra
  `en3-lv-later` class (`<li class="gt-node en3-lv-later">`) -- an
  exact-class-match regex silently dropped 10 of Herbalism's 28 herbs,
  cutting off exactly at the "beta stops at 225" divider. Fixed to match
  on the leading class only; all 28 now present.
- `getProfessionIds()`/`getAllProfessionSummaries()` (`lib/profession-
  recipes.ts`) would have picked up the 3 new gathering catalog files
  (same `data/professions-catalog/` directory) and thrown on
  `catalog.recipes.length`, which doesn't exist on a gathering catalog's
  shape -- excluded by id there before it ever shipped; gathering ids are
  added back in separately wherever they're actually needed
  (`generateStaticParams`, `app/sitemap.ts`, the profession opengraph-image
  route).

**Open / not done this session:** none flagged -- all 4 items verified
live and committed separately.

## Session handoff — 2026-09-23 (professions data-quality pass, prior conversation)

**Stable and shipped this session** (this is the conversation that ran
immediately after the "Professions recipe catalog" session below, before
the gathering-professions one above; its own commits never got a CLAUDE.md
write-up at the time, added here retroactively from the actual commits):
- **Root-caused and fixed "Slot/type unknown" for unchanged items
  site-wide.** `same.json`'s bulk export never carries a tooltip (`x`/`y`)
  at all, but it does carry `c`/`u` (Blizzard's own item class/subclass
  ids) that `scripts/lib/fc-item.js` never read. Since only 81 distinct
  `c:u` combos exist across the whole 21,458-item catalog, `scripts/
  build-item-category-labels.js` pulls the real displayed label for each
  from foreverchanges.pro's own per-item pages once (`data/sources/
  item-category-labels.json`) and `buildSyntheticTooltip` now uses it --
  fixes every reagent/trade-good/armor-type display without any per-item
  scrape.
- **Scoped re-fetch for the 751 items still missing real tooltip text**
  after the fix above (referenced from profession recipes or dungeon
  quest rewards; boss loot already had full text from a richer source) --
  `scripts/fetch-referenced-item-tooltips.js` /
  `scripts/lib/fetch-item-tooltip.js`, output as a dated overlay
  (`data/sources/item-tooltip-overlay-2026-09-23.json`) `fc-item.js`
  merges onto `raw.x` before building each item's tooltip.
- **Item icon now renders inside the tooltip body itself** (`Item
  TooltipBody.tsx`), not just on the triggering pill/row.
- **Real profession-page hover-lag bug found and fixed**, not guessed at
  -- confirmed by instrumenting `LootItemPill`'s render count directly:
  `useIsActiveTooltip` (`lib/active-tooltip.ts`) used a shared
  `useSyncExternalStore` snapshot, so every tooltip on the page re-rendered
  on every single hover transition (measured: 680 re-renders from 2 hovers
  on a 169-pill page). Fixed with a per-subscriber selector closure; same
  measurement after: 10 re-renders, a ~68x reduction.
- **Pulled Leveling/Merchant's Favor data for the 6 professions that never
  had it** (only Alchemy/Blacksmithing did before) -- `scripts/lib/
  parse-profession-page.js` + `scripts/fetch-profession-leveling-favor.js`,
  same live-HTML-plus-regex technique as the dungeon quest pull, no JSON
  API exists for this either (confirmed the same way as the item pages).
  Caught two real bugs before trusting the output: a step's class is
  sometimes `"en3-lv-step en3-lv-rod"` (Enchanting's one-time "Make a
  Runed Copper Rod" prerequisite), and Enchanting's own leveling steps
  "make" an enchant, not a craftable item, so there's no `en3-lv-made`
  link at all -- both now handled explicitly rather than silently dropped
  or crashing.

Full detail for all of the above already lives in the dedicated
architecture notes below (search "category label", "tooltip overlay",
"active-tooltip", "profession Leveling").

## Session handoff — 2026-09-23 (original professions recipe catalog build)

**Stable and shipped this session:** `/reference/professions/[profession]`
rebuilt as a real recipe catalog (Recipes / Leveling 1 to 300 / Merchant's
Favor) for all 8 crafting professions, replacing the old MDX write-up
pages, which moved to `/blog`. Full details in the new "Professions
recipe catalog" and "`/items/[itemId]`"-adjacent architecture notes below
(search for "profession"). Headline points:
- **Data pipeline** (`scripts/build-professions.js` + `scripts/lib/
  profession-categories/*.js`): resolves every recipe/reagent name in
  `data/professions/*.json` against the item catalog (99.84% resolve),
  assigns each recipe a category, and writes `data/professions-catalog/
  <id>.json`. Alchemy's categorization is a hardcoded ground-truth map
  read directly off foreverchanges.pro's own sidebar (0 uncertain, by
  construction); the other 7 lean on item slot / recipe-name pattern /
  tooltip-buff-text signals with a documented fallback, and 101 of 2,165
  recipes (4.7%) came out with a low-confidence guess, collected in
  `data/professions-catalog/uncertain.json` for review rather than
  silently trusted -- breakdown: engineering 77, cooking 12, tailoring 5,
  first-aid 3, leatherworking 3, blacksmithing 1, alchemy/enchanting 0.
- **Two real category-list gaps found and resolved with the user before
  building:** Enchanting's 10 given categories are all slot-based but 55
  of 222 recipes (wands/rods/oils/relics) fit none of them -- added an
  11th "Other" category. Cooking's given list had "Stamina and Spirit"
  and a separate standalone "Spirit" bucket that turned out to be the
  same thing (no cooking item grants a combined buff) -- collapsed to
  one. A third near-miss caught by hand rather than the user: an early
  regex for parsing "Enchant Off-Hand - X" split on the hyphen *inside*
  "Off-Hand" itself and miscounted 3 real Off-Hand recipes as
  uncategorizable -- fixed to split on " - " instead.
- **Every profession recipe/reagent/leveling-step/favor item is a full
  `LootItem`**, not a slim ref -- reuses `LootItemPill` (Part A's shared
  item-rendering component) directly, so hovering any material anywhere
  in a profession page gets the exact same tooltip, and clicking one
  goes to `/items/[itemId]`, as everywhere else on the site.
- **A real data-provisioning bug caught before building anything on top
  of it:** `data/professions/tailoring.json` as first provided this
  session was byte-identical to `engineering.json` (242 "recipes" that
  were all engineering items -- bombs, goggles, no cloth at all). Flagged
  to the user immediately rather than guessed around; they supplied the
  correct 417-recipe file, used from then on.
- **A second schema mismatch caught live, not assumed:** Alchemy's and
  Blacksmithing's `*_leveling_and_merchants.json` don't share one shape
  (`range` is a `[min,max]` tuple for one, a `{min,max}` object for the
  other; the rank-requirement field is singular vs. plural; Blacksmithing's
  Merchant's Favor tier strings don't embed their own skill range the way
  Alchemy's do). Blacksmithing's leveling guide rendered "–" for every
  range until this was normalized in the build script.
- Migrated all 7 profession write-ups from `content/professions/` to
  `content/blog/` (images too), fixing two credit-line mismatches this
  surfaced along the way: blog's shared `GuideImage` defaults to a
  Blizzard-press-still credit that would have misattributed both the
  WarcraftTavern tooltip screenshots in each post's body (now an explicit
  per-image `credit="Tooltip screenshot courtesy of WarcraftTavern."`)
  and the hero image (now an explicit empty `heroCredit: ""`, matching
  the old dedicated `ProfessionImage` component's deliberate no-credit
  behavior for an image of unknown provenance).

**Open / not done this session:**
- The 101 uncertain-category recipes in `data/professions-catalog/
  uncertain.json` haven't been individually reviewed/corrected --
  flagged for the user rather than resolved blind, per this session's
  own instruction. Engineering's 77 (32% of its 242 recipes) is the
  real concentration; the profession has the weakest slot/name signal of
  the 8 by a wide margin.
- The `data/professions/*_leveling_and_merchants.json` gap for the other
  6 professions (only Alchemy and Blacksmithing have one) is a data
  problem, not a code one -- `ProfessionLevelingGuide`/
  `ProfessionMerchantsFavor` are already written generically; a 3rd
  profession's leveling data just needs the file added and `hasLeveling:
  true` set in `scripts/lib/professions-config.js`, no component changes.
- Merchant's Favor's 240-tier for Alchemy (skill 290-300) has no
  recorded items in the provided data, even though foreverchanges.pro's
  own live page currently shows 2 (Major Frenzy Potion, Elixir of the
  Grizzly) -- rendered as an honest "no recipes recorded for this tier
  yet" rather than hand-filled from the live page, since the rest of
  this profession's data came from a snapshot, not a live re-pull.

**Session from earlier 2026-09-23:** individual item pages plus a batch of
small data/copy fixes, each verified live and committed separately (this
session picks up right after the dungeon-loot follow-ups below, same day).
- **`/items/[itemId]`** — individual item pages, studied against
  foreverchanges.pro/items live (clicking an item goes to `/item/<id>`,
  showing a title/meta line, a status callout, and a tooltip panel with
  current + Classic tooltip text) and rebuilt at the same information depth
  in this site's own theme, not a copy of their layout. Not statically
  generated -- `lib/items.ts`'s new `getItemById` is a Map lookup against
  the same cached `data/items.json` read `queryItems` already uses, so
  21,458 pages don't get built up front for a page most visitors reach one
  at a time.
- **Every item-rendering surface site-wide now links to its item page.**
  `LootItemPill`'s inner tooltip content (name, tooltip lines, drop chance,
  Classic-comparison block) was extracted into a new shared
  `ItemTooltipBody` component (needed by both the hover popover and the
  static item page, which has no use for `TooltipCard`'s fixed-position
  wrapper); `LootItemPill` now wraps an item's name in a `Link` whenever it
  has a real `itemId`. Because boss loot, quest rewards, the items catalog
  table, and the dungeon timeline's inline panel all already go through
  this one shared component, this single change wired up linking
  everywhere at once -- verified live on all four surfaces. Legacy Perk
  reward items were audited and deliberately left unlinked: that data has
  no real item id, and this project's convention is not to name-match when
  an id would be needed but isn't there.
- **Unchanged ("same"-status) items get a real tooltip instead of a bare
  "Slot, Type" line**, on both the `/reference/items` hover tooltip and the
  new item page. foreverchanges' "same" items never carry full tooltip
  text at the source -- only new/changed/missing do -- but they DO still
  carry real structured fields (slot, class restriction, weapon speed/dps,
  required level). `fcItemToUnified` (`scripts/lib/fc-item.js`) now
  reconstructs a tooltip from those fields when full text is absent, in
  the exact line format/order real tooltip-text items use (cross-checked
  against real weapon entries to confirm `p`/`d` are speed/dps, not some
  other stat). A new `tooltipSynthesized` flag drives an honest
  `TooltipDataNote` disclosing this is reconstructed, not the beta
  client's own text, and that armor/stat bonuses aren't derivable this
  way -- this project doesn't present reconstructed data as equivalent to
  a real pull.
- **Two real pre-existing bugs found and fixed while touching this area,**
  both the same root cause (loot-table-specific wording/styling applied
  unconditionally to the plain item catalog, where `status: "missing"`
  means something different -- "beta hasn't touched this Classic item
  yet," not "no longer drops"): the shared status note text, and the
  muted/grayscale-icon-plus-"Gone"-badge treatment. `ItemTooltipBody` and
  `LootItemPill` both now take a `context: "loot" | "catalog"` prop and
  render the wording/styling that's actually true for where they're used.
- **Data cleanup, each independently verified and committed:**
  - Stray leading commas in tooltip lines (e.g. ", Elixirs") -- came from
    joining an empty slot with a non-empty type on the tab-separated
    "Slot\tType" line without filtering the empty part first. Fixed in
    both `LootItemPill`'s tab-line renderer and its Classic-comparison
    block; confirmed live on Simple Flour ("\tCooking" -> now "COOKING").
  - Missing space in quest XP reward text (e.g. "...Forever beta2,750 in
    Classic") -- the source HTML has the Classic value as a sibling
    `<small class="dgx-was">` right after the Forever value with no
    separating text (CSS spacing does the work on the live site);
    `extract-foreverchanges-quests.js`'s `stripTags`-based extraction
    concatenated them directly. Fixed by inserting ", " before stripping;
    re-ran the scrape for all 35 dungeons and rebuilt
    `data/dungeons/*.json` (37 quests across 8 dungeons affected).
  - Homepage Reference card copy ("Racials and race/class rules at a
    glance") and the Reference page's own Dungeon Loot card copy (still
    said "community-sourced from wowtbc.gg" from before the 2026-09-22
    foreverchanges rebuild, flagged in that session's own handoff) both
    updated to reflect what's actually there now.
- **Investigated, no code change (reported rather than guessed):**
  - The stray "OLD" prefix on some item names (e.g. "OLDThug Belt",
    "OLDRecruit's Belt") is NOT a data artifact -- confirmed against
    foreverchanges.pro's own live item pages (both its catalog listing and
    its individual `/item/<id>` page) that they render the exact same
    "OLD..." name with no special-casing, for the same 31 item ids. These
    are real leftover/debug entries in the game's own item database (low-
    level vendor gear, NPC-only "Monster - X" template items, all quality
    0-1) that genuinely carry "OLD" as part of the stored name, not
    something either site's pipeline introduced. Left as-is, matching the
    primary source's own treatment -- don't strip it without a reason to
    believe it's wrong.
  - `LootDisclaimer`'s "cite foreverchanges.pro exactly once" requirement
    was checked against every one of the 35 dungeon loot pages (same-
    source and mixed-source cases) and the guard already in
    `app/reference/dungeons/loot/[slug]/page.tsx`
    (`questSource !== bossLootSource`) already prevents duplication in
    every case tried -- no reproducible bug found. Noted here in case this
    was observed somewhere this session didn't check (a specific dungeon,
    a specific viewport) rather than assumed fixed.

**Suggested next:**
- If `/items/[itemId]` ever needs prebuilt/cached pages for SEO reasons,
  reconsider `generateStaticParams` for at least the "new"/"changed"
  subset (the items people actually search for) rather than all 21,458.
- `app/sitemap.ts` still doesn't list `/reference/items`,
  `/reference/dungeons/loot`, per-dungeon loot pages, or the new
  `/items/[itemId]` pages -- pre-existing gap (the file's own guides/
  blog/profession coverage predates this session), not something this
  session's task asked for. Adding 21,458 item URLs to the sitemap would
  need its own explicit decision, not a default "add everything."
- The `LootDisclaimer` duplication question above is worth a fresh look
  if it recurs with a specific reproduction (URL, viewport) to check
  against, rather than re-auditing all 35 dungeons blind again.

**Session from earlier 2026-09-23:** five follow-ups on the dungeon loot
feature from 2026-09-22, each verified live and committed separately.
- **Quest field label hierarchy fix**
  (`components/reference/LootQuestRewardsCard.tsx` and
  `DungeonInlinePanel.tsx`'s `QuestDetail`): the "Starts/Comes after/Slay/
  Bring back/Reward" `dt` labels were rendering in nearly the same muted
  color/weight as the quest description text above them. Reused the
  site's existing muted-gold small-caps citation convention (`text-
  [#c8aa6e] text-[10px] font-semibold uppercase tracking-wide` — already
  used for "Classic's version"/"Compared to Classic" in `LootItemPill`/
  `TooltipCard`, see that architecture note below) for the labels, and
  promoted the `dd` values to plain `text-foreground` instead of muted.
  Also filled in `DungeonInlinePanel`'s `QuestDetail` with the Comes-
  after/Reward fields it was missing entirely (`LootQuestRewardsCard`
  already had them) so the inline panel and the full loot-table page
  show the same fields with the same hierarchy. Verified against Ragefire
  Chasm's "Returning the Lost Satchel" (multi-reward-choice, Comes-after
  chain, Horde-only tag) on both surfaces.
- **Quest reward items enriched with full item data** — see the updated
  "Dungeon loot" architecture note below for the id-based join against
  the full item catalog (100% match rate, no name-fallback needed) and
  the new `scripts/lib/fc-item.js` shared module.
- **Boss NPC portraits**, hotlinked from foreverchanges.pro — see the new
  dedicated architecture note below.
- **New `/reference/items` page** — a filterable table over the full
  21,458-item catalog — see the new dedicated architecture note below.
- **Dungeon loot index table** (`/reference/dungeons/loot`) rows now show
  that dungeon's own background art, darkened with a gradient scrim,
  using the `.hero-text-accent`/`.hero-text-muted` fixed-color classes
  (`app/globals.css`) instead of the normal `text-foreground`/`text-
  foreground-muted` so the text stays legible over the photo in both
  Light and Themed mode — verified live in both modes (toggled via
  `document.documentElement.classList.add('light-mode')` since the
  `ModeToggle` button's own click didn't register through the browser
  tool this session; not investigated further, low-priority). Updated
  `globals.css`'s own comment enumerating `.hero-text-*` consumers (it
  previously only listed the homepage/Blog/Guides hero banners) to keep
  it accurate now that a plain data table uses the same classes.

**Open / mid-flight:**
- Mobile-viewport re-verification for the new `/reference/items` table
  and the loot index background art wasn't done live this session —
  `resize_window` is still unreliable in this environment (see existing
  Tooling note below); both reuse this codebase's established `overflow-
  x-auto`-in-its-own-container table pattern rather than a new technique,
  so it's a low-risk carry-over, not unverified from scratch.
- The task description for the loot-index background art mentioned
  "level-band shading/gridlines already on this chart" as if it were the
  same page — that shading actually lives on the separate `/reference/
  dungeons` Level Ranges timeline (`DungeonsTimeline.tsx`), a different
  component from the plain loot index table this change touched.
  Confirmed the timeline page is untouched and still renders correctly.
  Worth keeping in mind that these are two different dungeon pages next
  time a task talks about "the dungeon chart."
- The Reference landing page's "Dungeon Loot" card
  (`app/reference/page.tsx`) still describes the loot data as "community-
  sourced from wowtbc.gg" — stale copy left over from before the
  2026-09-22 foreverchanges rebuild (most dungeons now prefer
  foreverchanges; wowtbc is the fallback for only 2). Not fixed this
  session since it wasn't part of what was asked — flagging so it isn't
  missed indefinitely.
- `data/items.json` (the new full item catalog, built by `scripts/
  build-items.js`) is a large generated file (~8.5MB, deliberately
  unformatted/compact JSON, unlike the pretty-printed `data/dungeons/
  *.json`) committed to the repo. Server-only — `lib/items.ts` reads it
  with `fs` and it's never shipped to the client — but worth knowing it's
  there if repo size or clone time ever becomes a concern.
- `/reference/items` is a deliberate first pass, not feature parity with
  foreverchanges.pro/items: no level-range/slot/type/class filters and no
  sort-by (foreverchanges has all of these). `lib/items.ts`'s `queryItems`
  is structured so adding those later means extending one function, not
  rewriting the page.

**Suggested next:**
- A real mobile-viewport check for `/reference/items` and the loot index
  table's background art, next time a real narrow window is available
  (see the claude-in-chrome Tooling notes below for the known
  workarounds/limitations).
- Fix the stale "wowtbc.gg"-only copy on the Reference landing page's
  Dungeon Loot card description (see Open/mid-flight above).
- If `/reference/items` ever needs the level-range/slot/class filters
  foreverchanges has, extend `lib/items.ts`'s `queryItems` rather than
  adding ad-hoc filtering logic in the page component.

**Session from 2026-09-22:**

**Stable and shipped this session:**
- **Dungeon loot feature rebuilt on foreverchanges.pro data, replacing the
  wowtbc.gg-only version from 2026-09-19/09-20.** Full pipeline:
  `data/sources/foreverchanges_dungeon_data/*.json` (boss loot, pulled a
  prior session) + `*.quests.json` (quest chains, pulled this session via
  `scripts/extract-foreverchanges-quests.js`) → `scripts/build-dungeons.js`
  → `data/dungeons/<id>.json` (35 files, one per dungeon) → `lib/dungeon-
  loot.ts` (fs-based reader) → UI. See the new architecture note below
  ("Dungeon loot: two-source reconciliation") for the full shape and the
  reconciliation policy (one source wins per dungeon per data-type, never
  blended boss-by-boss). wowtbc.gg data is now only the fallback for 2
  dungeons (gnomeregan, sm-library) that foreverchanges has no boss-loot
  pull for yet.
- **The prior session's wowtbc.gg icon-scrolling extraction (item 1 of an
  earlier 3-item loot-table task) is abandoned, not incomplete.** It had
  gotten partway through hand-scrolling ~20 of 34 dungeon pages to read
  icon slugs off `<img>` `src` attributes before this session found that
  `data/sources/foreverchanges_dungeon_data/*.json` already carries a real
  icon slug per item (the `k` field) alongside item id, quality, item
  level, and full current/Classic tooltip text -- strictly richer than
  what the manual scroll-and-read approach could ever produce. Don't
  resume that scroll-based extraction; the scratch files it produced
  (`wowtbc-icons/*.json` in the temp scratchpad) were never committed and
  can be discarded.
- Quest data (giver, giver location, objectives, "bring back" items,
  rewards) pulled for all 35 dungeons by fetching each foreverchanges.pro
  `/dungeons/<slug>` page directly with `curl` and parsing just the
  `#quests` chapter's HTML with a small regex-based parser (`scripts/
  extract-foreverchanges-quests.js`) -- deliberately not a browser-
  automation scroll/screenshot loop like the abandoned icon work, since
  this data is plain server-rendered HTML, not lazy-loaded images; the
  whole 35-dungeon pull ran in one `node` invocation. `/map`-linking quest
  givers/objectives are preserved as `{name, href}` mapRefs without being
  resolved -- there's no map feature yet, this just keeps the reference
  for whenever one gets built. 332 quests total, 7 dungeons come back
  empty (see below).
- New-in-Forever dungeon list/detail pages now hotlink foreverchanges.pro's
  own per-dungeon background art
  (`https://foreverchanges.pro/wow-ui/dungeons/art-<slug>.webp`, mapped in
  `scripts/dungeon-source-map.js`, confirmed per-dungeon against the
  `--art:url(...)` CSS variable each dungeon actually renders on
  foreverchanges' own timeline rather than guessed from name similarity) --
  same hotlink-not-mirror discipline this site already uses for
  wow.zamimg.com icons. Every dungeon in the `/reference/dungeons` timeline
  is now clickable (previously only the 9 "new" ones were) and opens an
  inline Bosses/Quests panel matching foreverchanges' own list-then-detail
  interaction pattern, rebuilt in this site's own components.
- `LootItemPill` rebuilt with a real icon, quality-colored name, full
  tooltip-line rendering, and a Classic-comparison block for changed/
  missing items -- and, in the same pass, finally wired into `lib/active-
  tooltip.ts`'s single-tooltip-owner mechanism, which it never had before
  despite the mechanism existing specifically to fix this exact "two
  tooltips open at once" bug elsewhere on the site. This closes out items
  2 and 3 of the original 2026-09-19 loot-table follow-up task as a side
  effect of the bigger rebuild (item 2's "do we have stats data" question
  is answered: yes, foreverchanges' `x`/`y` tooltip-line arrays are real
  beta-client stat text, not just slot/type).
- 7 dungeons come back with zero bosses and zero quests on both this
  session's foreverchanges pull and the earlier wowtbc.gg pull: excavation-
  site, city-of-dalaran, drowned-city, kroldok-stronghold, alcaz-prison,
  blackmaw-hold, shapers-terrace. Confirmed as a real "not yet in the beta"
  set (foreverchanges' own site shows the same 7 empty), not a scraping
  gap -- don't re-pull these expecting different results without checking
  foreverchanges.pro directly first.

**Open / mid-flight:**
- Mobile rendering of `DungeonInlinePanel` (the new list-then-detail
  Bosses/Quests panel) was never checked on a real narrow viewport --
  verified only at desktop width. The panel does stack `flex-col` below
  `sm:`, but the boss/quest list-plus-detail two-column sub-layout inside
  it was designed against the desktop reference screenshot only.
- `LootItemPill`'s tooltip could not be triggered with the `computer` tool's
  simulated mouse hover in this session (clicks and hovers via that tool
  timed out repeatedly, a recurrence of the previously-documented "second
  window can screenshot but time out on clicks" issue, this time on what
  should be the primary tab) -- verified instead by dispatching real
  `mouseover` DOM events via `javascript_exec` (focus() alone does *not*
  trigger React's onMouseEnter/onFocus the way a real pointer hover does;
  a dispatched `mouseover` bubbling event does). If this recurs, that's the
  workaround.
- foreverchanges' `sources` field (per-dungeon citation links -- Blizzard
  forum posts, BlizzCon panel timestamps, datamine credits) and `entrance`/
  `summary` prose were captured in this session's exploration but
  deliberately NOT carried into `data/dungeons/*.json` or shown anywhere --
  copying their own written summary/entrance text verbatim felt too close
  to reproducing another site's prose (see this project's own "paraphrased
  from that guide's prose, not copied verbatim" precedent for Wowhead
  content in `data/dungeons.json`'s `_readme`). This session's own
  `description` field (already on every dungeon, sourced from Wowhead
  originally) is what's shown instead. If dungeon `sources` citations are
  wanted later, they're pure URLs (safe to link) -- only the prose summary/
  entrance text is what was skipped.
- The plain `/reference/dungeons/loot` table-index page (distinct from the
  new interactive `/reference/dungeons` timeline) got only the minimum
  updates needed to compile against the new data shape (column rename,
  description text) -- not restyled or otherwise touched.

**Suggested next:**
- Give `DungeonInlinePanel` a real mobile pass (open it on an emulated
  narrow window, check the boss/quest list-plus-detail sub-layout doesn't
  overflow or become unusably cramped).
- Once foreverchanges pulls a boss-loot table for gnomeregan and sm-
  library, re-run `node scripts/build-dungeons.js` -- their `bossLootSource`
  will flip from `"wowtbc"` to `"foreverchanges"` automatically, no other
  changes needed.
- If a world-map feature ever gets built, the quest mapRefs
  (`data/sources/foreverchanges_dungeon_data/*.quests.json`'s `fields[].
  mapRef`, carried through into `data/dungeons/*.json`'s `quests[].giver.
  mapRef` and `.objectives[].mapRef`) are already there waiting -- `{name,
  href}` where `href` is foreverchanges' own `/map/<continent>#pin=<name>`
  path, not yet resolved to anything on this site.

**Session from 2026-09-20:**
- New talentsforever.com pull (`talentsforever-2026-09-20.json`) diffed
  against 2026-09-19 (`data/sources/diffs/2026-09-19_to_2026-09-20.{md,json}`)
  and applied. This session also finished a partial, unreviewed application
  of this same diff that a prior session had left uncommitted (see that
  session's "Open / mid-flight" note, now resolved) — three of five talent
  cost-line changes and the racials change had already been hand-applied
  before this session started, one with a real bug (see below).
- Small field-level talent/spellbook changes: Warrior Spearing Strike,
  Paladin Holy Shield and Rogue Mutilate each gained a "Requires \<weapon
  type\>" clause on their `cost` line (both in `data/talents/*.json` and the
  matching `data/spellbooks.json` entries); Hunter Resourcefulness's desc
  numbers changed; Hunter Lightning Reflexes' desc numbers changed and its
  `classic.status` flipped `changed` → `same`. Tauren's Cultivation racial
  gained a cooldown clause. The already-applied racials edit had a real bug
  (concatenated without the source's comma/space: "Instant. 1 hour
  cooldown.Cultivate..." instead of "Instant, 1 hour cooldown. Cultivate...")
  — found by diffing raw source JSON directly rather than trusting the
  working-tree edit, and fixed to match the source exactly.
- **Talent-granted spells now show in the spellbook** (Shaman's Water
  Shield, Druid's Mangle and Berserk — all three confirmed via this pull).
  This needed no new UI: `components/reference/SpellbookBook.tsx` already
  has a complete mechanism for this from an earlier session — a `talent?:
  boolean` field on `SpellbookEntry` (`lib/spellbooks.ts`) drives both a
  "Talent" pill next to the spell's name in the normal tab view and a
  separate "From your talents" bucket in the "By level" view (spells whose
  first rank has no real trainer level, or whose `talent` flag forces rank 1
  into that bucket even when it does have one — see `splitLevelRows`'s own
  comment). Regenerating `data/spellbooks.json` via `node scripts/
  build-spellbooks.js data/sources/talentsforever-2026-09-20.json` (which
  reads the flag from the vendor's own per-class `spellbooks.<Class>.talents`
  name list, not something we name-match ourselves) picked up all three
  automatically — confirmed live for Water Shield (Shaman) and both Berserk
  and Mangle (Druid), pill + tooltip + "From your talents" grouping all
  correct, and confirmed no passive talent is incorrectly flagged (`spell
  .talent && spell.passive` is 0 across every class). No second, differently-
  worded tag was added alongside the existing "Talent" pill — one label for
  one concept, per the existing convention.
- Regenerating spellbooks.json this way was verified purely additive first
  (`git diff --stat` showed 194 insertions, 0 deletions) before trusting it
  over the prior partial hand-edit — every hand-applied cost-line change
  already matched the script's own output exactly.


**Session from 2026-09-19:**
- Vercel Web Analytics actually wired up (`app/layout.tsx`): the prior
  session had installed `@vercel/analytics` and imported `Analytics` from
  `@vercel/analytics/next`, but never rendered the component — so despite
  looking complete (import present, package installed), zero events were
  ever firing. Added `<Analytics />` inside `<body>`. Checked against
  Vercel's live docs (fetched directly, not from training knowledge) to
  confirm `@vercel/analytics/next` is the correct App Router variant (not
  `/react`, not the Pages Router `_app.tsx` pattern) and that placement
  matches their example. Confirmed no other analytics/tracking setup
  exists anywhere in the codebase to conflict with it. Verified live via
  a real browser: in dev, the component loads `va.vercel-scripts.com/v1/
  script.debug.js` and the console logs `[Vercel Web Analytics] Running
  queued event pageview` → `[view] .../_vercel/insights/view` — dev mode
  intentionally queues without sending to the server, which is expected
  debug behavior per Vercel's own docs, not a bug. **Still needs a
  dashboard action from the user, not code**: Vercel project → Analytics
  in the sidebar → **Enable** — required before any real data flows,
  regardless of how correct the code is. Commit `588715a`.
- Spellbook mobile tab rail + spine (`components/reference/
  SpellbookBook.tsx`): the task as described assumed desktop already
  showed icon+name tabs and mobile's icon+name was the one causing
  horizontal scroll. Reading the actual code (and confirming live)
  showed the reverse — desktop was **already** icon-only (`sm:hidden` on
  the tab's name `<span>`), and mobile was the one rendering full names,
  which is what forced the scroll. Flagged this mismatch to the user
  before touching anything; they chose the simpler fix (make mobile
  match desktop) over the literal ask (add names to desktop's 56px
  rail). Removed the name `<span>` entirely — `title={tab.name}` on the
  button still gives it an accessible/hover name at every breakpoint —
  and added `hidden sm:block` to the book's center spine-shadow div so
  it doesn't render on mobile's single-column stacked layout. Desktop
  verified live via screenshot, both before and after. Commit `a808ceb`.

**Session from 2026-09-18 (spanning several conversations, same day) — folded forward, unchanged this session:**
- Planner "Copy build for AI" export: a plain-text summary of the current
  build (spec numbers, per-tree points, each spent talent's actual tooltip
  at its chosen rank, the share URL) copied to the clipboard from a new
  button in the planner controls row, for pasting into an AI chat. Disabled
  at 0 points like the other build-action buttons.
- `/whats-new` page: a talent-change breakdown (added/removed/moved/
  prerequisite-changed) generated from `scripts/diff-talentsforever.js`'s
  existing diff JSON, with a per-class picker and plain-language detail,
  linked from a small badge next to the planner header (not primary nav).
  Building it surfaced a real gap in the diff script itself: it never
  tracked a talent's `req` (prerequisite) field, so a dropped/added
  prereq was invisible to the tool and only ever caught by hand-reading
  the vendor changelog — fixed, and all historical diffs regenerated.
- Talent tooltip "Ctrl-hold to explain linked spells" feature: hovering a
  talent whose description names another spell/talent (e.g. Bloodthrill
  mentioning Rend and Overpower) highlights that name inline, and holding
  Ctrl expands a card per linked spell with its own tooltip text at the
  correct rank. New data layer (`data/talent-spell-links.json`,
  `scripts/build-talent-spell-links.js`, `lib/talent-spell-links.ts`) plus
  `lib/use-ctrl-held.ts`/`lib/use-pointer-fine.ts`. See the dedicated
  architecture note below for the data pipeline and two real bugs found
  and fixed while auditing it (a cross-class talent-id collision, a
  substring-overlap match bug) — the initial ship had a rendering gap
  that silently broke highlighting for every multi-rank talent at 0
  points (i.e. most talents, most of the time); fixed same session.
- Spellbook tooltip polish: a `TooltipLevelReq` line (surfaces
  `SpellTooltip.levelReq`, which existed in the data but was never
  rendered) and a typography tweak, matching a talentsforever.com study
  pass without copying their cream/yellow palette.
- Tooltip positioning rewritten to be viewport-aware for real (`lib/
  use-hover-tooltip.ts`): measures the tooltip's actual rendered size and
  flips/clamps against every edge, instead of clamping against a static
  height estimate that could still run off-screen — see architecture note
  below.
- Desktop talent tree resized and centered to match talentsforever.com's
  density (43px icons / 24px gap / 67px pitch, within 1px of their own
  44px/24px/68px) and the tree group centered as a unit instead of left-
  aligned with empty space beside it — see the dedicated architecture note
  below, including the deliberate square-cells-not-their-rhythm trade-off.
- Fixed a real bug where two tooltips could be open at once after a
  window blur/focus cycle mid-hover (e.g. alt-tabbing away without moving
  the mouse, then returning and hovering elsewhere) — see the new
  `lib/active-tooltip.ts` architecture note below. Covers both the talent
  tree tooltip and the spellbook tooltip, and both the desktop hover and
  mobile tap-to-open interaction models.
- Mobile re-verified against a real device-emulated browser window (not
  just reasoned about from unchanged CSS classes, which is as far as an
  earlier pass in this same session could get — see Tooling notes below
  for why): confirmed the desktop resize above didn't touch mobile's own
  icon sizing, and confirmed the single-tooltip fix also holds for the
  mobile tap-to-open flow.
- A talentsforever.com pull (`talentsforever-2026-09-18.json`) that changed
  the vendor's *source*, not just its values: every talent now carries
  `src: "beta"` (100% of 468), meaning direct WoW Forever beta-client
  extraction (build `1.60.1.69876`) rather than stream/demo footage.
  Practical effect: "estimated" is functionally retired for talents (see
  below), and 466 talent field-level changes plus a full racials rewrite
  landed from this one pull.
- `scripts/diff-talentsforever.js` fixed for the new Legacy Perks shape and
  upgraded schema-drift reporting — see Architecture below.
- Talent tree structural changes applied and browser-verified: Warrior
  Protection lost Vitality (Bastion and Focused Rage each moved into a
  vacated slot); Rogue Combat's Restless Blades and Warlock Affliction's
  Drain Hope were each replaced in-slot by a new talent (Flawless
  Execution, Wrack); Druid Balance lost Balance of Nature outright; Rogue
  Aggression no longer requires Hack and Slash; Warlock Conflagrate no
  longer requires Shadowburn; Priest's tab is now "Shadow" (was "Shadow
  Magic") and Shaman's is "Elemental" (was "Elemental Combat") — **that
  direction was verified against both raw vendor snapshots directly and
  corrects an earlier wrong assumption**, so trust the live tree names in
  `data/talents/*.json` over any older note describing it the other way.
  This rename also broke two things it wasn't obviously connected to
  (found and fixed later the same day, once flagged): the Priest/Shaman
  talent tree background images, and the Class Spellbooks page's tab
  icons for those two specs — see the "tab renames touch more than tree
  data" architecture note below for what actually broke and why.
- `lib/build-code.ts` versioned to protect existing shared links from the
  reshuffle above — see Architecture below.
- `/reference/legacy-perks` rebuilt as an interactive 3-column tree — see
  Architecture below.
- Racials rewrite applied by name-matching (36 general + 12 Priest
  class-specific) — see Architecture below.
- The `confirmedRanks`/per-rank "(estimated)" mechanism was retired
  (removed from `Talent`, `TalentNode.tsx`, and confirmed absent from every
  `data/talents/*.json` file) now that it has nothing left to distinguish —
  see Architecture below for why, and don't reintroduce it without first
  checking whether the vendor data has gone back to partial/estimated.

**Open / mid-flight:**
- Mobile verification for the spellbook change above isn't fully closed:
  got a real mobile-width window rendering correctly (330×717, confirmed
  via screenshot — not `resize_window`, still non-functional, same
  finding as 2026-09-18 below), but every click attempt inside that tab
  timed out (`Input.dispatchMouseEvent`) even though screenshots on the
  same tab worked fine — see the new Tooling note below. So the collapsed
  list was confirmed icon-only-ready, but an actual *expanded* book on a
  real phone-width viewport (tab rail + spine together, in context) was
  never seen — only reasoned about from the same Tailwind breakpoint
  logic that was directly confirmed on desktop. User opted to skip
  further live click-through rather than keep troubleshooting the click
  timeout. Worth a real manual phone check next time this page is
  touched.
- Not investigated this session, flagging rather than guessing: the
  working tree at session end carries changes this session didn't make
  and has no context on — `data/racials.json`, `data/spellbooks.json`,
  `data/talents/{hunter,paladin,warrior}.json`, plus an untracked
  `data/sources/talentsforever-2026-09-20.json`. Looks like a fresh
  vendor pull/diff-apply happened outside this conversation. Don't
  assume it's finished, reviewed, or safe to build on without checking
  with whoever ran it.
- One instruction this session ("drop false 'Requires Shadowform'/'Requires
  Spirit of Redemption' lines from Priest racials and Human Perception")
  could not be resolved — grepped current `data/racials.json` and
  `data/class-racials.json` (neither schema has a requirement-line field at
  all) and the full text of both the 09-16 and 09-18 vendor snapshots (zero
  occurrences of either phrase in either file). Not fixed, not fabricated.
  If this comes up again, ask for a screenshot or a different source before
  acting — it isn't in anything this codebase currently tracks.
- Legacy Perks page (`/reference/legacy-perks`) is desktop-only by explicit
  scope cut — see Architecture below. No mobile tap/long-press model yet,
  and `LegacyPerkNode`'s tooltip does not yet use the new single-tooltip-
  owner mechanism (`lib/active-tooltip.ts`) either — both ports are
  optional/low-priority unless this page turns out to get real traffic.
- Priest's Renewed Hope highlights "Heal" inside its own description text
  even where that word is really the tail of "Greater Heal" (a spell that
  isn't tracked anywhere in `data/spellbooks.json`) — a data-coverage gap
  found while auditing the linked-spell feature, not a matching-logic bug.
  Left as-is rather than fabricating "Greater Heal" data; would need a real
  source for that spell to fix properly.
- The talent tree's square talent cells vs. talentsforever.com's own wider-
  column, non-square rhythm (91px column pitch vs. their 68px row pitch)
  is a disclosed, deliberate trade-off, not an oversight — see the sizing
  architecture note below before "fixing" this into non-square cells.
- Carried over from 2026-09-17, still untouched: no visual distinction
  between directly-observed vs. inferred spell tooltip sourcing;
  spellbook tooltip's mobile bottom-sheet placement still never visually
  verified on a real narrow viewport (note: this session verified the
  *talent tree's* mobile sizing and tap-tooltip behavior on a real
  device-emulated window — that's a different check from the spellbook's
  bottom-sheet placement specifically, which remains unverified);
  `classicDescription`/`classicStatus` backfill (7+ of many spells done);
  tailoring's missing `hero.webp`; `app/sitemap.ts`'s manual TODO (still
  missing per-slug profession pages, blog posts, and guides).

**Suggested next:**
- If picking this project back up cold: the standing backlog above
  (racials "Requires" mystery, sitemap TODO, tailoring hero image,
  spellbook mobile bottom-sheet verification — a different, still-open
  check from this session's tab-rail/spine change, see above) plus this
  session's two new open items (real mobile click-through on the
  spellbook, and the unreviewed uncommitted data-pull files) are the
  standing backlog, not new discoveries.
- The claude-in-chrome click-timeout-on-an-unfocused-window issue (see
  Tooling notes below) is worth watching for. It only happened once, so
  it was worked around with a user hand-off rather than investigated —
  if it recurs, it's probably worth digging into properly instead of
  routing around it every time.
- Optional, low-priority: Legacy Perks could get the planner's mobile touch
  model (tap-to-add, long-press-peek, haptic pulse) ported over from
  `TalentNode.tsx` if this page turns out to get real mobile traffic — see
  Architecture below for why it was scoped out initially.
- Optional: decouple the talent tree's row/column spacing to match
  talentsforever.com's non-square cell rhythm exactly, if that proportion
  difference turns out to matter — see the sizing architecture note for
  why it wasn't done this session (risk to the connector-arrow geometry
  for a proportions-only gain).

## Tooling notes

### claude-in-chrome can drive more than one open Chrome window
Learned 2026-09-18, after wrongly assuming otherwise for a while first:
the extension is not bound to a single fixed window for the life of a
session. `tabs_create_mcp` creates its new tab in whichever Chrome window
currently has OS focus — not necessarily the window holding this
session's other tabs — and the resulting tab keeps its own addressable
`tabId` afterward regardless of which window it landed in or which window
has focus later. Both tabs stay independently usable by `tabId` at the
same time.

Practical effect: testing across two open windows (e.g. one at normal
desktop size, one set to a mobile responsive-mode viewport) just needs
the user to focus the target window, then a fresh `tabs_create_mcp` call
— no need to close/reopen either window, and no need to treat the tool as
limited to whatever viewport it happened to attach to first. This
directly unblocked a real mobile-verification need this session:
`resize_window` on an existing tab was confirmed unreliable in this
environment across many separate attempts (it reports success but
`window.innerWidth` never actually changes), which had previously been
written off as "mobile can't be visually verified here, only reasoned
about from unchanged CSS classes" — that conclusion was wrong. If a
resize-based approach isn't working, ask the user whether a second real
window is available before falling back to code-only reasoning.

### A second real window can screenshot fine but time out on clicks
Observed 2026-09-19, not yet root-caused: after the user set up a second,
mobile-sized Chrome window per the note above, `tabs_create_mcp` landed a
new tab there and `computer` `screenshot` worked on it repeatedly and
correctly (confirmed a genuine 330×717 viewport) — but every `computer`
`left_click` on that same tab timed out on `Input.dispatchMouseEvent`
after 30s, even immediately after a successful screenshot. The likely
cause is that CDP input-event dispatch needs the target window to have
real OS focus, which a second window sitting behind/beside the active
one may not have, while screenshot capture apparently doesn't need it.
Not confirmed against Chrome/CDP internals this session — treat as a
working theory, not a proven mechanism.

**Practical effect:** if clicks on a real secondary window mysteriously
time out while screenshots on the same tab keep working, don't loop
retrying the click — ask the user to click into (focus) that window
first, or fall back to asking them to perform the click themselves and
just screenshot the result. This session's spellbook mobile-tab
verification (see the 2026-09-19 handoff above) hit exactly this and the
user opted to skip further live interaction rather than troubleshoot it
further, so the underlying cause is still unconfirmed — worth revisiting
if it blocks something more important later.

## Architecture notes

### foreverchanges.pro/map recon (2026-09-24, investigation only -- nothing built)
Explored live via claude-in-chrome (network requests + a couple of global-
scope checks, not just visual inspection) to scope what building an
equivalent world map would actually take, per an explicit "investigate,
don't build" instruction. Two genuinely different features living behind
one "2D/3D" toggle, not one feature with two render modes of similar cost:

**2D view -- a normal Leaflet.js tile map.** `window.L` (Leaflet's global)
is present on the page. Standard slippy-map tile pyramid:
`/map/<continent>/tiles/<zoom>/<col>_<row>.webp` (zoom "2" for the default
overview), plus `/map/<continent>/areas.png` -- almost certainly a flat-
color zone-id mask sampled via canvas `getImageData` for "which zone is
under the cursor" hit-testing (a common technique, not confirmed by
reading source). Per-continent POI data ships as separate JSON files
matching the sidebar's own category checkboxes -- `pins.json`,
`services.json`, `quests.json`, `books.json`, `commerce.json`,
`rares.json` -- each rendered as small PNG icon sprites
(`/map/icons/svc-*.png`, `poi-*.png`). Everything is versioned by the
beta build number in the query string (`?v=1.60.1.69876`, plus a `-5`
data-revision suffix on the POI JSON specifically) for cache-busting
across patches. This is well within reach with this project's existing
skills and conventions (hotlinked icons, its own theme, a small per-
continent JSON data layer) -- Leaflet is mature and thoroughly documented.

**3D view -- a real custom WebGL terrain-streaming engine, not a toggle
on the same map.** Clicking "View in 3D" loads an entirely different
asset pipeline and shows "Loading terrain... N of 736" while streaming
in chunks. Confirmed via network requests: `/map/<continent>/height/
<col>_<row>.png` (grayscale heightmap tiles -- vertex-displace a mesh
from these, the standard technique for heightmap terrain), a second,
deeper-zoom pass of the same `tiles/<zoom>/<col>_<row>.webp` color
textures draped over that mesh, and `water.json` (vector water-plane
regions rendered as their own overlay). A second `<canvas>` element
exists in this mode with a genuine WebGL context (checked via
`canvas.getContext('webgl2'||'webgl')`); no `THREE`/`BABYLON` global was
present, so it's either a from-scratch WebGL2 renderer or a bundled
library that doesn't expose a global -- not confirmed which. Camera is a
real fly/orbit controller (drag to pan, right-drag to tilt, double-click
to fly to a point, a "Top down" toggle, a compass reset). Building an
equivalent would need, at minimum, a terrain-data extraction pipeline
this project has nothing like today (heightmap + textured-tile generation
per continent, presumably from the game client's own terrain files) on
top of the renderer itself -- closer in scope to a small game-engine
feature than a typical web-map integration.

**Takeaway for a future decision:** if a map ever gets greenlit, treat 2D
and 3D as two separate proposals with very different costs, not one. The
2D view alone would deliver most of the practical value (zone/dungeon/POI
navigation, matching what a fan planner site's users would actually want)
at a small fraction of the 3D view's effort and risk.

### Dungeon loot: two independent sources, reconciled per-dungeon-per-data-type, never blended
`data/dungeons/<id>.json` (one file per dungeon, 35 total, same ids as
`data/dungeons.json`) is what every dungeon page actually reads --
`lib/dungeon-loot.ts` loads all of them via `fs.readdirSync` at request
time (same pattern as `lib/content.ts`'s guides/professions loader), not a
single big JSON import. Built by `node scripts/build-dungeons.js` from:

- `data/sources/foreverchanges_dungeon_data/<fc-slug>.json` -- boss/trash/
  rare/object/quest-NPC loot, pulled from foreverchanges.pro. Real item id,
  icon slug, quality, item level, required level, full current tooltip
  text, and (when the item changed since Classic) the old tooltip text
  too, plus a `new`/`changed`/`same`/`missing` status per item. This is the
  primary source for loot -- richer than wowtbc.gg on every axis except
  drop-chance %, which foreverchanges doesn't have at all.
- `data/sources/foreverchanges_dungeon_data/<fc-slug>.quests.json` -- full
  quest chains (giver, giver location, objectives incl. structured "bring
  back N of item X, found on mob Y" lists, prerequisite quest, XP/money,
  reward choices), pulled by `scripts/extract-foreverchanges-quests.js`
  fetching each `/dungeons/<slug>` page with plain `curl` and regex-parsing
  just the `#quests` chapter's server-rendered HTML -- no browser
  automation needed, this isn't lazy-loaded the way item icons on
  wowtbc.gg were (see the abandoned-icon-extraction note in this session's
  handoff above for that contrast). `/map`-linking anchors inside that
  chapter are kept as `{name, href}` mapRefs, unresolved -- there's no map
  feature yet.
- `data/dungeon-loot.json` (the older wowtbc.gg-sourced pull, still built
  by `scripts/build-dungeon-loot.js` from `data/sources/wowtbc-loot-*.json`
  snapshots) -- now used only as a fallback, and only per data-type, per
  dungeon, where foreverchanges has nothing at all.

**Reconciliation policy, deliberately not a merge:** for each dungeon, for
each data type (loot, quests) independently, exactly one source wins
outright. foreverchanges wins wherever it has any data; wowtbc.gg is the
fallback only where foreverchanges came back completely empty for that
data type on that dungeon -- currently just boss loot for gnomeregan and
sm-library (that pull hasn't been done on foreverchanges yet; quests for
both of those ARE foreverchanges-sourced, since foreverchanges has them).
Blending the two sources item-by-item or quest-by-quest inside one dungeon
was considered and rejected: they're independent collection efforts (beta-
client/log reads vs. player-submitted drop reports) that can disagree on
attribution, and asserting a merged claim neither source actually made
would be worse than picking one and saying so. `bossLootSource`/
`questSource` on every `data/dungeons/<id>.json` record which source won,
and `LootDisclaimer` (`components/reference/LootDisclaimer.tsx`) renders
different messaging for each -- genuinely different confidence claims, not
interchangeable copy.

Both sources' items funnel into one unified `LootItem` shape (`lib/
dungeon-loot.ts`) regardless of origin -- fields only one source ever
populates (icon, quality, tooltip, classicTooltip, status vs. dropChance,
dropChanceUnder, unknown) are simply null from the other -- so every UI
component (`LootItemPill`, boss cards, quest reward lists) handles exactly
one item shape no matter which source it came from. Quest reward items
specifically reuse this same `LootItem` shape (built by
`questRewardItemToUnified` in the build script) rather than being a
separate lighter type, which is why a quest reward pill and a boss-loot
pill are the literal same component.

**Quest reward items are enriched from a third source: the full item
catalog (added 2026-09-23).** The quest-chain scrape
(`*.quests.json`) only ever gives a reward as a bare `{itemHref, name,
type}` -- no icon, quality, stats, or Classic-comparison data, unlike
boss loot which gets all of that straight from the per-dungeon pull.
`data/sources/foreverchanges_items/{new,changed,same,missing}.json`
(the same full-catalog pull `/reference/items` reads, see that
architecture note below) has real item id/icon/quality/tooltip data for
every item in the game, keyed by the same numeric id `itemHref` encodes
(`/item/15452` -> `15452`). `questRewardItemToUnified` in
`scripts/build-dungeons.js` looks a reward up by that id in an id-keyed
index built from the catalog and, when found, runs it through the same
`fcItemToUnified` mapping boss loot uses -- so a quest reward pill ends
up with the exact same icon/quality/tooltip/Classic-diff shape a boss-
loot pill has. Checked reliability before trusting id as the join key
(per this project's own "don't assume name-matching is reliable if an
id exists" caution): 422/422 reward items and 325/325 "bring back"
objective items resolve by id with zero misses across all 35 dungeons,
so there's no name-matching fallback -- an unmatched id falls back to
the old bare shape (kept for robustness, not currently exercised).

`fcItemToUnified` (and the `deriveTypeFromTooltip` helper it uses) now
lives in `scripts/lib/fc-item.js`, shared between `build-dungeons.js`
and the new `build-items.js` (see below) -- previously duplicated
verbatim in `build-dungeons.js` alone. Extracting it was verified
behavior-preserving by re-running `build-dungeons.js` and diffing
`data/dungeons/*.json` against the pre-extraction commit (zero diff)
before it was trusted.

**Slug mapping is non-trivial and lives in one place**
(`scripts/dungeon-source-map.js`): our own dungeon ids, foreverchanges'
slugs, and foreverchanges' *background-art* slugs are three different
naming schemes, and several classic dungeon wings share ONE art file on
foreverchanges (all 3 Dire Maul wings, both Blackrock Spire wings, both
Stratholme sides, Scarlet Monastery splitting 2-and-2 between
"scarletmonastery" and "scarlethalls") -- confirmed per-dungeon against the
actual `--art:url(...)` CSS custom property foreverchanges renders on its
own timeline bar for that dungeon, not guessed from name similarity.
Stratholme's `stratholme-main-gate`/`stratholme-service-gate` foreverchanges
slugs were mapped to our own `stratholme-live`/`stratholme-undead` ids by
reading each one's actual boss roster (Main Gate has Hearthsinger
Forresten/Timmy the Cruel/Balnazzar = the Live/Crusade side; Service Gate
has Baroness Anastari/Ramstein the Gorger/Baron Rivendare = the Undead
side), not by name resemblance -- "main" vs "service" gives no hint which
Classic side is which. Each Stratholme side is now a fully independent
`data/dungeons/*.json` record with its own real boss/item/quest lists,
unlike the old wowtbc-only pipeline which had to synthesize both ids from
one merged, unsplit wowtbc entry (see `LOOT_KEY_OVERRIDES` in the pre-
2026-09-22 version of `lib/dungeon-loot.ts`, now removed since it's no
longer needed).

### Boss NPC portraits: hotlinked from foreverchanges.pro's own asset folder
Added 2026-09-23. Each boss in a foreverchanges dungeon pull
(`data/sources/foreverchanges_dungeon_data/<fc-slug>.json`) carries a
`display` field -- the beta client's own creature display id.
foreverchanges hosts its own portrait render for these at
`https://foreverchanges.pro/wow-ui/bosses/<display>.webp` -- the same
hotlink-not-mirror discipline this site already uses for
wow.zamimg.com item icons (see the icon-slug note above), just a
different host since Wowhead's zamimg CDN has no equivalent public
per-NPC-portrait path to key off of.

**Verified before wiring it up, same discipline as icon-slug
verification elsewhere on this site:** all 223 distinct `display` ids
across all 35 dungeons resolve to a real, non-empty `.webp` (200
status); a bad/absent id 404s cleanly rather than returning a fake
placeholder image. `display` is absent for "Trash mobs" groupings and
lootable objects (no single NPC to portray) -- roughly a dozen entries
across the full dungeon set, confirmed to render with no portrait at
all rather than a broken-image icon.

`scripts/build-dungeons.js` resolves `display` -> a full `portraitUrl`
at build time (`null` for wowtbc-sourced bosses, which have no
equivalent asset) and writes it onto every `data/dungeons/<id>.json`
boss record; `LootBoss.portraitUrl` (`lib/dungeon-loot.ts`) carries the
type. `components/reference/BossPortrait.tsx` is a small client
component (needs `"use client"` for its `onError` fallback -- a plain
`<img>`'s error handler can't be passed from a Server Component) that
renders the circular portrait and renders nothing at all if `src` is
null or the image fails to load, rather than a broken-image icon.
Rendered in both places a boss name appears: `LootBossCard.tsx` (the
full loot-table page) and `DungeonInlinePanel.tsx`'s boss detail header
(the Level Ranges timeline's inline panel).

### `/reference/items`: full item catalog, filtered server-side
Added 2026-09-23. Lists every item in the WoW Forever beta client
(21,458 total) from `data/sources/foreverchanges_items/{new,changed,
same,missing}.json` -- new/changed/unchanged/not-yet-touched vs.
Classic, the same four buckets foreverchanges.pro/items itself uses
(status tabs on that page read "New in Forever 5,335 / Changed 4,271 /
Unchanged 9,813 / No Forever data yet 2,039" -- this site's own tab
counts match exactly). Studied that live page for the filtering pattern
(status tabs with counts, name search) but rebuilt it in this site's
own theme rather than copying markup -- a compact table instead of
their inline-tooltip card grid, and this site's existing spellbook
filter-tab convention (`inline-flex rounded border`, `bg-accent/20`
active state -- see `SpellbookBook.tsx`'s `FILTERS` buttons) instead of
their control styling.

**Deliberate first pass, not feature parity:** no level-range/slot/
type/class filters or sort-by (foreverchanges has all of these) — just
status tabs, name search, and pagination. Easy to extend later against
the same query function if wanted (see below).

**Kept off the client entirely, to protect this project's own "load
fast, minimal client JS" priority:** the full catalog is large enough
(`data/items.json`, ~8.5MB, built by `scripts/build-items.js` from the
per-status source files via the shared `fcItemToUnified` mapping — see
the quest-reward-enrichment note above) that shipping it to the browser
for client-side filtering was rejected outright. Instead:
- `lib/items.ts`'s `queryItems({status, q, page, pageSize})` does all
  filtering and pagination server-side, reading `data/items.json` via
  `fs` (module-level cache, same pattern as `lib/dungeon-loot.ts`'s
  `loadAll`) -- never imported by anything that runs in the browser.
- `app/reference/items/page.tsx` is a plain async Server Component
  reading `searchParams` (`status`, `q`, `page`); status tabs and
  pagination are ordinary `Link`s that update those params.
- The only client-side piece is `ItemsSearchInput.tsx`, a small
  component that debounces typing (300ms) into a `?q=` param via
  `router.replace` -- no copy of the item list ever reaches it.
- Only the current page's ~60 rows are ever serialized to the client,
  each as a `LootItemPill` (full icon/quality/tooltip data included,
  since that's what the tooltip needs) -- reused directly rather than a
  second tooltip implementation, per the task that added this page.

**`new.json`'s 7-item `"rebuilt"` status outlier** (Classic items
foreverchanges rebuilt under a new item id) is folded into `"new"` at
build time in `build-items.js` -- foreverchanges' own site groups these
into its "New in Forever" tab too (5,335 = 5,328 `new` + 7 `rebuilt`)
rather than exposing a fourth bucket, so this matches the source's own
grouping rather than inventing a status. Don't be surprised to find
`"rebuilt"` in a raw `new.json` entry; it's normalized away by the time
`data/items.json` is built.

### `/items/[itemId]`: individual item pages, and the shared tooltip-body extraction
Added 2026-09-23, same session as `/reference/items` above. Studied
foreverchanges.pro/items live: clicking an item goes to `/item/<id>`,
which shows a title/meta line (quality, slot, type, item level, id), a
colored status callout, and a tooltip panel with the item's full current
(and, when changed, Classic) tooltip text. Rebuilt at that same
information depth, not copied layout -- `app/items/[itemId]/page.tsx` is
a plain async Server Component; `lib/items.ts`'s `getItemById` is a Map
lookup (built once, lazily) against the same cached `data/items.json`
read `queryItems` already uses. **Deliberately not statically
generated** -- no `generateStaticParams`, so Next.js renders each item
page on demand rather than building all 21,458 up front for a page most
visitors reach one at a time (from a drop, a reward, or the catalog
table), matching this project's "load fast, minimal bloat" priority the
same way `/reference/items` itself already does for the catalog table.

**`ItemTooltipBody` (`components/reference/ItemTooltipBody.tsx`)** is
the tooltip's inner content -- name, tooltip lines (or a bare slot/type
fallback), the synthesized-tooltip disclosure (see the "same"-status
note in the `/reference/items` section above), drop chance, and the
Classic-comparison block -- extracted out of `LootItemPill` so the item
page could reuse it without `TooltipCard`'s `position: fixed` hover
wrapper: the item page wraps it in a plain bordered box instead.
`LootItemPill` now imports it too, so there is exactly one place this
content is rendered from, not two copies that could drift.

**Every item-rendering surface site-wide links to its item page** as a
consequence of one change: `LootItemPill` wraps an item's name in a
`Link` to `/items/<id>` whenever `item.itemId` isn't null. Since boss
loot (`LootBossCard`), quest rewards (`LootQuestRewardsCard`), the
items catalog (`ItemsTable`), and the dungeon timeline's inline panel
(`DungeonInlinePanel`) all already render items exclusively through
`LootItemPill`, this wired up linking everywhere at once -- verified
live on all four. Legacy Perk reward items (`LegacyPerksReference`) are
a different, hand-authored data shape with no real item id, so they
were deliberately left unlinked rather than name-matched against the
catalog -- this project's own convention (see the quest-reward-
enrichment note above) is to trust an id join over a name guess, and to
skip the link entirely when there's no id to join on.

**`context: "loot" | "catalog"`** on both `LootItemPill` and
`ItemTooltipBody` exists because `item.status === "missing"` means two
different things depending on where an item renders: on a dungeon loot
page it's a boss/quest drop no longer confirmed in Forever's loot
table; in the full item catalog it just means the beta client hasn't
touched that Classic item's data yet (`lib/items.ts`'s own "No Forever
Data" tab label is the accurate claim there). Before this was split out,
the catalog showed a "Gone"-badged, grayscale, "no longer drops"-
captioned row for a plain not-yet-touched Classic item -- actively
contradicting the catalog page's own copy ("not that it's been
removed") and its correct "NO FOREVER DATA" status-column badge right
next to it. Found and fixed in the same session that built the item
page, not a pre-existing note carried forward. `context` defaults to
`"loot"` (most `LootItemPill` call sites are loot-related); only
`ItemsTable` and the item page itself pass `"catalog"`.

### Professions recipe catalog: `/reference/professions/[profession]`
Added 2026-09-23, same session as the item pages above (Part B of a
two-part task). `data/professions/<dataFile>.json` (one per profession;
`data/professions/firstaid.json` on disk, `first-aid` as the route slug
-- see `scripts/lib/professions-config.js` for the id/dataFile/name/
category-list mapping for all 8) is a raw recipe list with **no item
ids and no category** -- name only. `scripts/build-professions.js`
resolves every recipe and reagent name against `data/items.json` by
exact match (a trailing "x2"/"x3"/"x200" with no space, e.g. "Fire
Oilx2", is a scrape artifact meaning "craft yields N" -- stripped before
lookup, carried through as `makesQty`, same pattern as the item-page
work's own "OLD" prefix investigation taught: check what a string
artifact actually means before stripping it blind), assigns a category
per `scripts/lib/profession-categories/<id>.js`, and writes
`data/professions-catalog/<id>.json` -- read at request time by
`lib/profession-recipes.ts` (fs + module cache, same pattern as
`lib/items.ts`/`lib/dungeon-loot.ts`).

**Categorization is per-profession, not one heuristic** -- see each
file in `scripts/lib/profession-categories/` for its own reasoning
(slot-based for the armor/weapon professions, recipe-name parsing for
Enchanting's "Enchant \<Slot\> - \<Effect\>" convention, tooltip buff-text
regex for Cooking, a hardcoded ground-truth map for Alchemy). Every
recipe gets a category either way (never left blank), but a
low-confidence guess sets `categoryConfident: false` and is collected
into `data/professions-catalog/uncertain.json` (101 of 2,165 recipes,
4.7% -- concentrated in Engineering, 77/242, which has by far the
weakest slot/name signal of the 8). **This hasn't been reviewed yet** --
flagged to the user at the end of the session that built it, not
silently trusted or silently left uncategorized.

**Every item reference in a profession's catalog JSON is a full
`LootItem`**, not a slim `{id, icon, name}` ref -- same reasoning as the
item-pages note above: `ProfessionRecipeTable`/`ProfessionLevelingGuide`/
`ProfessionMerchantsFavor` all render items through the shared
`LootItemPill`, so a reagent gets the exact same rich tooltip (including
a "same"-status synthesized one) and `/items/[itemId]` link as
everywhere else. `unresolvedItemRef()` in the build script gives the
~0.2% of names that don't resolve the same `unknown: true` degradation
(muted italic, no icon, no link) wowtbc-sourced "not yet discovered"
items already get elsewhere.

**The page itself** (`app/reference/professions/[profession]/page.tsx`)
stacks four views behind a `?view=` param (default `recipes`) --
`Recipes` (a `?category=` filter sidebar, server-rendered `Link`s, same
pattern `/reference/items`' status tabs use, no client JS needed just to
filter), `Leveling 1 to 300`, `Merchant's Favor`, and `Camp, Skill Rewards
and Perks` (added a later session -- see its own note below). All 8
crafting professions now have leveling/Merchant's-Favor data (originally
only Alchemy/Blacksmithing did; the other 6 were pulled in a later
session, see that session's handoff above) -- a profession's Leveling/
Favor view renders a "coming soon" state gated on `catalog.leveling`/
`catalog.favor` being `null`, not a profession allowlist, which is why
First Aid (a secondary profession with genuinely no Merchant's Favor
vendor on its own live page) correctly still shows "coming soon" there
without needing special-casing.

**The two leveling/merchants-favor source files don't share one JSON
schema** -- found live, not assumed, when Blacksmithing's guide first
rendered "–" for every skill range: Alchemy's step `range` is a
`[min, max]` tuple, Blacksmithing's is a `{min, max}` object; the rank
field is `requirement` for one, `requirements` for the other;
Blacksmithing's Merchant's Favor tier strings don't embed their own
skill range in the tier text the way Alchemy's do (carried in a
separate `skill_range` field instead). `build-professions.js` normalizes
all three -- don't assume a 3rd profession's leveling file matches
either existing shape without checking first.

**Old MDX write-ups moved to Blog** (see the Blog/Content-type notes
elsewhere in this file for the migration itself) -- `/reference/
professions/[profession]` used to be `[slug]`, MDX-driven, one page per
profession's "new recipes" narrative post. Same URL shape, so old
`/reference/professions/<slug>` links still resolve, just to the
catalog now instead of a write-up.

### Profession "Camp, Skill Rewards and Perks" tab
Added in the gathering-professions session (see that handoff above).
`scripts/lib/parse-profession-page.js`'s `parseCampSection` reads the
`id="camp"` chapter -- present on every profession page, crafting and
gathering alike, same markup either way. Two `<ol class="pr-milestones">`
lists (Legacy-point skill-rank milestones, then placeable camp objects)
plus a "Legacy perks" list that is **not** parsed here at all: checked
live against multiple professions of both types and found the perk
list identical within each type (all 8 crafting professions show
Performance Bonus/Working Overtime/Dedicated Study; all 3 gathering
professions show Bountiful Harvest/Working Overtime/Dedicated Study) --
it's just the "Professions" Legacy tree, not a per-profession reward, so
`scripts/lib/camp-section.js`'s `loadLegacyPerks(perkIds)` pulls the
right 3 by id from `data/legacy-perks.json` (built in an earlier session)
instead of re-scraping the same content 11 times. A milestone/camp-object
resolves its item by id extracted straight from foreverchanges' own item
URL (`buildCampMilestones` in `camp-section.js`), never by name -- these
rows come with a real link already, unlike recipe/reagent text elsewhere
in this pipeline.

A plain skill-rank milestone (Journeyman/Expert/Artisan) has no linked
item at all -- `item: null` on the built record, with its own trade-icon
slug carried separately (`icon`), rather than being forced through
`unresolvedItemRef`'s "we don't know what this real item is" treatment,
which would misrepresent it.

### Gathering professions: Mining, Herbalism, Skinning are their own page type
Added in the same session as the Camp tab above. These 3 are genuinely
not the crafting-profession shape -- checked each one live before writing
any parser, not assumed from Mining alone: no reagent-based recipes, no
category sidebar (no slot-based grouping concept exists for gathering at
all), no Merchant's Favor, no Legacy-point milestone track. Mining alone
gets an extra Smelting chapter (bars from ore, structurally identical to
a crafting profession's Recipes list -- same `cr-row`/`cr-mats`/
`en3-skill` markup). Herbalism has nodes + leveling only. **Skinning has
no separate "nodes" chapter at all** -- its one `id="skin"` list (level
bands, not named nodes: "Beasts of level 1 to 10", not "Copper Vein")
doubles as both the node list and the leveling guide.

Pipeline: `scripts/lib/parse-gathering-page.js` (live-HTML-plus-regex,
same discipline as every other pull in this project -- no JSON API exists
here either) -> `scripts/fetch-gathering-professions.js` (one dated
snapshot, `data/sources/gathering-professions-<date>.json`, all 3
professions together) -> `scripts/build-gathering-professions.js` ->
`data/professions-catalog/{mining,herbalism,skinning}.json`, read by the
new `lib/gathering-professions.ts` (a separate reader/type module, not
squeezed into `lib/profession-recipes.ts`'s crafting shapes). Every
node/step/smelting-recipe item resolves by id (every one comes with a
real foreverchanges item URL already) via `scripts/lib/item-ref.js`'s
`resolveItemByUrl` -- no name-matching anywhere in this pipeline.

`scripts/lib/item-ref.js` (itemRef/unresolvedItemRef/itemIdFromUrl) and
`scripts/lib/camp-section.js` (buildCampMilestones/loadLegacyPerks) were
extracted out of `build-professions.js` so this second pipeline doesn't
duplicate them -- verified the extraction was behavior-preserving by
rebuilding the 8 existing crafting catalogs and diffing against the
pre-extraction commit (zero diff) before building gathering on top of it.

**A node past the beta's current skill cap carries an extra class**
(`<li class="gt-node en3-lv-later">`) -- an exact-class-match regex
silently dropped 10 of Herbalism's 28 herbs at first, cutting off exactly
at the "beta stops at 225" divider (same failure class as the prior
session's "en3-lv-step en3-lv-rod" fix for Enchanting's leveling data --
watch for this pattern generally: foreverchanges adds a second class to a
list item for "this row is special" state changes, and an exact
`class="foo"` match instead of a leading-class match silently drops that
whole row). Fixed to match on the leading class only in `parseNodes`;
verified all 28 present after.

**The page route branches early** on `isGatheringProfessionId(profession)`
(`app/reference/professions/[profession]/page.tsx`) into an entirely
separate `GatheringProfessionPage` render path with its own per-profession
tab set (Mining: Ore by Skill/Leveling/Smelting/Camp; Herbalism: Herbs by
Skill/Leveling/Camp; Skinning: What to Skin/Camp only) -- not a shared
component stretched to fit both shapes. **Real bug caught before it
shipped:** `getProfessionIds()`/`getAllProfessionSummaries()`
(`lib/profession-recipes.ts`) read every `.json` in `data/professions-
catalog/`, which now also holds the 3 gathering catalogs -- those would
have been treated as crafting catalogs and thrown on `catalog.recipes
.length` (gathering catalogs have no such field). Excluded by id in
`getProfessionIds()`; gathering ids are added back in separately wherever
actually needed (`generateStaticParams`, `app/sitemap.ts`, the profession
`opengraph-image` route) rather than papered over with an optional-chain
that would've silently under-listed pages instead of crashing loudly.

### Planner: race is reference-only; URL is `/planner/<class>/<build>`
Race is no longer app state or a URL segment — it never affects talent
calculations. `RaceReferenceTable` (`components/reference/RaceReferenceTable.tsx`)
is the full table, shared as-is between the planner (rendered inline below
the trees) and the standalone `/reference/racials` page.

**Reversal (2026-09-16):** `RacePicker` (`components/planner/RacePicker.tsx`)
— the compact, class-filtered race column that used to sit beside the tree
with racials via popover — has been removed from the planner page (its only
call site) to give the talent trees the full width instead (trees widened
from `max-w-77` to `max-w-89`, icon columns from `minmax(52px,...)` to
`minmax(60px,...)`). The component file itself is left in place, deliberately
unused, per instruction not to touch it — only its embedding in the planner
is gone; `RaceReferenceTable` (a different, larger component) is unaffected
and still renders both standalone at `/reference/racials` and inline below
the planner's trees, same as before. Do not reintroduce `RacePicker` into
the planner without a fresh explicit decision to do so; this was a
deliberate width trade-off, not an oversight.

URL scheme is `/planner/<classId>/<buildCode>` (2 segments), handled by the
catch-all route `app/planner/[[...slug]]/page.tsx`. Old-style 3-segment
`/planner/<classId>/<raceId>/<buildCode>` links (from when race was a URL
segment) are detected in that route's `parseSlug()` — a second segment
matching a known race id — and redirected to the canonical 2-segment form.

### Build codes are versioned (`lib/build-code.ts`)
Encoding is positional — one base36 rank digit per talent, talents ordered
by tier then col within each tree, trees joined with `-` — with **no
name/id tie-back to the encoded digits**. That means any change to a
tree's talent membership or order (add/remove/reshuffle) shifts every
digit after the change point onto a *different* talent for anyone
decoding an old link against the current data: not a decode failure, a
silent wrong-talent assignment, and for a removed talent, a decode that
runs past the new (shorter) array just drops that digit's data with no
error at all. This is exactly what the 2026-09-18 tree restructuring above
would have done to old links with points in Warrior Protection's tier
5-7, Rogue Combat, Warlock Affliction, or Druid Balance.

Fixed with a version segment: `encodeBuild` prepends a version number
(currently `3`; was `2` until 2026-09-24 -- see the addendum below) as an extra `-`-separated segment, so a versioned code has
`classData.trees.length + 1` segments vs. exactly `classData.trees.length`
for a pre-versioning code — detected by segment count, not a special
character, so codes stay plain base36+`-` and drop safely into any URL
segment (including the OG image route's path) with no escaping questions.
`decodeBuild` branches on that: versioned codes decode directly against
the current tree order; unversioned (legacy) codes decode against a
frozen `LEGACY_TREE_ORDER` snapshot of the 4 talent trees that changed
shape on 2026-09-18, then translate old talent ids to current ones
(`LEGACY_ID_TRANSLATION` — identity for anything unchanged, an explicit
mapping for the 2 same-slot renames, `null`/dropped for the 2 outright
removals) before clamping to the current talent's `maxRank`. Every other
tree, on every other class, is untouched by any of this and always
decodes the same way it always did.

**The next time a tree's talent membership or order changes**, bump
`CURRENT_VERSION` again and add a new frozen `LEGACY_TREE_ORDER`-style
snapshot (and translation table) for whatever changed, following this
same pattern — don't simplify the versioning away just because it looks
like unused-most-of-the-time machinery; it exists specifically because
array-position encoding plus a tree reshuffle is a silent-corruption
scenario, verified directly against constructed legacy codes for all 4
trees affected on 2026-09-18 (see that commit for the exact repro).

**Addendum, 2026-09-24 (version 2 -> 3):** Paladin Holy lost Improved Holy
Strike, Paladin Retribution lost Crusade, and Shaman Elemental swapped
Elemental Fury (row 3 -> 6) and Elemental Alacrity (row 6 -> 3). Bumped
`CURRENT_VERSION` to 3 and froze those 3 trees' pre-change id order as
`V2_TREE_ORDER`. A version-2 code (any version below current) now decodes
through `decodeAgainstFrozenOrders`, which uses `V2_TREE_ORDER` for those 3
trees and live order for every other tree; unversioned pre-v2 codes fall
back to `V2_TREE_ORDER` too (those trees didn't change on 2026-09-18, so one
frozen order covers both eras). The two removed ids were added to
`LEGACY_ID_TRANSLATION` as `null` (points dropped). Druid's Mangle -> Primal
Bite and Primal Fury -> Blood Frenzy are same-slot renames, so positional
decoding needs nothing (ids changed: `feral_mangle` -> `feral_primal_bite`,
`feral_primal_fury` -> `feral_blood_frenzy`). Verified by encoding real old
codes (v2 and unversioned) against the pre-change data from git and
decoding against the new data for Shaman, Paladin, Druid and an untouched
Warrior tree -- all decode to the intended talents.

### Legacy Perks: interactive 3-column tree (`/reference/legacy-perks`)
Rebuilt 2026-09-18 to match the vendor's real Legacy Tree UI (three
columns — Adventure, Resourcefulness, Professions — each row/col/gate/
ranks/req-shaped like a talent tree; see `.reference/deep-dive-images/`
for the actual in-game reference screenshots) instead of the old flat
description-list page. `components/reference/LegacyPerkTreeGrid.tsx` +
`LegacyPerkNode.tsx` reuse `TalentTreeGrid.tsx`'s grid/connector-arrow
layout and `TooltipCard`'s tooltip primitives rather than a parallel UI.
One real geometry difference from class talent trees: every Legacy Perk
prereq (`req` in the vendor data, resolved to `prereq: {id, ranks: 1}` at
data-authoring time in `data/legacy-perks.json`) runs within the same row,
never between rows — so only `TalentTreeGrid`'s existing same-tier
horizontal-connector path (originally built for the rare same-tier class-
talent case, e.g. Paladin Holy Shock → Divine Precision) is ever exercised
here.

`lib/legacy-perks.ts`'s gating (`canAddLegacyPoint`/`canRemoveLegacyPoint`)
is deliberately its own thing, not a reuse of `lib/talent-rules.ts`: a
class talent tier unlocks at a fixed 5-points-per-row formula, but each
Legacy Perk specifies its own explicit `gate` that doesn't follow row math
at all (confirmed in the data: Resourcefulness's row-1 "For Great Honor"
has `gate: 5` while its row-2 neighbor "Gourmand" has `gate: 0`).

**Explicit scope cut, not an oversight:** `LegacyPerkNode` is click-to-add
/ shift-click-or-right-click-to-remove only — no touch-specific tap/
long-press-peek/haptic model ported from `TalentNode.tsx`. This is a
lower-traffic reference page, not the main planner, and the source data
has no confidence/classic-compare fields to show either, so the component
is meaningfully smaller than a straight fork would suggest. Plain clicks
still register via tap-triggers-click on a touch browser; only the extra
mobile affordances (long-press peek, haptic pulse) are missing. Port them
from `TalentNode.tsx` if this page turns out to get real mobile traffic.
Also **not persisted anywhere** — no build-code, URL, or localStorage; the
page is a spend-order scratch pad, not a saved/shareable build like the
main planner.

### A tab rename touches more than tree/tooltip logic
The 2026-09-18 Priest "Shadow Magic" → "Shadow" and Shaman "Elemental
Combat" → "Elemental" talent-tree tab renames (see the session handoff
above) broke two things that weren't visually checked in that same
session's own "verified live" pass, both surfacing only after the fact:

- **`treeBackgroundUrl()`** (`lib/wow-data.ts`) derives its image path by
  slugifying `tree.name` directly — `public/backgrounds/<classId>/<slug>
  .jpg`. Renaming the tree left it requesting `shadow.jpg`/`elemental.jpg`
  paths that didn't exist on disk yet (`shadow-magic.jpg`/`elemental-
  combat.jpg` were the tracked files). Fixed by renaming the actual image
  files to match — the derivation is single-domain (only ever called with
  the talent tree's own name from `TalentTreeGrid.tsx`), so renaming the
  assets is the complete, permanent fix, not a stopgap.
- **`getTreeIcon()`**'s `TREE_ICON_OVERRIDES` map (`lib/wow-data.ts`) is
  shared by two *different* naming domains that happened to be identical
  strings before this rename and no longer are after it: `TalentTreeGrid
  .tsx` calls it with the talent tree's name (now "Shadow"/"Elemental"),
  but `SpellbookBook.tsx` calls it with the trainer-spellbook tab name from
  `data/spellbooks.json`, which the vendor left unchanged ("Shadow Magic"/
  "Elemental Combat" — confirmed by direct inspection, not a mistake to
  "fix" there). Renaming only the override keys orphaned the spellbook's
  lookup, which fell through to the icon fallback and rendered a
  placeholder "?" for both tabs. Fixed by keeping **both** keys
  (`"priest:Shadow"` and `"priest:Shadow Magic"`, same for Shaman) mapped
  to the same icon — this is correct steady-state, not a duplicate to
  clean up later, as long as the two domains stay split.

**The lesson, not just the fix:** a rename like this can propagate through
any code that derives a path/lookup key from the renamed string, not just
the obvious tree-rendering and tooltip call sites a "did the tree still
work in the browser" check would catch. Before considering a tab/tree
rename done, grep the *entire* codebase (components, `lib/`, data files)
for the literal old string, not just the files you already expect to
touch — and don't take an earlier session's "verified live" note as proof
nothing else broke; it verified what it looked at, not everything the
string touched.

### Per-build Open Graph image: a Route Handler, not the file convention
Lives at `app/planner/og/[classId]/[buildCode]/route.tsx` as a plain Route
Handler, not the `opengraph-image.tsx` file convention — that convention
requires the image route to be the terminal segment of its own route,
which isn't possible nested under the planner's catch-all `[[...slug]]`.
`generateMetadata` in `app/planner/[[...slug]]/page.tsx` points
`openGraph.images` at this sibling route once a decoded build has at least
one point spent, falling back to the root layout's site-wide static image
otherwise (no classId/buildCode, or a build with zero points).

### Mobile talent tree interaction model
`components/planner/TalentNode.tsx` + `TalentTreeGrid.tsx` implement a
touch model that's deliberately separate from desktop's plain `onClick`:
- A tap always adds a point — it never toggles into removing one. Removal
  is only the dedicated minus button, shown when that talent's rank > 0.
- A 450ms long-press peeks a talent's tooltip without spending a point.
- **Scroll-vs-tap:** `touchstart` records the touch's start position;
  `touchmove` tracks distance traveled; `touchend` only fires the tap
  action if the touch moved ≤10px total — otherwise it's treated as a
  scroll that happened to graze the icon, and nothing fires (no
  `preventDefault`, so the browser's own scroll/momentum handling isn't
  disturbed).
- The tooltip is a **single overlay instance** (`position: fixed`,
  `pointer-events: none`, via `TooltipCard`) — not part of document flow,
  so it never pushes the grid layout and taps to icons underneath/behind
  it still land. It's dismissed by a real `scroll` event listener, not a
  timeout or a tap-elsewhere handler.
- Adding/removing a point plays a brief scale-pulse plus a
  `navigator.vibrate()` tick, gated to touch-originated changes only (a
  ref set immediately before a touch-driven add/remove, consumed by an
  effect that only reacts to an actual rank change) — a desktop mouse
  click never triggers either.

### Desktop talent tree sizing matches talentsforever.com within 1px (square cells, not their rhythm)
`TalentTreeGrid.tsx`'s desktop sizing is a set of `sm:`-prefixed Tailwind
classes layered on top of the mobile values above — mobile is completely
untouched by any of this (verified live against a real device-emulated
window, not just reasoned about from the class names — see Tooling notes).
Tuned 2026-09-18 by direct pixel measurement (`getBoundingClientRect`, not
their CSS/JS) against talentsforever.com's live tree: their icons render
at 44px on a 24px gap (68px row pitch); ours now measures 43px icons, 24px
gap, 67px pitch — within 1px of every one of their numbers. Concretely:
panel width `sm:max-w-[296px]`, grid gap `sm:gap-5`, column floor
`minmax(44px, 1fr)`, with the connector bar thickness, arrow triangle
size, and rank-badge text size all given matching `sm:`-only reductions so
nothing scaled independently of the icons. The tree group itself is
centered as a unit (`justify-center`, no `sm:justify-start` override) —
a stray override from an earlier width change had been left-aligning it
with a large empty gap on one side once the panels got narrower than the
container.

**Deliberately not matched: their non-square cell rhythm.** talentsforever
's own column pitch (91px) is noticeably wider than their row pitch
(68px) — a rectangular, not square, cell. Ours stays square (`TalentNode`
's `aspect-square` wrapper ties row height to column width via the grid
track), matching their row pitch but not reproducing the wider columns.
**This is a disclosed trade-off, not an oversight** — don't "fix" it into
non-square cells without a fresh explicit decision to do so. Decoupling
row/column spacing to match their rhythm exactly would mean removing
`aspect-square` and giving the grid explicit, separate row and column
tracks, which touches the same cell geometry the connector-arrow
legibility work depended on; matching a proportions difference that's
already within 1px on the dimension that actually matters (row pitch,
since that's what determines whether the tree fits without scrolling)
wasn't judged worth that risk. Also don't assume these exact pixel values
stay right forever — talentsforever.com is a live site that gets its own
updates, so re-measure before trusting the numbers above as still
accurate.

### Single-tooltip-owner mechanism (`lib/active-tooltip.ts`)
Both the talent tree tooltip (`TalentNode.tsx`) and the spellbook tooltip
(`SpellbookBook.tsx`'s `SpellEntry`) share one module-level "which tooltip
is currently allowed to be open" claim, added 2026-09-18 to fix a real
bug: each tooltip used to manage its own visibility purely from its own
mouseenter/mouseleave (and focus/blur) pair via `useHoverTooltip`'s local
state, and a window blur/focus cycle mid-hover isn't guaranteed to
deliver a mouseleave to the element the mouse never actually left — so
alt-tabbing away while hovering one talent, then returning and hovering a
different one, could leave the first tooltip stuck open alongside the
second. Verified fixed by reproducing the actual desync (dispatching
`mouseenter` on one talent, a window `blur` with no matching `mouseleave`
ever fired, then `mouseenter` on a different talent with the first still
never released) rather than just the surface symptom.

`claimActiveTooltip(id)` / `releaseActiveTooltip(id)` / `useIsActiveTooltip
(id)` enforce a hard single-owner invariant: every tooltip's render gates
on holding the claim, not just on its own local show/hide state, so a
different tooltip claiming it (or a window `blur`, handled directly inside
the module) hides a stuck one immediately regardless of whether its own
lifecycle ever fires correctly. It's a plain module-level store, not React
state lifted through a shared ancestor — talent nodes and spellbook
entries are siblings many levels deep with no natural place to hold
shared state, and threading it through every intermediate component would
be its own source of bugs. The spellbook entry releases its claim on the
same delayed timer as its existing hide-on-leave grace period (not
immediately on mouseleave), since releasing early would hide the tooltip
before the player has a chance to move the mouse into it.

**Any future tooltip-like component should use this mechanism from the
start**, not reinvent its own show/hide lifecycle — the failure mode here
(a stuck-open tooltip after a window focus change) is generic to anything
built on hover/focus events, not specific to talents or spellbooks.
`LegacyPerkNode`'s tooltip does not currently use this and would be worth
migrating if that page gets a mobile/touch pass (see the open items above).

### Shared class spellbook component
`SpellbookBook` and `ClassAbilitiesSection` (its "New & changed abilities"
sub-section) are the same components, rendered in multiple places: standalone
at `/reference/class-spellbooks`, and embedded in the planner below the
talent tree, wrapped together in one `Collapsible` that's collapsed by
default. `ClassAbilitiesSection` also wraps itself in its own nested
`Collapsible` when used standalone. Spell tooltip citations
(`TooltipSourceNote`) currently use a strict binary `confirmed` boolean —
see the open item above about inferred-vs-observed sourcing having no
distinct visual treatment yet.

`SpellbookBook` takes a `compareMode` prop (default `false`) that gates a
per-spell "Changed from Classic" word-diff (`TooltipClassicDiff`, built on
`lib/text-diff.ts`'s small LCS diff) shown only when that spell's
`classicStatus === "changed"` and it has a `classicDescription`. The
planner passes its existing `compareMode` state through; the standalone
`/reference/class-spellbooks` page has its own local `compareMode` state
and its own "Compare to Classic" button (mirroring the planner's), since it
has no other shared toggle to reuse. Each `SpellEntry`'s tooltip opens on
whichever side of its row is away from the list's continuation (alternates
by column) via `useHoverTooltip`'s `"left"`/`"right"` placement, and
switches to a bottom-anchored sheet below the `sm` breakpoint via that
hook's `mobileBottomSheet` option — see the open item above, that mobile
path hasn't been seen rendering on an actual narrow viewport yet.

### Per-rank `confirmedRanks` mechanism — retired 2026-09-18
talentsforever's source data used to sometimes carry a per-rank
`confirmed: number[]` array (which specific ranks' text is vendor-verified,
distinct from the whole-talent `confidence` field), and `Talent`
(`lib/wow-data.ts`) had a matching optional `confirmedRanks?: number[]`
that `TalentNode.tsx` used to mark any rendered rank *not* in that list
with a small "(estimated)" note.

Removed this session: the 2026-09-18 pull confirmed 100% of 468 talents at
`complete: true` (extracted directly from the beta client, `src: "beta"`,
not partial stream/demo reads), and `data/talents/*.json` already carried
zero `confirmedRanks` arrays by that point — the mechanism had nothing
left to ever display. `confirmedRanks` is gone from the `Talent` type and
`TalentNode.tsx`'s tooltip no longer has any per-rank estimated marker.

**The whole-talent `confidence` field itself is untouched** and still
flips `estimated → confirmed` when a talent's `complete` flag does
(`ConfidenceBadge.tsx` still renders it) — this removal was specifically
about the now-always-vacuous per-rank marker, not the talent-level
concept. Don't reintroduce `confirmedRanks` without first checking a fresh
`talentsforever-*.json` pull for a nonzero `complete: false` count — if
the vendor ever goes back to partial/estimated extraction, per-rank
confirmation becomes meaningful again and this mechanism (or something
like it) would be worth rebuilding, but re-add it from that evidence, not
speculatively.

### `data/sources/` reorganization (2026-09-23)
Every dated snapshot and pulled-data folder under `data/sources/` used to
sit flat in one directory (12 `talentsforever-*.json` files, a lone
`wowtbc-loot-*.json`, and `foreverchanges_dungeon_data/`/
`foreverchanges_items/` all as siblings) — workable with one source, a
guessing game once there were three. Regrouped by source into
`data/sources/{talentsforever,wowtbc,foreverchanges}/`, each holding that
source's own dated snapshots/pulled data; `diffs/` moved under
`talentsforever/` specifically, since it's only ever a diff between two
talentsforever snapshots. Full layout and what lives in each subfolder is
documented in `data/sources/README.md`'s own "Layout" section — read that
before hunting for a source file by feel.

**Every script (and `lib/whats-new.ts`, the one runtime reader) was
updated to the new paths in the same change**, then verified by re-running
every offline build script that reads from `data/sources/`
(`build-dungeons.js`, `build-items.js`, `build-dungeon-loot.js`,
`build-spellbooks.js`, `build-talent-spell-links.js`,
`diff-talentsforever.js`) and confirming `git diff --stat` showed no
unintended output changes — only `diff-talentsforever.js`'s own diff file
changed, and only in the `oldPath`/`newPath` fields it records verbatim
from the snapshots' new locations, which is the correct, expected
difference. (`build-item-category-labels.js` and
`fetch-gathering-professions.js` do live network pulls and weren't
re-run for this verification -- their path updates are the same
mechanical `path.join` edit as every other script here, not exercised
live.) One unrelated, pre-existing finding surfaced by this verification:
re-running `build-dungeons.js` reverted a hand-edit to the generated
`data/dungeons/hall-of-thanes.json` (quest-96403's faction, "Alliance" →
back to "Both") because the prior commit that made that edit patched the
generated output directly rather than the foreverchanges source file
(`data/sources/foreverchanges/dungeon_data/hall-of-thanes.quests.json`,
which still says "Both" and was open in the editor at the start of this
session) — restored via `git checkout` before committing anything, not
acted on further since it looks like in-progress work on that source
file. If that quest's faction still needs to change, it needs to change
in the source file, or the next `build-dungeons.js` run will revert it
again.

### Daily data-diff workflow
`data/sources/` holds dated, **immutable** snapshots of talentsforever.com's
export (`talentsforever/talentsforever-YYYY-MM-DD.json`) — a new pull
always gets a new dated file, never overwrites an existing one in place
(see `data/sources/README.md`). `node scripts/diff-talentsforever.js` diffs
the two most recent snapshots and writes both a markdown summary and the
raw JSON diff to `data/sources/talentsforever/diffs/` — **this is the
standard first step
before applying any changelog update**, so changes get applied from the
diff's actual field-level output rather than re-transcribing the whole
export by hand. The script is a pure JSON-field diff — it can't see
UI/UX-only changes with no data-level signal, so also read the vendor's own
`changelog` array by hand for those.

**Legacy Perks are diffed by tree+row+col, not name** (fixed 2026-09-18,
when the vendor moved this section from `[name, maxRank, description,
icon]` tuples to full talent-shaped objects —
`name/max/row/col/icon/ranks/gate/req?/placeholder?`, see the Legacy Perks
architecture note below): several placeholder perks share the literal name
"Unknown", and the main transition this data goes through is a placeholder
getting revealed in place, which position-keying reports as one "changed"
entry (with a "(revealed)" marker) instead of a spurious remove+add pair.
The one-time tuple→object transition itself has no sound cross-shape
identity to diff and is called out explicitly in the markdown rather than
guessed at — every pull since is object-vs-object and diffs normally.

**Schema-drift fields are reported as a value-count summary, not spammed
per-talent** (also fixed 2026-09-18): a field that appears on every talent
at once (e.g. `src` going from absent to `"beta"` on all 468 when the
vendor switched to direct beta-client extraction) shows up as one summary
line — count and value distribution — under "New fields seen on talents",
not one "changed" line per talent. Only fields never seen in the old
snapshot get this treatment; a real per-talent value change still shows
individually.

**Match by name (or position, for Legacy Perks — see above), never array
index, when applying a rewrite the vendor reordered.** The racials/
class_racials sections in particular have been reordered by the vendor
before (2026-09-18's pull shuffled both the per-race `classes` list and
the `abilities` array order) — diffing or applying by index there silently
attributes the wrong text to the wrong ability. Match by the vendor's own
`race`/ability `name` fields instead, the same approach used for the
2026-09-18 racials resync (36 general + 12 Priest class-specific abilities,
0 unmatched in either direction) and worth repeating for any future
resync of that section.

### Content-type architecture: shared `lib/content.ts` loader
`lib/content.ts` factors the filesystem/frontmatter plumbing —
`listContentSlugs(dir)` and `readContentFile<Frontmatter>(dir, slug)` (a
thin wrapper around `fs.readdirSync`/`fs.readFileSync` + `gray-matter`,
generic over the frontmatter shape) — out of what used to be duplicated
directly in `lib/guides.ts`. `lib/guides.ts` now calls into it with no
behavior change; `lib/professions.ts` (new) is a second, thin wrapper over
the same loader. **`lib/blog.ts` was not migrated onto this shared loader**
this session — it still has its own independent `fs`/`gray-matter` reads.
That's a real candidate for the same factor-out later, not an oversight to
silently "fix"; it just wasn't part of what this session's task asked for.

Each wrapper module keeps its own frontmatter type and its own behavior on
top of the shared loader: `lib/professions.ts`'s `ProfessionFrontmatter`
has no `tags` field (a profession page's slug already says which
profession it's about), and `getAllProfessions()` sorts alphabetically by
`title` rather than newest-first by `date` (profession pages are evergreen
reference material, not dated posts) — both deliberate, not the guide/blog
shape trimmed down by mistake.

### Reference nav dropdown
`components/site/SiteHeader.tsx`'s `NAV_LINKS` entries can carry an
optional `children: {href, label}[]`; only Reference does (five entries:
Racials, Legacy Perks, Class Spellbooks, Dungeon Level Ranges,
Professions). Desktop is pure CSS (`group`/`group-hover`/
`group-focus-within`, no JS state) — the panel is a sibling `absolute`
div inside a `relative` wrapper around the trigger link, so hovering or
tabbing into the trigger opens it and it stays open as long as focus is
anywhere inside the group. This is also why `<header>` no longer has
`overflow-hidden`: it was clipping the dropdown panel (which needs to
extend below the header's own box), and wasn't actually protecting
anything — it existed to contain a decorative background gradient div
that's currently disabled and, even active, wouldn't have needed the
clip anyway (a `background-image` never paints outside its own element's
box). Mobile renders the same five links indented under "Reference" in
the existing flat mobile menu overlay, not a separate nested toggle.

### What's New (/whats-new): active feature, low-key footer link
Was shelved (unlinked, noindex) until 2026-09-24; now a real feature, in the
sitemap and indexable. It was briefly a primary-nav item, then deliberately
moved (2026-09-25) to a small muted text link in `SiteFooter` -- "discoverable
if you look, not advertised" -- so do NOT re-add it to `SiteHeader`'s
`NAV_LINKS`. The old planner-header badge / `latestChangeCount` prop are still
not restored (a text link near the planner heading is the obvious next
low-key placement if the footer proves too hidden). The homepage card grid is
unchanged (4 cards in a 2-column grid; a 5th would unbalance it).

Two tabs (`WhatsNewTabs`, URL hash `#site` via useSyncExternalStore):

- **In Game** (`InGameSection`): one card per beta build, newest first, from
  `data/patch-notes/<build>.json` (hand-authored; read by `lib/patch-notes.ts`).
  Shape: build/date/title/summary/sourceUrl/sourceNote, optional
  `pendingInData` (things the notes describe that our planner data doesn't
  have yet -- shown in an amber callout), `classes` (classId -> entries),
  `races`, `other` (heading + bullet points, summarized). An entry is
  `{name, label?, kind, spec?, race?, raceId?, oldName?, text, changes?:
  [{label?, before, after}], devNote?}`. `lib/patch-notes.ts` resolves each
  `name` at build time (talent by name, then trainer spell, then Priest class
  racial when `race` is set, or a general racial when `raceId` is set) into
  a small `ResolvedRef` -- so the client never receives whole talent/spell
  datasets. Unresolvable names (removed talents, spells we don't track)
  render as plain names. `PatchNoteRef` is the linked pill + hover tooltip
  (same `useHoverTooltip`/`TooltipCard`/`claimActiveTooltip` pattern as
  `LootItemPill`), `PatchNoteEntryRow` the row (kind badge, summary, diff,
  developer note). Before -> after uses `PatchChangeDiff`, What's New's OWN copy of the
  Compare-to-Classic visual pattern (struck red old words, gold-highlighted new
  words, always-dark card) labeled "Previously"/"Now" -- NOT the shared
  `TooltipClassicDiff`, whose Classic/Forever wording is only correct for
  talent tooltips (a patch change is relative to the previous build, and
  new-in-Forever spells have no Classic state). `TooltipClassicDiff` is back to
  its original unparameterized form; don't add label props to it again.
  Class sections and "Race changes" are collapsible (controlled, class chips
  jump to/open them); "Other changes" is collapsed and muted. The older raw
  talent-diff view (`WhatsNewView` + `lib/whats-new.ts`, fed by
  `data/sources/talentsforever/diffs/*.json`) still exists, now under a
  collapsed "Talent data syncs (raw)" section at the bottom.
- **On the Site** (`SiteChangelog`): `data/site-changelog.json`, a short
  hand-written user-facing list (CLAUDE.md handoffs were the source but are
  too technical to publish as-is).

**Source links (rule):** a build's `sourceUrl` may ONLY be an official Blizzard
forum post -- never foreverchanges.pro or any other third-party aggregator, even
if that's where data was cross-checked. If a build has no official post on
hand, omit `sourceUrl`/`sourceLabel` entirely and say so in `sourceNote` (builds
69977/69913/69893 do this). The link renders in Blizzard blue (darker on the
Light theme).

**Adding a build:** copy an existing `data/patch-notes/*.json`, fill it in,
run nothing else. Check every named thing resolves (a name that doesn't
match a talent/spell just renders unlinked -- fine for removed things, a typo
otherwise). Developer notes are quoted verbatim from Blizzard; everything
else is paraphrased. Builds 69977/69913/69893 are lighter entries (no
Blizzard text was on hand) built from our own data-pull history, with no source
link (see the rule above).

**Verified via** `tsc`, eslint, dev-server HTML and server-rendering the
entry components -- NOT visually in a browser (the extension was not
connected), so hover tooltips, the class chip jump-scroll and the tab switch
are unverified live.

### Dungeon Level Ranges lives under Reference, not Guides
Moved from `/guides/dungeons` to `/reference/dungeons` this session — it's
reference material (a static data chart), not a written guide. The
component moved with it: `components/reference/DungeonsTimeline.tsx` (was
`components/guides/DungeonsTimeline.tsx`); page/chart logic itself is
unchanged. `next.config.ts` has a permanent redirect from the old path.
Don't be surprised to find `/guides/dungeons` referenced in old
conversation history or external links — the redirect handles it, no
further action needed there.

### Professions content type — retired 2026-09-23, folded into Blog + the recipe catalog
This section used to describe an MDX "Professions" content type
(`content/professions/*.mdx`, `lib/professions.ts`, `components/
professions/ProfessionImage.tsx`) rendered at `/reference/professions/
[slug]` — one narrative "new recipes/updates" write-up per profession.
That's gone: the write-ups moved to `content/blog/` (see the Blog note
below), and `/reference/professions/[profession]` is now a real recipe
catalog built from `data/professions/*.json` — see the "Professions
recipe catalog" architecture note above (search for "profession"). If
you see `ProfessionImage`, `lib/professions.ts`, or `content/
professions/` referenced in old conversation history, that's what it
meant — none of those files exist anymore.

### Open Graph images: shared template + file-convention routes
`lib/og-template.tsx` exports `renderOgImage({ title, subtitle?,
backgroundImage? })`, used by an `opengraph-image.tsx` file (the Next.js
file convention, not a Route Handler) colocated in every route segment that
needs one — both static (`/reference`, `/reference/racials`,
`/reference/legacy-perks`, `/reference/class-spellbooks`,
`/reference/dungeons`, `/reference/professions`, `/guides`, `/blog`) and
dynamic-slug (`/guides/[slug]`, `/reference/professions/[profession]`
(reads `catalog.name`/recipe count, not frontmatter — see that route's
own architecture note), `/blog/[slug]`, the latter two pulling `title`/
`summary`/`heroImage` straight from that post's frontmatter). Unlike the
planner's build-code image (see
above), none of these routes sit under a catch-all segment, so the plain
file convention works directly and Next.js wires up the `<meta
property="og:image">` tags automatically — no manual `generateMetadata`
wiring needed. The homepage's own `openGraph.images` still points at the
static `public/images/og/opengraph.png` (unchanged) rather than the new
template, since that PNG *is* the visual reference the template was built
to match — regenerating a pixel-equivalent image via code would be pure
churn.

The template renders the gold hexagon talent-tree mark (same artwork as
`public/images/logo/gold-talent-tree-transparent.svg`, but with path data
embedded directly in `lib/og-template.tsx` rather than read from disk) plus
Cinzel Bold title / EB Garamond italic subtitle / a gold rule /
"FOREVERCRAFT.APP" footer, over a darkened background photo — `backgroundImage`
when given, else the homepage hero, with the same fallback triggering
automatically if a given path doesn't exist on disk (e.g. a profession's
`heroImage` that hasn't been supplied yet, see below). Both font files live
in a new top-level `assets/fonts/` (`Cinzel-Bold.ttf`,
`EBGaramond-Regular.ttf`, `EBGaramond-Italic.ttf` — only the italic is
currently loaded into `ImageResponse`, the other two are there for any
future non-italic EB Garamond use), pulled from Google Fonts' own hosting
via the legacy-user-agent trick that returns real `.ttf` files instead of
`.woff2` (`next/og`'s renderer only accepts ttf/otf/woff).

**Every background image is re-encoded through `sharp` before being
embedded as a data URI, unconditionally** — this isn't optional polish, two
real failures were hit and confirmed by testing directly against this
renderer before adding it: (1) `next/og`'s renderer (satori) cannot decode
WebP passed via a data-URI `<img>` — it crashes the whole response with an
opaque `"u2 is not iterable"` error with no useful stack, while the
identical layout with a JPEG/PNG source works fine, and most of this site's
hero images are `.webp`; (2) a full-resolution source
(`content/blog`'s hero, 5+MB) blows past satori's internal XML buffer limit
once base64-inflated, failing differently (`Resource limit exceeded: Buffer
size limit exceeded`). `readPublicImageAsDataUri` in `lib/og-template.tsx`
resizes every source to 1600px wide (`withoutEnlargement`) and re-encodes
as JPEG q82 regardless of its original format, which fixes both at once.
`sharp` was already present in `node_modules` only as an *optional*
dependency of `next` itself (used internally for `next/image`), which isn't
reliable to import from application code — it's now also a direct
`package.json` dependency for this reason.

### Adding guides/blog/profession content
See `docs/adding-content.md` for the full step-by-step: frontmatter schema,
image conventions and credit-line rules (including the guides/blog vs.
professions difference above), SEO metadata (what's automatic vs. not),
gotchas, and copy-pasteable templates, for all three content types. It's
written from the actual implementation (`next-mdx-remote` + filesystem
reads in `lib/blog.ts`/`lib/guides.ts`/`lib/professions.ts`, the latter two
via the shared `lib/content.ts` loader — see above), not the `@next/mdx`
file-convention routing an earlier description of this project assumed.
