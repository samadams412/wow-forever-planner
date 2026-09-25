import fs from "fs";
import path from "path";
import { worldToLatLng, type FullGridCorners } from "./map-coords";

export type ContinentMapConfig = {
  id: string;
  name: string;
  tileUrlTemplate: string;
  tileSize: number;
  gridSize: number;
  bounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  fullGridCorners: FullGridCorners;
  defaultCenter: [number, number];
  defaultZoom: number;
};

// Continents registered for /reference/map/[continent]. Both now have real
// tiles generated (see scripts/slice-map-tiles.js).
const REGISTERED_CONTINENTS = ["eastern-kingdoms", "kalimdor"];

type ContinentMeta = {
  mapId: number;
  mapDir: string;
  mapName: string;
  tileSize: number;
  gridSize: number;
  nativeZoom: number;
  adtWorldSize: number;
  populated: { minCol: number; maxCol: number; minRow: number; maxRow: number };
  fullGridCorners: FullGridCorners;
};

const cache = new Map<string, ContinentMeta>();

function loadMeta(continentId: string): ContinentMeta {
  const cached = cache.get(continentId);
  if (cached) return cached;
  const file = path.join(process.cwd(), "public", "map", continentId, "meta.json");
  const meta = JSON.parse(fs.readFileSync(file, "utf8")) as ContinentMeta;
  cache.set(continentId, meta);
  return meta;
}

export function isRegisteredContinent(id: string): id is (typeof REGISTERED_CONTINENTS)[number] {
  return REGISTERED_CONTINENTS.includes(id);
}

export function getRegisteredContinentIds(): string[] {
  return REGISTERED_CONTINENTS;
}

// {id, name} for every registered continent, for the continent switcher --
// reads each one's own meta.json for its display name rather than
// hand-typing it a second time. Skips (rather than throws on) a continent
// whose meta.json isn't there yet -- e.g. mid-tiling-run -- so one
// continent's own page doesn't break while another is still being
// generated; a "registered" continent is still expected to have real tiles
// by the time anyone should be looking at it normally.
export function getRegisteredContinents(): { id: string; name: string }[] {
  return REGISTERED_CONTINENTS.flatMap((id) => {
    try {
      return [{ id, name: loadMeta(id).mapName }];
    } catch {
      return [];
    }
  });
}

// Converts a real WoW world coordinate to a Leaflet LatLng for this
// continent. See CLAUDE.md's world-map architecture note for the axis-swap
// reasoning (wow.export's image axes are rotated relative to the game's
// own world_x/world_y). The actual math lives in lib/map-coords.ts (no
// Node-only imports), shared with the client-side reverse conversion used
// to write the URL-hash view state -- see LeafletZoneMap.tsx.
export function worldToContinentLatLng(continentId: string, worldX: number, worldY: number): [number, number] {
  const meta = loadMeta(continentId);
  return worldToLatLng(meta.fullGridCorners, meta.gridSize, meta.tileSize, meta.nativeZoom, worldX, worldY);
}

export function getContinentMapConfig(continentId: string): ContinentMapConfig {
  const meta = loadMeta(continentId);
  const { minCol, maxCol, minRow, maxRow } = meta.populated;

  // Bounds cover just the populated tile range (not the full 64x64 grid,
  // most of which has no tiles at all) -- this is what actually stops
  // panning into the empty void past the continent's own edge, via
  // maxBounds in components/map/LeafletZoneMap.tsx. Both corners go
  // through the exact same worldToLatLng-backed conversion used for world
  // coordinates (via native pixel positions), so there's no separate
  // sign-convention path to get wrong.
  const scale = Math.pow(2, meta.nativeZoom);
  const toLatLng = (col: number, row: number): [number, number] => [
    -((row * meta.tileSize) / scale),
    (col * meta.tileSize) / scale,
  ];
  const corner1 = toLatLng(minCol, minRow);
  const corner2 = toLatLng(maxCol + 1, maxRow + 1);
  const bounds: [[number, number], [number, number]] = [corner1, corner2];

  const centerLat = (corner1[0] + corner2[0]) / 2;
  const centerLng = (corner1[1] + corner2[1]) / 2;

  // Default zoom: the level at which the populated area's larger dimension
  // is roughly TARGET_PX on screen -- a reasonable "see the whole
  // continent clearly" starting view, not a pixel-perfect fit (the
  // component's own container is responsive, not a fixed size). Not
  // actually consumed by LeafletZoneMap.tsx (it uses fitBounds instead --
  // see CLAUDE.md), kept for anything that wants a plain numeric default.
  const widthUnits = Math.abs(corner2[1] - corner1[1]);
  const heightUnits = Math.abs(corner2[0] - corner1[0]);
  const TARGET_PX = 900;
  const rawZoom = Math.log2(TARGET_PX / Math.max(widthUnits, heightUnits));
  const defaultZoom = Math.min(meta.nativeZoom, Math.max(0, Math.round(rawZoom)));

  return {
    id: continentId,
    name: meta.mapName,
    tileUrlTemplate: `/map/${continentId}/tiles/{z}/{x}_{y}.webp`,
    tileSize: meta.tileSize,
    gridSize: meta.gridSize,
    bounds,
    minZoom: 0,
    // The map's own overzoom ceiling (nativeZoom + 2) is a LeafletZoneMap.tsx
    // concern, not this config's -- this stays the *tile* pyramid's real
    // depth, matching TileLayer's own maxNativeZoom option.
    maxZoom: meta.nativeZoom,
    fullGridCorners: meta.fullGridCorners,
    defaultCenter: [centerLat, centerLng],
    defaultZoom,
  };
}
