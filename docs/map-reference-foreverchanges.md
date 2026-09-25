# Map reference: foreverchanges.pro/map

Research notes for Forevercraft's own world map (`/reference/map/[continent]`).
Observed 2026-09-25 in Chrome, beta build 1.60.1.70009 (the site's own
banner), Eastern Kingdoms map at a 1920x911 viewport.

**Rules followed:** behavior and appearance only. No JS, CSS, custom art or
data from that site is copied into this repo, and none of their data endpoints
are a source for our data. Icon PNGs were opened in the browser to identify
what they depict; nothing was saved.

**Confidence tags:** *[measured]* = read from the live DOM, computed styles or
canvas pixels. *[observed]* = seen in a screenshot. *[inferred]* = a
reasoned guess, flagged so nobody treats it as fact.

**Tooling caveat:** the browser tab was heavily throttled (screenshots timed
out several times, `zoom` never worked, mouse-wheel input never registered).
Zoom limits were therefore measured by loading URL-hash views, not by
scrolling. Wheel/pinch behavior, animation duration and drag inertia are
**not** measured (see "Not verified").

---

## Overall shape

- Leaflet **1.9.4** (`L.version`), `leaflet-container` with a `wm-2d` class.
  It is a plain 2D Leaflet map, the same library family we already use. *[measured]*
- Custom panes on top of the stock ones: `zones` (z-index 450, one canvas),
  `pins` (600), `names` (650, all text labels as `divIcon` markers). *[measured]*
- Page layout: fixed 300px left panel (`wm-panel`) plus a map filling the
  rest, 1605x775 at the test viewport. Map background is pure black
  (`rgb(0,0,0)`). *[measured]*
- All view state lives in the URL hash: `#o=<layers>&x=&y=&z=&p=<selected id>&l=paint`.
  `x`/`y` are in their own map units (not lat/lng), `z` is fractional.
  Layer toggles are also remembered between visits (loading a bare URL
  re-populated `o=` from previous choices, so it is stored client-side). *[measured]*
- Tab title/URL hash updates lag the animation by a few seconds; the hash is
  written after the view settles, not per frame. *[observed]*

## 1. Zoom

| Item | Finding |
|---|---|
| Range | **min 0, max 8**, fractional. Setting `z=9` in the hash clamps to `8.00`; `z=0` is accepted as `0.00`. *[measured]* |
| Default view | `z=1.50`, centered on the middle of the continent. At 1.5 the Eastern Kingdoms is taller than the viewport (Stranglethorn is cut off), so the default is **not** fit-to-height. *[measured]* |
| Buttons | `+` / `-` step **1 whole level** (1.5 -> 2.5 -> 3.5). Extra buttons: "Zone text" (eye icon, toggles labels), "Entire map", "Fullscreen", "Share view" (copies a link). *[measured]* |
| Fly-to | Picking a zone from search zooms to a fitted level (Stormwind City landed at `z=5.25`), so fractional zoom is in use and the snap is finer than 1. *[measured]* |
| Tile pyramid | 512px tiles, native levels **z0 to z6**; view zoom 7-8 just overzooms z6 tiles (at `z=7` the loaded tiles were z6, at `z=8` a tile measured 2048px = 512 x 2^2). The base map goes visibly soft past z6. Between integer zooms it cross-fades tile levels 3<->4 etc. *[measured]* |
| Pan limits | **Not clamped to the landmass.** Loading `x=0&y=0&z=3` put the view in the black void off the top-left of the world grid, with Eastern Kingdoms in the corner. At `z=0` the view re-centers itself (y moved 9990 -> 10758) so the map is not lost. They appear to bound to the full 64x64 ADT grid, not the populated area. *[measured]* |
| Animation | Leaflet default zoom animation plus a tile fade (`leaflet-fade-anim`, `leaflet-zoom-animated`). Exact durations not measured. *[measured classes, durations not measured]* |
| Scroll / pinch | Container has `leaflet-touch-zoom` and `leaflet-touch-drag`, so pinch and drag are on. Wheel step size not measured. *[measured classes only]* |

Note for us: our tiles are the same global-ADT-grid pyramid (z0-z6, 512px), so
overzooming to 8 and fractional zoom need only Leaflet options, not new tiles.
We deliberately clamp panning to the populated area (`maxBounds`); they don't.

## 2. Zone labels

Labels are DOM markers, not canvas text: `div.wm-name` with a tier class. All
labels exist in the DOM; visibility is decided per zoom and viewport. Font size
does **not** scale with zoom. *[measured]*

| Tier class | Used for | Size | Color | Notes |
|---|---|---|---|---|
| `wm-name-zone` | Zones / cities | 17px bold, uppercase, `letter-spacing` 0.06em (1.02px) | `#ffe28a` (255,226,138) | Level range on a second line |
| `wm-name-zone wm-name-on` | Selected zone | 17px | renders **white** in screenshots (the container's computed color is the same gold, so the white is likely on the inner span) | Selected zone's label switches from gold to white |
| `wm-name-big` | Seas, bays, big landmarks, some towns | 14px bold | `#fff0a8` (255,240,168) | Sentence case |
| `wm-name-mid` | Subzones | 12.5px bold | `#fff0a8` | |
| `wm-name-small` | Small landmarks | 11.5px bold | `#fff0a8` | |

- **Font:** `Verdana, Geneva, "DejaVu Sans", Tahoma, sans-serif` for everything on the map.
- **Legibility trick:** no stroke; a triple black text-shadow:
  `0 0 3px #000, 0 0 6px #000, 0 1px 2px #000`. Works over both satellite and parchment.
- **Level range:** an `<em class="wm-lv wm-lv-{a|h|c}">` under the name,
  12px bold, colored by faction: Alliance `#6fb1ff`, Horde `#ff7a6b`,
  Contested `#ffd100`; en-dash ("54-59"). Cities show a single level ("10").
  The same colors are the legend at the top of the sidebar.
- **Zoom behavior** (Stormwind-centered test views plus the default EK view): *[measured]*

| Zoom | What shows |
|---|---|
| 0 | Only 5 big zone labels (Eastern Plaguelands, Gilneas, Dun Morogh, Riverglades, Stranglethorn Vale). Others hidden to avoid collisions. |
| 1.5 (default) | ~14 zone labels with levels. No pins. |
| 2 | 12 zone labels. No pins. |
| 2.5 | 23 zone labels + 13 big labels (seas). Service/dungeon pins begin. |
| 3-3.5 | ~11-28 zone labels, big labels, flight-master and service pins. Mid (subzone) labels start around 3.5. |
| 4 | Zone labels thin out to those near the view edge, mid labels appear (25 visible), big labels only a few. |
| 5 | Small labels appear (7 visible), mid (5), zone labels down to 1-2. |
| 7-8 | Zone/big/mid/small labels are all off for a view inside one city. Pins remain. |

  So the rule is a tier ladder (zone -> big -> mid -> small as you zoom in) with
  collision culling and **hiding a zone label once you are zoomed inside that zone**.
  Exact thresholds are approximate; only integer zooms were sampled.

## 3. Zone borders

- **Vector, not baked into tiles.** One full-viewport `<canvas>` in the `zones`
  pane (1926x930 at the test size), redrawn on pan/zoom. *[measured]*
- Sampled canvas colors: zone outlines are Blizzard-gold `#ffd100`
  (255,209,0) at low-to-mid alpha (~25-70%), with a faint black underlay
  (0,0,0 at ~44%) so lines read on bright terrain. The hovered/selected zone
  is a solid brighter cream/gold `#fad961` (250,217,97), noticeably thicker
  (~2px vs ~1px). *[measured colors; weights estimated from screenshots]*
- **Selected zone** (search result or click): thick cream outline and the
  label goes `wm-name-on` (white). Hovering a zone gives the same thick
  outline (seen on Dun Morogh while the cursor was over a pin inside it). *[observed]*
- Some borders are stepped/blocky (cities like Stormwind follow ADT-chunk
  edges), which suggests polygons derived from the client's area grid rather
  than hand-traced shapes. *[inferred]*
- "Where to level" recolors outlines lime-green for zones matching your level
  and dims non-matching zone labels (section 6). *[observed]*

## 4. Icons and pins

Two pin sizes, both **fixed pixel size at every zoom** (they never scale with
the map): *[measured]*

- Flight master pin `wm-pin-flight`: **22x22**
- Service / general pins `wm-pin-svc`, `wm-pin-poi`: **18x18**

Each pin is a `div.wm-pin` containing an `<img>`. Categories enabled by default:
Dungeons & Raids, Trade camps, Flight Master. Everything else is opt-in.
Sidebar counts for Eastern Kingdoms: Dungeons & Raids 16, Towns & Landmarks 122,
Dungeon Quest Givers 76, Library books 22, Rare elites 8, Trade camps 11,
Graveyards 47, Flight Paths 128, Boats & Zeppelins 8; services: Flight Master
30, Innkeeper 26, Repair 88, Stable Master 22, Banker 4, Auctioneer 7, Mailbox 30.

| Pin family | Icon file (basename) | Look |
|---|---|---|
| Flight master | `flight.png` (32x32) | Winged boot |
| Dungeon | `svc-dungeon.png` | Cyan swirling portal ring |
| Raid | `svc-raid.png` | Green swirl (same shape, green) |
| Innkeeper | `svc-inn.png` | Hearthstone-style blue-swirl stone |
| Repair | `svc-repair.png` | Anvil/forge block |
| Stable | `svc-stable.png` | Horseshoe |
| Banker | `svc-bank.png` | Two coin sacks |
| Auctioneer | `svc-auction.png` | Stack of gold coins |
| Profession trainers, trade camps, commerce | `trade_alchemy.jpg`, `trade_blacksmithing.jpg`, `trade_engraving.jpg`, `trade_engineering.jpg`, `trade_leatherworking.jpg`, `trade_tailoring.jpg`, `inv_misc_food_15.jpg`, `inv_crate_02.jpg`, `ability_mount_kodo_01.jpg`, `inv_misc_bag_10.jpg`, `inv_misc_coin_02.jpg` | Standard WoW spell/item icons |
| Towns, landmarks, camps, graveyards, quest givers, etc. | `poi-2`, `-4`, `-5`, `-6`, `-7`, `-9`, `-10`, `-11`, `-12`, `-41` `.png` | Small pixel-art with dark outline: town house (5), grey tower/landmark (6), blue Alliance tower (9), red Horde tower (10), red flag (7), blue gravestone-like (4), etc. |
| Boats / zeppelins / skyships | none; `wm-line-end wm-line-boat/zeppelin/skyship` | A route line plus a pill-shaped label, e.g. "To Auberdine >" (dark pill, light text, faction-colored) |

- **Routes:** flight paths are dashed lines (yellow on the default view);
  boat routes are dashed blue with "To <destination>" pills at the ends. Route
  color follows faction (Alliance blue / Horde red / contested gold). *[observed]*
- **Appearance thresholds:** no pins at z1.5-2; service and dungeon pins begin
  around **z2.5**; flight-master pins were absent at z2.5 and present at z3
  (14 visible in the Stormwind-centered view). *[measured]*
- **Hover / click:** hovering or clicking a pin opens a Leaflet popup
  (`wm-popup`) anchored to it. There is no close button. It has a tip. *[measured]*
  - Contents (dungeon example): **name** in gold `#ffd100` bold 14px; a gray
    (`#9d9d9d`) line "Dungeon entrance"; a gray line "Position from Classic"
    (data provenance!); a small 11.5px muted line
    "Dun Morogh 17.7, 39.2 . world -5,163, 932".
  - Style: `#06080c` background, 1px `#3a4557` border, 4px radius,
    `0 6px 20px rgba(0,0,0,.6)` shadow, white 13px Verdana, ~280px wide.
  - **No link-through** from the popup; ours already links to the loot page,
    which is better.
- **Bottom-left cursor readout**: a live pill that follows the mouse, e.g.
  "Dun Morogh 17.6, 39.0 lvl 4-12 world -5,158, 933" (zone, in-zone coords,
  level range, world coords). A permanent hint bar sits beside it: "Click a zone
  for its levels and size. Right-click anywhere for coordinates." *[observed]*

## 5. Base map

- **Two styles**, switched from a sidebar "Map style" control, stored as
  `l=paint` in the URL when the in-game style is picked:
  - **Satellite** ("The world seen from above"): the default. A top-down
    render of real client terrain (buildings, roads and water visible, not the
    parchment world-map art). Ocean/void areas get a dark-blue tint. *[observed]*
  - **In-game map** ("The map you open with M"): the classic parchment
    world map, stitched per zone; seams between zone textures are visible and
    the parchment backdrop text ("EAS..." lettering) shows through. *[observed]*
- Base fills the whole container; anything outside the tiles is solid black.
  The populated landmass sits inside a mostly-black 64x64 world grid.
- Tiles: `/map/<continent>/tiles/<z>/<col>_<row>.webp`, 512px, addressed on the
  global ADT grid (same scheme we adopted independently).
- A small "View in 3D" thumbnail card sits bottom-left (a separate WebGL
  view; see `CLAUDE.md`'s foreverchanges map recon note).
- A **Classic / Forever** toggle sits bottom-right; it swaps which pin/data set
  is shown (the panel footer explains that some pins carry "Classic position"
  because the beta client doesn't list them).

## 6. Sidebar and filters

Fixed-width (300px), dark, scrolls independently. Top to bottom: *[observed/measured]*

1. **Search box** ("Zone, town or dungeon", `/` shortcut). Autocompletes with a
   right-aligned type tag: "Dungeon", "City", "Alliance flight master",
   "Stormwind City". Picking a result flies to it and selects it.
2. **Map** dropdown: a custom list (not a native `<select>`) grouped:
   *Continents* (Eastern Kingdoms, Kalimdor); *New in Forever* (Battle for
   Gilneas, City of Dalaran, Dalaran City, Darkspear Islands, Eastern Kingdoms
   Preserved, Excavation Site: Wetlands, Half-Pint Tavern, Hyjal Crater, Ruins of
   Lordaeron, The Hall of Thanes, Warsong Gulch (Winter), Zephras Isle);
   *Dungeons and raids* (~25: Deadmines, Naxxramas, Scholomance, Zul'Gurub, etc.);
   *Battlegrounds* (Alterac Valley, Arathi Basin, Warsong Gulch); *Other maps*
   (Azshara Crater, EPL Scarlet Raid Phase). A link reads "All 48 maps".
   So instances are separate maps, not overlays on the continent.
3. **Selection card** (only when something is selected): serif small-caps name,
   "Zone of Eastern Kingdoms", Level + faction, Coords, Size in km2, and two
   buttons: "Center on map", "Copy link". Has a close X.
4. **Where to level**: number input (1-60, "I am level") with a Clear link.
   Typing a level (tested: 15) instantly (a) draws lime-green outlines on zones
   that fit, (b) dims other zone labels, (c) lists matching zones as chips in
   the sidebar with their level range, e.g. "Westfall 9-18", "Loch Modan 10-18",
   "Silverpine Forest 10-20", "Redridge Mountains 15-25". Legend dots
   (Alliance/Horde/Contested) sit above it.
5. **Points of interest**: one row per category with an icon, label, count and
   a gold check when on. Rows are `<button aria-pressed>`; toggling
   updates the `o=` list in the URL (keys: `labels, zones, flights, pois,
   routes, transport, levels, instance, graveyard, inn, repair, stable, bank,
   auction, mailbox, commerce, quest, book, rare, svc`).
6. **Town services**: same row pattern (Flight Master, Innkeeper, Repair,
   Stable Master, Banker, Auctioneer, Mailbox).
7. **Map style** (Satellite / In-game map).
8. A provenance footnote: "Read from the Forever beta client, build
   1.60.1.69876. The client does not list graveyards, town services or most
   dungeon doors: a pin marked Classic position comes from the Classic database
   instead."

Filtering is purely client-side and instant; it adds/removes pin layers, and
"Where to level" changes zone styling. Nothing reloads.

## 7. Where the icons come from

- **Profession/commerce pins** use the exact Blizzard client icon slugs
  (`trade_alchemy`, `inv_misc_coin_02`, `ability_mount_kodo_01`...) as `.jpg`.
  These are the standard `Interface\Icons` art that every WoW site hotlinks;
  so **client art, not custom.**
- **`poi-N.png`**: the numbering matches the client's own POI icon index
  scheme, so the *meaning* comes from client data. The 32x32 art itself has a
  heavy dark outline and looks re-drawn or re-processed. *[inferred; can't tell
  from here whether it's an extract or a redraw]*
- **`flight.png`, `svc-*.png`**: same 32x32 outlined pixel style; likely
  site-made or re-processed (their filenames are the site's own, not client
  names). Treat as **custom art, do not reuse.** *[inferred]*
- This project's actual policy (already applied to the world map's own
  tiles — see CLAUDE.md's tiles-are-local-only note and the
  `process.env.VERCEL` check in `app/reference/map/[continent]/page.tsx`):
  client-extracted art is local-only and gitignored, usable for local
  development without a rights check first. A rights decision is only
  needed before any of it — tiles now, icons later — ships to a real
  deployment, not before extracting or using it locally. See the Icons
  recommendation below for what that means for pin/POI icons specifically.
  

## 8. What to adopt (ranked by value to Forevercraft)

Stack reality check: we already run Leaflet + the same 512px global-ADT tile
pyramid, so most of this is configuration and data, not engineering.

| # | Item | Value | Effort | Notes |
|---|---|---|---|---|
| 1 | **Zone label tiers + text-shadow legibility** (17/14/12.5/11.5px bold Verdana-style, triple black shadow, tier appears by zoom) | Very high: the map reads as a map instead of a picture | **Easy** | Zone list needs data first (zone names, centers, level ranges). Render as `divIcon` markers in a custom pane, toggled by zoom class. Use our own colors/font stack, not theirs. |
| 2 | **Level-range line under each zone name, faction-colored** | High | **Easy** | We already color Alliance/Horde/Contested elsewhere in the site. Needs zone-level data. |
| 3 | **Fractional zoom + maxZoom 8 overzoom** (zoomSnap ~0.25, `maxNativeZoom` 6) and default view that isn't fit-to-height | High | **Easy** | Pure Leaflet options. Keep our `maxBounds` clamp (better than theirs for a fan site), maybe with some padding. |
| 4 | **Sidebar category filters with counts** (button rows, `aria-pressed`, layers keyed in the URL hash) | High | **Medium** | UI plus per-category data. Start with the categories we can already back: dungeons/raids. |
| 5 | **Search with type tags + fly-to + selection card** | High | **Medium** | Dungeon/zone search list, fly to a fitted zoom, small card with level/coords/size and Copy link. Reuses our existing data. |
| 6 | **Zone borders as a single canvas layer, gold, hover/selected state** | High | **Medium/Hard** | Needs real zone polygons; that's a data problem (client area grid or hand-built). The rendering itself is `L.canvas()` + polygons, easy once we have them. |
| 7 | **URL-hash view state** (`x`, `y`, `z`, selected id, layers) | Medium-high | **Easy** | Shareable views; fits our shareable planner URLs. |
| 8 | **Popup content pattern** (gold name, gray kind line, data-provenance line, coords) | Medium | **Easy** | Our popup already has the link-through, which theirs lacks. Add a "confirmed / datamined / estimated" line: a natural fit for our data-confidence convention. |
| 9 | **"Where to level"** (lime outlines + dimmed labels + zone chips) | Medium | **Medium** | Fun and sticky, but needs zone level data first (same as 1-2). |
| 10 | **Live cursor readout + right-click coordinates** | Medium | **Easy** | A `mousemove` listener; needs our own world-to-zone-coordinate conversion, which `lib/map-continents.ts` mostly has. |
| 11 | **Fixed-size pins (18 / 22px) regardless of zoom, with tiers of appearance** | Medium | **Easy** | Leaflet `divIcon` already behaves this way. Hide pin classes below z2.5. |
| 12 | **Routes** (flight paths, boats/zeppelins with "To X >" pills) | Medium | **Hard** | Needs route data; flight-path graph is real data work. Defer. |
| 13 | **Satellite vs in-game-map style switch** | Medium | **Hard** | Second tile pyramid (their "paint" style is a separate stitched render). Disk cost is another ~27 MB per continent locally. Defer. |
| 14 | **Multiple maps (dungeon interiors, BGs, new-in-Forever areas)** | Medium | **Hard** | Each is its own export + tiling run plus its own map config. Our per-continent config is already the right shape. |
| 15 | **3D view** | Low for our goals | **Very hard** | Separate WebGL terrain engine; see `CLAUDE.md` recon note. Not recommended. |

**Icons recommendation:** don't copy their PNGs directly (see Section 7 —
several are likely their own re-processed art, not raw client assets). Two
paths, both fine under this project's actual policy (local-only,
gitignored, rights-checked only before deployment — same as the tiles):
(a) hotlink the standard `Interface\Icons` `.jpg` set from `wow.zamimg.com`,
which this site already does for items and profession icons and needs no
local-only caveat at all, since it's never extracted or stored by us; (b) for
anything zamimg doesn't cover (e.g. genuinely custom POI iconography, if a
closer look confirms `poi-N.png` isn't just client art), extract real
client icons locally via wow.export — the same pipeline already used for
the map tiles — and keep them local-only/gitignored until a rights decision
is made before deploying them.

## Not verified (worth a follow-up if any of it matters)

- Mouse-wheel zoom step and pinch behavior (wheel input never registered here).
- Animation durations for zoom/pan and drag inertia.
- Whether hover alone or a click is what opens the pin popup (both were sent in
  the same action).
- Exact zoom thresholds for label tiers and pin categories at fractional
  zooms (only integer/.5 samples).
- Mobile layout: how the 300px sidebar collapses on narrow screens.
- Kalimdor, dungeon-interior maps and the Classic/Forever toggle's exact effect
  on pins.
- The "Zone text" and fullscreen buttons were identified but not exercised.
