@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever — a race/class/talent
planner, a reference section, and guides/blog content. Not affiliated with
Blizzard, not monetized. This file is the living architecture reference for
the codebase; it's kept in sync with what's actually implemented rather than
serving as a fixed project brief.

Full session-by-session history (what was built, bugs found/fixed, data
pipelines investigated, and every superseded/reverted approach) lives in
`Forevercraft-Knowledge-Base/03-Handoffs/project-history/2026-09-30-claude-md-archive.md` — read it if you need forensic detail on
*how* something was built or verified. This file only covers what's true
*now*: active architecture, data/build protocols, and open items. (Separate
from that archive, `Forevercraft-Knowledge-Base/03-Handoffs/<category>/*.md` holds the individual
per-task handoffs, sorted into category folders, e.g. `maps/` or `data-pipeline/`.)

**New session orientation:** `Forevercraft-Knowledge-Base/01-Projects/Forevercraft/Site-Overview-2026-10-06.md`
(route map, data pipeline end to end, architecture, the week's work, roadmap
state) and `Weekly-Audit-2026-10-06.md` in the same folder (regression,
security, and tech-debt findings with evidence). Both are dated snapshots;
this file wins where they disagree.

Read this file at the start of a session. At the end of a session that did
substantive work (not a quick question), write a handoff into
`Forevercraft-Knowledge-Base/03-Handoffs/<category>/`, following the format
in `Forevercraft-Knowledge-Base/99-Templates/Handoff-Template.md` — don't
improvise a different structure session to session.

## Current state (as of 2026-09-30)

- Planner, reference (racials/legacy perks/class spellbooks/dungeon level
  ranges/professions/items/world map), guides, and blog are all live.
- World map (`/reference/map/[continent]`) covers both continents with a
  full tile pyramid, zone borders/labels, toggleable marker layers
  (entrances, flight masters, towns; blocked categories stubbed, as of
  2026-10-19), and a sidebar (zone list/search/layer toggles), all URL-hash
  restorable. See "World map" → "Marker layers" below.
- Raid comp planner (`/raid-comp`, 2026-10-19): 10/20/40-player roster by
  spec, live buff/debuff coverage from hand-curated `data/raid-buffs.json`,
  role summary, shareable `?r=&n=&s=` link, local saved rosters. See "Raid
  comp planner" below.
- Gear planner (`/gear/<classId>`, 2026-10-21): **Warrior only** at
  `/gear/warrior` (item pool, share codec and UI built; not in the nav or the
  sitemap yet, pending the owner's review). Presets exist for all 9 classes.
  See "Gear planner" and "Gear planner data layer" below.
- No database yet — still static JSON + MDX, Phase 1.

## Standing rule: no runtime-variable or full-file disk reads in server code

No server-side code (pages, route handlers, OG images, `lib/`) may read
`public/` or a large data file via a runtime-variable path
(`path.join(process.cwd(), "public", someVariable)`) or by loading a whole
big file per request. Next's file tracer can't resolve a variable path, so
it bundles the entire directory into **every** serverless function (this
put ~120 MB of `public/map` + `public/images` into all 102 functions,
2026-09-30). Static reference data must be either generated statically at
build time, or served from `public/` and fetched by the client. Where a
server read is unavoidable, use a literal-path lookup map (see
`scripts/build-og-backgrounds.js` → `lib/og-backgrounds.generated.ts`, run
as `prebuild`). This applies doubly to the full wow.export dataset (icons,
dungeon loot, tooltips) landing for Nov 4. After adding any new server-side
file read, re-run `next build` and check the `.next/server/app/**/*.nft.json`
sizes. `next.config.ts` also excludes `public/map/*/tiles/**` from all traces.

**Related: never name a top-level `public/` folder after a page route.** A
`public/gear` folder next to the `/gear/<class>` route made a fresh
`next start` answer that page's first requests with the 404 page
(2026-10-21, reproduced 4 times; renaming the folder to `public/gear-pool`
fixed it 3 of 3). Today's top-level `public/` folders: backgrounds, cursors,
gear-pool, images, map, maps.

## Active architecture

### Planner
- Race is reference-only (not app state, not a URL segment) — it never
  affects talent calculations. `RaceReferenceTable` renders both inline
  below the trees and standalone at `/reference/racials`.
- URL scheme: `/planner/<classId>/<buildCode>` (2 segments), via the
  catch-all `app/planner/[[...slug]]/page.tsx`. Old 3-segment links
  (`/planner/<classId>/<raceId>/<buildCode>`, from when race was a URL
  segment) redirect via `parseSlug()`.
- Point order: separate `?order=<build-code version>.<one char per point>`
  param (`lib/talent-order.ts`), never part of the build code. Levels are
  derived (point i = level 10+i). Missing/invalid/old-version order = no
  "Talent order" panel. Full contract:
  `Forevercraft-Knowledge-Base/03-Handoffs/2026-10-14-talent-order-tracking.md`.
- **The planner page is cached, so never read `searchParams` in `page.tsx`.**
  `?order=` is read client-side in `PlannerFromUrl.tsx` (`useSearchParams`
  under Suspense, fallback = same planner without an order). `/planner` and
  the 9 class pages are prerendered via `generateStaticParams`. Build-code URLs
  render once on first request and are cached (ISR), and `?order=` doesn't
  change the cache key. Reading `searchParams` on the server would make every
  planner visit a server render again (Fast Origin Transfer, 2026-10-19).
- Per-build OG image: `app/planner/og/[classId]/[buildCode]/route.tsx`, a
  Route Handler (not the `opengraph-image.tsx` file convention, which
  can't be the terminal segment under a catch-all). `generateMetadata`
  points at it once a build has ≥1 point spent, else falls back to the
  site-wide static image.

### Build codes are versioned (`lib/build-code.ts`)
Encoding is positional (one base36 rank digit per talent, ordered by tier
then col, trees joined with `-`) with no name/id tie-back — so any change
to a tree's talent membership/order needs a version bump, or old shared
links silently decode to the wrong talent. `encodeBuild` prepends a
version segment (currently `6`); `decodeBuild` branches: versioned codes
decode against current tree order, legacy/old-version codes decode
against a frozen snapshot (`LEGACY_TREE_ORDER`/`V2_TREE_ORDER`) + an id
translation table, then clamp to current `maxRank`. Frozen snapshots now
run `LEGACY`/`V2`/`V3`/`V4`/`V5_TREE_ORDER` (v4 Druid Feral 2026-10-01, v5
Warrior Fury/Protection 2026-10-03, v6 Priest/Shaman/Mage/Warlock 2026-10-15).
Frozen orders merge **per tree** (`mergeOrders`), so two snapshots can freeze
different trees of one class (Shaman: V2 Elemental, V5 Restoration).

**The next time a tree's talent membership or order changes**, bump
`CURRENT_VERSION` and add a new frozen order snapshot + translation table
for whatever changed, following the existing pattern — don't remove the
versioning machinery just because it looks unused most of the time.

### Raid comp planner (`/raid-comp`)
Built 2026-10-19. Feature shape learned from wowtbc.gg's raid comp planner
(mechanism only; none of its code, data, icons or design was copied).
Handoff: `Forevercraft-Knowledge-Base/03-Handoffs/2026-10-19-raid-comp-planner.md`.
- **Files:** `app/raid-comp/page.tsx` (static ○ server shell),
  `components/raid-comp/{RaidCompFromUrl,RaidCompPlanner,CoveragePanel,StackingRules,HowToUse}.tsx`,
  `lib/raid-comp.ts` (client-safe core: frozen spec list, roles, coverage,
  share-link codec), `lib/raid-buffs.ts` (server-only resolver),
  `lib/saved-rosters.ts` (localStorage), `lib/raid-comp.test.ts`,
  `app/raid-comp/opengraph-image.tsx`. Top-level "Raid Comp" link in
  `SiteHeader`.
- **Client bundle stays small on purpose:** `lib/raid-comp.ts` must not
  import `lib/wow-data` (it pulls every talent file into the client). The
  page resolves spec icons/colors (`SpecView`) and effect icons + Forever
  tooltip text (`EffectView`, via `lib/raid-buffs.ts`) on the server and
  passes them down. Effect rows are native `<details>` (tap to expand), not
  `TooltipCard` hovers, for the same reason and because hover doesn't
  exist on touch, so `active-tooltip` isn't involved.
- **Data: `data/raid-buffs.json` is hand-curated, never generated.** 49
  effects (raid / group / single-target buffs, enemy debuffs), each with
  sources `{classId, specs: "all" | [tree], spell | talent, confidence,
  note}`. `"all"` = a spell every class member learns; a talent (or a
  spellbook spell flagged `talent: true`) is credited only to its tree.
  `onlyOneCounts` sets (stacking: major/minor armor, -204 AP, -2% hit,
  armor proc) and `perCaster` sets (one-at-a-time: Blessings, Auras,
  Judgements, Curses, air/water totems, hunter pets). Sets may carry an
  `evidence` array (url, era the source describes, what it says), never
  rendered: the web research behind the rule. A set is `confirmed` only on
  an official Blizzard source or a specific in-game test. Top-level `source` +
  `build` record provenance (verified against build 1.60.1.70425 spell
  text). `scripts/check-raid-buffs.js` runs first in `prebuild` and fails
  the build if any spell/talent/tree/set reference stops matching
  `data/spellbooks.json` / `data/talents/*.json`. **After every talent or
  spellbook sync, re-read the effects' Forever text** (the check only
  catches names, not changed numbers or scope), and update `build`.
- **Coverage is spec-level:** a slot covers an effect if its spec can
  provide it (no talent builds, no pet choice). Group-scope effects only
  reach the provider's group. `perCasterShortfalls` adds caster-limit notes
  when casters < covered effects in a set (per group for group-scope sets),
  merging identical per-group shortfalls into one entry with `groups[]`:
  "1 Paladin per group for 3 Auras, one at a time (Groups 1, 2, 4)". A
  group with a different caster count gets its own line. Each icon has a
  source-count badge.
- **Layout (2026-10-19):** page grid is groups | coverage on `lg`
  (`[minmax(0,1fr)_20rem]`), plus a third sticky `17rem` column on `xl` for
  `StackingRules` (caster-limit notes + every `onlyOneCounts` set with its
  members' classes). On `lg` the rules sit below the groups, on phones
  after coverage. **Collapsed by default:** a "Stacking rules · N active"
  toggle in the role-summary row (N = caster notes + only-one-counts sets
  the roster doubles up on) opens it; its own Hide button closes it.
  Collapsed = not rendered, and the `xl` third column class is applied only
  while open, so the grid returns to two columns. Opening below `xl`
  scrolls the section into view. The choice is remembered in localStorage
  (`forevercraft:raid-comp-rules-open`, "1"/"0", read after mount, every
  access in try/catch, same as the quest faction filter). Each
  only-one-counts entry is a compact one-liner (members + classes, "N in
  your roster" when doubled up); its sourced note is behind a per-entry
  "why" (native `<details>`, like coverage rows).
  **Unreproduced glitch (2026-10-19):** once, after a navigation, the key
  read "0" while the section rendered open. Two exact repeats with a trace
  in `toggleRules` showed no write. Likely a click in another localhost tab
  (storage is shared), unconfirmed. Only investigate with a real repro. Either way the rule list never pushes coverage down; keep
  rules out of `CoveragePanel`. Class names there use `CLASS_COLOR` (via
  `SpecView.color`) with `CLASS_TEXT_SHADOW` from `lib/class-text.ts`
  (shared with the planner's `ClassHero`; client-safe, no `lib/wow-data`).
  Pet-family abilities (`perCaster: "hunter-pets"`) show as "Hunter pet".
  Role chips borrow spec icons: Protection Warrior (Tank), Restoration
  Druid (Healer), Fury Warrior (DPS).
- **Raid size (10/20/40):** `roster`/`names` always hold 40 slots; a smaller
  size only hides groups (switching back up restores them) and coverage,
  roles and counts use the visible `roster.slice(0, size)`. The share link
  and saved rosters encode only the visible slots, so hidden slots survive
  size switches but not a reload or a shared link.
- **Share link:** `?r=1-<base36 digit per slot>&n=<names>&s=<10|20>` (`s`
  omitted at 40, so pre-size links still open as 40-man). Digit = 1-based
  index into `SPEC_ORDER` (0 = empty), trailing empties trimmed (full raid
  = 42 chars). **`SPEC_ORDER` is frozen**: never reorder or remove entries
  (a renamed tree changes `tree` in place; new specs append). If that ever
  can't hold, bump `ROSTER_CODE_VERSION` and branch in `decodeRoster`, as
  with build codes. Names are percent-encoded, joined by `~` (stripped from
  names), max 12 chars. Read client-side (`useSearchParams` under
  Suspense); written with `history.replaceState`. Never read
  `searchParams` in `page.tsx` (keeps the page static, same rule as the
  planner). **Verified 2026-10-19 against `next start`:** `/raid-comp` is
  `compute: static`, `initialRevalidateSeconds: false` in the prerender
  manifest; five different `?r=&n=&s=` URLs all returned
  `x-nextjs-cache: HIT` with byte-identical HTML and no new files under
  `.next/server/app` or `.next/cache`, while each new planner build path
  was a MISS (server render + new ISR entry). Shared rosters cost no renders.
- **Saved rosters:** `lib/saved-rosters.ts` mirrors `lib/saved-builds.ts`
  (key `forevercraft:saved-rosters`, `{id, name, query, createdAt}`, newest
  first). `query` is the share-link query, so loads go through the same
  versioned decoders. Save / My Rosters dialogs copy the planner's. Local
  only: no build-tracking events.
- **SEO:** title/description, canonical `/raid-comp` for every shared
  roster, openGraph, `WebApplication` JSON-LD (as on the planner), a
  two-paragraph how-to (`HOW_TO` in `page.tsx`, 2026-10-20) behind a "?"
  in the controls row (`HowToUse.tsx`), with one visible tagline under the
  h1. The how-to is a native `<dialog>` that's always mounted (hidden until
  `showModal()`), so the text is in the prerendered HTML. **Don't swap it for
  the house `Dialog`**, which unmounts when closed and would drop the text
  from the static HTML. A modal `<dialog>` sits above `CustomCursor`'s
  overlay (top layer), so `globals.css` swaps to the native gauntlet
  cursors while `html:has(dialog:modal)`. `/raid-comp` in
  `app/sitemap.ts`. `app/robots.ts` disallows `/raid-comp?` (shared-link
  variants), like `/planner/*/`; `/raid-comp` itself is allowed.
- **Sticky specs bar (2026-10-20):** the Specs section (controls row + grid)
  is `sticky top-0` at every width; a ResizeObserver writes its height to
  `--specs-h` on the planner root, which offsets the sticky coverage and
  rules columns (`top`/`max-h`) and `#stacking-rules`' `scroll-mt`. Below
  `sm` it's trimmed (owner wanted it on phones, but shorter): the "Specs"
  h2 is `sr-only`, and `SpecGrid compact` uses 28px icons and tighter gaps
  (269px at 390px; `sm`+ unchanged).
- **Interaction:** tap a palette spec to arm it, then tap slots; tapping
  an empty slot with nothing armed opens a spec picker (`Dialog`); tapping
  a filled slot then another moves/swaps. Desktop adds HTML5 drag (palette
  → slot, slot ↔ slot), which never fires from touch. The status bar is
  `fixed` at the bottom so it never shifts the grid (a sticky in-flow bar
  caused mis-taps).
- **Roles:** default role per spec (Feral = "flex", shown as "+N Feral"
  on Tanks and DPS). Soft hints from 10 players up: no tanks, or healers
  under 20% of the roster (rule of thumb, not a game rule).

### Gear planner (`/gear/<classId>`, Warrior only, 2026-10-21)
Handoff: `Forevercraft-Knowledge-Base/03-Handoffs/gear-planner/2026-10-21-gear-planner-pool-codec-ui.md`.
- **Item pool** (`node scripts/build-gear-pool.js [classId]` →
  `public/gear-pool/<level>/<class>.json`, client-fetched, never read on the
  server). One row per base item (`itemId`, name, icon, quality, item level,
  catalog slot and type, parsed `stats`, `armor`, `weapon`, `fromLevel`,
  `sides`, `requires`, unique / `uniqueGroup`, a `suffixes` flag); **no
  tooltip text** (the item page has it). Plus a `suffixes` slice (the
  `SuffixData` its items need, so `lib/item-suffixes.ts` computes rolls in
  the browser), the usable `enchants`, the class `presets` (scores dropped)
  and `baseStats` per race at that level, so the page makes one fetch. Warrior:
  1,519 items, 319 with suffixes, 107 enchants, 375 KB (~50 KB gzip).
  - **Window:** source-derived level (`gear-availability.js`, not "Requires
    Level", which 312 of Warrior's pool items lack) from 20 to the level, plus
    every item the class's presets use: the class Insignias (level 1, rank
    gated), Minor Recombobulator (crafted, from 10) and a few 17-19 picks
    would otherwise drop out. The generator fails if a preset item is missing.
  - **Eligibility is shared** with the preset generator in
    `scripts/lib/gear-pool.js` (`classBaseItems`, `expandSuffixes`,
    `classifyRequirement`); presets came out byte-identical after the move.
  - **Capital vendors:** a `sources.json` vendor in one capital ("Orgrimmar,
    in Classic") now sells to that faction only (88 items; Insignia of the
    Horde / Alliance were both-faction before).
  - `lib/gear-pool.test.ts`: every preset item is in its pool for its side,
    no tooltip field, the window rule, and the pool's suffix slice reproduces
    the full suffix data for every flagged item.
- **Share codec** (`lib/gear-code.ts`, test `lib/gear-code.test.ts`):
  `?g=<version>.<a|h>.<slot>...` over the frozen `GEAR_SLOTS`; each slot is
  `base36(itemId)[_base36(suffixId)][-base36(enchantId)]`, trailing empties
  trimmed, only `[0-9a-z._-]` (URLSearchParams leaves it unescaped). A full
  set is about 125-135 characters. `GEAR_CODE_VERSION` = 1: bump it and branch
  `decodeGear` if a slot's meaning changes. `pickProblem` / `decodeGear`
  validate each slot against the pool and `lib/gear-classes.ts` (faction,
  slot, dual-wield level, shields, no off hand under a two-hander, the item's
  own suffix rolls, a roll required on suffix items and refused on plain ones,
  enchant slot/type/item level, unique items and unique groups) and **keep
  what's legal, listing why the rest was skipped**, so a stale link still
  opens. No name or race in the link yet (saved sets keep the race).
- **UI** (`app/gear/[classId]/page.tsx`, `components/gear/*`): a static ●
  page per class in `GEAR_PLANNER_CLASSES` (`lib/gear-config.ts`),
  `dynamicParams = false`. `GearFromUrl` reads `?g=` under Suspense (never
  `searchParams` in `page.tsx`); `GearPlanner` fetches the pool and writes
  the code back with `history.replaceState`. Verified 2026-10-21 against
  `next start`: `/gear/warrior` is `compute: static`, and four different
  `?g=` URLs return the same cached HTML (HIT); the route's trace is 2.46 MB
  with no pool, preset or base-stat file.
  - `SlotGrid` (paper doll: armor left, jewelry right, weapons below; one
    column on phones with the sheet after the slots), `RequirementChips`
    (profession / reputation / PvP rank), preset select with the disclaimer
    (a set identical to a preset reads as that preset; any hand edit makes
    it "Custom set"), Alliance/Horde toggle (a preset follows the faction, a
    custom set keeps what the other faction can use and lists the rest).
  - `StatSheet` + `lib/gear-sheet.ts` (`computeSheet`, tested): race base
    stats (race select, derived races flagged estimated) + item stats +
    suffix roll + enchant; health/mana by the Classic formulas, armor + 2 ×
    Agility, no crit/hit/AP derivation (Forever's conversions are unknown).
  - `SlotPicker`: a right-side drawer (the sheet stays visible on wide
    screens), empty search = the preset's ranked list (pins and alternates
    tagged), typing = name search over the pool (60 max, best quality first).
    Each row shows its top stat changes (phones get the preview without
    hover); hover/focus previews the change on the sheet. **Click/tap expands
    a row** (one at a time) to the slot tooltip's detail (`ItemDetail` in
    `SlotTooltip.tsx`) plus an Equip button; nothing equips on the row click.
    Illegal picks still expand, with Equip disabled and the reason. The
    equipped item's suffix roll and enchant are chosen in the drawer.
  - Enchant text everywhere is the effect only (`enchantEffect` in
    `lib/gear-sheet.ts`, the numbers the sheet applies), never the name. In
    the enchant select, the short name is added only where two options on
    that item read the same (5 pairs on 70374 data: Minor/Lesser Stats,
    Defense/Greater Defense, etc., probably stale values). A recipe whose
    formula has no known source reads "(Leatherworking (135) pattern, source
    unknown)": the Forceful/Mystic armor kits are pattern-taught, and our data
    has no source for those patterns (Merchant's Favor only lists the kits as
    turn-ins).
  - Slot hover tooltip (`SlotTooltip`, desktop hover only, `active-tooltip`
    claim). "Requires Level N" comes from the tooltip line
    (`build-gear-pool.js`), never the catalog `requiredLevel` field, which
    holds a placeholder 1 on 25 Warrior items with no line; items without a
    line say "obtainable from level N" (`fromLevel`).
  - `GearActions`: Share (copies the address bar), Save and My Sets
    (`lib/saved-gear-sets.ts`, key `forevercraft:saved-gear-sets`, per class,
    stored as the share code plus race, loaded through `decodeGear`).
  - "?" how-to: `components/raid-comp/HowToUse.tsx` (now takes `title`/`id`),
    rendered above the loading gate so the text is in the prerendered HTML.
  - Client components import display helpers from client-safe
    `lib/item-display.ts` (moved out of `lib/wow-data.ts`, which re-exports
    them), never `lib/wow-data.ts`.
  - **Not done yet:** the other 8 classes' pools and pages, a nav link,
    sitemap and `robots` entries (disallow `/gear/*?` like raid comp), an OG
    image, set names and race in the link, talents in the link.

### Gear planner data layer (built 2026-10-20)
Planned feature: standalone `/gear/<classId>`, level 30 first, level as a
parameter throughout. Decided by the owner on 2026-10-20: generated presets
(weights plus an override file, all `estimated`), no 3D viewer, cmangos base
stats, raid-comp-style "?" how-to `<dialog>`. Investigation and design:
`Forevercraft-Knowledge-Base/03-Handoffs/2026-10-20-gear-planner-investigation.md`.
The pool, codec and UI are in "Gear planner" above. Presets exist for all 9
classes (38 variants × 2 sides, generated 2026-10-20), pending the owner's
review; per-class status is under "Presets" below.
- **`lib/item-stats.ts`** (pure, erasable TS, so build scripts `require()` it
  under Node 24 type stripping): `parseItemTooltip` sorts every tooltip line
  into stats / armor / weapon damage / meta / set bonus / unscored effect /
  `unparsed`; `parseEnchantText` turns an enchant's `Use:` prose into target
  slots, stats, armor, flat weapon damage, `minIlvl` (procs are effect-only).
  Stat keys in `STAT_KEYS`: Forever ratings (`critRating`) and Classic
  percentages (`critPct`) stay separate keys, and Spell Power / Spell Damage /
  Healing are distinct, as in Forever tooltips. Conditional bonuses ("Attack
  Power Vs Undead", weapon skills) are effects, not stats. A shield's
  "N Block" line counts as `blockValue` (foreverchanges leaves it out).
  Keeps `uniqueGroup` ("Unique-Equipped: Rune of Battle (1)").
- **Coverage:** `node scripts/report-item-stat-coverage.js` writes
  `docs/item-stat-coverage.md`; re-run after every item pull. As of the 70374
  catalog: 11,969 / 11,976 equipment items (99.9%) clean, 0 unparsed lines;
  the 7 misses are "Damage set by hand" placeholder weapons and armorless
  shirts. A test fails if any equipment item gains an unparsed line.
- **`lib/gear-slots.ts`:** `GEAR_SLOTS` is **frozen** (share codes will be
  positional over it: never reorder or remove, append only, same rule as
  `SPEC_ORDER`). `CATALOG_SLOT_TO_GEAR_SLOTS` maps `data/items.json` slot
  strings (One-Hand → main/off, Relic/Thrown → ranged). 11,876 / 11,998
  weapons+armor map; the rest are shirts/tabards (`NON_PLANNER_CATALOG_SLOTS`)
  or `slot: null` non-equipment (conjured stones, seals, quest items).
- **`lib/gear-config.ts`:** `GEAR_LEVELS`, `DEFAULT_GEAR_LEVEL`,
  `maxProfessionSkill(level)` (Classic rank gates, caps enchants a preset
  assumes). **`lib/gear-classes.ts`:** per-class proficiencies (`canEquip`),
  all 9 classes, Classic trainer rules, `estimated`: armor tier by level,
  shield, weapon types, `twoHand` (types allowed as a two-hander when narrower,
  e.g. Mage staves only, Rogue none), ranged-slot catalog slots, dual-wield
  level, and `relic` (Libram / Idol / Totem). Agrees with foreverchanges'
  per-class pools. **Forever changes from Classic** (listed in the file's
  header; add new ones there): Druids use two-handed Polearms (confirmed by
  the owner 2026-10-21; nothing in our own sourced data mentions it).
- **`data/base-stats.json`** (`node scripts/build-base-stats.js [--check]`):
  level 1-60 → class → race → str/agi/sta/int/spi/health/mana from cmangos
  classic-db `player_levelstats` + `player_classlevelstats`, pinned to commit
  `28ef6259` (last change to `Full_DB/`, 2024-01-17). `basis` per entry:
  `classic` (`datamined`, Classic values not verified for Forever),
  `race-offset` (pairs new in Forever such as Undead Paladin, Dwarf Shaman;
  `estimated`; leave-one-out error 0.09 per attribute), `class-average`
  (Skyborne, no Classic row; `estimated`; leave-one-out error 2.49, p95 6).
  419 KB for all 60 levels: import a slice server-side, never into a client
  bundle.
- **`data/gear/enchants.json`** (`node scripts/build-gear-enchants.js`):
  194 enchants from the Enchanting/Engineering/Leatherworking/Blacksmithing
  catalogs, id = the enchant item's `itemId`, stats parsed from that item's
  Forever tooltip. The script exits 1 on an unrecognised target or leftover
  number. No Arcanums / ZG / Argent Dawn shoulders yet (no profession recipe;
  all 50+). Each entry has `learnedFrom` (`trainer` | `recipe`, from the
  catalog's `source`), `recipeItemIds` (the "Formula:/Pattern:/Schematic:/
  Plans:" items, matched by name) and `recipeSourced` (trainer, or a formula
  with a known source via `gear-availability.js`). As of 70374: 61 trainer, 66
  recipe with a sourced formula, 63 recipe whose formula has **no known source
  in our data** (all 38 Forever-new formulas among them, plus Classic ones such
  as Crusader), 4 with no formula item. That's a gap in foreverchanges'
  `sources.json`, not proof they're unlearnable (foreverchanges treats
  Necklace - Strength and the Forever armor kits as learnable), so presets
  don't filter on it; the UI can flag it.
- **Presets** (`node scripts/build-gear-presets.js [classId]`):
  hand-written `data/gear/preset-weights.json` (per variant: weights;
  `mainHand` one mode or a list of two-hand / one-hand-shield /
  one-hand-off-hand / dual-wield, the best-scoring main + off pair wins;
  optional `mainTypes`; `groups` such as `pvp`, `caster`) and
  `data/gear/preset-overrides.json`: `_groups` (shared `alternates` and forced
  `enchants` for every variant in a group: `pvp` offers Minor Recombobulator
  and Net-o-Matic as trinket alternates and forces Boots - Minor Speed;
  `caster` forces Weapon - Revelation; `caster-pve` pins Minor Recombobulator
  in trinket 2; groups may carry `pin`, which sits under the class's and
  variant's own), `_excludeEnchants` (never picked: the
  three enchants with no known recipe, Minor Stats and Cloak - Defense, whose
  values changed after our item pull), and per class `exclude`, a class-wide
  `pin` (the relic) and per variant `pin` / `enchants` / `alternates`. Every
  entry is `{id, reason}`; the generator fails on a missing reason or an id it
  can't place. Output `data/gear/presets/<class>.json`: per variant and side
  (`a`/`h`) a loadout, `suffixes` (slot → suffix id for random-suffix picks),
  enchants, a `requires` map (slot → `[{kind, text}]`, kind `profession` |
  `reputation` | `pvpRank` | `override`, for the UI) and a ranked list per
  slot: pins (tag `pin`), then alternates (tag `alternate`, offered but not
  picked), then the scored top 6 (entries may carry `suffixId`). **Candidates
  are suffix-aware**: an item with a bonus tree becomes one candidate per roll
  (base + suffix stats, `lib/item-suffixes.ts`), never a bare base. A slot no
  weighted enchant fits gets the most-armor enchant (caster cloaks). Eligibility uses
  `scripts/lib/gear-availability.js`: many Forever quest rewards and drops
  have **no "Requires Level" line**, so the obtainable level comes from the
  quest's required level / dungeon minimum level (crafted: the level the
  profession skill is trainable at), and the faction from the quest side.
  Items with no known source are dropped (test records like "Bad Hat").
  Gated items are never ranked; a **pin** may take one gated by a profession
  trainable by the level (Minor Recombobulator, Net-o-Matic), a reputation
  (Defiler's / Arathor Talisman), or a PvP rank. No tooltip shows a rank, so
  rank gates come from the client's `ItemSparse.RequiredPVPRank`
  (`data/sources/client-db2/1.60.1.70450/itemsparse.csv`, 449 items; value −
  4 = Classic rank, so Insignia's 6 = rank 2, Corporal / Grunt). A
  faction-only reputation (The Defilers, League of Arathor, the BG factions)
  also limits the item to that side. A pin can be one entry or `{a, h}` per
  side, and may add `requires: [text]` for a gate no data shows (kind
  `override`). **Use-effect trinkets and relics score 0** (effects aren't
  weighted), so they're pinned. The pattern for every class:
  - **PvP:** trinket 1 = the class Insignia, trinket 2 = Talisman of Arathor
    (A) / Defiler's Talisman (H), per side; the Engineering pair stays in the
    ranked list as alternates. Forever's Horde Paladins and Alliance Shamans
    have no Insignia (Classic made none), so that side pins only the talisman.
  - **Melee PvE:** Cursed Murloc Eye + Minor Recombobulator. **Tanks:** Minor
    Recombobulator + Rune of Duty. **Caster / healer PvE** (`caster-pve`
    group): trinket 1 = the generator's best stat trinket, trinket 2 = Minor
    Recombobulator (its on-use mana and health outweigh the +2 mp5 / +6 Spirit
    trinkets, and use effects aren't scored); Dog Whistle offered as an
    alternate. The rule for a pin: an on-use or equip effect the scoring can't
    see; plain itemization taste stays with the generator.
  - **Relics:** Tenets of the Silver Hand (Paladin), Mystic Mushroom (Druid
    casters; Idol of Shifting Tides for Horde ferals, Alliance can't get it per
    our quest data), Polished Driftwood Icon (Shaman).
  - **Weights:** healers value Healing and Spell Power at 0.5 (the client budget
    prices a Healing point at about a quarter of a primary stat); two-school
    casters (Warlock, Balance, Elemental) weight their main school below
    all-school Spell Power, or "of … Wrath" suffixes win everywhere.
  - **Match vs foreverchanges, both sides (2026-10-21, ring and trinket pairs
    compared as pairs; identical / identical + in their ranked list / enchants
    identical):** Warrior 55 / 78 / 61%, Paladin 41 / 71 / 56%, Hunter 56 / 74 /
    63%, Mage 57 / 82 / 68%, Rogue 59 / 78 / 70%, Priest 54 / 82 / 72%, Warlock
    38 / 81 / 69%, Druid 49 / 76 / 61%, Shaman 51 / 81 / 69%. 6–10% of their picks per class aren't offerable to us
    (no source in our data or not in our catalog; Paladin 21 of 200). The PvP
    trinket pins differ from theirs by design.
  Each
  preset file carries a `disclaimer` string the UI must show wherever a
  preset is displayed: generated starting point, not a definitive BiS claim,
  build and share your own. `lib/gear-presets.test.ts` checks every generated
  pick is legal and that `requires` starts with the item's tooltip lines.
- **Random suffixes** (`node scripts/build-gear-suffixes.js [build]` →
  `data/gear/suffixes.json`, 82 KB, `confidence: "datamined"`; read through
  `lib/item-suffixes.ts` `itemSuffixes(item, data)`, pure, callers pass the
  JSON in). Forever has no Classic ItemRandomProperties / ItemRandomSuffix; it
  uses retail-style bonus lists, all in the client. Source:
  `data/sources/client-db2/1.60.1.70450/` (`itemxbonustree`,
  `itembonustreenode`, `itembonus`, `randproppoints`, `itemnamedescription`,
  `itemsparse`), trimmed by `node scripts/trim-client-db2.js <wow.export dir>
  <build> <tables>` from the owner's wow.export export (row-for-row identical
  to wago.tools' 70450 tables).
  - **Eligibility:** `ItemXBonusTree` (item → tree) → `ItemBonusTreeNode` rows
    of that tree with ItemContext 0 → `ChildItemBonusListID`; a list is a
    suffix when it has a name (ItemBonus type 5 → `ItemNameDescription`).
    Covers 1,758 items over 75 shared trees (300 suffixes). Not covered: 50
    items whose tree nests trees or uses item contexts (Forever's "Restored …"
    set, an upgrade system), and the dev list "Test".
  - **Stats:** ItemBonus type 2 (`Value` = stat id, allocation /10000) →
    `round(RandPropPoints[itemLevel][quality][group] × allocation / 10000)`;
    groups 0 head/chest/legs/2H, 1 shoulder/waist/feet/hands/trinket, 2
    wrist/neck/back/finger/shield/held off-hand, 3 one-hand, 4 ranged. The
    item's own fixed stats stay on its tooltip. Type 23 is an **ItemEffect** id
    (only "of Eluding": 213334 → spell 13669 "Increased Dodge 1", +1% dodge,
    per wago's 70450 tables). Decoding it from our own export needs
    `ItemEffect`, `Spell` and `SpellEffect` (`EffectBasePointsF` fills `$s1`);
    not exported yet, so the page says "plus an equip effect (not decoded
    yet)". Type 54 rows are
    zero-valued flags. The script fails on an unmapped stat id or bonus type.
  - **Stat ids:** each mapped to a `STAT_KEYS` key by evidence (the formula on
    ItemSparse base items vs our parsed tooltips, plus the suffix names): 51-56
    resistances (53 holy unused), 84-89 school spell damage ("of … Wrath"). Ids
    83 and 90+ appear only on base items and stay unmapped.
  - **Verified:** the formula reproduces 4,466 / 4,557 ItemSparse base items'
    fixed stats against our tooltips; 232 / 232 foreverchanges suffix items
    (their numbers only graded ours; the 5 "differences" are a shield's base
    block value they don't count). Wowhead's "<Random enchantment>" marker
    agrees on 9 of 12 sampled tree items it has and all 5 non-tree items; the
    3 it lacks (Cerulean Talisman, two Forever thrown weapons) are stat-less
    greens, which is what a suffix base looks like (1,582 of the 1,711 tree
    items in our catalog have no fixed stats).
  - **Presets use them** (one candidate per roll); the item pool (not built) must too.
  - `scripts/lib/csv.js` is now quote-aware (ItemSparse has `;` and a newline
    inside quoted descriptions) and fails on a row whose field count is off.

### Mobile talent tree interaction (`TalentNode.tsx`/`TalentTreeGrid.tsx`)
- Tap always adds a point (never toggles remove — removal is the
  dedicated minus button).
- 450ms long-press peeks a tooltip without spending a point.
- `touchmove` distance >10px before `touchend` = scroll, not a tap (no
  `preventDefault`).
- Tooltip is one `position: fixed`, `pointer-events: none` overlay
  (`TooltipCard`) — dismissed on a real `scroll` listener.
- Point add/remove plays a scale-pulse + `navigator.vibrate()` tick,
  gated to touch-originated changes only.

### Desktop talent tree sizing
Tuned to match talentsforever.com within 1px (43px icons / 24px gap /
67px pitch) via `sm:`-prefixed classes layered on the mobile values —
mobile is untouched. **Deliberately square cells, not their rectangular
rhythm** (their column pitch is wider than their row pitch) — don't
"fix" this into non-square cells without a fresh explicit decision; it
touches the same geometry the connector-arrow layout depends on.
Re-measure before trusting these exact pixels — talentsforever.com is a
live site that changes.

### Single-tooltip-owner mechanism (`lib/active-tooltip.ts`)
Talent tree and spellbook tooltips share one module-level "which tooltip
may be open" claim (`claimActiveTooltip`/`releaseActiveTooltip`/
`useIsActiveTooltip`) instead of each managing its own hover/focus state —
fixes a stuck-open tooltip after an alt-tab mid-hover (a window blur isn't
guaranteed to deliver a matching mouseleave). **Any future tooltip-like
component should use this from the start.** `LegacyPerkNode`'s tooltip
does not yet use it (would be worth migrating if that page gets a mobile
pass).

### Shared class spellbook component
`SpellbookBook`/`ClassAbilitiesSection` render both standalone
(`/reference/class-spellbooks`) and embedded in the planner (collapsed by
default). `compareMode` prop gates a per-spell Classic word-diff
(`TooltipClassicDiff`, built on `lib/text-diff.ts`) for spells whose
`classicStatus === "changed"`. The old per-rank `confirmedRanks`
"(estimated)" marker was retired 2026-09-18 once the vendor data hit
100% `complete: true` — don't reintroduce it without checking a fresh
pull for nonzero `complete: false` first.

**Lesson from the 2026-09-18 Priest/Shaman tab rename:** renaming a
tree/tab name can silently break anything that derives a path or lookup
key from that string (background image slugs, icon-override maps) even
outside the obvious tree-rendering call sites — grep the whole codebase
for the literal old string before considering a rename done.

### Content-type architecture (`lib/content.ts`)
`listContentSlugs(dir)`/`readContentFile<Frontmatter>(dir, slug)` factor
the filesystem/frontmatter plumbing shared by `lib/guides.ts` and
`lib/professions.ts` (professions are evergreen reference material —
sorted alphabetically, no `tags`). **`lib/blog.ts` still has its own
independent implementation**, not migrated onto the shared loader — a
real candidate for the same factor-out, not fixed yet.

### Reference nav dropdown
`SiteHeader.tsx`'s `NAV_LINKS` entries support `children: {href, label}[]`
(top-level links: Planner, Raid Comp, Reference, Guides, Blog) — only Reference does (Racials, Legacy Perks, Class Spellbooks, Dungeon
Level Ranges, Professions). Desktop is pure CSS (`group`/`group-hover`/
`group-focus-within`), no JS. `<header>` has no `overflow-hidden` (it was
clipping the dropdown).

### What's New (`/whats-new`)
Active feature, linked as a small muted text link in `SiteFooter` (not
primary nav — deliberately low-key, don't re-add it to `SiteHeader`).
Two tabs: **In Game** (`data/patch-notes/<build>.json`, resolved via
`lib/patch-notes.ts` into linked pills with hover tooltips — talent/spell/
racial names resolve automatically, unresolvable ones render as plain
text) and **On the Site** (`data/site-changelog.json`, a short hand-
written user-facing list).

**Adding a build:** copy an existing `data/patch-notes/*.json`, fill it
in. A `sourceUrl` may ONLY be an official Blizzard forum post — never
foreverchanges.pro or another aggregator; omit it and explain in
`sourceNote` if no official post is on hand. Developer notes are quoted
verbatim from Blizzard; everything else is paraphrased.

### Open Graph images
`lib/og-template.tsx`'s `renderOgImage({title, subtitle?, backgroundImage?})`
is used by an `opengraph-image.tsx` file in every route segment that
needs one. Backgrounds come from `lib/og-backgrounds.generated.ts` (a
literal-path lookup map) pointing at pre-shrunk 1600px JPEG q82 files in
`assets/og-backgrounds/`; both are generated by
`scripts/build-og-backgrounds.js` (the `prebuild` step — so build with
`npm run build`, not bare `next build`) from the hardcoded
`backgroundImage` values in `opengraph-image.tsx` files plus every content
frontmatter `heroImage`. No runtime `sharp`. JPEG because `next/og`'s
renderer (satori) can't decode WebP data URIs and chokes on oversized
buffers, both confirmed failures, not just caution.

### Dungeon loot: two sources, reconciled per-dungeon-per-data-type
`data/dungeons/<id>.json` (35 files) merges two independent pulls —
foreverchanges.pro (primary: full tooltip text, quest chains, boss
portraits) and wowtbc.gg (fallback only where foreverchanges has nothing
for that data type on that dungeon — currently just boss loot for
gnomeregan/sm-library). **Never blended item-by-item** — one source wins
outright per dungeon per data type, recorded in `bossLootSource`/
`questSource`, because they're independent collection efforts that can
legitimately disagree. Quest reward items are enriched with full item
data (icon/quality/tooltip) via an id-keyed join against the full item
catalog (`data/items.json`) — 100% match rate, no name-fallback needed.
Rebuild via `node scripts/build-dungeons.js`.

### `/reference/items` and `/items/[itemId]`
Full 21,626-item catalog (`data/items.json`, built by
`scripts/build-items.js`), filtered/paginated **server-side**
(`lib/items.ts`'s `queryItems`) — the catalog is never shipped to the
client for filtering, to protect load-time. Current item pull is
`1.60.1.70235` (2026-10-05), re-fetched 2026-10-06 from
`https://foreverchanges.pro/items/{new,changed,same,missing,sources}.json`
(foreverchanges republished `new.json` under the same build number with one
added item, so 21,626 items); previous copies are in
`data/sources/foreverchanges/items/archive/`. Individual item pages
(`/items/[itemId]`) are **not statically generated** (no
`generateStaticParams`) — rendered on demand. `context: "loot" | "catalog"`
on `LootItemPill`/`ItemTooltipBody` matters: `status === "missing"` means
"no longer drops" in a loot context but "beta hasn't touched this Classic
item yet" in the catalog — don't let the two share wording/styling.
Items that can roll random suffixes show a "Random suffixes (N)" card
(`components/reference/ItemSuffixList.tsx`, server-rendered, 1 column on
phones, 2 from `sm`; suffix names in `itemQualityColor(2)`, the fixed Uncommon
green like every quality color, values in `text-foreground`. In Light mode the
green is low contrast, about 1.4:1, as on every green item name on the site) with each suffix's stats at that item's level, from
`lib/item-suffixes.ts` (see "Random suffixes" under the gear planner). The
page imports `data/gear/suffixes.json` statically: `npm run build` on
2026-10-20 showed the same 186 traced files and +85,561 bytes, with no
suffix or client-db2 file traced.

### Professions (`/reference/professions/[profession]`)
8 crafting professions (`data/professions-catalog/<id>.json`, built by
`scripts/build-professions.js`) each get Recipes/Leveling/Merchant's
Favor/Camp tabs; 3 gathering professions (Mining, Herbalism, Skinning,
`scripts/build-gathering-professions.js`) are a **separate page type**
with their own tab set — no recipes, no category sidebar, no Merchant's
Favor. `getProfessionIds()` in `lib/profession-recipes.ts` excludes
gathering ids by design (their catalog shape has no `recipes` field).
Every recipe/reagent is a full `LootItem` via `LootItemPill`, same as
everywhere else on the site. The page is **fully static** (one prerendered
page per profession, no server `searchParams`): the server resolves only
that profession's data against the item catalog at build time and passes
it to the client `ProfessionExplorer`, which does view/category/page/q
filtering from `useSearchParams` (Suspense fallback = default view, so the
prerendered HTML has real content). `data/professions-catalog/uncertain.json`
lists 101 recipes (mostly Engineering) with a low-confidence category
guess — not yet individually reviewed.

**Leveling 1 to 300 verification (`lib/profession-leveling-status.ts`):**
`LEVELING_VERIFIED_PROFESSION_IDS` (currently Blacksmithing and First Aid)
marks the paths that are tested and final. Every other profession keeps its
Leveling tab and its catalog data, reachable on the page and via
`?view=leveling`. For non-verified ids, `LevelingUnderConstruction`
(`components/professions/`) wraps the leveling view: content is grayed out
(opacity + grayscale), made `inert` and covered by a click-blocking scrim, and
crossed by two caution-tape bands. A card above it says the path isn't
verified and links to `/contact`. The page and explorer don't gate the tab or
the URL; the overlay is the only treatment. The `/reference/professions`
listing still shows an "In the works" card (`InTheWorksCard`) as a quick-glance
marker. To verify one, add its id to `LEVELING_VERIFIED_PROFESSION_IDS`. The
MDX guide and blog pipelines are unaffected: the profession write-ups in
`content/blog/` are patch announcements, not leveling guides, and none of the
guide drafts exist.

### `data/sources/` layout
Organized by source: `data/sources/{talentsforever,wowtbc,foreverchanges}/`.
See `data/sources/README.md` for what lives where. **Known trap:**
`data/dungeons/hall-of-thanes.json` (generated) has previously had a
hand-edit to quest-96403's faction silently reverted by a
`build-dungeons.js` re-run — if that quest's faction needs to change, it
has to change in the foreverchanges source file, not the generated
output.

### Daily data-diff workflow
`data/sources/talentsforever/` holds dated, **immutable** snapshots — a
new pull always gets a new dated file. `node scripts/diff-talentsforever.js`
diffs the two most recent snapshots into `data/sources/talentsforever/diffs/`
— run this before applying any changelog update, then also read the
vendor's own `changelog` array by hand (the diff is a pure field diff, it
can't see UI/UX-only changes). Match by name (or tree+row+col for Legacy
Perks), never array index — the vendor has reordered sections before.

### World map (`/reference/map/[continent]`)
Real client art (wow.export tile exports) tiled into a committed z0-z6
Leaflet pyramid per continent (`public/map/<continent>/tiles/`; regenerate
via `node scripts/slice-map-tiles.js <continent>`). Server-read JSON
(`meta.json`, `zones.json`, `zone-areas.json`) lives in
`data/map/<continent>/` and reaches code via static imports in
`lib/map-data.generated.ts` (`scripts/build-map-data-imports.js`, also
`prebuild`); only client-fetched files (`subzone-grid.bin`,
`subzone-names.json`) stay under `public/map/`.
`lib/map-continents.ts` derives bounds/zoom/tile URLs from `meta.json` —
adding a continent is a `REGISTERED_CONTINENTS` config entry once its
tiles exist. Zone borders/labels (`lib/zone-areas.ts`,
`zones.json`+`zone-areas.json`), dungeon/raid/battleground entrance
markers (`lib/map-entrances.ts`, grouped by proximity for shared
buildings), and `MapExplorer.tsx` (owns `selectedZoneId`/
`selectedEntranceId`/`layers` as controlled state, passed to both
`MapSidebar` and `LeafletZoneMap`) combine into one URL hash
(`#x=&y=&z=&sel=&off=`) written by a single function so independent
writers can't clobber each other's part. Marker SVG markup and colors
live in `lib/map-icons.ts` (shared by both the map and the sidebar
legend, so they can never drift). Empty map space renders solid black
(`style={{backgroundColor: "#000"}}` — Leaflet's own CSS otherwise wins
over theme tokens). Regenerate zone data via
`node scripts/build-zone-areas.js [build] [wowExportRoot]`.

**Marker layers (2026-10-19):** sidebar marker rows come from
`MARKER_CATEGORIES` in `lib/map-layers.ts`. A row with `layer` is live: it
toggles a `MapLayers` key (hidden via `display:none` on marker elements, no
map re-render, persisted in the hash's `off=`) and shows a live count. A row
with `blockedReason` renders greyed with that reason as its tooltip, and has no
pins. Entrances keep their own render path (grouping, group popups, deep
links). Every other category is a generic `MapPoi` on one path in
`LeafletZoneMap.tsx` (`POI_ICON_ZOOM` per layer, `poiIconSvg` in
`lib/map-icons.ts`). **Adding a category:** a generator script writes
`data/map-pois/<category>.json` from a raw source (never hand-edited), a
`lib/map-<category>.ts` reader maps it to `MapPoi` via a static JSON import (no
runtime file reads), then add the `MapLayers` key, `PoiLayerKey`,
`POI_ICON_ZOOM` entry and icon, and switch the registry row from
`blockedReason` to `layer`. Data status per category:
- **Live:** dungeons/raids/battlegrounds (`data/map-entrances.json`, 32 of 52
  placed; the 20 unplaced, Naxx's duplicate `map.csv` row and Emerald Dream
  only affect this layer), flight masters (`data/map-pois/flight-masters.json`,
  client TaxiNodes), towns & cities (`data/map-pois/towns.json`, 59, from
  client AreaPOI via `scripts/build-towns.js`: capitals, towns, villages,
  plus Brackenwall Village special-cased by AreaPOI id 1684 since its icon
  is the AV-graveyard one; the 149 minor landmarks are excluded by decision).
- **Blocked (stubbed, no pins):** town services and graveyards (not in the
  Forever client; cmangos has Classic-era positions, but the owner decided
  2026-10-19 not to use Classic positions for these), rare elites, library
  books and trade camps (new in Forever, no source has positions), boats &
  zeppelins (needs transport route data).
- **Client extract is older than the rest of the site's data:** entrances,
  flight masters, towns and zone data all come from the one client-db2
  extract, `data/sources/client-db2/1.60.1.70009/` (2026-09-25). Talents,
  spellbooks and racials are synced to build 70425, items to 70374.
  Whether AreaPOI/TaxiNodes/Map changed since 70009 is unknown until a fresh
  wow.export extract is diffed against it.
- **Verified 2026-10-19:** the `npm run build` trace for
  `reference/map/[continent]` grew 13,127 bytes (29.771 → 29.784 MB local
  trace sum; the other 43 functions were byte-identical; same 310 traced
  files), so the towns JSON is bundled into the page chunk, not traced as a
  file. Usable at 390px phone width (menu overlay rows, counts, toggles,
  popups).
- **Known follow-ups:** blocked rows' reason is a native `title`, so touch
  users see only "No data"; towns aren't in the sidebar search; layer rows
  are 30px tall, under the 44px touch-target guideline (pre-existing row
  style).

**Not yet built:** real dungeon/raid icon art (client texture atlas
FileDataID 1121272 needs exporting from wow.export and cropping — SVG
placeholders render until then), a "where to level" filter, a selection
info card, the in-game/parchment map style toggle, a Classic-era map
toggle (source PNGs already exist locally, see `docs/map-tile-cdn-plan.md`
and the archive for the CDN plan).

## Tooling notes (claude-in-chrome)
- `resize_window` reports success but doesn't actually change
  `window.innerWidth` in this environment — for real mobile-viewport
  verification, ask the user to open a second real Chrome window at the
  target size; `tabs_create_mcp` can attach a tab to whichever window has
  OS focus and that tab stays independently usable by `tabId`.
- A second (unfocused) window can screenshot fine but `computer`
  `left_click` may time out on `Input.dispatchMouseEvent` on it — if that
  happens, don't loop retrying the click; ask the user to focus that
  window first, or to click and let you screenshot the result. Dispatching
  a real `.click()` via `javascript_exec` (not the coordinate-based click
  tool) has also worked around this.
- Phone-width layout check without a second window: replace the page body
  with a same-origin `<iframe src="/route" style="width:390px">` via
  `javascript_exec`. The iframe has its own viewport, so Tailwind
  breakpoints apply. It doesn't emulate touch events.
- `left_click_drag` doesn't start native HTML5 drag-and-drop; dispatch
  `DragEvent`s with a shared `DataTransfer` from `javascript_exec` instead.

### Build tracking (anonymous share/save/open counts)
Collection only: nothing reads these counts yet, no Popular Builds UI exists. Full detail (schema rationale, the determinism/Next-cache/build-time investigation, Vercel usage findings): `Forevercraft-Knowledge-Base/01-Projects/Forevercraft/Architecture.md` → "Build tracking".

- **Events:** `shared` / `saved` / `opened`, each `{classId, buildCode, token}`. Schema/validation in `lib/build-events.ts`. Raw token never stored.
- **Token/hashing:** random 32-hex token in localStorage (`lib/build-tracking-client.ts`), server stores only `HMAC-SHA256(BUILD_TRACKING_SECRET, ...)`. IPs are hashed the same way, for rate-limit keys and the popularity HyperLogLog only. The token is browser-minted, so per-token limits only stop accidental repeats; the per-IP limits bound abuse.
- **Build validation (write time):** `canonicalBuildCode` decodes with the planner decoder and rejects builds with no points or that fail `isValidBuildState` (`lib/talent-rules.ts`: ≤51 points, rows unlocked by tree points, prereqs met; same rules `canAddPoint`/`canRemovePoint` keep). Stored codes are canonical current-version codes, so a legacy link counts as the same build. Invalid builds get 400.
- **Popularity signal:** distinct hashed IPs per build per UTC day, `PFADD builds:hll:<classId>:<buildCode>:<day>` (40-day TTL) plus a per-day index set `builds:hll-index:<day>` of `<classId>:<buildCode>`. Rank popularity from these, not from raw event counts.
- **Local writes are off:** `getRedis()` returns null when `NODE_ENV !== "production"`, and the capture route no-ops for a loopback `Host` header (catches local `next start`, which runs as production with `.env.local` pointing at the **production** database). Both log one warning. `BUILD_TRACKING_ALLOW_LOCAL=1` opts in (use it only against a stand-in or a throwaway database).
- **Bots:** the client skips `opened` when `navigator.webdriver` is true.
- **Secrets/env:** Redis credentials come under two naming schemes, and `getRedis()` accepts either (per value, `UPSTASH_*` first, matching `Redis.fromEnv()`):
  - **On Vercel:** the Marketplace Upstash integration sets `KV_REST_API_URL`/`KV_REST_API_TOKEN` (plus the unused `KV_URL`, `REDIS_URL`, `KV_REST_API_READ_ONLY_TOKEN`) in Preview and Production. It never sets `UPSTASH_*`. Until 2026-10-19 the guard required `UPSTASH_*`, so production tracking had silently no-op'd since launch.
  - **Locally:** `.env.local` has the `KV_*` names from `vercel env pull`, plus hand-added `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (`.env.example` lists these).
  - **Secrets:** `BUILD_TRACKING_SECRET` and `CRON_SECRET` are set by hand in Vercel, **Production only**. Keep them out of Preview: Preview has the production Redis credentials, and without the secret `keyedHash` fails, so previews no-op. Locally, paste the real secret values over the `[SENSITIVE]` placeholders after `vercel env pull` by hand.
  - Missing Redis vars or a missing secret = tracking no-ops.
- **Capture route:** `POST /api/builds/track` (`lib/build-tracking-server.ts` `recordBuildEvent`), fire-and-forget (`sendBeacon`/`fetch keepalive`). Rate limits: 30/min/IP (burst), 50 accepted events/day/IP, 100/day/token.
- **Dedup (write time):** one counted event per (type, token, classId, buildCode) per UTC day — `SET NX EX` claim before the write. Reloads, repeat clicks, and late clipboard callbacks collapse to one.
- **Daily rollup:** `GET /api/cron/build-rollup` (`lib/build-rollup.ts`), Bearer `$CRON_SECRET`. `vercel.json` schedule `0 6 * * *` (Hobby: daily only, ~1h window). Aggregates raw events into `builds:agg:classes`/`builds:agg:talents`/`builds:agg:meta`, then trims what it processed.

Research and rationale: `docs/popular-builds-research.md`.

## Adding content
See `docs/adding-content.md` for guides/blog/profession frontmatter,
image/credit conventions, and SEO metadata specifics.

## Next up
- **BIS builder** — design doc written 2026-10-06 (`Forevercraft-Knowledge-Base/04-Features/BIS-Builder/BIS-Builder-Design.md`). Build is scheduled for after level-60 data lands; don't start the BIS UI before then. Reuses the planner's URL + localStorage persistence; gear data is keyed by `itemId` into `data/items.json`, which first needs a slot-mapping table (inconsistent slot strings, 9,479 `null`). **2026-10-20:** the owner now wants a level-30 gear planner built with level as a parameter; the investigation (foreverchanges dissection, data model, URL scheme, open scope calls) is in `Forevercraft-Knowledge-Base/03-Handoffs/2026-10-20-gear-planner-investigation.md`. Decisions made the same day; the data layer is built (see "Gear planner data layer"). Pass 3 (same day): Warrior trinket/enchant overrides, suffix sourcing investigated, Wowhead cross-check (see the handoff). All 9 classes' presets are generated (2026-10-20, later). **2026-10-21:** item pool, codec and UI built for Warrior (`/gear/warrior`, see "Gear planner"). Next, after the owner's review: pools and pages for the other 8 classes, then nav/sitemap/robots/OG.
- **Design the November data layout (items / loot / tooltips) before
  importing the full wow.export dataset** — per-item shards (static files,
  fetched on demand / prerendered) vs. Postgres. Decide this first; today's
  single 10 MB `data/items.json` read by `lib/items.ts` is exactly the
  pattern that won't scale (see the standing rule above).

## Open items (carried forward)
- **Quality colors in Light mode are low contrast (tracked, not fixed):**
  `ITEM_QUALITY_COLOR` (`lib/wow-data.ts`) is a fixed palette by design (only
  Common routes through `--quality-common`), so Uncommon `#1eff00` reads at
  about 1.4:1 on the Light surface (`#f4f4f5`), far under 4.5:1. Seen on the
  item-page suffix card (2026-10-20) but site-wide: every green item name,
  the item page title, `ItemsTable`, loot pills. Rare/Epic/Legendary likely
  need a check too. A fix belongs in the quality-color tokens (Light-mode
  variants per quality, like Common), not in one component.
- **Gear planner data gaps (2026-10-20):** (1) `data/items.json` has no
  random-suffix items ("…of the Tiger"); foreverchanges encodes them as
  `baseId * 100000 + suffixId` and 3 of their 49 Warrior picks per faction
  are suffix items. **The suffix data and item-page list are built
  (2026-10-20, see "Random suffixes" above), and presets pick suffix rolls;
  the item pool isn't built yet.** Open: the "of Eluding" effect text
  (ItemEffect 213334; needs the ItemEffect, Spell and SpellEffect exports),
  the 50 "Restored …" nested-tree items, and the 47 tree items not in our
  catalog. (2) The
  item catalog is build 70374, foreverchanges is on 70450: enchants such as
  Bracer - Lesser Intellect (+5 → +3) and Cloak - Defense (60 → 30 armor)
  were nerfed since. Refresh items, then re-run `build-gear-enchants.js` and
  `build-gear-presets.js`.
- **Raid comp: `estimated` rules still unverified** (`data/raid-buffs.json`,
  web research pass 2026-10-19, sources in each set's `evidence`). Now
  **confirmed** from Blizzard: `major-armor` (Rogue/Warlock deep dive:
  Sunder won't overwrite Expose unless weaker) and the new
  `windfury-flametongue` set (beta notes Sept 24 + Oct 16; Grace of Air
  stacks with both). **Corrected:** Demoralizing Screech is the Carrion Bird
  family's ability, not owl/bat (Hunter/Druid deep dive). **Still
  estimated:** `minor-armor` (now leans the right way: a community wiki
  and a third-party PR citing Wowhead say Faerie Fire / Curse of
  Recklessness / Dust Cloud don't stack in Forever, but nothing official;
  Blizzard's Oct 16 fixes are each spell with itself), `attack-power-
  reduction`, `hit-reduction` (Oct 16 fix is Insect Swarm with itself),
  `armor-proc` (nothing found), `shaman-air-totems` / `shaman-water-totems`
  (one-per-element only from a third-party guide), `hunter-pets` (pet
  families confirmed; one pet out at a time not restated), pet-sourced
  effects (Furious Howl, Dust Cloud, Demoralizing Screech, Blood Pact).
  **Unmodelled leads:** Furious Howl reportedly doesn't stack with Battle
  Shout (community wiki, testing-grade); Leader of the Pack was made
  exclusive with Moonkin crit (Sept 30), then the two were split into
  melee/ranged vs spell crit (Oct 16) with no word on whether that still
  holds. Possible later work: optional linked talent build per slot (owner
  deferred it; needs a new link version), a coverage summary visible while
  building on phones (the panel sits below the groups), and a
  site-changelog entry if the feature gets announced.
- **Dungeon loot header art (refined 2026-10-06):** borderless header image, 560px wide on `sm+`, height set by its natural ratio (no crop). Fades into the page on its right edge via `linear-gradient(to right, transparent 60%, var(--background))`, so the blend matches the page in both themes. Full-width and unfaded on narrow screens. Verified on Uldaman and Wailing Caverns (rendered ratio 1.829 vs source 1.827), and phone width (386px, stacked, no overlap, no horizontal scroll). Title sits beside the image on `sm+`. Options and trade-offs are in `Forevercraft-Knowledge-Base/03-Handoffs/reference-ui/2026-10-06-loot-pill-cleanup-quest-ui-and-header-art.md`.
- **`lib/quest-detail.ts` reads `data/quests/detail/<variable>.json`:** Turbopack warns that the pattern matches 10,098 files (still a warning, build exit 0, re-checked 2026-10-06). This is the runtime-variable path the standing rule forbids. The file's comment says the shards are never traced, but `/quests/[questId]/page.js.nft.json` lists all 5,049 of them. Fix with a generated literal-path map (like `lib/og-backgrounds.generated.ts`) or a route-scoped `outputFileTracingExcludes`, then recheck `.nft.json` sizes.
- **`lib/dungeon-loot.ts` reads the whole `data/dungeons/` directory**, so ~4.9 MB of committed non-JSON source files there (dungeon map PNG/JPGs, `Classic-Classic.lua`) are traced into 10 functions, including ƒ `/reference/items`. Move them out of `data/dungeons/` (update the map scripts' paths) or exclude them from traces. See `Weekly-Audit-2026-10-06.md` §3.4.
- **Build tracking (only item 3 still open):** the code fixes landed 2026-10-06 (distinct-IP HyperLogLog, 50/day/IP cap, write-time build validation, `opened` bot filter, local-write guard; see "Build tracking" above and `03-Handoffs/infrastructure/2026-10-06-build-tracking-security-fixes.md`). (1) ~~Vercel Firewall rate-limit rule~~ done 2026-10-19: rule `Rate limit build tracking` (`rule_rate_limit_build_tracking_Ay7F8L`) covers POST `/api/builds/track`, 30 req per 60s fixed window per IP, then 429. It was published from the CLI, and a live test got exactly 30 through. It's Hobby's only rate-limit rule slot. (2) ~~reset test events~~ done 2026-10-19: production Redis was cleaned after the KV_* env fix was verified live, leaving only `builds:agg:meta` (`eventsProcessed: 0`, `windowStart: 2026-10-19`), so real tracking starts that day; (3) the rollup still aggregates raw event counts (`builds:agg:*`), which one IP can push by up to 50/day, so the Popular Builds reader should rank by the HLLs.
- **Sell-price-only "changed" items are display-unchanged but still indexable:** `lib/item-display-status.ts` (`displayStatus`) drives the item tooltip and item-page callout. `isIndexableItemStatus` (sitemap, `robots`) still reads the stored status, so 104 such items stay indexed. Decide whether the predicate should use `displayStatus`.
- **Stale dungeon item snapshots: root cause fixed 2026-10-06.** `build-dungeons.js` `bossLootItemToUnified` now always takes the catalog record when the catalog has the item (it used to swap only on a name/quality/level mismatch, which left 157 + 164 stale records over the week). All 1,967 boss items in 35 dungeons matched `data/items.json` after the rebuild. Keep running `build-dungeons.js` after every `build-items.js`, because item records are still baked in. See `03-Handoffs/data-pipeline/2026-10-06-dungeon-drift-audit.md`.
- **`scripts/diff-foreverchanges-items.js` truncates tooltips at 160 chars and doesn't diff `sources.json`, `p`/`d`/`v`/`t`:** a removed line can be hidden in the markdown. Until fixed (phase 1 of the automation design below), write a full all-field report by hand next to it (format: `items/diffs/…_republished-2026-10-06_full.md`).
- **Dungeon loot drift: all 29 raw files match live as of 2026-10-06 (late).** `node scripts/check-dungeon-drift.js` (read-only; per-group item-id sets, kind/level; `--slugs`, `--json`; exit 1 on drift) found 4 drifted dungeons (Ruins of Lordaeron, Excavation Site, The Deadmines, SM Graveyard). All were additions, re-pulled and rebuilt; RFK and The Stockade already matched. Run it at every beta patch and before every item pull. It doesn't cover `.mapdata.json`/`.quests.json` yet. Roster counts are rendered from `lib/dungeon-roster.ts` (client-safe: no Node built-ins, since `dungeon-loot.ts` imports `fs`). Bosses and rare spawns are shown as separate figures, never summed. The rare split comes from foreverchanges' `kind`, because `sources.json` tags all dungeon drops `B`. See `03-Handoffs/data-pipeline/2026-10-06-dungeon-drift-audit.md`.
- **Data pipeline automation (proposed, not built):** one command per pipeline (`npm run sync-items`, `npm run sync-dungeons`: fetch, archive, diff, build, verify, no skippable steps), diff-script fixes, a shared `verify-data.ts` with sentinels, a fail-loudly `dungeon_overrides.json` layer (build-time roster role and quest XP instead of render/load-time corrections), and a weekly scheduled drift check. Design and phasing: `03-Handoffs/data-pipeline/2026-10-06-pipeline-automation-design.md`. Phases 1–2 (diff fixes, verify script) are worth doing before the next beta patch.
- **Vercel function sizes (open, not urgent):** functions are 24.2 MB each
  (was ~121 MB) but the dashboard's uniform sizes don't match local trace
  sizes, and the cause is unexplained. See
  `Forevercraft-Knowledge-Base/03-Handoffs/infrastructure/2026-09-30-vercel-function-size.md`.
- Export FileDataID 1121272 from wow.export and crop real dungeon/raid/
  battleground icons (see World map above).
- Resolve the duplicate-Naxxramas-Map-row and Emerald-Dream-on-the-map
  questions in `data/map-entrances.json`.
- `data/professions-catalog/uncertain.json`'s 101 low-confidence category
  guesses haven't been reviewed.
- `lib/blog.ts` isn't on the shared `lib/content.ts` loader yet.
- **Leveling guides held for review (2026-10-06):** the other crafting and
  gathering professions have catalog leveling data but aren't in
  `LEVELING_VERIFIED_PROFESSION_IDS`. Review each one, then add it to the
  verified list. Decide whether the "Browse" links on the in-the-works cards are
  wanted (they keep recipe pages reachable from the listing).
- Re-tile Kalimdor with the GM Island 3x3 ADT block excluded (currently
  shows as a stray unlabeled island in the NW corner).
- No mobile pass yet for `DungeonInlinePanel`'s boss/quest two-column
  sub-layout, or for Legacy Perks' touch interactions.

Full history, bug-hunt narratives, and retired/superseded approaches
(the original SVG map MVP, the pre-tile-pyramid proof of concept, the
foreverchanges.pro/map 2D-vs-3D recon, per-session verification detail)
are in `Forevercraft-Knowledge-Base/03-Handoffs/project-history/2026-09-30-claude-md-archive.md`.
