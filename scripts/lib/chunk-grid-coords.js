// World-coordinate conversion for the 1024x1024 (64 ADTs x 16 chunks) zone
// grid built by build-zone-grid.js. Deliberately NOT derived through
// lib/map-coords.ts's image-pixel-corner math (that module bridges
// wow.export's stitched TILE IMAGE pixels <-> world coordinates, and this
// project's scripts/ are plain CommonJS while lib/ is TypeScript consumed by
// Next -- importing one from the other isn't set up anywhere in this repo).
// Instead this uses the single more fundamental relationship every one of
// those image corners was already cross-checked against in an earlier
// session (slice-map-tiles.js's own "full-grid corner sanity check", which
// asserts exactly ±(GRID_SIZE/2)*ADT_WORLD_SIZE = ±17066.667 on both axes):
// the ADT grid is centered on the world origin, 64 tiles (533.3333 world
// units each) per side.
//
// This still respects the SAME axis-swap convention documented in
// lib/map-coords.ts and CLAUDE.md's world-map architecture note (WoW's own
// world_x is north/row-like, world_y is west/column-like -- rotated from the
// image's own horizontal/vertical axes): a chunk's COLUMN position maps to
// worldY, its ROW position maps to worldX. Verified directly against this
// project's own zones.json rather than assumed: Dun Morogh's real
// worldBounds (from UiMapAssignment.Region, an independent source) fall
// exactly at chunk columns ~917-1093 / rows ~458-556 by this formula, which
// is precisely the tile range this same session found containing AreaId 1
// (Dun Morogh) when scanning real ADTs -- see the "Zone areas from client
// ADTs" CLAUDE.md note for the cross-check.

const GRID_SIZE = 64; // ADT tiles per side of the global grid
const CHUNKS_PER_TILE = 16;
const ADT_WORLD_SIZE = 1600 / 3; // 533.3333... -- one ADT tile, in world units
const CHUNK_WORLD_SIZE = ADT_WORLD_SIZE / CHUNKS_PER_TILE; // 33.3333... per chunk
const TOTAL_CHUNKS = GRID_SIZE * CHUNKS_PER_TILE; // 1024

// World Y at the given fractional chunk-column position (0..1024, left edge
// of chunk `gCol` is gCol, right edge is gCol+1).
function chunkColToWorldY(gCol) {
  return (GRID_SIZE / 2 - gCol / CHUNKS_PER_TILE) * ADT_WORLD_SIZE;
}

// World X at the given fractional chunk-row position (0..1024, top edge of
// chunk `gRow` is gRow, bottom edge is gRow+1).
function chunkRowToWorldX(gRow) {
  return (GRID_SIZE / 2 - gRow / CHUNKS_PER_TILE) * ADT_WORLD_SIZE;
}

// Inverse of chunkColToWorldY -- the fractional chunk-column position for a
// given worldY (not rounded/floored; callers decide how to snap to a cell).
function worldYToChunkCol(worldY) {
  return (GRID_SIZE / 2 - worldY / ADT_WORLD_SIZE) * CHUNKS_PER_TILE;
}

// Inverse of chunkRowToWorldX.
function worldXToChunkRow(worldX) {
  return (GRID_SIZE / 2 - worldX / ADT_WORLD_SIZE) * CHUNKS_PER_TILE;
}

module.exports = {
  GRID_SIZE,
  CHUNKS_PER_TILE,
  ADT_WORLD_SIZE,
  CHUNK_WORLD_SIZE,
  TOTAL_CHUNKS,
  chunkColToWorldY,
  chunkRowToWorldX,
  worldYToChunkCol,
  worldXToChunkRow,
};
