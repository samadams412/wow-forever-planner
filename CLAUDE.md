@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever — a race/class/talent
planner, a reference section, and guides/blog content. Not affiliated with
Blizzard, not monetized. This file is the living architecture reference for
the codebase; it's kept in sync with what's actually implemented rather than
serving as a fixed project brief.

Full session-by-session history (what was built, bugs found/fixed, data
pipelines investigated, and every superseded/reverted approach) lives in
`Forevercraft-Knowledge-Base/03-Handoffs/archive/2026-09-30-claude-md-archive.md` — read it if you need forensic detail on
*how* something was built or verified. This file only covers what's true
*now*: active architecture, data/build protocols, and open items. (Separate
from that archive, `Forevercraft-Knowledge-Base/03-Handoffs/*.md` also holds individual recent per-task
handoffs, e.g. `map-ui-cleanup.md`.)

## Current state (as of 2026-09-30)

- Planner, reference (racials/legacy perks/class spellbooks/dungeon level
  ranges/professions/items/world map), guides, and blog are all live.
- World map (`/reference/map/[continent]`) covers both continents with a
  full tile pyramid, zone borders/labels, dungeon/raid/battleground entrance
  markers, and a sidebar (zone list/search/layer toggles), all URL-hash
  restorable. See "World map" below.
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

## Active architecture

### Planner
- Race is reference-only (not app state, not a URL segment) — it never
  affects talent calculations. `RaceReferenceTable` renders both inline
  below the trees and standalone at `/reference/racials`.
- URL scheme: `/planner/<classId>/<buildCode>` (2 segments), via the
  catch-all `app/planner/[[...slug]]/page.tsx`. Old 3-segment links
  (`/planner/<classId>/<raceId>/<buildCode>`, from when race was a URL
  segment) redirect via `parseSlug()`.
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
version segment (currently `3`); `decodeBuild` branches: versioned codes
decode against current tree order, legacy/old-version codes decode
against a frozen snapshot (`LEGACY_TREE_ORDER`/`V2_TREE_ORDER`) + an id
translation table, then clamp to current `maxRank`.

**The next time a tree's talent membership or order changes**, bump
`CURRENT_VERSION` and add a new frozen order snapshot + translation table
for whatever changed, following the existing pattern — don't remove the
versioning machinery just because it looks unused most of the time.

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
— only Reference does (Racials, Legacy Perks, Class Spellbooks, Dungeon
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
Full 21,458-item catalog (`data/items.json`, built by
`scripts/build-items.js`), filtered/paginated **server-side**
(`lib/items.ts`'s `queryItems`) — the catalog is never shipped to the
client for filtering, to protect load-time. Individual item pages
(`/items/[itemId]`) are **not statically generated** (no
`generateStaticParams`) — rendered on demand. `context: "loot" | "catalog"`
on `LootItemPill`/`ItemTooltipBody` matters: `status === "missing"` means
"no longer drops" in a loot context but "beta hasn't touched this Classic
item yet" in the catalog — don't let the two share wording/styling.

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

## Adding content
See `docs/adding-content.md` for guides/blog/profession frontmatter,
image/credit conventions, and SEO metadata specifics.

## Next up
- **Design the November data layout (items / loot / tooltips) before
  importing the full wow.export dataset** — per-item shards (static files,
  fetched on demand / prerendered) vs. Postgres. Decide this first; today's
  single 10 MB `data/items.json` read by `lib/items.ts` is exactly the
  pattern that won't scale (see the standing rule above).

## Open items (carried forward)
- Export FileDataID 1121272 from wow.export and crop real dungeon/raid/
  battleground icons (see World map above).
- Resolve the duplicate-Naxxramas-Map-row and Emerald-Dream-on-the-map
  questions in `data/map-entrances.json`.
- `data/professions-catalog/uncertain.json`'s 101 low-confidence category
  guesses haven't been reviewed.
- `lib/blog.ts` isn't on the shared `lib/content.ts` loader yet.
- Re-tile Kalimdor with the GM Island 3x3 ADT block excluded (currently
  shows as a stray unlabeled island in the NW corner).
- No mobile pass yet for `DungeonInlinePanel`'s boss/quest two-column
  sub-layout, or for Legacy Perks' touch interactions.

Full history, bug-hunt narratives, and retired/superseded approaches
(the original SVG map MVP, the pre-tile-pyramid proof of concept, the
foreverchanges.pro/map 2D-vs-3D recon, per-session verification detail)
are in `Forevercraft-Knowledge-Base/03-Handoffs/archive/2026-09-30-claude-md-archive.md`.
