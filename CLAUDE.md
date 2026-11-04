@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever (launch 2026-11-04):
talent planner, raid comp and gear planners, a reference section, guides and
blog. Not affiliated with Blizzard, not monetized. This file holds the rules
and architecture that are true **now**. History lives in handoffs, the backlog
on the Roadmap.

## Start here
1. This file (rules and gotchas).
2. `Forevercraft-Knowledge-Base/01-Projects/Forevercraft/Overview.md`: what's
   live, where every doc lives, the read order.
3. `Forevercraft-Knowledge-Base/01-Projects/Forevercraft/Roadmap.md`: **the
   only backlog**, including every partially built feature with its real state.
   This file keeps no open-items list.
4. `Forevercraft-Knowledge-Base/01-Projects/Forevercraft/Data-Sync-Runbook.md`:
   the order of operations for the talentsforever and foreverchanges syncs.
   Follow it for any data refresh.
5. The newest handoff for your area: `Forevercraft-Knowledge-Base/03-Handoffs/<category>/`
   (local-only, gitignored).

At the end of a substantive session: write a handoff into
`03-Handoffs/<category>/` with `99-Templates/Handoff-Template.md`, add new
backlog items to the Roadmap, fix the runbook if a sync taught you something,
and update this file only for rules or architecture that changed.
Forensic history: `03-Handoffs/project-history/2026-09-30-claude-md-archive.md`
and `2026-10-31-claude-md-archive.md` (the full pre-trim copy of this file).

## Current state (2026-11-03)
- Talent planner (9 classes, build codes v9), raid comp, reference section
  (racials, legacy perks, spellbooks, dungeons and loot, professions, crafting
  calculator, items, quests, world map), Beta Wrapped, blog: live.
- Data: talents/spellbooks/racials from talentsforever 2026-11-03 (client build
  70753; some talents follow Blizzard's 2 Nov notes ahead of the game data, and
  14 vendor-placed talents carry `confidence: "estimated"`); items from foreverchanges 1.60.1.70707
  (21,809 items); map data from client extract 70009.
- **Partial:** gear planner (Warrior, level 30 only, not in nav/sitemap),
  guides (none written), Popular Builds (collection only), profession leveling
  (2 of 11 verified), What's New (missing 70374/70425), world map (paused). Details:
  Roadmap → "Partially built".
- No relational database: static JSON + MDX; Upstash Redis only for build
  tracking.
- `main` matches `origin/main` at `8846396e` (the 10-31 syncs). The 11-03
  talent sync is uncommitted on `main`
  (`03-Handoffs/talents/2026-11-03-talentsforever-data-sync.md`).

## Standing rules
- **No runtime-variable or full-file disk reads in server code.** Never read
  `public/` or a large data file via a variable path
  (`path.join(process.cwd(), "public", x)`) or per request: Next's file tracer
  can't resolve it and bundles the whole directory into every function (~120 MB
  into all 102 functions, 2026-09-30). Generate statically at build time, or
  serve from `public/` and fetch on the client. If a server read is
  unavoidable, use a generated literal-path map (`scripts/build-og-backgrounds.js`
  → `lib/og-backgrounds.generated.ts`, run in `prebuild`). After adding any
  server-side read, run `npm run build` and check `.next/server/app/**/*.nft.json`.
  `next.config.ts` excludes `public/map/*/tiles/**` from all traces. Known
  violation: `lib/quest-detail.ts` (Roadmap).
- **Never name a top-level `public/` folder after a page route** (`public/gear`
  next to `/gear/<class>` made `next start` 404 that page). Current folders:
  backgrounds, cursors, gear-pool, images, map, maps.
- **Cached pages never read `searchParams` in `page.tsx`.** The planner, raid
  comp, gear planner and professions read query params client-side
  (`useSearchParams` under Suspense) so the page stays static/ISR and query
  variants cost no server render.
- **Build with `npm run build`, not bare `next build`:** `prebuild` runs
  `check-raid-buffs.js`, OG backgrounds, map data imports and the quest-dungeon
  index.
- **Generated data is never hand-edited** (items, dungeons, profession
  catalogs, quests, spellbooks, talent-spell links, gear presets and pools).
  Fix the source or the script; a rebuild silently reverts hand edits.
- `lib/wow-data.ts` pulls every talent file; client components must not import
  it. Resolve server-side and pass props down (raid comp, Beta Wrapped and the
  gear planner all do; client-safe helpers live in `lib/item-display.ts`,
  `lib/class-text.ts`, `lib/dungeon-roster.ts`).

## Planner
- Race is reference-only, never app state or a URL segment
  (`RaceReferenceTable`, inline and at `/reference/racials`).
- URL: `/planner/<classId>/<buildCode>` via `app/planner/[[...slug]]/page.tsx`;
  old 3-segment links redirect in `parseSlug()`. `/planner` and the 9 class pages
  are prerendered, build-code pages render once and are ISR-cached.
- Talent order: `?order=<build-code version>.<one char per point>`
  (`lib/talent-order.ts`), read client-side in `PlannerFromUrl.tsx`; an old
  version means no order panel. Contract:
  `03-Handoffs/talents/2026-10-14-talent-order-tracking.md`.
- Per-build OG image: Route Handler `app/planner/og/[classId]/[buildCode]/route.tsx`
  (the file convention can't sit under a catch-all).
- Mobile tree (`TalentNode.tsx`, `TalentTreeGrid.tsx`): tap always adds a point
  (removal is the minus button), 450 ms long-press peeks the tooltip, >10 px
  touch movement is a scroll, one `position: fixed` `TooltipCard` dismissed on
  `scroll`, haptic pulse only for touch-originated changes.
- Desktop tree: 43 px icons / 24 px gap / 67 px pitch, **square cells on
  purpose** (the connector-arrow layout depends on it). A prereq connector is
  drawn only along a clear row or column (`prereqConnector` in
  `lib/talent-rules.ts`), as on talentsforever.com; otherwise the tooltip's
  "Requires" line and the hover highlight carry it.
- `TalentTreeGrid.tsx` imports the current talentsforever snapshot for Classic
  comparisons; bump the import with each sync.

### Build codes (`lib/build-code.ts`)
Positional: one base36 digit per talent, tier then col order, trees joined by
`-`, with a leading version segment (currently **9**). Any change to a tree's
membership **or order** needs a version bump, or old links decode onto the
wrong talents.
- Older versions decode against frozen orders `LEGACY_TREE_ORDER`,
  `V2`…`V8_TREE_ORDER`, merged **per tree** (`mergeOrders`; an older snapshot of
  the same tree wins), then `LEGACY_ID_TRANSLATION` (removed → `null`; renamed
  or moved tree → new id), clamp to `maxRank`, and `repairPrereqs` drops points
  whose prereq is no longer met.
- The translation table is class-agnostic, so `translateId()` never translates
  an id the class still has (Warrior's removed `protection_toughness` is
  Paladin's Toughness).
- Generate frozen orders from HEAD's talent files; add a decode test per
  version. Never remove the machinery. Steps: Data-Sync-Runbook §1.4.

## Raid comp (`/raid-comp`)
Handoff: `03-Handoffs/2026-10-19-raid-comp-planner.md`.
- Static page (`app/raid-comp/page.tsx`), client in `components/raid-comp/*`,
  core in `lib/raid-comp.ts` (client-safe: never import `lib/wow-data`), effect
  resolution in `lib/raid-buffs.ts` (server).
- `data/raid-buffs.json` is **hand-curated**: effects with sources
  (`classId`, `specs: "all" | [tree]`, spell or talent, confidence),
  `onlyOneCounts` stacking sets and `perCaster` sets, optional `evidence`
  (never rendered). A set is `confirmed` only on an official Blizzard source or
  an in-game test. `check-raid-buffs.js` validates names in `prebuild`; after
  every talent/spellbook sync re-read the numbers by hand and update `build`.
- Coverage is spec-level; group-scope effects reach only their group.
- Share link `?r=1-<digit per slot>&n=<names>&s=<10|20>`; **`SPEC_ORDER` is
  frozen** (append only; else bump `ROSTER_CODE_VERSION`). Roster always holds
  40 slots; smaller sizes hide groups.
- The "?" how-to is a native always-mounted `<dialog>` so its text is in the
  static HTML; don't swap it for the house `Dialog` (unmounts when closed).
- localStorage: `forevercraft:saved-rosters`,
  `forevercraft:raid-comp-rules-open` (every access in try/catch).

## Gear planner (`/gear/<classId>`) and its data layer
Handoffs: `03-Handoffs/gear-planner/` (investigation 10-20, pool/codec/UI and
drawer 10-21). State and gaps: Roadmap.
- Config: `lib/gear-config.ts` (`GEAR_PLANNER_CLASSES`, `GEAR_LEVELS`,
  `maxProfessionSkill`), proficiencies `lib/gear-classes.ts` (all 9 classes;
  Forever changes from Classic listed in its header).
- **`GEAR_SLOTS` (`lib/gear-slots.ts`) is frozen**: share codes are positional
  over it. Append only.
- Share code `?g=<version>.<a|h>.<slot>...` (`lib/gear-code.ts`,
  `GEAR_CODE_VERSION` 1); `decodeGear` keeps legal picks and lists why the rest
  were skipped.
- Pool: `node scripts/build-gear-pool.js <class>` → `public/gear-pool/<level>/<class>.json`,
  client-fetched, never read on the server. Eligibility shared with presets in
  `scripts/lib/gear-pool.js` / `gear-availability.js` (obtainable level from
  sources, not "Requires Level", which many Forever items lack).
- Presets: `node scripts/build-gear-presets.js` from hand-written
  `data/gear/preset-weights.json` and `preset-overrides.json` (every pin,
  exclude and alternate needs a `reason`). Use-effect trinkets and relics score
  0, so they're pinned. Every preset file carries a `disclaimer` the UI must
  show wherever a preset appears.
- Item stats: `lib/item-stats.ts` (pure, `require()`-able by scripts);
  coverage report `scripts/report-item-stat-coverage.js` → `docs/item-stat-coverage.md`
  (a test fails on any unparsed equipment line). Enchants:
  `scripts/build-gear-enchants.js` → `data/gear/enchants.json`.
- Random suffixes: `scripts/build-gear-suffixes.js` → `data/gear/suffixes.json`
  from client DB2 tables in `data/sources/client-db2/1.60.1.70450/`
  (`lib/item-suffixes.ts`).
- Base stats: `data/base-stats.json` (cmangos, pinned commit) is 419 KB; import
  a slice server-side only.

## Beta Wrapped (`/beta-wrapped`)
Handoffs: `03-Handoffs/2026-10-28-beta-wrapped-*.md`. A dated archive page
(content hand-written in `lib/beta-wrapped.ts`), deliberately **not** in
`SiteHeader`'s nav. `motion` (pinned 14.2.0) is used only in
`components/wrapped/*` through `LazyMotion` + `m.*`; never import it from
shared components. Steps use a functional `setIndex`. Banner dismissal key:
`forevercraft:beta-wrapped-banner-dismissed`.

## Shared UI mechanisms
- **One tooltip owner:** `lib/active-tooltip.ts`
  (`claimActiveTooltip`/`releaseActiveTooltip`/`useIsActiveTooltip`). Any new
  tooltip uses it.
- **Spellbooks:** `SpellbookBook`/`ClassAbilitiesSection` render standalone and
  in the planner; `compareMode` shows a Classic word-diff. Don't reintroduce the
  retired per-rank "(estimated)" marker without a pull showing
  `complete: false`.
- **Renaming a tree or tab** can break path or key derivations far from the
  tree code (background slugs, icon maps): grep for the old string.
- **Content:** `lib/content.ts` backs guides and professions; `lib/blog.ts`
  still has its own loader. Frontmatter and SEO conventions:
  `docs/adding-content.md`.
- **Nav:** `SiteHeader.tsx` `NAV_LINKS` (Planner, Raid Comp, Reference, Guides,
  Blog); only Reference has `children`, dropdown is pure CSS; the header must
  not get `overflow-hidden`.
- **What's New** (footer link only, not nav): In Game tab from
  `data/patch-notes/<build>.json` (`sourceUrl` may only be an official Blizzard
  forum post; dev notes quoted verbatim), On the Site tab from
  `data/site-changelog.json`.
- **OG images:** `lib/og-template.tsx` `renderOgImage`; backgrounds are
  pre-shrunk JPEGs from `scripts/build-og-backgrounds.js` (satori can't decode
  WebP or huge buffers).
- **Quality colors** (`ITEM_QUALITY_COLOR`) are a fixed palette; only Common
  has a Light-mode token.

## Reference data
- **Items** (`/reference/items`, `/items/[itemId]`): `data/items.json`, built by
  `scripts/build-items.js`, filtered server-side (`lib/items.ts`, cached per
  process), item pages rendered on demand. `context: "loot" | "catalog"`
  matters: `missing` means "no longer drops" in loot but "beta hasn't touched
  this Classic item yet" in the catalog.
- **Dungeons** (`data/dungeons/<id>.json`, 35): foreverchanges primary,
  wowtbc fallback, chosen **per dungeon per data type**, never blended per item
  (`bossLootSource`/`questSource`). Item records are baked in from the catalog,
  so rebuild after every item pull. Change quest 96403's faction in the
  foreverchanges source, not the generated file.
- **Professions:** 8 crafting (Recipes/Leveling/Merchant's Favor/Camp) and 3
  gathering (separate page type, excluded from `getProfessionIds()`); fully
  static, client-side filtering. Raw recipe files `data/professions/*.json`
  hold item **names only**, joined by exact name
  (`scripts/lib/profession-item-resolver.js`, first match wins, `new.json`
  first). Unverified leveling paths render under `LevelingUnderConstruction`;
  verify by adding the id to `LEVELING_VERIFIED_PROFESSION_IDS`.
- **Sources** (`data/sources/`): talentsforever (dated, immutable snapshots),
  foreverchanges (items with archive/diffs, dungeon data, quests), wowtbc,
  wowhead, client-db2. See `data/sources/README.md`.
- **Data syncs:** Data-Sync-Runbook. Never hand-apply a sync from memory.

## World map (`/reference/map/[continent]`, paused)
Leaflet over a committed z0–z6 tile pyramid (`public/map/<continent>/tiles/`,
`node scripts/slice-map-tiles.js <continent>`). Server-read JSON lives in
`data/map/<continent>/`, imported via `lib/map-data.generated.ts`. Selection,
zone and layer state go into one URL hash (`#x=&y=&z=&sel=&off=`) written by a
single function. Marker icons in `lib/map-icons.ts` (shared with the legend);
empty space is forced black inline. Marker categories come from
`MARKER_CATEGORIES` in `lib/map-layers.ts`: a row has `layer` (live) or
`blockedReason` (greyed, no pins). **Adding a category:** a generator writes
`data/map-pois/<category>.json` from a raw source, a `lib/map-<category>.ts`
reader maps it to `MapPoi` via a static import, then add the `MapLayers` key,
`PoiLayerKey`, `POI_ICON_ZOOM` entry and icon, and switch the row to `layer`.

## Build tracking (anonymous share/save/open counts)
Design and rationale: `Forevercraft-Knowledge-Base/01-Projects/Forevercraft/Architecture.md`
→ "Build tracking", `docs/popular-builds-research.md`.
- `POST /api/builds/track` (`lib/build-tracking-server.ts`), events validated
  and canonicalized with the planner decoder; only HMAC hashes of tokens and IPs
  are stored. Popularity = per-day HyperLogLogs of distinct IPs. Daily rollup:
  `GET /api/cron/build-rollup` (Bearer `$CRON_SECRET`, `vercel.json`).
- **Local writes are off:** `getRedis()` returns null outside production, and
  the route no-ops for a loopback `Host` (local `next start` runs as production
  with `.env.local` pointing at the **production** database).
  `BUILD_TRACKING_ALLOW_LOCAL=1` only against a throwaway database.
- **Env:** on Vercel the Upstash integration sets `KV_REST_API_URL`/`KV_REST_API_TOKEN`
  (never `UPSTASH_*`); `getRedis()` accepts either scheme. `BUILD_TRACKING_SECRET`
  and `CRON_SECRET` are **Production only**; keep them out of Preview, which
  shares the production Redis. Missing vars = tracking no-ops.
- Vercel Firewall rule `Rate limit build tracking` (30 req/60 s/IP) is Hobby's
  only rate-limit slot.

## Tooling notes (claude-in-chrome)
- `resize_window` doesn't change `window.innerWidth`. For phone layout, load the
  route in a same-origin `<iframe style="width:390px">` via `javascript_exec`
  (no touch emulation), or ask for a real second window.
- Clicks on an unfocused second window can time out; dispatch `.click()` via
  `javascript_exec` instead of retrying.
- `left_click_drag` doesn't start HTML5 drag-and-drop; dispatch `DragEvent`s
  with a shared `DataTransfer`.
- The extension tab runs at about 2 animation frames per second: check
  animation end states, not mid-animation samples.
