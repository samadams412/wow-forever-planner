# World map handoff: toolbar, area-lookup popup, mobile menus, cursor

Covers `components/map/MapToolbar.tsx`, `components/map/MapExplorer.tsx`, and the
area-lookup/cursor-readout additions to `components/map/LeafletZoneMap.tsx`. Read
CLAUDE.md's own map-related "Session handoff" entries first for the broader
architecture (panes, coordinate math, tile pyramid, StrictMode gotchas); this file
covers the toolbar/popup/mobile-menu/cursor layer specifically, including three real
bugs found and fixed after the original build.

## Toolbar (`MapToolbar.tsx`)

Desktop: a plain icon-button row (Zone borders / Zone labels / Level lines) plus
Share view, in the header's empty space above the map. Each `ToggleButton` is a real
`aria-pressed` button with a custom CSS tooltip (`group-hover`/`group-focus-visible`,
not the native `title` alone, though `title` is also set for accessibility). State is
the same `MapLayers`/URL-hash mechanism `MapExplorer.tsx` already owns -- this
component is purely presentational, driven by `layers`/`onToggleLayer` props.

`ShareButton` copies `window.location.href` via `navigator.clipboard.writeText`,
showing "Copied" for 1500ms; on failure (or if the Clipboard API isn't available) it
reveals a selectable `<input readonly>` field instead, dismissed on an outside click.
**Real clipboard behavior could not be cleanly end-to-end verified through browser
automation** -- `navigator.clipboard.writeText()` hangs indefinitely with no
resolve/reject when called without a real, permission-granted user gesture in this
dev environment (the same class of issue already documented in CLAUDE.md for
`clipboard.readText()`). The fallback-on-failure path itself was confirmed correct by
directly observing the DOM (a forced-rejecting override still produced the fallback
`<input>` with the right URL). Do a real manual click before fully trusting it if this
matters for a release.

**Bug fixed this session: the mobile dropdown could open almost entirely off-screen.**
The header row (`MapExplorer.tsx`) is `flex flex-wrap justify-between` with the title
block as one item and the toolbar as the other. On a narrow viewport the title block
alone usually exceeds the row's width, so the toolbar wraps onto its own line --
and a single item on a wrapped flex line sits at flex-start (the **left** edge), not
at the position `justify-between` would give it on a wider line. The dropdown's
`right-0` anchor assumed the latter (desktop's far-right position) and, confirmed
live at 440px width, rendered from x=-172 to x=52 -- almost entirely off-screen.
Fixed with a measure-after-paint correction (`useLayoutEffect`, so there's no visible
flash): after the dropdown mounts, if its real rendered rect overflows either
viewport edge, its `left`/`right` inline style is clamped to an 8px margin instead of
trusting the static `right-0` class. Same "measure the real rendered size, then
correct" approach this codebase already uses for tooltip placement
(`lib/use-hover-tooltip.ts`) -- reach for that pattern again if another small
absolutely-positioned overlay in this area turns out to have the same problem.

## Mobile sidebar toggle (`MapExplorer.tsx`)

The "Map menu"/"Close menu" button and the toolbar's own hamburger are deliberately
separate, mutually-exclusive controls (each handler closes the other) -- not the same
menu, don't merge them.

**Bug fixed this session: the toggle button became unreachable once the menu was
open.** The button sits in normal page flow above the map row; the sidebar overlay is
`fixed inset-0 z-40`, covering the *entire* viewport once open -- including where the
button used to be, since the overlay's own content (`ContinentSelect`, search, zone
list) starts painting from the top of that same `inset-0` box. Confirmed live via
`document.elementFromPoint` at the button's own coordinates: a click there hit a
zone-list row, not the button, making the menu impossible to close from that button.
Fixed by pinning the button (`fixed right-4 top-4 z-50`) above the overlay's own
z-index *only while open* (closed state is untouched, still normal flow, no visual
change); the overlay also gained `pt-16` on mobile so its own top content
(`ContinentSelect`) doesn't sit underneath the now-floating button.

## Area-lookup click popup (`LeafletZoneMap.tsx`)

A click that isn't on a zone border or a marker (both call
`L.DomEvent.stopPropagation` so they never reach this) looks up the clicked world
point via `lib/subzone-lookup.ts` (a small RLE-encoded binary grid per continent,
`public/map/<continent>/subzone-grid.bin`, plus `public/map/subzone-names.json` for
subzone id -> name/parent-zone/faction-mask) and opens an `L.popup` themed via the
`.area-popup` class in `globals.css` (dark background, gold border -- scoped to this
one popup's own className, not a sitewide override of Leaflet's default white popup
background, which the pre-existing entrance/flight-master popups still use
deliberately unchanged).

Popup content: subzone name + "in `<Zone>`" (or just the zone name over open zone
with no subzone), level range, faction (a subzone's own `FactionGroupMask` if set,
else the zone's), zone coords (`lib/zone-coords.ts`'s `worldToZoneCoords`) and raw
world coords, and a "Copy link" button. The link encodes
`#x=&y=&z=6.00&popup=<worldX>,<worldY>&off=...` -- a one-shot hash param consumed
once on mount by `LeafletZoneMap` and naturally dropped the next time `writeHash()`
fires (it isn't part of that function's own persistent vocabulary).

**`lib/zone-coords.ts`'s `worldToZoneCoords` formula is still unverified against
real in-game coordinates.** This has been flagged since it was written and still
needs 2-3 real reference points from in-game to confirm the axis convention (first
number increasing south, second increasing west, per the documented-but-unverified
recollection in that file's own comment) before trusting it for anything beyond
internal consistency.

Verified live this session: zone-only popup (Elwynn Forest), subzone-in-zone popups
(Crystal Lake, Mirror Lake Orchard, Jasperlode Mine, all "X in Elwynn Forest"),
entrance/flight-master marker clicks correctly opening only their own bound popup
(never also triggering this one). Not independently re-verified this session
specifically: a capital-city zone click (Stormwind City was checked in an earlier,
already-summarized part of this same overall task).

## Cursor readout (`LeafletZoneMap.tsx`)

Bottom-left HUD overlay, `rAF`-throttled on `mousemove`, hidden on touch
(`pointer: coarse`, checked once via `matchMedia` at mount) and while the cursor is
outside the map. Format: `Subzone, Zone · x.x, y.y · lvl a–b · world X, Y`, or just
`Zone · ...` with no subzone. A temporary debug `console.log` and a diagnostic rAF
bypass left over from an earlier session's tab-backgrounding investigation were
removed this session -- if you see either reappear, it's leftover debug code, not
intentional.

## Double-cursor fix (`CustomCursor.tsx` + `LeafletZoneMap.tsx`)

Plain map background already correctly hides the custom gauntlet-cursor overlay
(showing Leaflet's own native cursor instead) via `.leaflet-container` in
`CustomCursor.tsx`'s `NATIVE_CURSOR_SELECTOR` -- that part was fixed in an earlier
session and is untouched.

**Bug fixed this session: hovering an entrance or flight-master marker showed both
the native pointer cursor and the custom "active" gauntlet cursor at once.** The
marker's own inline styles used to set `cursor:pointer` directly, which always beats
the site's global `cursor:none` class rule regardless of Tailwind layer ordering --
removing that inline value alone wasn't sufficient, though, because Leaflet's own
stylesheet sets `cursor: pointer` on `.leaflet-interactive` (an *ancestor* of the
marker's inner div), and CSS `cursor` is inherited -- so the inner div kept showing a
"pointer" cursor via inheritance even with no `cursor` property of its own. Fixed
with an explicit `cursor: none` (not just omitting a value) on
`.entrance-icon-inner`/`.flight-master-icon-inner`, which overrides the inherited
value. If a new marker type is ever added with its own inner styled element, give it
the same explicit `cursor: none` rather than assuming "don't set cursor:pointer" is
enough.

## Not done / still open

- Real in-game coordinate verification for `lib/zone-coords.ts` (see above).
- A real manual click-through of Share view / Copy link's clipboard-success path
  (automation can't cleanly exercise it here, see the toolbar section above).
- Firefox scrollbar rendering was never directly tested (only Chrome automation is
  available); the theming relies on standard `scrollbar-color`/`scrollbar-width`
  properties plus a `::-webkit-scrollbar` fallback, both already used elsewhere in
  this codebase.
- The toolbar's own mobile dropdown has no outside-click-to-dismiss handler (only its
  own hamburger toggle opens/closes it) -- pre-existing behavior, not changed or
  asked for this session.
