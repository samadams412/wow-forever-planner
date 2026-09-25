@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever — a race/class/talent
planner, a reference section, and guides/blog content. Not affiliated with
Blizzard, not monetized. This file is the living architecture reference for
the codebase; it's kept in sync with what's actually implemented (verified
against real files, not assumed from an earlier description) rather than
serving as a fixed project brief.

## Session handoff — 2026-09-25 (map sidebar: zone list, search, layer toggles, URL hash, mobile)

Render + a small amount of state-management refactoring, stopped before
committing. Builds directly on the same day's "data-driven dungeon/raid/
battleground entrance markers" session below -- read that one first.

**Architecture change: selection and layer toggles are now controlled
state, owned by a new `components/map/MapExplorer.tsx`.** Previously
`LeafletZoneMap.tsx` managed its own zone-selection style as an internal
closure variable, invisible outside the component. Since the sidebar now
needs to select a zone (and the map needs to react), and the map needs to
tell the sidebar when ITS OWN border click changed the selection, neither
side can own this alone -- `MapExplorer` is the single source of truth for
`selectedZoneId`/`selectedEntranceId`/`layers`, passed down as props to
both `MapSidebar` (new, fully rewritten) and `LeafletZoneMap` (now a
`forwardRef` component with a `LeafletZoneMapHandle` imperative API:
`flyToWorldBounds`/`flyToWorldPoint`/`openEntrancePopup`, for one-shot
"fly to X" actions from the sidebar that aren't persistent state the way
selection/layers are). `MapLayers`/`DEFAULT_MAP_LAYERS` moved to a new
`lib/map-layers.ts` with no Leaflet import, specifically so `MapExplorer`
can use the DEFAULT VALUE at import time without pulling in
`LeafletZoneMap.tsx`'s own `import L from "leaflet"` (which touches
`window` at import time -- see that file's own header comment) into a
component that isn't behind the `ssr:false` dynamic loader.

**Two real bugs found and fixed while wiring up the combined URL hash**
(`#x=&y=&z=&sel=&off=`, one string covering view + selection + layer
toggles, written by ONE function in `MapExplorer` so no two independent
writers can strip each other's part -- same reasoning `LeafletZoneMap.tsx`
already documents for its own `reportView`/hash-writing split):
- **Stale-closure bug**: `LeafletZoneMap`'s mount effect binds `onViewChange`
  to a Leaflet `moveend` listener ONCE (selection/layers are deliberately
  excluded from that effect's own deps -- see its header comment) --
  making `writeHash` (and therefore `onViewChange`) close over
  `selectedZoneId`/`layers` REACT STATE meant its identity changed every
  render, so the listener stayed bound to whatever those looked like AT
  MOUNT TIME forever. Confirmed live, not just reasoned about: clicking a
  zone row wrote `#sel=zone:12` immediately, then the fly animation's own
  `moveend` firing (via the STALE closure) silently overwrote it with a
  hash that had dropped `sel=` entirely. Fixed by having `writeHash` read
  ONLY from refs (`selectedZoneIdRef`/`layersRef`, kept in sync by a
  separate effect) instead of closing over the state directly -- this
  makes `writeHash`'s (and `onViewChange`'s) identity permanently stable.
- **Reload-clobber bug**, found immediately after fixing the first one:
  the hash-restore effect's own `setSelectedZoneId`/`setLayers` calls (on
  mount, from a shared link) triggered the ref-sync effect on the VERY
  NEXT render -- before `LeafletZoneMap` (an async `next/dynamic(ssr:
  false)` component) had necessarily mounted and read `window.location.
  hash` for ITS OWN x/y/z restoration -- and `writeHash()` firing at that
  point (with `viewRef.current` still `null`) destructively stripped x/y/z
  out of the URL before the map ever got a chance to read them. Confirmed
  live: `sel=`/`off=` restored correctly on reload, but the view silently
  fell back to the default fit-bounds every time. Fixed by additionally
  gating the ref-sync effect's `writeHash()` call on `viewRef.current !==
  null` (i.e., the map has reported at least one real view), not just on
  the hash having been restored.

**`components/map/MapSidebar.tsx`** (full rewrite, still mounted under the
existing continent `<select>` per the task's own instruction) adds:
- **Zone list**: sorted by `levelRange[0]` ascending (zones with no data
  sort last, via `?? Infinity`), a text filter box, a territory-colored
  dot (reusing `ZoneFaction`/`FACTION_COLOR` -- see the earlier "zone
  level ranges + real faction data" session), row click -> `onSelectZoneRow`
  (fly + select). A selected-via-map-click row auto-`scrollIntoView`s.
- **Search** (`/` focuses it, ignored while already typing in a field):
  matches zone names (tagged "Zone", or "City" for the 6 real capital-city
  zones -- Stormwind City/Ironforge/Undercity/Orgrimmar/Thunder Bluff/
  Darnassus, hardcoded since zones.json has no such flag) and entrance
  names -- both a group's own combined name ("Blackrock Mountain") AND
  each of its members' individual names ("Molten Core" is independently
  searchable even though it has no marker of its own, routing to its
  group's marker/popup). Picking a zone result flies+selects; picking an
  entrance flies to its marker at z5 and opens its popup (group or
  single, whichever it is).
- **Layer toggles**: 6 `aria-pressed` buttons (zone borders/labels, level
  lines, dungeons/raids/battlegrounds), the three entrance types showing a
  live count (summed across both single markers and every group member,
  not just visible marker count) from the `entrances` prop.

**Mobile (<768px, Tailwind's own default `md` breakpoint -- matches the
task's own "~768px" exactly)**: the sidebar becomes a `fixed inset-0`
overlay toggled by a `md:hidden` "Map menu" button; on `md:` and up the
same markup reverts to a normal static side-by-side layout via `md:block
md:static md:inset-auto`. No JS viewport detection needed -- pure Tailwind
responsive classes.

**Verified live** (fresh tabs throughout; `resize_window` confirmed
non-functional again -- see below): zone list renders sorted with correct
colored dots on both continents; clicking a row flies to and exactly fits
the zone's bounds, applies the selected border style, and updates the URL
hash; clicking a zone border ON THE MAP (Western Plaguelands, picked
arbitrarily) correctly highlighted and auto-scrolled to its sidebar row --
confirming the map-to-sidebar direction, not just sidebar-to-map; search
found all three required terms ("Uldaman" -> Dungeon, flies + opens its
popup at the exact same position as before; "Blackrock" -> matches both
the group and all 4 of its dungeon members individually, picking the
group flies + opens the full 5-member popup; "Barrens" -> matches The
Barrens zone, flies + selects); toggling "Zone labels" off live-hides
every name label at z3 (confirmed against an otherwise-identical prior
screenshot that had them); a full hash
(`#x=-9097&y=-200&z=3.50&sel=zone:12&off=battlegrounds,levelLines`) pasted
into a fresh tab correctly restored the exact view, the exact zone
selection (border + sidebar row), AND the exact layer state on reload, all
three together, after the two bugs above were fixed. Zero console errors
across every page load and interaction checked, both continents.

**Mobile tooling note**: `resize_window` reports success but leaves
`window.innerWidth` unchanged (same finding as this project's own existing
Tooling notes). Per that same note's own established resolution, the user
was asked and opened a second real ~390px-wide Chrome window; a tab
attached there confirmed genuine `innerWidth: 393` and showed the
collapsed-sidebar/"Map menu"-toggle/full-width-map layout correctly, both
open and closed. Also reproduced the already-documented "a second window
can screenshot but time out on click dispatch" issue -- worked around
(as that note already suggests trying) by dispatching a real `.click()`
via `javascript_exec` instead of the coordinate-based click tool, which
worked cleanly both times it was needed.

**Suggested next:** none of this session's own work needs a follow-up by
itself. Out of scope for this task, confirmed still unbuilt: "where to
level" filter, a selection info card, the in-game (parchment) map style
toggle -- all explicitly excluded per instruction.

## Session handoff — 2026-09-25 (data-driven dungeon/raid/battleground entrance markers)

Render + a small amount of new hand-authored data, stopped before
committing. Builds on the same day's earlier "zone borders+labels render"
session -- read that one first for the pane/CSS-var/StrictMode-cleanup
conventions this reuses.

**Step 0 -- icon art investigation (blocked, reported rather than
guessed):** `UiTextureAtlas.csv`/`UiTextureAtlasMember.csv` ARE exported to
the raw wow.export folder (2,803 / 20,523 rows). Found real client icons
for all three types, all in the SAME atlas texture: `UiTextureAtlas` id
647 -> FileDataID **1121272** (a 1024x1024 sheet). Members: `dungeon`
(CommittedLeft/Right/Top/Bottom 203/253/321/371, 50x50), `raid`
(203/253/373/423, 50x50), `crossedflags` (379/411/718/750, 32x32, used as
the battleground icon -- a real client member, not a raid/dungeon-specific
one, but "crossed flags" is Blizzard's own established PvP/battleground
motif elsewhere in the UI too). **The texture itself (FileDataID 1121272)
has not been exported** -- confirmed by searching the entire wow.export
output folder for it, nothing found. **What to export, exactly:** open
wow.export's Textures tab, search FileDataID `1121272`, export as PNG.
Once it lands anywhere in the wow.export output folder, crop the three
rectangles above with `sharp` and save into `public/map/icons/` (now
gitignored, added to `.gitignore` proactively this session even though the
folder doesn't exist yet -- same local-only policy as the tiles). Until
then, `LeafletZoneMap.tsx`'s `entranceIconSvg()` renders three small
**original SVG placeholders** (a portal-ring for dungeon, a ring+dot for
raid, crossed lines for battleground -- teal/purple/red) explicitly marked
in its own comment as a swap-in-later placeholder, not a "no client icon
exists" fallback -- all three types DO have real client icons, they're
just not extracted yet.

**Step 1 -- new `lib/map-entrances.ts`**, replacing the old hardcoded
Uldaman-only marker and the "3b eastern-kingdoms-only" gate in
`app/reference/map/[continent]/page.tsx` entirely:
- Resolves each `data/map-entrances.json` entry's display name/level range
  from `data/dungeons.json` (dungeons -- already existed) or two NEW small
  hand-authored files, **`data/raids.json`** and **`data/battlegrounds.json`**
  (same id/name/levelMin/levelMax shape as dungeons.json). Every original
  Classic raid is an unambiguous level 60 (well-established, not guessed);
  the 6 new-in-Forever raids get `levelMin/levelMax: null` since nothing in
  this project's data confirms their level yet. Battlegrounds get NO level
  field at all, deliberately -- a Classic battleground has no single
  canonical level the way a dungeon does (10-level queue brackets up to
  60), so inventing one would misrepresent the data; `data/battlegrounds.json`'s
  own `_readme` explains this.
- **Skips**, with a stated reason each: any entry with no `worldPosition`
  (20 total -- see the full list in this session's chat report, matches
  the "expect Naxxramas/new-Forever-dungeon/BG gaps" pattern already
  documented elsewhere in this file), plus Emerald Dream explicitly (real
  client data, but not a confirmed Classic/Forever raid this project
  tracks anywhere else, pending a decision either way -- it also has no
  position in this build regardless, so this skip is currently redundant
  with the no-position one, but stays explicit so the reason survives once
  a future build gives it a real position).
- **Grouping**: plain union-find over pairwise distance, same-continent
  only, threshold `ENTRANCE_GROUP_DISTANCE_YARDS = 600` -- picked
  empirically, not guessed: every real multi-entrance-instance pair
  (Scarlet Monastery's 4 wings, Dire Maul's 3, Stratholme's 2, Ahn'Qiraj's
  2, and Blackrock Mountain's 5 -- Lower/Upper Blackrock Spire, Blackrock
  Depths, Molten Core, AND Blackwing Lair, which turned out to chain-
  connect through LBRS/UBRS at <=350 yards each, confirmed live in the
  popup, not assumed from the task's own 3 named examples) sits under 600
  yards apart, while the nearest unrelated-dungeon pair on the whole map
  (Uldaman/Zul'Farrak, 733 yards) sits safely outside it -- computed by
  checking every pairwise distance among all 32 positioned entrances
  before picking the number, not tuned after the fact. 5 groups found
  total (3 on EK, 2 on Kalimdor) -- see the chat report for the full
  membership list.
- **Group labels** are derived, not hand-mapped, for 4 of the 5 groups: a
  shared `"X: Y"` name prefix (Scarlet Monastery/Dire Maul/Stratholme) or a
  shared trailing word (`"Ruins of Ahn'Qiraj"`/`"Temple of Ahn'Qiraj"` ->
  `"Ahn'Qiraj"`). Blackrock Mountain's five members are five fully
  independently-named real places with no shared naming convention at all
  -- the one deliberate override in `GROUP_LABEL_OVERRIDES`, keyed by the
  cluster's own sorted member-id signature (computed from the real
  clustering, not hand-guessed membership).

**Step 2 -- zoom behavior**, one exported `ENTRANCE_ICON_ZOOM` config
constant in `LeafletZoneMap.tsx`: `fadeInFrom: 2.5`, `sizeAtFadeIn: 16`,
`sizeAtMax: 32`, `maxZoomForSizing: 6`, `raidSizeMultiplier: 1.15`. Size
and opacity are both driven by a single `--entrance-icon-size`/
`--entrance-icon-opacity` CSS custom property pair set ONCE per zoom
change on the shared `pins` pane element and inherited by every marker's
inner icon element -- satisfies "resize via a CSS variable... not by
re-creating markers" literally: markers are created once, only the pane's
own two style properties ever change on zoomend. Each marker's OUTER
`divIcon` wrapper is a fixed 32x32 box (`iconAnchor` always `[16,16]`)
regardless of the icon's current visual size, with the actual resizing
inner element centered inside it -- this is what keeps the marker's real
geographic anchor point from drifting as the visible icon grows/shrinks;
sizing the icon via the divIcon's own `iconSize` instead would have moved
the anchor every zoom step.

**Step 3 -- hover/click:** hover brightens the icon via a `filter` swap on
`marker.getElement()`'s own inner element (no re-render). Click opens
Leaflet's own bound popup (no custom handler needed, `L.Marker` already
opens `bindPopup` content on click) in the project's existing popup style
(`#0d0b07` background, gold name) -- single-entrance popups show name,
"Dungeon/Raid/Battleground &middot; Level X-Y" (omitted when no level
data), a provenance line (`entranceProvenanceLabel()` maps the data's own
`source: "map.corpse"` to "client data (Map.Corpse)"; a future `"manual"`
source would read "manual"), world coordinates, and a loot-page link only
when `hasDungeonLoot()` says one exists (raids/battlegrounds never link --
no such page exists for them yet). Grouped markers list every member with
its own name/type/level/link, matching the task's own "each with its own
link" requirement.

**Verified live, both continents, fresh tabs (same CDP same-tab-renav
quirk as the prior session -- fresh tabs used throughout, not same-tab
hash edits):** Uldaman's popup shows "Dungeon &middot; Level 44-50 /
Position: client data (Map.Corpse) / world -6060, -2955" -- pixel-identical
position to the old hardcoded pin (map.corpse's own -6060.18,-2954.997
rounds to the same integers the old hardcoded `ULDAMAN_WORLD` used).
Blackrock Mountain's popup lists all 5 members with correct per-member
levels and links (raids correctly have no link). Dire Maul's popup lists
all 3 wings. Icons are invisible at the default (z0.75) fit-bounds view,
appear and grow through z3 (visibly mid-size) to z6 (visibly at the 32px
cap). Zero console errors across every page load checked. `public/map/
icons/` doesn't exist (extraction is blocked, see Step 0), so `git status`
shows no icon images -- trivially satisfied, not yet meaningfully tested
(there's nothing to gitignore yet).

**Suggested next:** export FileDataID 1121272 per Step 0 above, crop the
three rectangles, and swap `entranceIconSvg()`'s placeholder output for
real `<img>` tags pointing at `public/map/icons/{dungeon,raid,
battleground}.png` -- everything else (sizing, fade, hover, panes) needs
no change. Resolve the Emerald Dream question (belongs on the map or not)
and the duplicate-Naxxramas-Map-row question, both still open from the
original map-entrances.json session. If any of the 6 new-Forever raids
ever get a confirmed level requirement, fill it into `data/raids.json`
directly.

## Session handoff — 2026-09-25 (fixed: boxes-in-rivers hole bug in zone-areas.json)

Data-only, stopped before committing. Root cause and fix in
`scripts/build-zone-areas.js`; full technical detail already in that
file's own header comment, summarized here.

**Diagnosis (before fixing anything):** a new `classifyHoles()` function
samples every grid cell inside every zone's traced polygon holes and
buckets each cell by what's actually there (another real zone = legitimate,
Step-1 ocean-ID removal, Step-2 coastal-trim removal, raw AreaId 0, or an
unresolved raw ID). Run against the pre-fix ("naive") grid: **EK had 24
holes, ALL of them "removed by coastal trim (Step 2)"** (Western
Plaguelands, Arathi Highlands, Wetlands, Riverglades, Duskwood, and a
21-cell one in Stranglethorn Vale specifically); **Kalimdor had 54**, a mix
of the same Step-2 artifact (Teldrassil, Moonglade, Darkshore, Felwood,
Azshara, Ashenvale, The Barrens, Dustwallow Marsh -- one cluster there had
16+9+6+3+2+2+2+1+1+1+1 cells scattered through the swamp -- Feralas,
Un'Goro Crater) plus the handful of genuinely legitimate other-zone holes
that were already expected (Darnassus in Teldrassil, Orgrimmar in Durotar,
Thunder Bluff in Mulgore, 3 tiny Durotar slivers in Ashenvale). Root cause:
a wide/slow river or swamp segment can occasionally satisfy Step 2's own
liquidType+height criterion in complete isolation from any real ocean,
producing an "island" removal in the middle of dry land.

**Fix:** Step 2 now runs in two parts. 2a computes the same naive
candidate-removal set as before (unchanged criterion). 2b is new: a
candidate only stays removed if 4-connected -- travelling only through
other removed-or-never-assigned cells -- to a real Step-1 ocean cell or the
outer edge of the 1024x1024 world grid (plain BFS/flood-fill, array-index
queue, not `Array.shift()`, since the candidate set can be 100k+ cells).
An isolated candidate is restored to its original zone. **Real-world raw-
AreaId-0 cells (mostly open ocean/void beyond the landmass) count as
passable travel-through cells but are NOT seeds themselves** -- only actual
Step-1 ocean removals and the grid edge seed the flood, matching the task's
own "through other removed or empty cells... to the Step-1 ocean cells or
the grid edge" wording exactly.

**Result:** EK -- 213 of 16,854 naive Step-2 candidates were isolated
pockets, restored; **zero holes remain**, all 24 boxes gone. Kalimdor --
263 of 17,532 restored; **6 holes remain, and every one of them is now
purely `zone:<name>`** (the same legitimate other-zone holes listed above,
untouched by the fix since they were never Step-2 removals to begin with)
-- confirmed by re-running `classifyHoles()` against the fixed grid, not
assumed.

**Verified live** (debug images + a byte-level pixel diff, not eyeballing
alone): Stranglethorn Vale's river -- visibly full of small boxes in
`debug-output/zone-areas/before/eastern-kingdoms.png`, completely clean in
`after/`; the western coastline in the same crop is still trimmed exactly
as before (the coastal-trim's own value is untouched, only the isolated-
pocket false positives are gone); Kalimdor's Dustwallow Marsh swamp shows
the same before/after cleanup, with its real coastal cove/small-island
holes preserved; **Loch Modan's crop is byte-for-byte pixel-identical
before vs. after** (0 of 494,844 bytes differ); Elwynn Forest's Stormwind
City hole is still there, unchanged. Check (c) (gaps/overlaps) is 0/0 on
both continents; every Prompt-6 point-in-zone check still passes.

`public/map/{eastern-kingdoms,kalimdor}/zone-areas.json` and `zones.json`
(labelAnchor) were regenerated from the fixed grid. Re-run via `node
scripts/build-zone-areas.js` any time the source data changes -- the
connectivity fix is not behind a flag (it's a correctness fix, not a
comparison feature like Step 2 itself).

## Session handoff — 2026-09-25 (zone level ranges + real faction data)

Follow-on to the same day's "ocean/coastal grid trim, then zone borders+
labels render" session below -- this one filled in the two pieces that
session's labels left dark (levelRange, faction). Stopped before
committing, per instruction.

- **`data/sources/leveling-ranges/2026-09-25.md`**: the user's own pasted
  leveling-route text, saved verbatim with a `source =` / `date =` header.
  Source is credited as "Sam's leveling notes (pasted directly in chat; no
  external URL given)" -- the user's own instruction template left the
  source blank, so this is a stated assumption, not a verified citation;
  flag if wrong.
- **`data/zone-levels.json`** (hand-authored, committed, own `_readme`):
  one `{name, min, max, source, confidence: "estimated"}` entry per zone
  the source text gives an explicit number for -- 21 EK zones, 18 Kalimdor
  zones, plus Zephras Isle (areaId 16593, included per instruction even
  though it isn't a zone on either continent's own zones.json -- MapID
  2991, a separate map; the merge step below only ever touches zones that
  already exist in a continent's zones.json, so this entry is inert unless
  Zephras Isle is ever registered as a real zone). Interpretation calls
  made (all flagged, not silently resolved):
  - **Ashenvale -> 18-30**, combining an implied ~20-30 ("Wetlands
    (20-30), with Ashenvale as an alternative") with an explicit 18-30
    (Horde's "Ashenvale, Hillsbrad Foothills (18-30)") -- widest span, per
    the task's own worked example.
  - **Mount Hyjal -> 60-60**, "at 60" treated as a single-level range, per
    instruction.
  - **Hillsbrad Foothills -> 18-30 only**: it's named twice (once with no
    number, as a bare next-step after Silverpine Forest on the Undead
    path; once explicitly "(18-30)" on the Horde ladder) -- only the
    explicit mention contributed a number, the bare mention added nothing
    to merge.
  - The two "most likely" Skyborne continuations (Alliance: "most likely
    through Darkshore, Westfall, or Loch Modan"; Horde: "most likely The
    Barrens, Silverpine Forest") were read and considered but produced no
    new/changed data -- every zone they name already has its own
    independent explicit range elsewhere in the text, and "most likely"
    is explicitly hedged, not a number to encode.
  - "Desolace or Arathi Highlands (30-40)" and "Redridge Mountains" and
    every other multi-zone-one-number line ("Tanaris, Feralas, The
    Hinterlands (40-50)", etc.) were NOT treated as interpretation calls --
    one explicit number applied to N named zones is direct, not ambiguous.
  - Every zone name in the text matched a zones.json entry exactly (no
    apostrophe/spelling mismatches found, despite the task's own
    Shen'dralas/Un'Goro/"The Hinterlands" examples -- none of those
    particular names happen to appear in this text) -- the only non-match
    is Zephras Isle, which is expected/by design, not a typo.
  - **Zones left with no level range** (10, exactly matching the task's
    own prediction): Alterac Mountains, Deadwind Pass (EK); Moonglade,
    Shen'dralas (Kalimdor); every city (Undercity, Stormwind City,
    Ironforge, Orgrimmar, Thunder Bluff, Darnassus).
- **`scripts/build-map-zones.js`** now merges `data/zone-levels.json` into
  each zone's `levelRange`/`levelRangeSource`/`confidence` at build time --
  zones.json is never hand-edited. Since this script REBUILDS zones.json
  from scratch every run (it's the only writer of the zone list), and
  `labelAnchor` is written by a *different*, later script
  (`build-zone-areas.js`) as a post-process, a plain rebuild here would
  have silently dropped every zone's labelAnchor -- fixed by reading the
  existing zones.json first and carrying `labelAnchor` forward by areaId
  before overwriting. New check (e) reports the merge (39/49 zones got a
  range) and cross-checks for zone-levels.json entries with no matching
  zone (only Zephras Isle, expected).
- **Real faction data found and used, not proposed.** Checked Prompt 7's
  own reasoning first (it always fell back to "contested" because the
  *trimmed* `data/sources/client-db2/*/areatable.csv` snapshot has no
  faction column) -- but the RAW wow.export `AreaTable.csv` this project's
  own trim script reads from DOES have one: `FactionGroupMask`. Verified
  its values (0/2/4, no other combination appears across all 49 zones)
  against every EK/Kalimdor zone's real known Classic territory before
  trusting it -- exact match everywhere (starting zones and capital-city
  zones get 2=Alliance/4=Horde, every regular/shared leveling zone gets
  0=Contested, including well-known contested PvP zones like Ashenvale,
  Hillsbrad Foothills, and Stranglethorn Vale). Since this is real client
  data (not the "propose from standard Classic territory" fallback the
  task described for the no-data case), it was used directly per the
  task's own "if AreaTable has a faction field... use it" branch, not held
  back pending approval -- that approval gate was explicitly attached to
  the *proposal* fallback only, which this session never needed. Flag if
  this reading is wrong; reverting is a small, isolated change (see below).
  - `scripts/trim-client-db2.js`'s `areatable` column list gained
    `FactionGroupMask`; the snapshot was re-pulled (purely additive --
    every existing column unchanged).
  - `scripts/build-map-zones.js`'s `factionFor()` maps `0/2/4` ->
    `contested/alliance/horde` (falls back to `contested` for anything
    else, though nothing else occurs); every zone entry gets a `faction`
    field. New check (f) prints every zone's derived faction (see the
    script's own console output for the full per-zone list) and confirms
    no unexpected mask values.
  - `lib/zone-areas.ts` gained a `ZoneFaction` type and `faction` field on
    `ZoneAreaData`; `LeafletZoneMap.tsx`'s `labelHtml` now colors the
    level-range line from `FACTION_COLOR[zone.faction]` instead of always
    Contested -- the hardcoded-gold fallback code from the prior session's
    handoff is gone, this is real data now.
- **Verified live on both continents** (fresh tabs, matching this
  project's own established hash-restore reliability note): Elwynn Forest
  shows "1-10" in Alliance blue, Westfall "10-20" blue, The Barrens
  "10-25" in Horde red, Durotar "1-10" red, Stranglethorn Vale "30-45"
  gold/contested, Mount Hyjal "60-60" gold/contested, Ashenvale "18-30"
  gold, Darkshore "10-20" blue -- all exactly matching the derived data.
  Stormwind City/Deadwind Pass/Orgrimmar show their name with no level
  line and no blank gap. Collision culling still holds with the taller
  two-line labels at a dense EK cluster (Dun Morogh/Loch Modan/Wetlands/
  Searing Gorge/Badlands all visible with no overlap). Zero console
  errors on every view checked.

**Suggested next:** none of this session's work needs a follow-up by
itself -- the level-line/faction rendering code was already fully built
in the prior session and just needed real data, which it now has.

## Session handoff — 2026-09-25 (ocean/coastal grid trim, then zone borders+labels render)

Two back-to-back tasks in one session, explicitly scoped not to overlap:
Task A was data-only (no map UI touched); Task B was render-only (no data
regenerated). Both stopped before committing, per instruction.

**Task A -- ocean removed from the zone grid before roll-up/tracing, in two
steps, both applied in `scripts/build-zone-areas.js`:**

- **Step 1 (mandatory, name-based):** `data/map-ocean-areas.json` is a
  committed, commented exclude list of 25 raw AreaIds whose ZoneName is one
  of the game's administrative open-ocean labels (TheGreatSea/TheVeiledSea/
  TheForbiddingSea/SouthSeas) -- derived by grepping `areatable.csv` for
  those exact ZoneName values, NOT a raw "sea"/"ocean" text search (that
  also matches "SearingGorge" and "TheSeaofCinders", a real lava lake in
  Searing Gorge that must stay). Any raw cell matching one of these ids is
  treated as empty before rollup. Removed 69,723 cells (EK) / 93,768 cells
  (Kalimdor).
- **Step 2 (flagged, `--no-coastal-trim` to disable, on by default):**
  liquid-based coastal trim. `scripts/lib/adt-liquid.js` reads MH2O per-
  chunk (found empirically: this build's exporter doesn't populate MCNK's
  own sub-chunk offset fields, so MCVT is located by scanning sequentially
  from the fixed 128-byte header end, same "no real offset table" pattern
  already documented for the missing MCIN; MCNK's `position` C3Vector DOES
  read correctly at a fixed offset, verified by matching it against the
  independently-computed chunk world coordinates for 8 samples across 2
  tiles). A cell not already removed by Step 1 is additionally emptied only
  if it has a real MH2O layer whose liquidType matches what Step 1's own
  cells empirically turned out to be made of (discovered at run time per
  continent from Step-1 cells, not hardcoded -- came out to `1250` on both
  continents, confirmed distinct from Loch Modan's lake liquidType `1325`)
  AND the chunk's own terrain (MCVT) is entirely below that layer's lowest
  recorded height. Removed 16,854 more cells (EK) / 17,532 more (Kalimdor).
- **Checks, all reported:** 0 gaps/0 overlaps on the final grid (both
  continents); every Prompt-6 point-in-zone check reproduced the same
  answers (Uldaman -> Loch Modan, Stormwind's city-label pin -> Elwynn
  Forest, etc. -- see the script's own `runChecks`); 8 zones lost more than
  25% of their Step-1-only cell count to Step 2 (Stranglethorn Vale,
  Westfall, Eastern Plaguelands, Stormwind City on EK; Durotar, Azshara,
  Darkshore, Feralas on Kalimdor) -- every one individually visually
  confirmed via before/after debug images
  (`debug-output/zone-areas/{before,after}/<continent>.png`, plus named
  crops for Eastern Plaguelands, Durotar and Loch Modan) to be real open-
  ocean overhang being trimmed off a coastal zone's administrative
  rectangle, not real land -- Eastern Plaguelands' huge rectangular ocean
  spill north of the continent (visible in the "before" image) is
  completely gone in "after," now hugging the real coastline. **Loch
  Modan's lake was confirmed pixel-identical before vs. after** (its
  liquidType never matches the discovered ocean type), proving inland
  water survives Step 2 untouched.
- `public/map/{eastern-kingdoms,kalimdor}/zone-areas.json` and `zones.json`
  (labelAnchor) were regenerated from this final grid; both already
  committed-shape files, not new. Re-run via `node scripts/build-zone-
  areas.js` any time the source ADTs, `zones.json`, or the ocean exclude
  list change.

**Task B -- zone borders and name labels rendered on the existing Leaflet
map (`components/map/LeafletZoneMap.tsx`, `app/reference/map/
[continent]/page.tsx`, new `lib/zone-areas.ts`):**

- **Panes:** `zones` (450, above tiles), `pins` (600, the existing Uldaman
  marker moved into it), `names` (650, `pointer-events:none` so a label
  never blocks a pin or border click) -- matches docs/map-reference-
  foreverchanges.md section 3's own layering.
- **Borders:** every zone's GeoJSON geometry (`lib/zone-areas.ts` merges
  `zones.json` + `zone-areas.json` server-side into one `ZoneAreaData[]`
  prop) drawn on ONE shared `L.canvas()` renderer -- a faint dark underlay
  polygon (non-interactive) plus a thin gold (`#ffd100`, weight 1, opacity
  0.55) border polygon per zone, both using the same renderer/pane.
  Hover/click both switch to a brighter/thicker style (`#fad961`, weight
  2.5); a selection persists until a click on empty map space (the
  border's own click handler calls `L.DomEvent.stopPropagation`, so the
  map-level click-to-clear listener only ever fires for genuine empty-space
  clicks). No selection card, per the task's own out-of-scope list.
- **Labels:** `divIcon` markers at each zone's `labelAnchor`, bold
  uppercase gold text with a triple black text-shadow, recomputed on
  `zoomend`/`moveend` only (`ZONE_LABEL_ZOOM` exported constant:
  `namesFrom: 1`, `levelLineFrom: 3`). Collision culling keeps the larger
  zone (by `worldBounds` bbox area) when two labels' estimated boxes
  overlap. A zone's own label hides once all four viewport corners
  (projected to the same pixel space as the zone's own outer ring) fall
  inside it -- verified live: deep inside Loch Modan's lake at z5, zero
  zone labels render; the same continent's Durotar at z5 still showed its
  label because the coastline (a real border) was also in view, which is
  correct, not a bug. The level-range sub-line is faction-colored (`#6fb1ff`
  Alliance / `#ff7a6b` Horde / `#ffd100` Contested) but **never actually
  renders yet** -- `zones.json`'s `levelRange` is `null` for every zone in
  this build (see the "Client DB2 zone/entrance data" note below: no level-
  range source exists in the current DB2 snapshot) and there is no
  AreaTable faction field in the snapshot either, so the faction branch
  always falls through to Contested. Both are wired correctly and will
  light up automatically the moment either field gets real data -- nothing
  else needs to change.
- **A real bug found and fixed, not just a data problem:** the map's very
  first `setView`/`fitBounds` call (before Leaflet considers itself
  "loaded") never fires `moveend`, so the label system's own moveend
  listener never ran for the initial view -- confirmed live, a synchronous
  `updateLabels()` call right after `setView` produced zero labels because
  `map.getSize()` still returned a stale pre-layout value. Fixed with a
  nested `requestAnimationFrame` (outer: `invalidateSize()`; inner:
  `updateLabels()`), which reliably runs after the container's real size
  has painted.
- **A second real bug found via React StrictMode's dev-mode double-invoke**
  (mount -> cleanup -> mount): the first mount's scheduled `rAF` callback
  wasn't cancelled on cleanup, so it fired after that first `L.Map` instance
  was already `.remove()`d, throwing inside Leaflet's own
  `containerPointToLayerPoint` ("Cannot read properties of undefined
  (reading '_leaflet_pos')") -- this silently aborted `updateLabels()` and
  was why a zone-border click could appear to do nothing. Fixed by storing
  both rAF ids and cancelling them in the effect's cleanup.
- **Verified live on both continents** (screenshots at z1.5/z3/z5 taken
  during this session, not saved to the repo -- debug artifacts only):
  borders align with real coastline and city edges at z6-equivalent detail;
  hover/click/deselect all work via a border click computed from the
  zone's own projected ring coordinates (clicking blind on visually-
  estimated pixel coordinates was unreliable -- canvas hit-testing for a
  `fill:false` polygon only responds near the actual stroked line); the
  Uldaman pin's popup still opens correctly through/above the zone borders;
  zone names appear from z1 without overlapping and thin out correctly;
  zooming inside a zone (Loch Modan) hides its own label with no blank gap
  left behind; zero console errors after the two fixes above. **Not
  verified**: the `+`/`-` zoom control buttons and scroll-wheel zoom didn't
  register clicks/scroll through this session's browser-automation tooling
  (a known, previously-documented environment limitation -- see this same
  file's own "Tooling notes" section on click/scroll registration issues,
  not a regression) -- all zoom-level testing instead went through the
  existing URL-hash view-restore mechanism, which is real, user-reachable
  functionality (a shared link), not a test-only workaround. Also
  **not verified**: same-tab CDP re-navigation to a hash-only-different URL
  was found to NOT reliably re-apply the hash on this specific dev-tooling
  setup (a fresh tab always worked correctly, matching this project's own
  prior "brand-new tab" verification note for the hash mechanism) -- if
  this resurfaces, test via a fresh tab per zoom level, not same-tab re-
  navigation.

**Suggested next:**
- If `AreaTable`'s faction field or a level-range source is ever added to
  the DB2 snapshot, the label ladder's level-line/faction-color code in
  `LeafletZoneMap.tsx` needs no changes -- just populate `zones.json`'s
  `levelRange` (and, if faction data ever exists, extend `ZoneAreaData`/
  `lib/zone-areas.ts` with it and swap the hardcoded Contested fallback).
- No selection card, sidebar zone filter, subzone labels, or dungeon/raid
  icons yet -- all explicitly out of scope for this session's task.
- Kalimdor's own before/after coastal-trim crops weren't individually
  named/saved this session (only Eastern Plaguelands, Durotar and Loch
  Modan were) -- the full before/after mosaic images cover it, but a named
  Kalimdor coastline crop would be a quick follow-up if ever needed again.

## Session handoff — 2026-09-25 (zone polygons from raw ADTs, no UI changes)

Data-only task, explicitly scoped to never touch `public/map/*/tiles/` or
the map UI. All 6 numbered steps done, all 5 checks reported. Stopped
before committing, per instruction.

**Step 0 -- format confirmed empirically before writing any parser, not
assumed:** root `.adt` files exist for both continents
(`C:/Users/samue/wow.export/maps/{azeroth,kalimdor}/<mapDir>_<col>_<row>.adt`).
This build uses split ADTs (root + `_lod`/`_obj0`/`_obj1`/`_tex0` per tile,
confirmed by file listing and size -- the root is the only large one, ~400KB+
vs. a few KB for the others). MCNK headers ARE in the root file, and this
build's root ADTs have **no MCIN offset table** -- all 256 MCNK chunks
follow MHDR/MH2O sequentially in row-major order. Confirmed two ways before
trusting it: each MCNK's own `IndexX`/`IndexY` header fields exactly match
its position in that sequential list for every chunk checked, and a
known-Dun-Morogh tile (`azeroth_33_42.adt`) reads AreaId 1 for its interior
chunks and 138 (Misty Pine Refuge, a real Dun Morogh subzone) at one border
-- using the task's own suggested offset, 0x34, which turned out correct.
`scripts/lib/adt-areas.js` still handles an MCIN-based layout defensively
(cheap to support, never assume one build's format holds forever), but this
build never exercises that path.

**Step 1 -- the grid.** `scripts/build-zone-areas.js` reads every root ADT's
256 MCNK AreaIds into a 1024x1024 grid (`Uint16Array`, row-major, index =
`gRow*1024+gCol`) -- 64 ADTs x 16 chunks/tile per side, 33.3333 world units
per chunk (`scripts/lib/chunk-grid-coords.js`'s `CHUNK_WORLD_SIZE`). The raw
grid (subzone ids, pre-roll-up) is cached to
`data/sources/client-db2/<build>/zone-grid-<continent>.bin` (2MB/continent,
raw `Uint16Array` bytes) -- **gitignored** (`data/sources/client-db2/*/
zone-grid-*.bin`), a build artifact for re-runs, not source data.

**Step 2 -- roll-up.** `ParentAreaID` was already in the trimmed
`areatable.csv` snapshot from the previous session's task, so no re-trim was
needed. For each raw AreaId present in the grid, `resolve()` walks
`ParentAreaID` upward until it hits an id present in that continent's own
`zones.json` (from the previous session), or gives up (no parent, unknown
id, or a cycle). Reported, not silently dropped or guessed at:
- **AreaId 0 (never-assigned) chunk counts:** 872,416 (EK) / 816,144
  (Kalimdor) out of 1,048,576 total cells -- expected, not a bug: only
  736/988 of the 4,096 possible 64x64 ADT-grid positions have any real
  terrain at all (matches the tile pyramid's own "empty tiles skipped"
  stats from an earlier session), so most of the 1024x1024 grid is
  legitimately outside the landmass.
- **Raw AreaIds that don't roll up to a known zone** -- 6 on EK, 2 on
  Kalimdor, all real, explainable client quirks, not parsing bugs: Gilneas
  (17065, +City/Ruins/Northern Headlands/Shark-Infested Waters, 2270+
  chunks) has real terrain in this build but no `UiMapAssignment` zone
  entry yet; Gillijim's Isle (408) is a known long-standing un-zoned Vanilla
  island near Stranglethorn; Gates of Ahn'Qiraj (3478, Kalimdor) and The
  Great Sea (332, Kalimdor) are real areas with no dedicated zone-map entry
  either. None of these are in `zones.json`; their chunks stay `0` in the
  rolled grid.
- **Zones with zero chunks in this build:** Undercity (1497) and Ironforge
  (1537) -- both underground cities carved into a mountain, whose surface
  footprint is apparently tagged with the surrounding zone's own AreaId
  (Tirisfal/Dun Morogh) rather than their own city id in this build. Not an
  error -- `zone-areas.json` simply has no entry for either, and
  `zones.json`'s `labelAnchor` is likewise absent for both.

**Step 3 -- tracing (`scripts/lib/raster-to-polygons.js`).** A generic
rectilinear-polygon-with-holes tracer, unit-tested against a single cell, a
3x3-with-a-hole "donut," and a two-piece multipart shape before being
trusted on real data (all three passed exactly as expected -- see the
script's own header comment for the algorithm and the specific edge-
direction/winding-sign convention it relies on). Only strictly collinear
points are removed -- no smoothing, no per-polygon simplification -- so two
neighboring zones' shared border is bit-for-bit identical on both sides
(each is retraced from the exact same underlying grid cells). 11 "pinch
point" vertices (two same-label regions touching at one corner only) were
hit and resolved deterministically on Kalimdor, 0 on EK -- reported, not
silently possible to go unnoticed.

**Step 4 -- label anchors.** `scripts/lib/polylabel.js` is a from-scratch
~150-line reimplementation of Mapbox's polylabel (pole-of-inaccessibility)
algorithm -- this repo has no `polylabel` package and the algorithm is small
enough that adding a dependency for it wasn't worth it. Unit-tested against
a plain square (exact center), a known "L-shape" tricky case, and a donut
(all three gave geometrically correct, expected answers) before use.
`labelAnchor` is computed on each zone's LARGEST part (by traced area, so a
multipart zone's label doesn't end up in its smallest sliver) and written
into that continent's own `zones.json` (both continents got a full
regenerate of `zones.json` — from data/sources/client-db2 — the earlier
session's other fields on that file are untouched, only `labelAnchor` was
added per zone).

**Coordinate space -- deliberately NOT routed through `lib/map-coords.ts`.**
`scripts/lib/chunk-grid-coords.js` converts grid cell <-> world coordinates
directly from the one truly fundamental relationship (the 64x64 ADT grid is
centered on the world origin, 533.3333 world units per tile -- the same
constant `slice-map-tiles.js`'s own "full-grid corner sanity check" already
asserts as exactly ±17066.667 on both axes), NOT by reusing
`lib/map-coords.ts`'s image-pixel-corner math. Two reasons: that module
bridges wow.export's stitched TILE IMAGE pixels <-> world coordinates, a
different (if numerically equivalent) relationship than chunk-index <->
world coordinates; and `lib/` is TypeScript consumed by Next while
`scripts/` is plain CommonJS with no TS runner installed in this repo
(checked -- no `ts-node`/`tsx`/etc.), so importing one from the other isn't
wired up anywhere in this codebase. The SAME axis-swap convention documented
in `lib/map-coords.ts`/CLAUDE.md's world-map note still applies here: a
chunk's COLUMN maps to `worldY`, its ROW maps to `worldX`. GeoJSON
coordinates are written as plain `[worldX, worldY]` pairs (not lng/lat --
this project's own world-coordinate convention throughout, just reusing
GeoJSON's structural format as the task asked for).

**`public/map/<continent>/zone-areas.json` shape:** a plain object keyed by
`areaId` (string keys, JSON requires it), each value a standalone GeoJSON
`Feature` (`properties: {areaId, name}`, `geometry` a `Polygon` for a
single-part zone or `MultiPolygon` for a multipart one) -- not one big
`FeatureCollection`, since the task asked for "GeoJSON, keyed by areaId."
Every ring inside is independently valid GeoJSON-shaped coordinate data.

**Checks, all reported:**
- **(a) Point-in-zone.** Tested via direct rolled-grid lookup at the
  point's own grid cell (equivalent to testing the traced polygon, since the
  polygon is an exact re-expression of the grid, and cheaper/no edge-case
  risk). 4 of 7 test points landed exactly as expected: Goldshire ->
  Elwynn Forest (12); Riverglades' own bbox center -> Riverglades (16591, no
  independent landmark point exists for this new zone in this export, noted
  honestly rather than treated as a strong check); Thunder Bluff -> Thunder
  Bluff (1638); Stormwind Harbor -> Stormwind City (1519). **3 came back
  different from what was expected, each independently verified as a real
  client-data fact, not a pipeline bug** (confirmed by reading the raw,
  pre-rollup grid cell directly, bypassing the rollup/tracer entirely, for
  each one):
  - **Uldaman's `map.corpse` point resolves to Loch Modan (38), not
    Badlands (3).** The raw AreaId at that exact cell is 923 ("Stonesplinter
    Valley"), a real, well-known Vanilla subzone with `ParentAreaID` 38
    (Loch Modan) -- not 3. This is a common mix-up (Uldaman is usually
    *associated* with Badlands by level range/lore) but the entrance's
    actual client-tagged terrain has apparently always been Loch Modan's
    Stonesplinter Valley, not Badlands proper. The task's own stated
    expectation was wrong here, not this pipeline.
  - **Stormwind's plain city-label `AreaPOI` pin (id 16) resolves to Elwynn
    Forest (12), not Stormwind City.** Its raw cell is genuinely 12.
    **Stormwind Harbor** (a different, more specific POI) resolves correctly
    to 1519. The generic city-label pin sits right at/just across the city's
    own polygon edge, not safely inside it.
  - **Orgrimmar's plain city-label `AreaPOI` pin resolves to Durotar (14),
    not Orgrimmar (1637)**, for the same reason -- its raw cell is genuinely
    14. Thunder Bluff's own city-label pin, by contrast, DOES land correctly
    inside Thunder Bluff (1638). Not a uniform quirk of all city pins, just
    Stormwind's and Orgrimmar's specifically, in this build.
- **(b) Polygon bbox vs. `UiMapAssignment` rectangle.** Every zone was
  checked; the great majority of "offenders" (dozens on each continent) are
  fully explained by ONE cause, confirmed by identifying each offending
  zone's largest contributing raw subzone (the build script's own console
  output does this automatically now): a few massive administrative "sea"
  AreaIds -- The Great Sea, The Veiled Sea, South Seas, The Forbidding Sea --
  each spanning thousands of chunks of open ocean along a huge stretch of
  coastline, get `ParentAreaID`-assigned to a SINGLE neighboring coastal
  zone in Blizzard's own data, so that one zone's rolled-up polygon balloons
  to cover a huge ocean rectangle far beyond its nominal `UiMapAssignment`
  box. This is exactly the "ocean clipping" the task's own out-of-scope list
  named -- not attempted here, and this is why. A handful of zones (Loch
  Modan +221, Redridge +110, Searing Gorge +1023 on one axis, Darnassus +295
  via a real subzone "The Temple Gardens") show small, land-based, genuine
  overshoot instead -- boundary jaggedness at chunk resolution, not a bug.
- **(c) Gaps/overlaps -- 0 and 0, on both continents.** Every traced
  polygon was independently re-rasterized (point-in-polygon over its own
  bbox) and compared cell-by-cell against the rolled grid it came from: zero
  cells that should have a zone but aren't covered by any traced polygon,
  zero cells covered by 2+ zone polygons. This is the tracer's own internal
  consistency proven directly against real data, not just the earlier
  synthetic unit tests.
- **(d) File size, comfortably under target, nothing simplified to get
  there:** `zone-areas.json` is 48 KB (EK) / 57 KB (Kalimdor), vs. the ~500
  KB target.
- **(e) Debug images** -- each continent's z3 tile mosaic (8x8 tiles =
  4096x4096px, exactly 4px/chunk-grid-cell, so no world-coordinate math
  needed for this step at all) with every traced polygon, its label anchor
  dot, and its name drawn on top via one `sharp` SVG-overlay composite.
  Written to **`debug-output/zone-areas/{eastern-kingdoms,kalimdor}.png`**
  -- a new top-level gitignored folder (`/debug-output/`), not `public/`.
  Visually confirmed before trusting the rest of this write-up: tight,
  terrain-hugging boundaries (Un'Goro Crater's traced ring sits exactly on
  the crater's own visible rim; Teldrassil's ring sits exactly on the
  tree-island) match the real coastline pixel-for-pixel, the huge
  rectangular "ocean-dominated" zones from check (b) are visually obvious
  and exactly as explained, and the excluded GM Island cluster (step 5)
  shows up as a bare, unoutlined patch of terrain in the mosaic's corner --
  confirming it's excluded from THIS data but still present in the
  (untouched) tile pyramid underneath, a real pre-existing visual quirk in
  the already-shipped map tiles worth a separate future fix if the tile
  pyramid is ever regenerated.

**Step 5 -- Kalimdor's stray NW tile(s).** Turned out to be a 3x3 block of 9
ADT tiles (`kalimdor_{0,1,2}_{0,1,2}.adt`), not literally one tile --
confirmed, not assumed, by reading every one of the 9 files' own MCNK
AreaIds directly: all 9 are uniformly AreaId 876, **"GM Island"** (a
real, long-standing Blizzard internal test/GM-only island, always tucked in
a far corner of the world grid). Excluded from the grid-building loop
entirely (`EXCLUDE_ADT_TILES` in `build-zone-areas.js`, keyed by exact ADT
tile coordinate). Also explains why Kalimdor's `meta.json` (from an earlier
session's tiling work) has `populated.minCol: 0` -- the real landmass
doesn't start until column ~19; that stray cluster is almost certainly why
the tile pyramid's own populated-bounds calculation extended to column 0.
**Not fixed** (out of scope -- tiles are untouched this session): the tile
pyramid itself likely still renders this island as a small floating patch
of terrain in Kalimdor's NW corner (visible in the check-e debug image,
underneath where no zone outline is drawn). Worth a from-scratch Kalimdor
re-tile with this same 3x3 exclusion applied at the image-slicing stage, in
a future session that's allowed to touch tiles.

**Step 6 -- classic-era map exports, noted only, not processed.**
`C:/Users/samue/wow.export/maps/kalimdor/kalimdor_classic_era/` and
`.../azeroth/eastern_kngdoms_classic_era/` each hold one huge stitched PNG
(114-183 MB) + a JSON sidecar in the exact same shape as the Forever-era
exports the existing tile pyramid was built from (`map_id`/`map_dir`/
`tiles.{min_x,max_x,min_y,max_y}`/`image.{width,height}`/`corners`). Not
tiled, not touched, not referenced by any code this session -- flagged here
purely so a future "Classic vs. Forever map toggle" task knows this source
material already exists locally and doesn't need a fresh wow.export pass.

**Regenerate command:** `node scripts/build-zone-areas.js [build]
[wowExportRoot]` (defaults: build `1.60.1.70009`, wow.export root
`C:/Users/samue/wow.export`) -- rebuilds the raw grid cache, rolls up,
retraces, rewrites both continents' `zone-areas.json` and the
`labelAnchor` field in `zones.json`, reruns every check, and re-renders the
two debug images. Safe to re-run any time the source ADTs or `zones.json`
change; it doesn't touch anything under `public/map/*/tiles/`.

**Suggested next:**
- Re-tile Kalimdor from scratch with the GM Island 3x3 block excluded at
  the image-slicing stage (see step 5), so the tile pyramid itself no
  longer shows the stray island and `meta.json`'s `populated.minCol`
  reflects the real landmass.
- Gilneas (and its City/Ruins/Northern Headlands/Shark-Infested Waters
  subzones) has real terrain in this build but no `UiMapAssignment` zone
  entry -- worth registering as a real zone once/if it's meant to be
  reachable, rather than staying permanently unresolved in every future
  `build-zone-areas.js` run.
- If zone borders/labels ever get drawn on the live map (explicitly out of
  scope this session), the ocean-dominated polygons from check (b) will
  need real clipping first (also explicitly out of scope) -- don't render
  Tirisfal Glades' polygon as-is, it currently includes a huge slice of The
  Great Sea.

## Session handoff — 2026-09-25 (client DB2 zone/entrance data, no UI changes)

Data-only task, explicitly scoped to not touch anything under
`public/map/*/tiles/` or the map UI itself. All 5 numbered steps done;
stopped before committing, per instruction.

**1. Trimmed DB2 snapshot.** `scripts/trim-client-db2.js` reads wow.export's
raw per-table CSVs (`C:/Users/samue/wow.export/*.csv`, outside this repo)
and writes only the columns actually used into
`data/sources/client-db2/1.60.1.70009/{uimapassignment,areatable,
contenttuning,map,areapoi}.csv` (28-60KB each, trivial to commit). Build
`1.60.1.70009` wasn't stated anywhere in the export itself -- confirmed
instead against this machine's own `C:\Program Files (x86)\World of
Warcraft\.build.info`, whose `wow_classic_beta` line reads `1.60.1.70009`,
matching this project's own already-tracked latest build
(`data/patch-notes/1.60.1.70009.json`). **`uimap.csv` was NOT present in the
wow.export folder** -- only `UiMapAssignment.csv` (the child/region table)
was exported, not the base `UiMap.csv` (display name/type/flags). The script
skips it and says so rather than fabricating it; nothing this session needed
(zone name comes from AreaTable, continent name from Map, the UiMapID itself
straight from UiMapAssignment) required it, but export `UiMap.csv` from
wow.export before anything needs a UiMapID's own type/flags later.

**2. `public/map/{eastern-kingdoms,kalimdor}/zones.json`** --
`scripts/build-map-zones.js`. A "zone" is a `UiMapAssignment` row with
`MapID` 0 or 1 (the continents' own Map ids) and a nonzero `AreaID` (0 marks
the continent-overview assignment itself) and a plain `0,0`/`1,1`
`UiMin`/`UiMax` (excludes UiMapID 947's two fractional rows, the combined
"Azeroth" world-map overview that places both continents side by side in one
0-1 space). 26 EK zones, 23 Kalimdor zones. `worldBounds` comes straight from
`Region`'s own `minX,minY,minZ,maxX,maxY,maxZ` (Z always ±1,000,000 here,
i.e. unbounded, unused) -- the same world-coordinate space
`lib/map-coords.ts` already uses, so these bounds drop onto the existing
tile map with zero further conversion. **`levelRange` is `null`, on
purpose** -- see check (b).

**3. Checks, all reported, none hand-typed:**
- **(a) 1002:668 aspect ratio:** every one of the 49 zone rectangles matches
  within 1% (`Math.abs(ratio/1.5 - 1) <= 0.01`). No offenders.
- **(b) Level ranges vs. ContentTuning:** every open-world zone's
  `AreaTable.ContentTuningID` is `0` (empty) in this export, Dun Morogh/
  Westfall/Loch Modan/Silverpine/Redridge included -- confirmed by checking
  all 1,371 AreaTable rows, not just these 5. The 21 rows that DO have a
  nonzero `ContentTuningID` all belong to dungeon *interior* areas (e.g.
  Uldaman's own area entry, id 1337) and hold a single
  `MinLevelSquish`/`MaxLevelSquish` scaling target (Uldaman: 35/35; Hall of
  Thanes: 13/13) -- a level-squish/scaling value, not a player-facing
  min-max range, and not matching our existing ranges either way. There is
  nothing in this export to derive open-world zone level ranges from, even
  indirectly -- `zones.json`'s `levelRange` stays `null` rather than
  hand-typing the 5 known values or anything else.
- **(c) New Forever zone continents:** Riverglades -> MapID 0 (Eastern
  Kingdoms, included). Mount Hyjal -> MapID 1 (Kalimdor, included).
  Shen'dralas (areaId 16651 -- note the apostrophe; `ZoneName` is
  "Shendralas" but the real display name `AreaName_lang` is "Shen'dralas")
  -> MapID 1 (Kalimdor, included). Darkspear Islands -> MapID 2997, its own
  separate map, excluded. Zephras Isle -> MapID 2991, also separate,
  excluded (matches the task's own example).
- **(d) Zone PNG <-> zones.json cross-check:** 54 PNGs in
  `C:/Users/samue/wow.export/zones`, 49 zones.json entries. Every
  zones.json entry has a matching PNG. 5 PNGs have no zones.json entry, and
  all 5 are legitimate exclusions already accounted for above, not orphans:
  Zephras Isle (16593) and Darkspear Islands (16606) are on separate maps
  (c, above); Alterac Valley (2597), Warsong Gulch (3277) and Arathi Basin
  (3358) are battleground-instance Map ids (30/489/529), not MapID 0/1.

**4. `data/map-entrances.json`** -- `scripts/build-map-entrances.js` +
`scripts/map-entrance-source-map.js` (the id -> `Map.csv` `Directory`
correspondence table, hand-verified per entry the same way
`scripts/dungeon-source-map.js` verifies its own foreverchanges slugs, not
guessed from name similarity). Source is `Map.csv`'s own `Corpse` field --
a dungeon/raid Map's graveyard-release position on its parent continent,
which is effectively "right outside the entrance" for every instance
checked here -- keyed to continent via `CorpseMapID`. A `Corpse` of exactly
`0,0` is treated as **no data**, not a real position at the world origin:
every dungeon/raid/BG confirmed to have no client-side placement in this
build uses that same placeholder, and a literal reading would have silently
stacked all of them at one point instead of reporting them missing.
52 entries total: the 35 existing dungeon ids from `data/dungeons.json`,
plus 12 new raid ids and 4 new battleground ids invented for this file
(kebab-case, matching the dungeon-id convention -- **no prior id existed for
raids/battlegrounds anywhere in this project**, flagging that these ids are
new, not pulled from an existing source). Shared-building entries (Scarlet
Monastery's 4 wings, Dire Maul's 3, Blackrock Spire's 2, Stratholme's 2) all
resolve to the one real Map.csv row for that building and get the identical
position, not a fabricated per-wing offset -- same sharing this project's
own dungeon-art slug map already documents.
- **No client position (reported, not filled in), 20 of 52:** the 4 new
  Forever dungeons that DO have a Map.csv row (Hall of Thanes, Ruins of
  Lordaeron, Excavation Site: Wetlands, City of Dalaran) all have
  `Corpse=0,0` -- not yet placed in this beta build. The other 5 new Forever
  dungeons (Drowned City, Krol'dok Stronghold, Alcaz Prison, Blackmaw Hold,
  Shaper's Terrace) have **no Map.csv row in this export at all** -- checked
  by grepping the raw export directly for each name, not just absent from
  the source-map table by oversight. All 6 new Forever raids
  (`emerald-dream` included, flagged below) and all 4 battlegrounds
  (including Naxxramas, which is its own oddity, also flagged below) are
  likewise `Corpse=0,0`.
- **Two real data anomalies surfaced, not silently resolved:** (1)
  `Map.csv` has *two* rows referencing Naxxramas -- id `533`, Directory
  literally `"Stratholme Raid"` but `MapName_lang` "Naxxramas" (`Corpse=0,0`,
  included in `map-entrances.json` as `naxxramas`), and id `2921`, Directory
  `"2921"`, MapName_lang also "Naxxramas" but `InstanceType 1` (dungeon, not
  raid) -- not resolved into one entry or guessed at; `map-entrances.json`
  only uses `533`, and `2921` is unaccounted for. (2) `Emerald Dream` (id
  `169`, InstanceType 2/raid) is real client data but isn't a Classic-era or
  confirmed Forever raid this project tracks anywhere else -- included in
  `map-entrances.json` as `emerald-dream` for completeness rather than
  silently dropped, flagged here for a decision on whether it belongs.
- **Check: Uldaman vs. the existing hardcoded pin (`-6060, -2955`, from
  `app/reference/map/[continent]/page.tsx`'s `ULDAMAN_WORLD`).** `map.corpse`
  gives `(-6060.18, -2954.997)` -- matches the existing pin to the nearest
  unit exactly. A *second*, independent source, `AreaPOI`'s own entrance
  marker (id 1027, "Uldaman"), gives `(-6092.01, -3179.35)` instead -- a
  real, different point about 227 units away (likely the doorway/marker
  position vs. the graveyard-release spot, both legitimately "at Uldaman"
  but not identical). `map.corpse` was used as the authoritative source
  throughout this file, both because it's listed first in the task's own
  source-preference order and because it's what the existing pin already
  matches almost exactly.

**5. Deployment readiness confirmed, not just assumed:** `.gitignore`'s
`public/map/*/tiles/` rule is scoped to the tile-image subfolder only --
verified with `git add -n` that `public/map/{eastern-kingdoms,kalimdor}/
{meta,zones}.json` stage normally while every `tiles/` file underneath stays
untracked. Every new file this session added is small text (JSON/CSV, 4KB-
60KB each) with no size or build concern for either git or a Vercel deploy.
No code currently reads `zones.json` or `map-entrances.json` yet (this was a
data-only task) -- wiring them into the map UI (zone borders/labels, dungeon
pins beyond the single hardcoded Uldaman one) is future work, not started.

**Verified via:** `tsc --noEmit` (clean) and inspecting the actual generated
JSON output directly (spot-checked Loch Modan's bounds contain the Uldaman
point, per the existing pin's own "Loch Modan/Badlands border" description).
Not a UI change, so nothing to check live in a browser this session.

**Suggested next:**
- Resolve the two anomalies above (the duplicate Naxxramas Map row, whether
  Emerald Dream belongs in `map-entrances.json` at all) before this file is
  treated as final.
- Export `UiMap.csv` from wow.export if a UiMapID's own display name/type/
  flags are ever needed (see item 1).
- The 5 new-Forever-dungeons and 6 new-Forever-raids/1-new-BG with no
  client position at all will need a source once Blizzard places them in a
  later build -- re-run `trim-client-db2.js`/`build-map-entrances.js`
  against a newer export rather than hand-filling coordinates now, per this
  session's own instruction not to.
- Nothing in the planner/map UI reads either new file yet -- the natural
  next step (zone borders/labels on the tiled map, real dungeon/raid/BG
  pins beyond the single hardcoded Uldaman one) is a separate task.

## Session handoff — 2026-09-25 (fractional zoom + overzoom, URL-hash view state, doc policy fix)

**Shipped, not yet committed at session end (stopped before committing, per
instruction):**
- **Fractional zoom + overzoom.** `LeafletZoneMap.tsx`'s map now sets
  `zoomSnap: 0.25` (scroll/pinch land on quarter-zoom increments) and
  `zoomDelta: 1` (the +/- buttons and keyboard still step by a full level,
  matching foreverchanges.pro/map's own button behavior even though free
  zoom is now finer -- see the reference doc's Section 1). `maxZoom` is now
  `maxNativeZoom + OVERZOOM_LEVELS` (2), so both continents go to z8; the
  `TileLayer` keeps its own separate `maxNativeZoom` option so Leaflet
  fetches the real z6 tile and scales it up for z7/z8 instead of requesting
  nonexistent tile files. `maxBounds`/`maxBoundsViscosity` are untouched.
  Verified live on both continents: at z=8.00 the DOM's `.leaflet-tile`
  elements are real `tiles/6/<col>_<row>.webp` files (200, 512px each), not
  a 404 or a blank pane, over real terrain (a bridge/settlement on
  Kalimdor, confirmed by direct `fetch()` against the tile URLs from the
  page's own console, not just a screenshot).
- **URL-hash view state**, in real WoW world coordinates, not lat/lng or
  Leaflet's internal CRS.Simple pixel space: `#x=<world_x>&y=<world_y>&z=<zoom>`.
  Written via `history.replaceState` on `moveend` (after panning/zooming
  settles, not per animation frame -- matches foreverchanges.pro/map's own
  "hash lags the animation" behavior, see the reference doc). Restored on
  mount if present and valid (finite numbers, zoom within
  `[minZoom, maxZoom]`, and the resulting LatLng actually inside this
  continent's own populated `bounds`); falls back to the existing
  `fitBounds` default otherwise. Verified live: copying a hash URL into a
  brand-new tab restores a pixel-identical view on both continents; a
  garbage hash (`#z=99&x=abc`) loads the default whole-continent view with
  zero console errors, also on both continents.
- **New `lib/map-coords.ts`**: the world-coordinate <-> LatLng math
  (previously only server-side, inline in `lib/map-continents.ts`) is now a
  pure module with no `fs`/Node-only imports, exporting both directions
  (`worldToLatLng`/`latLngToWorld`) plus the native-pixel intermediate step.
  Shared by `lib/map-continents.ts` (server, unchanged behavior -- reads
  `meta.json`) and the new client-side hash read/write in
  `LeafletZoneMap.tsx`, which needs the exact same formula in reverse. One
  copy, both directions, deliberately -- see the file's own header comment;
  this project has already hit real bugs from the "same" coordinate formula
  living in two places with a subtle difference (the axis-swap and
  CRS.Simple-negates-lat bugs from the proof-of-concept phase).
- **`docs/map-reference-foreverchanges.md` Section 7 and the "Icons
  recommendation"** Go ahead for deployment. 



If this comes up again: that edit is a one-line change to a file outside
this repo, still pending an explicit go-ahead.

## Session handoff — 2026-09-25 (Kalimdor tiled, continent dropdown, black background)

**Shipped, not yet committed at session end (waiting on explicit review):**
Kalimdor run through the continent tiler (both source halves -- 1,377
tiles, ~42MB, ~36 min, 312.5MB peak RSS, 1,324 empty native tiles
correctly skipped); `kalimdor` registered in `lib/map-continents.ts`
(config-entry-only, as asked); the map's empty background (outside tiles
and behind transparent/skipped-tile regions) is now solid black on both
continents instead of Leaflet's own default light grey; a minimal
`MapSidebar`/`ContinentSelect` dropdown navigates between `/reference/map/
eastern-kingdoms` and `/reference/map/kalimdor`. Full technical detail in
the new "Kalimdor registered" architecture note (search for "hardcoded-
marker bug").

**One real bug caught and flagged, per instruction, rather than silently
patched or left broken:** registering `kalimdor` alone would have left the
page still unconditionally placing the Uldaman marker (Eastern-Kingdoms-
only world coordinates) onto whichever continent was being viewed,
including Kalimdor, where those coordinates are meaningless. Fixed with
the minimal correct gate (only show it on `eastern-kingdoms`) -- this is
the "if anything else needs changing, stop and tell me" case the task
asked about.

**A second, smaller issue found and fixed along the way, not part of the
original ask:** registering `kalimdor` in the config *before* its tiling
run finished broke the *already-working* Eastern Kingdoms page too (every
continent page's sidebar lists all registered continents by name, and
Kalimdor's `meta.json` didn't exist yet). Fixed by having that lookup skip
a continent whose `meta.json` isn't readable instead of throwing.

**Seam verified at z6, z3, and z2 with actual tile coordinates**, not just
reasoned about: cols 25-40/rows 37-42 at z6 (96 tiles), cols 3-5/rows 4-5
at z3, cols 1-2/row 2 at z2, all straddling the real row-39/row-40 seam
between Kalimdor's two source halves. A magenta test background made any
real gap impossible to miss against actual terrain; none appeared, and
Un'Goro Crater/Tanaris/Feralas all render as one continuous landmass across
the join at every level checked.

**Also noticed, not touched:** an untracked `docs/map-reference-
foreverchanges.md` appeared during this session (UI/behavior research notes
on foreverchanges.pro/map, dated today) that this session did not create --
left completely alone, not staged, not referenced as this session's own
work. If picking this up later, don't assume it came from this work without
checking who actually wrote it.

**All of this task's acceptance criteria verified live:** Kalimdor pans/
zooms/clamps like Eastern Kingdoms; the seam is genuinely seamless; empty
areas are black on both continents; the dropdown switches both ways with
Eastern Kingdoms (Uldaman pin included) unchanged after the round trip.
Stopped before committing, per instruction.

## Session handoff — 2026-09-25 (real continent map route + a second sharp composite bug)

**Shipped, not yet committed at session end (waiting on explicit review):**
per-continent config (`lib/map-continents.ts`) replacing the old crop-
specific `lib/map-tiles.ts`; a real dynamic route,
`/reference/map/[continent]` (only `eastern-kingdoms` registered), replacing
the old flat `/reference/map` proof-of-concept page; a local-only guard
(`process.env.VERCEL`) that shows a plain notice instead of the map on any
Vercel deployment, since tiles are gitignored and genuinely aren't there;
`public/map/proof-badlands/` and `lib/map-tiles.ts` both deleted, their job
done. Full detail in the new "Real `/reference/map/[continent]` route"
architecture note (search for "fitBounds").

**A second real sharp/libvips bug, same category as the earlier `.stats()`
one:** `.composite()` chained directly into `.resize()` silently drops any
child not positioned at `(0,0)` -- found because the continent map's
initial render, after fixing an unrelated hand-computed-zoom bug, showed a
correctly shaped Eastern Kingdoms silhouette that was mostly blank in
several large patches. Isolated with a minimal repro (single known-real
tile, composited at a non-origin offset, with vs. without a chained
`.resize()`) before touching the real script. Fixed in `scripts/slice-map-
tiles.js`'s `buildLowerLevels` the same way as before: materialize to a
buffer, start a fresh `sharp()` instance for the next step. Eastern
Kingdoms was re-tiled after the fix (~15 min, 230.0MB peak RSS, same 1,029
tiles as before but now ~27MB instead of ~23MB since the previously-blank
z0-z4 tiles now hold their real content) and re-verified live.

**Also found and fixed:** a hand-computed `defaultZoom`/`defaultCenter`
heuristic (added as part of "three changes" to `LeafletZoneMap.tsx`, since
removed) didn't know the real container size and produced an off-center,
non-fitting initial view -- replaced with `map.fitBounds(bounds)`, verified
correct afterward. `maxBounds`/`maxBoundsViscosity` were added to actually
enforce "can't scroll past the edge into the void," which nothing in the
component did before despite the task requiring it.

**Incident, self-corrected but worth flagging:** repeatedly deleted `.next`
and ran `next build` (including once with `VERCEL=1` to verify the
production-notice branch) while a separate, already-running `next dev`
server for this same project was actively serving requests -- this
corrupted that dev server's Turbopack state (`500`s with a `SyntaxError:
Unexpected non-whitespace character after JSON`, not a real application
bug -- both builds succeeded cleanly on their own). Fixed by finding the
exact PID bound to port 3000 via `netstat` and restarting only that
process, not a blanket `taskkill /IM node.exe` (a mistake made and
self-corrected earlier in this project's history) -- confirmed the
restarted server serves correctly. **Lesson for next time:** don't run a
second `next build`/`next dev` against the same project directory while
another one is live serving real traffic, even briefly for verification;
if a second check is needed, ask before running it, or verify via the
already-running server instead.

**Verified live, all three of the task's acceptance criteria** (pan/zoom
without escaping into void, Uldaman pin position matching the deleted proof
crop exactly, popup + loot-page link both working) -- see the architecture
note for specifics. Stopped before committing, per instruction.

## Session handoff — 2026-09-25 (continent tile pyramid, investigation + build)

**Investigation only, no files changed, reported back before building:**
tile-generation mechanics for the existing `proof-badlands` crop (script/
inputs/outputs), whether commit `d3d2087` added tile images to git (yes --
20 files, ~0.89MB, confirmed by summing the actual committed byte sizes),
full-continent tile-count/size estimates at several possible top-zoom
choices for both Eastern Kingdoms and Kalimdor (math shown, based on the
proof crop's own ~45KB/tile average), how Kalimdor's two export halves fit
together (contiguous, no overlap, confirmed via their own JSON metadata --
not physically merged), and what in the map component was hardcoded to the
20-tile proof area. This report is what the storage/scope decisions below
were made from.

**Decisions made and acted on this session:** tiles are local-only and
gitignored (`public/map/*/tiles/`, added to `.gitignore` before generating
anything); only each continent's `meta.json` is committed; top zoom is
native (512px, no downscaling at the finest level); tiles are addressed by
the global 64x64 ADT grid (not per-image local indices), giving a standard
z0-z6 pyramid where z6 lines up exactly with real ADT tiles.
`scripts/slice-map-tiles.js` was rewritten from the single-crop proof-of-
concept tool into a general continent tiler implementing all of this -- run
for Eastern Kingdoms only (1,029 tiles, ~23MB, 23.4 min, 247.6MB peak RSS,
230 empty native tiles correctly skipped). Full technical detail, the real
run's numbers, and a real `sharp`/libvips `.stats()` bug found and fixed
along the way are in the new "Continent tile pyramid" architecture note
further down this file (search for "global ADT grid").

**Spot-checked and confirmed correct:** the z6 tile containing Uldaman's
real world coordinates shows the actual Loch Modan/Badlands border; its z2
ancestor tile shows the correct broader region of the continent (dominated
visually by neighboring forest zones at that zoom, which is expected --
each z2 tile spans a large area).

**Explicitly out of scope, not started:** Kalimdor hasn't been tiled yet
(config for it exists and was reasoned through, untested in practice); no
map page/route changes; no new pins. `public/map/proof-badlands/` and
commit `d3d2087` were left untouched, as instructed.

## Session handoff — 2026-09-25 (world map: wow.export tiles + Leaflet proof of concept)

**Stable and shipped this session:** a small, deliberately-scoped proof of
concept at `/reference/map` (not linked from nav/index, same "reachable but
not advertised" treatment as `/whats-new`) -- a real Leaflet map, panning
and zooming over actual client art extracted via wow.export (the user's own
tool, already installed), not hand-drawn SVG (see the 2026-09-24 revert
below) and not hotlinked third-party tiles. One dungeon pin (Uldaman) with
a working popup and link-through to its existing loot page. Full technical
detail in the new "World map proof of concept" architecture note further
down this file (search for "wow.export") -- headline points:

- The user exported Eastern Kingdoms (and Kalimdor, in two halves) as
  single huge stitched PNGs via wow.export's own map-export feature, each
  with a JSON sidecar giving real world-coordinate corners. This is a
  fundamentally better art source than hand-drawn SVG -- verified visually
  (a crop centered on Uldaman's real coordinates showed unmistakable,
  correct Badlands canyon terrain) and is what the rest of this feature is
  built on.
- **Three real, non-obvious coordinate bugs were found and fixed, each
  confirmed against live evidence, not guessed:** wow.export's image axes
  are swapped relative to the game's own `world_x`/`world_y` (confirmed by
  exact tile-count arithmetic, not approximation); `next/dynamic(...,
  { ssr: false })` isn't allowed directly in a Server Component in this
  Next.js version (build error surfaced it immediately); and `L.CRS.Simple`
  negates `lat` by default, which was silently sending Leaflet's tile
  requests to negative row indices (caught from the user's own browser
  console output showing 404s for tiles like `0_-1.webp` against a pyramid
  that only has rows 0/1) -- not a CSS or rendering problem, despite
  initially looking like one (a *separate*, real bug -- missing Leaflet
  CSS because its import lived inside the `ssr:false`-loaded chunk -- was
  found and fixed first, and was a genuine problem, just not the last one).
- Scoped to a tiny 2-zoom, 20-tile crop around the Loch Modan/Badlands
  border by explicit decision, before any full-continent tiling or a
  storage-strategy decision (a full pyramid would be several thousand
  files) -- see the architecture note for the concrete next steps this
  unblocks.
- Wowhead's `robots.txt` explicitly disallows `anthropic-ai`/`Claude-Web`/
  `ClaudeBot` site-wide -- investigated this session for a possible
  zone-quest data source and declined to scrape it for that reason (a
  one-zone proof of concept was never run). foreverchanges.pro's own
  `robots.txt` has no such restriction, consistent with how this project
  already uses it throughout.

**Also this session:** the entire prior single-zone SVG map MVP (Loch
Modan/Badlands hand-drawn shapes, the Uldaman pin, the Classic/Forever
toggle -- built across the two sessions before this one) was reverted at
explicit request before this proof of concept was started. Confirmed via
`git diff --stat` across its full commit range that every file it touched
was a pure addition, so the revert was a clean `git rm` of 7 files, not a
partial unwind -- verified via a full-codebase grep that nothing else ever
referenced it. That revert is its own commit, separate from this session's
new work.

**Open for a future session:**
- No storage-strategy decision has been made for full-continent tiling
  (likely several thousand files) -- the crop-based proof deliberately
  avoided this decision, not settled it.
- Kalimdor's two halves (top/bottom, see the architecture note) haven't
  been fed through the tiling script yet -- only Eastern Kingdoms has.
- The feature is hardcoded to one dungeon (Uldaman) and one crop
  (`proof-badlands`) -- generalizing to more dungeons/zones needs a real
  per-dungeon location dataset, which doesn't exist yet (the previous SVG
  MVP's `data/dungeon-locations.json` was hand-authored and was removed in
  the revert along with everything else).
- Zone-level (non-dungeon) quest location data is still unresolved --
  foreverchanges.pro only has it for dungeon quest givers; Wowhead has a
  full zone/quest database but isn't scrapable per the robots.txt finding
  above.

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

### World map proof of concept: wow.export tiles + Leaflet CRS.Simple
Added 2026-09-25, superseding an earlier hand-drawn-SVG attempt (see the
"reverted" note below). Sourcing decision: real client art extracted via
wow.export (the user's own tool, already installed locally against the
WoW Forever beta client), not hand-drawn shapes and not hotlinked
third-party tiles -- the strongest map-art source this project has found,
and one it can regenerate itself rather than depend on another site for.

**The export.** wow.export's own "Maps" feature stitches every ADT tile of
a whole continent into one huge PNG plus a JSON sidecar
(`{map_id, map_dir, map_name, tile_size, tiles: {min_x,max_x,min_y,max_y,
wide,high}, image: {width,height}, corners: {top_left,bottom_right}
{world_x,world_y}}`). The user exported Eastern Kingdoms this way
(11776×21504px, `azeroth_ec7b93ee.png`/`.json`) and Kalimdor in two halves
since it was too large in one pass (`kalimdor_e750bc91.png` "top",
`kalimdor_8bf8e9c5.png` "bottom" -- **confirmed to tile together exactly**:
top's bottom edge `world_x: -4266.67` matches bottom's top edge exactly,
and bottom's horizontal tile offset (`min_x: 23`) lines up precisely with
23 × 533.33 = the world_y difference between them -- no gap, no overlap,
no need to physically merge them into one file). None of this lives in the
repo -- these are large source exports on the user's own machine
(`C:\Users\<user>\wow.export\maps\...`), read by `scripts/
slice-map-tiles.js` at generation time, not committed.

**The coordinate system -- two real, non-obvious bugs, both confirmed
against hard evidence, not guessed:**
1. **wow.export's image axes are swapped relative to the game's own
   world_x/world_y.** WoW's engine has +X as north (row) and +Y as west
   (column) -- rotated from the image's own horizontal/vertical axes. A
   first attempt at `worldToPixel` (mapping world_x→pixel-x, world_y→
   pixel-y directly) landed a known-Uldaman coordinate in Searing Gorge's
   volcanic terrain, not Badlands -- visibly wrong. Confirmed the actual
   mapping two ways: exact tile-count arithmetic (`tiles.wide × 533.333 ==
   |Δworld_y|` and `tiles.high × 533.333 == |Δworld_x|`, both matching to
   the decimal, where 533.333 = 1600/3 is the constant ADT tile size) and
   visually (the corrected pixel landed exactly on the real Loch Modan/
   Badlands zone border, matching what foreverchanges.pro's own map showed
   for Uldaman in an earlier session). The fix: pixel-x comes from
   `world_y` against the sidecar's `world_y` corners, pixel-y from
   `world_x` against the `world_x` corners -- see `lib/map-tiles.ts`'s
   `worldToZone0LatLng`.
2. **`L.CRS.Simple` negates `lat` by default** (`point.y = -lat`). Feeding
   it a plain top-down pixel Y (0 at top, increasing downward, matching
   both the crop's own pixel space and the tile files' own row numbering)
   silently sent Leaflet's tile requests to *negative* row indices --
   caught directly from the user's own browser console showing 404s for
   `tiles/0/0_-1.webp`/`0_-2.webp` against a pyramid that only has rows
   0/1, not guessed at. Fixed by negating the `lat` component everywhere a
   LatLng is constructed (`worldToZone0LatLng`, `getZone0Bounds`) rather
   than fighting CRS.Simple's own convention or renumbering tile files.

**A separate, real bug on the way to finding that one:** the map initially
rendered as a plain white box with a correctly-positioned marker but zero
tile textures -- a *different* problem from the coordinate bug above, found
and fixed first. `LeafletZoneMap.tsx` is loaded via `next/dynamic(...,
{ ssr: false })` (required -- Leaflet touches `window` at import time and
this Next.js version doesn't allow `ssr:false` dynamic imports directly in
a Server Component either, which is why there's a thin `"use client"`
`LeafletZoneMapLoader.tsx` wrapper in between). A `leaflet/dist/leaflet.css`
side-effect import living inside that lazily-loaded chunk doesn't reliably
make it into the page's stylesheet with this project's bundler (Turbopack)
-- confirmed by curling the served CSS and finding zero `.leaflet-*` rules.
Fixed by importing the CSS from the page itself (a Server Component) instead
of the client-only chunk, which is part of the initial render regardless of
when/whether the dynamic chunk loads.

**Scope at the time, deliberately small -- since superseded and removed.**
The first version of `scripts/slice-map-tiles.js` cropped a single
2048×2048px region around Uldaman's real world coordinates out of the full
Eastern Kingdoms export and sliced it into a 2-zoom (0 = half-res, 1 =
native, 512px tiles) pyramid -- 20 tiles, ~1MB total, under `public/map/
proof-badlands/`, read by `lib/map-tiles.ts`'s `worldToZone0LatLng`/
`getZone0Bounds`/`getMapTileConfig`. That was an explicit decision, not a
shortcut: a full multi-zoom pyramid for both continents would be several
thousand files, and no storage-strategy decision had been made yet. **Once
the real continent tiler below was built, verified, and wired into a real
route, `public/map/proof-badlands/` and `lib/map-tiles.ts` were both
deleted** (2026-09-25, same session as the "Real `/reference/map/
[continent]` route" note further down) -- their only job was proving the
Leaflet+CRS.Simple approach worked at all, which it did; every bug found
against this crop (the axis swap, the CSS-loading order, the lat-negation)
carried forward correctly into the real continent map, so nothing from
this phase needed re-discovering.

### Continent tile pyramid: gitignored, global ADT grid, z0-z6
Added 2026-09-25, once storage/scope decisions were made (see below).
`scripts/slice-map-tiles.js` was rewritten from the single-crop tool above
into a general continent tiler: `node scripts/slice-map-tiles.js
<continent>` (`eastern-kingdoms` or `kalimdor`; per-continent source paths
are a small `CONTINENTS` config object at the top of the script, not CLI
flags -- there are only two continents and the source export paths are
machine-specific anyway).

**Storage decision:** tiles are local-only. `public/map/<continent>/tiles/`
is gitignored (`.gitignore`'s `public/map/*/tiles/` rule, added *before*
generating anything, per instruction); `public/map/<continent>/meta.json`
is committed normally (a few hundred bytes, not matched by that pattern).
Regenerate with `node scripts/slice-map-tiles.js <continent>` any time the
source wow.export files change -- there is no other way to reproduce the
tiles, so don't `git clean` or otherwise discard this directory without
knowing you can re-run the script.

**Tile addressing: the global 64x64 ADT grid, not per-image local
indices.** Every WoW continent map has a fixed 64x64 tile grid (`GRID_SIZE`
in the script); a given continent's terrain only occupies some sub-region
of it (Eastern Kingdoms: columns 23-45, rows 20-61). Tiles are named by
their position in that GLOBAL grid (`<globalCol>_<globalRow>.webp` =
`sourceMeta.tiles.min_x/min_y` + the tile's own local position within
whichever source image it came from), not a 0-based index local to one
source image. This is what lets Kalimdor's two separate source halves
contribute tiles to the same coordinate space without ever being merged
into one file, and it produces a standard slippy-map z/x/y scheme for
free: zoom z has exactly 2^z tiles per side, and z6 (native, 2^6 = 64)
lines up exactly with the real ADT grid. z0 is a single tile covering the
entire 64x64 grid at the coarsest resolution; z6 is 1:1 with real 512px
ADT tiles, the finest level this project generates (matching the "top
zoom = native" decision -- no interpolated detail beyond what the source
actually has).

**Lower zoom levels (z5..z0) are built from the OUTPUT TREE, never
re-derived from the source images.** For each level from z6 down to z1,
every existing child tile's parent (`floor(col/2), floor(row/2)`) is
computed, up to 4 children are composited onto a transparent 1024x1024
canvas at their quadrant offset, then downsampled to 512px. A parent with
zero existing children is never created (no empty tiles written); missing
quadrants (1-3 of 4) simply stay transparent. This is required, not just
convenient: Kalimdor's two source halves are correctly positioned in world-
coordinate terms (see the note above) but 533.333-world-unit ADT tiles
don't necessarily land on shared parent-tile boundaries a few levels down
across an arbitrary two-way image split -- combining from the already-
tiled output sidesteps that entirely, since by z6 every source's
contribution is already in the same global coordinate space, one tile at a
time.

**A second real sharp/libvips quirk, found the same way as the `.stats()`
one below: `.composite()` chained directly into `.resize()` in one pipeline
silently drops any child NOT positioned at (0,0).** First surfaced as 18 of
202 z5 tiles (and their descendants up the pyramid, including z0 itself)
coming back completely blank despite having verified-real z6 children --
confirmed live in the browser first (the map rendered a correctly-sized,
correctly-centered, but entirely empty grey box), then isolated with a
minimal repro: compositing one known-real tile at `left:512,top:0` onto a
blank canvas and immediately calling `.resize()` produced all-zero output,
while the identical composite at `left:0,top:0` worked, and the identical
`left:512` composite WITHOUT a chained `.resize()` also worked (confirmed
by extracting just that region afterward). Fixed the same way as the
`.stats()` quirk: materialize the composite to a real buffer
(`.png().toBuffer()`) before starting a fresh `sharp()` pipeline for
resize+encode, rather than chaining resize directly onto the composite.
`buildLowerLevels` also now runs a `.stats()` check (on the final encoded
buffer, via a fresh `sharp()` instance -- not chained, per the lesson
above) on every composited parent before writing it, skipping (and
counting) any that come back fully blank -- belt-and-suspenders against
this exact class of bug recurring silently, not just a fix for the one
instance found. **General lesson for this file, now proven twice:** don't
trust a second pixel-reading or pixel-transforming operation chained
directly onto an in-progress sharp pipeline in this version -- materialize
to a buffer and start fresh.

**Emptiness detection -- confirmed against real pixel data, not assumed.**
Every extracted native tile is checked before writing: `sharp`'s own
`.stats()` on a `.clone().extract(...)` chain was found to silently ignore
the extract and return whole-image stats instead (verified live -- two
extracts of visibly different, far-apart regions produced byte-identical
`.stats()` output). Fixed by re-wrapping the already-encoded tile buffer in
a fresh `sharp(buffer)` before calling `.stats()`. Confirmed source's own
"no data" representation is fully transparent `RGBA(0,0,0,0)`, not solid
black -- a known-void corner tile (the bounding box's own top-left, outside
any real landmass) came back flat `0/0/0/0` across all four channels.
Emptiness = alpha channel's max is 0.

**`limitInputPixels` and memory.** Every source is opened with
`limitInputPixels: false` -- Eastern Kingdoms (~253M px) is under sharp's
default ~268M-px limit, but Kalimdor's top half (~514M px) is not, and the
config needs to work for both without touching the code again when
Kalimdor is run. `sequentialRead: true` matches the script's own row-major,
top-to-bottom access pattern. One `sharp()` pipeline is opened per source
image (not per tile); each tile does one `.clone().extract(...).webp()`
encode, reused for both the emptiness check and the file write.

**Real runs, both continents, after the composite-bug fix above:**

| zoom | EK tiles | EK size | Kalimdor tiles | Kalimdor size |
|---|---|---|---|---|
| 6 (native) | 736 written, 230 empty skipped | 17.4 MB | 988 written, 1,324 empty skipped | 27.9 MB |
| 5 | 202 | 4.5 MB | 273 | 7.3 MB |
| 4 | 60 | 1.6 MB | 76 | 2.5 MB |
| 3 | 20 | 0.50 MB | 25 | 0.75 MB |
| 2 | 6 | 0.13 MB | 10 | 0.19 MB |
| 1 | 4 | 0.03 MB | 4 | 0.05 MB |
| 0 | 1 | 0.01 MB | 1 | 0.01 MB |
| **total** | **1,029 tiles** | **~27 MB** | **1,377 tiles** | **~42 MB** |

(EK sizes are from the fixed run -- larger than the first, buggy run's
numbers, since z0-z4 now actually contain the content they were silently
dropping before.) Kalimdor runtime 2,145.8s (~35.75 min) across both source
halves (top half alone: 680 written/1,280 skipped of 1,960 candidates --
nearly twice EK's total candidate count, and the reason this run took
longer); peak RSS 312.5 MB. Kalimdor's much higher empty-tile fraction
(1,324/2,312 candidates, ~57%, vs. EK's 23.8%) reflects its source images'
own bounding rectangles covering a lot more open ocean around a narrower,
more irregular landmass, not a bug -- confirmed by inspecting the actual
shape (see below). Zero parents came back blank-after-composite on either
run.

**Multi-source addressing confirmed correct, not just reasoned about.**
Kalimdor's two source halves write into the exact same `tiles/6/`
directory using their own `min_x`/`min_y` offsets (see "Tile addressing"
above) -- verified this produces a genuinely seamless join, not just
non-overlapping files, by rendering the actual pixel content at three zoom
levels straddling the real seam (row 39 [top half] / row 40 [bottom half]):
**z6** (cols 25-40, rows 37-42, 96 tiles, all present) -- no gap, overlap,
or offset visible where Feralas/Thousand Needles-type terrain crosses the
boundary; **z3** (cols 3-5, rows 4-5, 6 tiles) and **z2** (cols 1-2, row 2,
2 tiles) -- both show Un'Goro Crater's distinctive circular shape, Tanaris'
desert, and Feralas joining the northern landmass with no visible seam line
at any of the three levels. A magenta test background (instead of the
usual transparent) was used during this check specifically so any real gap
would be impossible to miss against actual terrain colors -- none appeared
anywhere except genuinely empty ocean/void at the continent's own edges.

**Sanity check, not just informational:** the full grid's own world-
coordinate corners are computed by extrapolating from whichever source's
`corners`/`tiles.min_x`/`min_y` are available (`computeFullGridCorners`),
and are asserted to equal exactly ±17,066.667 on every axis --
`(GRID_SIZE/2) * ADT_WORLD_SIZE`, WoW's well-known universal per-continent
coordinate extent, independent of which sub-region is actually populated.
Confirmed exact for both Eastern Kingdoms and Kalimdor (`OK` in the
script's own output both times -- Kalimdor's check uses its first source,
the top half, per `writeMeta`'s `continent.sources[0]._meta`, which is
valid regardless of which of a continent's sources is picked since the
formula only depends on that source's own `min_x`/`min_y`/`corners`, all
of which describe the same underlying coordinate system). A mismatch here
on a future run would mean a wrong assumption upstream, not something to
silently accept.

**`meta.json` shape:**
```json
{
  "mapId": 0, "mapDir": "azeroth", "mapName": "Eastern Kingdoms",
  "tileSize": 512, "gridSize": 64, "nativeZoom": 6,
  "adtWorldSize": 533.3333333333334,
  "populated": { "minCol": 23, "maxCol": 45, "minRow": 20, "maxRow": 61 },
  "fullGridCorners": { "top_left": {...}, "bottom_right": {...} }
}
```
Read by `lib/map-continents.ts` -- see the "Real `/reference/map/
[continent]` route" note below for how. Both continents have one now.

### Real `/reference/map/[continent]` route: per-continent config, fitBounds, maxBounds
Added 2026-09-25, replacing the flat `/reference/map` proof-of-concept page
(deleted, along with `public/map/proof-badlands/` and `lib/map-tiles.ts` --
see the note above). Dynamic route, `generateStaticParams`/`dynamicParams =
false` so only registered continents resolve (`eastern-kingdoms` and, as of
the same-day follow-up below, `kalimdor`; unregistered ids 404 via an
explicit `notFound()` check in the page too, not just the static-params
mechanism). `lib/map-continents.ts` replaces the old crop-specific
`lib/map-tiles.ts`: `getContinentMapConfig(id)` reads that continent's
`meta.json` and derives everything the map needs (name, tile URL template,
bounds, min/max zoom, default center/zoom) rather than any of it being
hand-typed per continent.

**Local-only guard.** Tiles are gitignored (see the tile-pyramid note
above), so any Vercel deployment -- Preview or Production alike, both
equally lack the tiles -- would serve a map with no textures. The page
checks `process.env.VERCEL` (set on every Vercel build, not just
`VERCEL_ENV === "production"` specifically, since a Preview deploy has the
exact same missing-tiles problem) and renders a plain notice instead of the
map when true. Confirmed both branches directly: a normal `next build`
prerenders the real Leaflet page; `VERCEL=1 next build` prerenders the
notice instead -- checked by grepping the actual prerendered HTML output
for each, not just reasoned about.

**`LeafletZoneMap.tsx` changes, plus one the component needed that wasn't
on the original list of three:** `minZoom` is now a prop (was hardcoded
`0`); the fixed `h-[520px]` container is now `heightClassName` (defaults to
`h-[70vh] min-h-[360px]`, overridable). The fourth change:
**`maxBounds`/`maxBoundsViscosity: 1` were added to the map, using the
existing `bounds` prop** -- without this, nothing stopped panning past the
continent's real edge into blank space, which the task's own acceptance
criteria required ("can't scroll into the empty void"). Verified live: with
the fix, dragging repeatedly toward open water/off-map space produced zero
movement once the view was already at the populated area's boundary.

**A `defaultZoom` prop was added, then removed again, in favor of
`map.fitBounds(bounds)`.** The per-continent config computes a `defaultZoom`
analytically (target on-screen size ÷ the populated area's own size in
zoom-0-equivalent units) -- this exists on `ContinentMapConfig` and is
still exposed, but the component does **not** consume it. Verified live
that the hand-computed value, not knowing the real container's rendered
size, produced a view with real content pushed into one corner and blank
space filling the rest -- not the earlier proof crop's problem (that one
just had a wrong CSS-loading bug), a genuinely different bug. Replaced with
`map.fitBounds(bounds)`, which asks Leaflet to compute the fit against the
container's actual measured size -- confirmed correct afterward (the whole
continent silhouette centered symmetrically, matching its real shape).
This was flagged as a deliberate deviation from "keep the component as
written plus exactly three changes," not a silent one: fitBounds was
avoided for the original crop specifically because it couldn't be verified
without live devtools at the time; this session had live browser access
throughout, so the same concern didn't apply once a real problem was found.

**Coordinate math** (`worldToContinentLatLng` in `lib/map-continents.ts`)
reuses the exact same two conventions proven on the proof crop: the world-
axis swap and the CRS.Simple lat-negation, just scaled by the continent's
own `nativeZoom` (64x, since z6 is native) instead of a crop's
`maxNativeZoom` (2x, for proof-badlands). `bounds` are computed by running
the *same* pixel-to-LatLng conversion on the `populated` min/max col/row
from `meta.json`, rather than a separately-derived formula with its own
chance of a sign mistake.

**Verified live, all three of the task's stated acceptance criteria:** the
whole continent pans and zooms and cannot be dragged past its own real
edge into empty space (confirmed by repeated failed drag attempts at the
boundary); the Uldaman pin sits exactly on the real Loch Modan/Badlands
border, pixel-for-pixel matching the deleted proof crop; its popup shows
"Uldaman / Level 44-50" and the "View loot & quests →" link navigates
correctly to `/reference/dungeons/loot/uldaman` (confirmed via a dispatched
click, the same reliable technique used earlier in this project when the
browser tool's own coordinate-based click doesn't register).

**Still hardcoded/out of scope for this task (unchanged from before):** one
dungeon (Uldaman). A real multi-dungeon, multi-continent location dataset
is still open -- see the follow-up note below for the one hardcoding issue
this surfaced when Kalimdor was registered.

### Kalimdor registered: continent dropdown, black empty-space background, a hardcoded-marker bug caught
Same day as the note above, once Kalimdor's tiles existed (see the tile-
pyramid note's real-run numbers). `lib/map-continents.ts`'s
`REGISTERED_CONTINENTS` is the only place a continent needs adding once its
tiles/meta.json exist -- confirmed by doing exactly that and nothing else
for the config layer.

**A real hardcoded-marker bug this surfaced, flagged rather than silently
worked around.** The page unconditionally computed and rendered the
Uldaman marker for *every* continent, since it was written when only
Eastern Kingdoms existed -- registering Kalimdor without any other change
would have placed a marker built from Uldaman's Eastern-Kingdoms-only world
coordinates onto Kalimdor's own, independent coordinate space, landing it
somewhere meaningless on the wrong map. Fixed with the minimal correct
gate (`continent === "eastern-kingdoms" ? [marker] : []`) rather than
building a real per-continent marker dataset, which is still out of scope.
This is the "if anything else needs changing, stop and tell me" case the
task asked to watch for -- flagged in-session, then fixed, rather than left
broken or silently patched without mention.

**`getRegisteredContinents()` (added for the dropdown, see below) skips a
continent whose `meta.json` isn't readable yet** instead of throwing --
caught live: registering `kalimdor` in the config *before* its tiling run
finished broke the *already-working* Eastern Kingdoms page too, because
every continent page's sidebar tries to list every registered continent by
name. Fixed by having that lookup skip (not crash on) a missing meta.json,
which is also just generally the right behavior for "a continent is
registered but its tiles haven't finished generating yet," not a one-off
patch for this specific timing accident.

**Black background, everywhere outside real tile content.** The map
container previously used a `bg-background` Tailwind class, which Leaflet's
own default CSS (`.leaflet-container { background: #ddd }`) was found to
win over regardless of the site's theme tokens (confirmed live -- the map
showed light grey, not the theme's dark background, in every empty area).
Switched to an inline `style={{ backgroundColor: "#000" }}` on the
container div, which always wins on specificity regardless of stylesheet
load order. This covers both "outside every tile" (open water past the
continent's own silhouette, before `maxBounds` stops you) and "behind a
tile's own transparent pixels" (missing-children regions within a
composited lower-zoom tile) in one place, since nothing else in Leaflet's
DOM structure between the tile images and this container sets its own
background.

**Continent dropdown -- a minimal sidebar, explicitly not a real one yet.**
`components/map/MapSidebar.tsx` is a plain `<aside>` holding only
`components/map/ContinentSelect.tsx` (a `"use client"` `<select>` using
`next/navigation`'s `useRouter().push()` on change, the same client-router
pattern already used by `ItemsSearchInput.tsx` elsewhere in this project).
No zone list, filters, or icons -- explicitly out of scope for this task,
and the component is deliberately named/shaped to be extended later rather
than replaced. `getRegisteredContinents()` in `lib/map-continents.ts`
supplies the `{id, name}` list from each continent's own `meta.json` rather
than hand-typing display names a second time.

**Verified live, all of this task's acceptance criteria:** `/reference/
map/kalimdor` pans and zooms and is clamped at its own real edges the same
way Eastern Kingdoms is (repeated drag attempts at the boundary produced
zero movement); the seam between Kalimdor's two source halves is genuinely
seamless at z6, z3, and z2 (see the tile-pyramid note's real-run section
for the exact tile coordinates inspected and what was checked); empty areas
render solid black on both continents; the dropdown navigates
Eastern-Kingdoms-to-Kalimdor and back, and Eastern Kingdoms' own page
(including the Uldaman pin, popup, and link-through) is unchanged after
the round trip.

### Reverted: single-zone hand-drawn SVG world map MVP (2026-09-24)
Two sessions built a single-zone world map -- `/reference/map`,
`components/map/{ZoneMap,DungeonPinMarker,WorldMapZone,zoneShapes}.tsx`,
`data/dungeon-locations.json`, `lib/dungeon-locations.ts` -- originally-
drawn SVG zone art (Loch Modan, then corrected to Badlands once the
Uldaman/Loch Modan pairing was found to be wrong: Uldaman's entrance and
its quest givers Rigglefuzz/Theldurin the Lost are in the Badlands, per
`data/dungeons/uldaman.json`'s own quest location fields), a dungeon-
entrance pin with click-through, and a Classic/Forever pin-set toggle
(never exercised for real -- Uldaman is a plain classic-type dungeon,
`appearsIn: "both"`). All of it was reverted at explicit request on
2026-09-25 -- the SVG-art approach wasn't the direction being pursued, not
a quality problem with what was built, and the wow.export-based proof of
concept above replaced it. Every file the feature touched was a pure
addition across its 6 commits (confirmed via `git diff --stat` before
deleting anything), so the revert was a clean `git rm`, not a partial
unwind of any shared file -- verified via a full-codebase grep that
nothing else ever referenced it (it really was never linked from nav).
The commits themselves are untouched in git history if any of that art or
the toggle mechanism turns out to be worth revisiting.

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
