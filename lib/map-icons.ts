import type { EntranceKind } from "./map-entrances";
import type { FlightMasterFaction } from "./map-flight-masters";

// Marker glyph SVG markup, shared between components/map/LeafletZoneMap.tsx
// (the real map markers, injected into Leaflet divIcons) and
// components/map/MapSidebar.tsx / MapToolbar-style legends (rendered next to
// each layer toggle). Lives here, not in LeafletZoneMap.tsx, because that
// module imports Leaflet (touches `window` at import time) and the sidebar
// isn't behind the ssr:false loader -- same reason lib/map-layers.ts exists.
// One copy of the markup means the legend can never drift from the markers.
//
// Type-only imports above: map-entrances.ts/map-flight-masters.ts read JSON
// data server-side, and `import type` is erased at compile time, so none of
// that is pulled into the client bundle.

export const MAP_FACTION_COLOR = {
  alliance: "#6fb1ff",
  horde: "#ff7a6b",
  contested: "#ffd100",
} as const;

export const ENTRANCE_ICON_COLOR: Record<EntranceKind, string> = {
  dungeon: "#4fd8c4",
  raid: "#b478ff",
  battleground: "#ff6b6b",
};

// Reuses the map's existing faction color language (alliance blue / horde
// red / contested-or-neutral gold) rather than inventing a second palette.
// "Both" isn't literally "contested" the way a zone's territory can be, but
// it's the same "neither side alone" case visually, so it gets the same gold.
export const FLIGHT_MASTER_FACTION_COLOR: Record<FlightMasterFaction, string> = {
  Alliance: MAP_FACTION_COLOR.alliance,
  Horde: MAP_FACTION_COLOR.horde,
  Both: MAP_FACTION_COLOR.contested,
};

// Simple original SVGs, not client art -- the real client world-map pin
// icons for these (UiTextureAtlas 647's "dungeon"/"raid"/"crossedflags"
// members, FileDataID 1121272) were found and verified but that texture
// hasn't been exported from wow.export yet (see CLAUDE.md's "entrance icon
// art" session note for exactly what to export and the crop rectangles to
// use once it is) -- these are a placeholder, swappable for a real
// extracted PNG in public/map/icons/ later with no rendering-logic change,
// not a permanent design choice.
export function entranceIconSvg(kind: EntranceKind): string {
  const color = ENTRANCE_ICON_COLOR[kind];
  if (kind === "raid") {
    return `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/><circle cx="16" cy="16" r="8" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="16" cy="16" r="2.5" fill="${color}"/></svg>`;
  }
  if (kind === "battleground") {
    return `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/><path d="M9 9 L23 23 M23 9 L9 23" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  return `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/><path d="M10 20 V13 A6 6 0 0 1 22 13 V20" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
}

// A simple original glyph (not client art -- see entranceIconSvg's own
// comment on the same policy): an L-profile boot (shaft, heel, flat sole)
// with two feather shapes fanning off the ankle. Tinted by faction via
// FLIGHT_MASTER_FACTION_COLOR. Checked at full render size before trusting
// it -- an earlier version (a plain vertical bar with a flared base) read
// as the numeral "1" once shrunk to icon size, not a boot at all.
export function flightMasterIconSvg(faction: FlightMasterFaction): string {
  const color = FLIGHT_MASTER_FACTION_COLOR[faction];
  return (
    `<svg viewBox="0 0 32 32" width="100%" height="100%">` +
    `<circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/>` +
    `<path d="M15 9 Q7 5 4 10 Q9 11 15 10 Z" fill="${color}" opacity="0.55"/>` +
    `<path d="M15 11 Q8 9 6 14 Q11 14 15 12 Z" fill="${color}" opacity="0.8"/>` +
    `<path d="M13 6 L19 6 L19 17 L19 19 L24 19 Q27 19 27 21.5 Q27 24 24 24 L8 24 L8 19.5 Q8 17.5 10 17 L13 17 Z" fill="${color}"/>` +
    `</svg>`
  );
}
