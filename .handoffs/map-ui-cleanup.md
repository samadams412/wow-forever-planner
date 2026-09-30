# Map UI cleanup handoff: layer legend icons, mobile auto-close, loot → map link

Date: 2026-09-30. Branch: `claude/gracious-curie-gj22x9` (the session's designated
branch; the task text named `feature/map-ui-cleanup`, which was not created -- rename
or cherry-pick if that branch name matters).

Read CLAUDE.md's map "Session handoff" entries and `.handoffs/map-toolbar-popup-mobile-menus.md`
first for the broader map architecture (MapExplorer owns selection/layers/URL hash;
LeafletZoneMap is a forwardRef component with an imperative fly-to handle).

**Verification scope:** `tsc --noEmit` (clean apart from the pre-existing
`app/layout.tsx` `LayoutProps` generated-type error, which needs `next typegen`),
eslint clean on every touched file, and a dev-server `curl` of the rendered HTML
(loot page links present with the expected hashes; map page renders 200 with the
legend rows). **No live browser interaction was done**, per instruction -- the
fly-to/popup behavior on following a link and the mobile auto-close are for manual
testing (checklist at the bottom).

## 1. Layer toggles now carry the marker icon as a legend

### New: `lib/map-icons.ts`
The marker SVG markup (`entranceIconSvg(kind)`, `flightMasterIconSvg(faction)`) and
its colors (`MAP_FACTION_COLOR`, `ENTRANCE_ICON_COLOR`, `FLIGHT_MASTER_FACTION_COLOR`)
moved here out of `components/map/LeafletZoneMap.tsx`, unchanged byte-for-byte.

Why a separate module: `LeafletZoneMap.tsx` does `import L from "leaflet"`, which
touches `window` at import time, so the sidebar (not behind the `ssr:false` loader)
can't import from it -- same reason `lib/map-layers.ts` exists. It only has
`import type` imports from `map-entrances`/`map-flight-masters` (erased at compile
time), so none of their server-side JSON loading reaches the client bundle.

One copy of the markup means the legend can never drift from the real markers: if
the placeholder SVGs are ever swapped for the extracted client atlas art
(FileDataID 1121272, see CLAUDE.md), change it here and both update.

### `components/map/LeafletZoneMap.tsx`
Now imports `MAP_FACTION_COLOR as FACTION_COLOR`, `entranceIconSvg`,
`flightMasterIconSvg` from `lib/map-icons.ts`; the local definitions were removed.
No rendering-logic change. (`ENTRANCE_ICON_COLOR` and the `FlightMasterFaction`
type are no longer referenced in this file, so they're no longer imported.)

### `components/map/MapSidebar.tsx`
- `LAYER_ROWS` (Dungeons / Raids / Battlegrounds) and `POI_ROWS` (Flight masters)
  share a `LayerRow` type with an `iconSvg` field.
- New `LegendIcon` (20x20 span, `dangerouslySetInnerHTML` of the static, locally
  generated SVG string -- no data/user input, so safe). Rendered left of each row's
  label. When the layer is off it dims to `opacity-40 grayscale`, so the legend also
  mirrors toggle state alongside the existing `aria-pressed` border styling.
- Flight masters are faction-tinted on the map; the single legend row uses the
  neutral ("Both") gold variant.
- Counts on the right of each row are unchanged.

The zone borders/labels/level-lines toggles stay as lucide icon buttons in
`MapToolbar.tsx` -- they're display toggles, not marker types, so they have no map
glyph to legend.

## 2. Mobile map menu closes when a zone is picked

### `components/map/MapExplorer.tsx`
`handleSelectZoneRow` (clicking a row in the sidebar Zones list) now calls
`setMobileSidebarOpen(false)` before selecting/flying. Previously only
`handleSearchPick` closed the overlay, so on mobile tapping a zone row flew the map
*behind* the full-screen (`fixed inset-0`) overlay and the user saw nothing happen.
On `md+` the sidebar is static and ignores this state, so it's a no-op there.

Other paths already covered: search results (zone or entrance) already closed it.
The toolbar hamburger menu (`MapToolbar.tsx`) contains no zone selection, so it's
unchanged.

## 3. Dungeon loot page → map entrance link

### `lib/map-entrances.ts`
New `getEntranceMapHref(entranceId): string | null` and `ENTRANCE_LINK_ZOOM = 5`.

- Dungeon ids are the same ids `data/map-entrances.json` uses, so the loot page's
  `dungeon.id` is passed straight in.
- Finds the marker containing that entrance on its continent via
  `getEntranceMarkers(continent)`. If the entrance was clustered into a group
  (Scarlet Monastery wings, Dire Maul, Stratholme, Blackrock Mountain, Ahn'Qiraj),
  it links to the **group** marker id (e.g. `group:sm-armory+sm-cathedral+sm-graveyard+sm-library`),
  since members have no marker of their own; the group popup lists every member.
- Returns `null` for entrances with no continent/position in this build (e.g. Hall
  of Thanes and the other not-yet-placed new-Forever dungeons), for
  `ALWAYS_SKIP` ids, and for unregistered continents.
- Output format reuses MapExplorer's existing shareable hash rather than adding a
  new query param:
  `/reference/map/<continent>#x=<worldX>&y=<worldY>&z=5.00&sel=entrance%3A<markerId>`
  - `sel=entrance:<id>` → MapExplorer's mount effect validates it, sets
    `selectedEntranceId`, and (once the async map handle exists) flies to the
    marker at z5 and opens its popup (`flyToEntranceId`).
  - `x/y/z` → LeafletZoneMap's own hash restore sets the initial view on the same
    point, so the map doesn't first render the whole continent and then fly across
    it; MapExplorer also primes its `viewRef` from it so the hash stays intact.
  - Note: the map page is `/reference/map/[continent]` -- there is no bare
    `/reference/map` index route, so the link targets the continent page.
- Imports `isRegisteredContinent` from `lib/map-continents.ts` (no circular import:
  that module only imports `map-coords`).

### `app/reference/dungeons/loot/[slug]/page.tsx`
The header's right side (level range) is now a small flex group: the existing
"Level X-Y" text plus, when `getEntranceMapHref(dungeon.id)` is non-null, a
`next/link` pill button -- lucide `MapPin` icon + "View entrance on map", styled with
the site's existing accent-pill convention (`border-accent/60 bg-accent/10
text-accent`, `hover:bg-accent/20`). Omitted entirely when there's no placed
entrance.

Rendered hrefs checked via curl:
- uldaman → `/reference/map/eastern-kingdoms#x=-6060&y=-2955&z=5.00&sel=entrance%3Auldaman`
- sm-library → `...eastern-kingdoms#x=2892&y=-811&z=5.00&sel=entrance%3Agroup%3Asm-armory%2Bsm-cathedral%2Bsm-graveyard%2Bsm-library`
- ragefire-chasm → `/reference/map/kalimdor#x=1817&y=-4423&z=5.00&sel=entrance%3Aragefire-chasm`
- hall-of-thanes → no link (no position in this build)

## Files changed

| File | Change |
|---|---|
| `lib/map-icons.ts` | **new** -- shared marker SVGs + colors |
| `components/map/LeafletZoneMap.tsx` | uses `lib/map-icons.ts`; local copies removed |
| `components/map/MapSidebar.tsx` | legend icons on Dungeons/Raids/Battlegrounds/Flight masters toggles |
| `components/map/MapExplorer.tsx` | zone-row click closes mobile overlay |
| `lib/map-entrances.ts` | `getEntranceMapHref`, `ENTRANCE_LINK_ZOOM` |
| `app/reference/dungeons/loot/[slug]/page.tsx` | "View entrance on map" header link |

## Manual test checklist

1. `/reference/map/eastern-kingdoms` desktop: each of the 4 sidebar toggles shows
   an icon matching its map marker; toggling off dims the icon and hides markers.
2. Mobile (<768px): open "Map menu", tap a zone row → overlay closes, map flies to
   and highlights the zone. Search pick still closes it as before.
3. `/reference/dungeons/loot/uldaman` → click "View entrance on map" → map opens
   near Uldaman at z5 with its popup open. Repeat for `sm-library` (group popup with
   4 wings) and `ragefire-chasm` (Kalimdor). `hall-of-thanes` shows no button.
4. Client-side navigation case: the link is a `next/link`; if the popup ever fails
   to open after a soft navigation (hash not yet in `window.location` when
   MapExplorer's mount effect runs), switch it to a plain `<a>` for a full load --
   Next's router updates history in an insertion effect before page effects run, so
   this is not expected, but it's the one untested timing assumption here.
