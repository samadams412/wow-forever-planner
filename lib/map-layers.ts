// Layer-toggle shape, split out from components/map/LeafletZoneMap.tsx
// specifically so it can be imported (as a value, not just a type) from
// components/map/MapExplorer.tsx without pulling in that module's own
// `import L from "leaflet"` -- Leaflet touches `window` at import time
// (see LeafletZoneMap.tsx's own header comment), so anything that isn't
// loaded through the ssr:false LeafletZoneMapLoader can't import from it
// directly, even indirectly through a re-export. This file has no such
// import and is safe to use anywhere, server or client.

export type MapLayers = {
  zoneBorders: boolean;
  zoneLabels: boolean;
  levelLines: boolean;
  dungeons: boolean;
  raids: boolean;
  battlegrounds: boolean;
  flightMasters: boolean;
  towns: boolean;
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  zoneBorders: true,
  zoneLabels: true,
  levelLines: true,
  dungeons: true,
  raids: true,
  battlegrounds: true,
  flightMasters: true,
  towns: true,
};

// --- Point-of-interest markers ---
// Every non-entrance marker category renders through one generic path in
// LeafletZoneMap.tsx (icon, zoom fade-in, popup, toggle). Adding a category:
// a generated data/map-pois/<category>.json, a lib/map-<category>.ts reader
// that maps it to MapPoi, a MapLayers key, a POI_ICON_ZOOM entry and an icon
// in lib/map-icons.ts, then flip its MARKER_CATEGORIES row to `layer`.
// Entrances keep their own path (proximity grouping, group popups, deep links).

export type PoiLayerKey = "flightMasters" | "towns";
export type PoiFaction = "Alliance" | "Horde" | "Both";

export type MapPoi = {
  id: string;
  layer: PoiLayerKey;
  name: string;
  kindLabel: string; // popup subtitle, e.g. "Horde flight master"
  faction: PoiFaction | null;
  worldPosition: { x: number; y: number };
  source: string;
};

// Sidebar rows, in display order. A row with `layer` is live (toggleable,
// counted); a row with `blockedReason` has no usable position data yet and
// renders greyed out with the reason as its tooltip -- never placeholder pins.
export type MarkerCategory = { label: string; section: "Layers" | "Points of interest" } & (
  | { layer: keyof MapLayers }
  | { blockedReason: string }
);

export const MARKER_CATEGORIES: MarkerCategory[] = [
  { section: "Layers", label: "Dungeons", layer: "dungeons" },
  { section: "Layers", label: "Raids", layer: "raids" },
  { section: "Layers", label: "Battlegrounds", layer: "battlegrounds" },
  { section: "Points of interest", label: "Towns & cities", layer: "towns" },
  { section: "Points of interest", label: "Flight masters", layer: "flightMasters" },
  {
    section: "Points of interest",
    label: "Town services",
    blockedReason:
      "No Forever position data yet: the beta client doesn't list innkeepers, repair vendors or other services, and Classic-era positions could be wrong for Forever.",
  },
  {
    section: "Points of interest",
    label: "Graveyards",
    blockedReason:
      "No Forever position data yet: the beta client doesn't list graveyards, and Classic-era positions could be wrong for Forever.",
  },
  {
    section: "Points of interest",
    label: "Rare elites",
    blockedReason: "No position data yet: Forever's rare elites are new spawns, so Classic-era positions would be wrong.",
  },
  {
    section: "Points of interest",
    label: "Library books",
    blockedReason: "No position data yet: library books are new in Forever and no source this site pulls has them.",
  },
  {
    section: "Points of interest",
    label: "Trade camps",
    blockedReason: "No position data yet: trade camps are new in Forever and the profession data has no map positions.",
  },
  {
    section: "Points of interest",
    label: "Boats & zeppelins",
    blockedReason: "No route data yet: boat and zeppelin routes need transport path data this site doesn't have.",
  },
];
