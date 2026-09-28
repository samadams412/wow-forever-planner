// Area lookup: resolves a world (x, y) point to a subzone/zone id, from the
// compact per-continent grid scripts/build-zone-areas.js ships alongside
// zone-areas.json -- see that script's own writeSubzoneGrid() comment for
// the exact pipeline (the same ocean-cleaned, 7c-connectivity-fixed grid
// zone-areas.json is traced from, kept at subzone resolution instead of
// rolled up to the top-level zone) and file format (row-major RLE, 6-byte
// [uint16 value, uint32 runLength] pairs).
//
// A cell whose raw AreaId is ALREADY a registered top-level zone (no finer
// subzone at that point) has no entry in subzone-names.json at all -- see
// that file's own build-time comment. This module surfaces that case as
// `subzoneId: null, subzoneName: null, zoneId: <that id>`; the caller
// cross-references `zoneId` against the zone data it already has loaded
// (lib/zone-areas.ts) rather than this module duplicating zone name/level/
// faction data it has no need to know about.

const GRID_SIZE = 64; // ADT tiles per side of the global grid
const CHUNKS_PER_TILE = 16;
const ADT_WORLD_SIZE = 1600 / 3; // 533.3333... world units per ADT tile
const TOTAL_CHUNKS = GRID_SIZE * CHUNKS_PER_TILE; // 1024 -- matches scripts/lib/chunk-grid-coords.js

export type AreaLookupResult = {
  subzoneId: number | null;
  subzoneName: string | null;
  zoneId: number;
  // 0 when the subzone doesn't override its zone's own faction (the
  // overwhelmingly common case) -- 2/4 (Alliance/Horde) for the handful of
  // subzones that do (a faction outpost inside an otherwise contested
  // zone). null when there's no subzone at all (rawId already a zone).
  subzoneFactionMask: number | null;
};

type NamesMap = Record<string, { name: string; zoneId: number; factionMask: number }>;

const gridPromises = new Map<string, Promise<Uint16Array>>();
const loadedGrids = new Map<string, Uint16Array>();
let namesPromise: Promise<NamesMap> | null = null;
let loadedNames: NamesMap | null = null;

function decodeRle(buf: ArrayBuffer): Uint16Array {
  const view = new DataView(buf);
  const out = new Uint16Array(TOTAL_CHUNKS * TOTAL_CHUNKS);
  let outIdx = 0;
  for (let offset = 0; offset < buf.byteLength; offset += 6) {
    const value = view.getUint16(offset, true);
    const length = view.getUint32(offset + 2, true);
    out.fill(value, outIdx, outIdx + length);
    outIdx += length;
  }
  return out;
}

function loadGrid(continentId: string): Promise<Uint16Array> {
  let p = gridPromises.get(continentId);
  if (!p) {
    p = fetch(`/map/${continentId}/subzone-grid.bin`)
      .then((r) => r.arrayBuffer())
      .then(decodeRle);
    gridPromises.set(continentId, p);
  }
  return p;
}

function loadNames(): Promise<NamesMap> {
  if (!namesPromise) {
    namesPromise = fetch("/map/subzone-names.json").then((r) => r.json());
  }
  return namesPromise;
}

// Kicks off both fetches (idempotent -- safe to call every time the map
// mounts) and caches the decoded results for the synchronous lookupArea()
// below. Call once on mount, well before the first click/mousemove that
// needs a real answer; lookupArea() simply returns null until this
// resolves, which the cursor readout treats as "nothing to show yet" and
// the click popup awaits directly.
export function preloadSubzoneLookup(continentId: string): Promise<void> {
  return Promise.all([
    loadGrid(continentId).then((g) => {
      loadedGrids.set(continentId, g);
    }),
    loadNames().then((n) => {
      loadedNames = n;
    }),
  ]).then(() => undefined);
}

// Synchronous by design -- the cursor readout calls this on every
// (throttled) mousemove tick and can't await a promise there without
// introducing out-of-order-resolution flicker on fast mouse movement.
// Returns null both for "no data at this point" (open sea/void, or not
// preloaded yet) and "out of grid bounds" -- callers don't need to tell
// these apart (a click on open sea should show nothing either way).
export function lookupArea(continentId: string, worldX: number, worldY: number): AreaLookupResult | null {
  const grid = loadedGrids.get(continentId);
  if (!grid || !loadedNames) return null;

  // Same axis-swap convention as scripts/lib/chunk-grid-coords.js's
  // worldXToChunkRow/worldYToChunkCol (world_x -> row, world_y -> col),
  // inlined here since lib/ (TS, consumed by Next) and scripts/ (plain
  // CommonJS) aren't wired to import from each other -- see that file's
  // own header comment for why, and CLAUDE.md's world-map coordinate note.
  const row = Math.floor((GRID_SIZE / 2 - worldX / ADT_WORLD_SIZE) * CHUNKS_PER_TILE);
  const col = Math.floor((GRID_SIZE / 2 - worldY / ADT_WORLD_SIZE) * CHUNKS_PER_TILE);
  if (row < 0 || row >= TOTAL_CHUNKS || col < 0 || col >= TOTAL_CHUNKS) return null;

  const rawId = grid[row * TOTAL_CHUNKS + col];
  if (rawId === 0) return null;

  const entry = loadedNames[rawId];
  if (entry) return { subzoneId: rawId, subzoneName: entry.name, zoneId: entry.zoneId, subzoneFactionMask: entry.factionMask || null };
  // Not in subzone-names.json: either rawId already IS a registered zone
  // (the overwhelmingly common case), or it's one of the rare dead-end ids
  // build time logged and omitted -- either way, the caller's own zones
  // data is the source of truth for whether `rawId` is real; it isn't this
  // module's job to know.
  return { subzoneId: null, subzoneName: null, zoneId: rawId, subzoneFactionMask: null };
}
