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
};

export const DEFAULT_MAP_LAYERS: MapLayers = {
  zoneBorders: true,
  zoneLabels: true,
  levelLines: true,
  dungeons: true,
  raids: true,
  battlegrounds: true,
  flightMasters: true,
};
