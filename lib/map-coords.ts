// Pure world<->LatLng math for the continent map, with no Node-only
// imports (no `fs`) -- shared between lib/map-continents.ts (server, reads
// meta.json) and components/map/LeafletZoneMap.tsx (client, needs the same
// conversion in reverse to write the URL-hash view state from live pan/zoom
// events). Splitting this out is deliberate: this project has already hit
// several real coordinate-math bugs from having the "same" formula written
// in more than one place with a subtle difference -- one copy, used both
// directions, is the point.
//
// See CLAUDE.md's world-map architecture note for the two conventions this
// encodes: wow.export's image axes are swapped relative to the game's own
// world_x/world_y, and L.CRS.Simple negates `lat` by default.

export type FullGridCorners = {
  top_left: { world_x: number; world_y: number };
  bottom_right: { world_x: number; world_y: number };
};

// A native (z = nativeZoom) pixel position -> Leaflet [lat, lng] in this
// continent's own zoom-0-equivalent space.
export function nativePixelToLatLng(nativeZoom: number, nativePixelX: number, nativePixelY: number): [number, number] {
  const scale = Math.pow(2, nativeZoom);
  return [-(nativePixelY / scale), nativePixelX / scale];
}

// Inverse of the above -- a Leaflet [lat, lng] -> native pixel position.
export function latLngToNativePixel(nativeZoom: number, lat: number, lng: number): { x: number; y: number } {
  const scale = Math.pow(2, nativeZoom);
  return { x: lng * scale, y: -lat * scale };
}

// A real WoW world coordinate -> Leaflet [lat, lng] for this continent.
export function worldToLatLng(
  corners: FullGridCorners,
  gridSize: number,
  tileSize: number,
  nativeZoom: number,
  worldX: number,
  worldY: number
): [number, number] {
  const { top_left, bottom_right } = corners;
  const fracX = (worldY - top_left.world_y) / (bottom_right.world_y - top_left.world_y);
  const fracY = (worldX - top_left.world_x) / (bottom_right.world_x - top_left.world_x);
  const nativePixelX = fracX * gridSize * tileSize;
  const nativePixelY = fracY * gridSize * tileSize;
  return nativePixelToLatLng(nativeZoom, nativePixelX, nativePixelY);
}

// Inverse of the above -- a Leaflet [lat, lng] -> real WoW world coordinate.
// Used to write the URL-hash view state from the map's current center.
export function latLngToWorld(
  corners: FullGridCorners,
  gridSize: number,
  tileSize: number,
  nativeZoom: number,
  lat: number,
  lng: number
): { worldX: number; worldY: number } {
  const { top_left, bottom_right } = corners;
  const { x: nativePixelX, y: nativePixelY } = latLngToNativePixel(nativeZoom, lat, lng);
  const fracX = nativePixelX / (gridSize * tileSize);
  const fracY = nativePixelY / (gridSize * tileSize);
  const worldY = top_left.world_y + fracX * (bottom_right.world_y - top_left.world_y);
  const worldX = top_left.world_x + fracY * (bottom_right.world_x - top_left.world_x);
  return { worldX, worldY };
}
