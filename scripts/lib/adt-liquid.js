// Reads per-chunk MH2O liquid data (and, only where needed, MCVT terrain
// heights) out of a root ADT file, for the coastal-trim step of
// build-zone-areas.js (Step 2 -- distinct from Step 1's name-based ocean
// AreaId exclusion, see data/map-ocean-areas.json).
//
// Verified empirically against this project's own wow.export output before
// being trusted, same discipline as scripts/lib/adt-areas.js:
// - MH2O is a top-level chunk (found via readTopLevelChunks, same as
//   MCNK) holding a 256-entry header array (12 bytes each: offsetInstances,
//   layerCount, offsetAttributes -- all relative to the MH2O chunk's own
//   data start), one entry per MCNK in the same localRow*16+localCol order.
//   Confirmed the instance struct is exactly 24 bytes by checking two
//   adjacent single-layer chunks in a real tile: chunk[1].offsetInstances -
//   chunk[0].offsetInstances == 24 when chunk[0] has layerCount 1.
// - SMLiquidInstance: uint16 liquidType, uint16 (unused here -- a
//   liquidObject/vertex-format id, not needed for ocean-vs-not), float
//   minHeightLevel, float maxHeightLevel, then 4 bytes offset/dims + 2
//   uint32 sub-chunk offsets this code doesn't need.
// - This build's exporter does NOT populate the MCNK header's own
//   sub-chunk offset fields (ofsHeight reads back 0 on every real chunk
//   checked) -- same "no real offset table, subchunks just laid out
//   sequentially" pattern already found for the outer ADT (no MCIN) and
//   documented in adt-areas.js. MCVT is instead located by scanning
//   sequentially from right after the 128-byte MCNK header, which is where
//   it was found on every sample checked (immediately following the
//   header, with a real MCVT magic + 580-byte size = 145 float32s).
// - The MCNK header's C3Vector position (x, y, z) DOES read correctly at a
//   fixed offset (0x68 from the MCNK's own data start): position.x/y were
//   checked against this project's own chunkRowToWorldX/chunkColToWorldY
//   formula and matched exactly (to the float) across 8 sampled chunks on
//   2 different tiles. position.z is the chunk's base height -- MCVT's 145
//   values are height deltas relative to it, confirmed by the Dun Morogh/
//   Loch Modan sample heights coming out at plausible real-world Z values
//   only once added to position.z, not on their own.
// - Empirically discovered ocean liquidType for build 1.60.1.70009: 1250,
//   found by cross-referencing several of data/map-ocean-areas.json's own
//   Step-1 ocean-administrative cells (both continents) against their real
//   MH2O liquidType -- every one sampled read 1250 at height 0 (WoW's
//   canonical global sea level). Loch Modan's lake, by contrast, reads a
//   different liquidType (1325) at its own basin height (~297). This
//   module does NOT hardcode 1250 -- build-zone-areas.js discovers it at
//   run time from the Step-1 cells and passes it in, so a future client
//   build that renumbers LiquidType ids doesn't silently mis-trim.

const fs = require("fs");
const { readTopLevelChunks, CHUNKS_PER_TILE, MCNK_COUNT } = require("./adt-areas");

const MCNK_HEADER_SIZE = 128;
const MCNK_POSITION_OFFSET = 0x68; // C3Vector x,y,z
const MH2O_INSTANCE_SIZE = 24;

function findSubchunk(buf, start, end, wantMagic) {
  let off = start;
  while (off + 8 <= end) {
    const magic = buf.toString("ascii", off, off + 4).split("").reverse().join("");
    const size = buf.readUInt32LE(off + 4);
    if (magic === wantMagic) return { dataOffset: off + 8, size };
    off += 8 + size;
    if (size < 0 || off > end) break;
  }
  return null;
}

function readTerrainMaxHeight(buf, mcnk, posZ) {
  const mcvt = findSubchunk(buf, mcnk.dataOffset + MCNK_HEADER_SIZE, mcnk.dataOffset + mcnk.size, "MCVT");
  if (!mcvt || mcvt.size < 145 * 4) return posZ; // no heightmap found -- fall back to the chunk's own base height
  let max = -Infinity;
  for (let i = 0; i < 145; i++) {
    const h = buf.readFloatLE(mcvt.dataOffset + i * 4);
    if (h > max) max = h;
  }
  return posZ + max;
}

// Returns null if this isn't a readable 256-MCNK root ADT (mirrors
// adt-areas.js's own bail-out -- caller should treat it the same way, i.e.
// as "no liquid data available", not a hard error). Otherwise returns a
// length-256 array, index = localRow*16+localCol (same convention as
// readAdtAreaIds), where each entry is either null (no MH2O liquid at all
// in that chunk) or { layers: [{liquidType, minH, maxH}, ...],
// terrainMaxHeight }. terrainMaxHeight is only ever computed (reading
// MCVT) for a chunk that has at least one liquid layer, since it's never
// used otherwise.
function readAdtLiquidInfo(adtPath) {
  const buf = fs.readFileSync(adtPath);
  const chunks = readTopLevelChunks(buf);
  const mcnkChunks = chunks.filter((c) => c.magic === "MCNK");
  const mh2o = chunks.find((c) => c.magic === "MH2O");
  if (mcnkChunks.length !== MCNK_COUNT) return null;
  if (!mh2o) return new Array(MCNK_COUNT).fill(null);

  const result = new Array(MCNK_COUNT).fill(null);
  for (let i = 0; i < MCNK_COUNT; i++) {
    const entryOff = mh2o.dataOffset + i * 12;
    const offsetInstances = buf.readUInt32LE(entryOff);
    const layerCount = buf.readUInt32LE(entryOff + 4);
    if (!layerCount || !offsetInstances) continue;
    const layers = [];
    for (let L = 0; L < layerCount; L++) {
      const instOff = mh2o.dataOffset + offsetInstances + L * MH2O_INSTANCE_SIZE;
      layers.push({
        liquidType: buf.readUInt16LE(instOff + 0),
        minH: buf.readFloatLE(instOff + 4),
        maxH: buf.readFloatLE(instOff + 8),
      });
    }
    const mcnk = mcnkChunks[i];
    const posZ = buf.readFloatLE(mcnk.dataOffset + MCNK_POSITION_OFFSET + 8);
    result[i] = { layers, terrainMaxHeight: readTerrainMaxHeight(buf, mcnk, posZ) };
  }
  return result;
}

module.exports = { readAdtLiquidInfo, CHUNKS_PER_TILE };
