import fs from "fs";
import path from "path";

type MapMeta = {
  cropOrigin: { left: number; top: number };
  cropSize: number;
  tileSize: number;
  maxNativeZoom: number;
  sourceCorners: {
    top_left: { world_x: number; world_y: number };
    bottom_right: { world_x: number; world_y: number };
  };
  sourceImage: { width: number; height: number };
};

const cache = new Map<string, MapMeta>();

function loadMeta(mapName: string): MapMeta {
  const cached = cache.get(mapName);
  if (cached) return cached;
  const file = path.join(process.cwd(), "public", "map", mapName, "meta.json");
  const meta = JSON.parse(fs.readFileSync(file, "utf8")) as MapMeta;
  cache.set(mapName, meta);
  return meta;
}

// Converts a real WoW world coordinate to a [lat, lng] pair in this crop's
// own zoom-0 pixel space, for use as a Leaflet LatLng with CRS.Simple.
// See scripts/slice-map-tiles.js's own header comment for the world<->pixel
// axis convention this depends on (wow.export's image axes are swapped
// relative to the game's own world_x/world_y).
//
// The `lat` component is negated on purpose: L.CRS.Simple's default
// transformation is `point.y = -lat`, so feeding it a plain top-down pixel
// Y (0 at top, increasing downward, matching both this crop's own pixel
// space and the tile files' own row numbering) makes Leaflet request tiles
// at negative row indices -- confirmed live (404s for rows -1/-2 against a
// pyramid that only has rows 0/1). Negating here cancels that flip out
// rather than fighting CRS.Simple's own convention or renaming tiles.
export function worldToZone0LatLng(mapName: string, worldX: number, worldY: number): [number, number] {
  const meta = loadMeta(mapName);
  const { top_left, bottom_right } = meta.sourceCorners;
  const fracX = (worldY - top_left.world_y) / (bottom_right.world_y - top_left.world_y);
  const fracY = (worldX - top_left.world_x) / (bottom_right.world_x - top_left.world_x);
  const fullPixelX = fracX * meta.sourceImage.width;
  const fullPixelY = fracY * meta.sourceImage.height;
  const cropPixelX = fullPixelX - meta.cropOrigin.left;
  const cropPixelY = fullPixelY - meta.cropOrigin.top;
  const scale = Math.pow(2, meta.maxNativeZoom); // native-res crop pixels -> zoom-0-res pixels
  return [-(cropPixelY / scale), cropPixelX / scale]; // Leaflet LatLng order is [y, x]
}

export function getZone0Bounds(mapName: string): [[number, number], [number, number]] {
  const meta = loadMeta(mapName);
  const zone0Size = meta.cropSize / Math.pow(2, meta.maxNativeZoom);
  return [
    [0, 0],
    [-zone0Size, zone0Size],
  ];
}

export function getMapTileConfig(mapName: string): { maxNativeZoom: number; tileSize: number } {
  const meta = loadMeta(mapName);
  return { maxNativeZoom: meta.maxNativeZoom, tileSize: meta.tileSize };
}
