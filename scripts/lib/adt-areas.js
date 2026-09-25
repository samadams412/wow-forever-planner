// Reads per-chunk AreaId out of a root ADT file's 256 MCNK headers.
//
// Verified empirically against this project's own wow.export output before
// being trusted (see CLAUDE.md's "Zone areas from client ADTs" architecture
// note for the full verification, not just the summary here):
// - This build's root ADT files have NO MCIN offset table -- the 256 MCNK
//   chunks simply follow MHDR/MH2O sequentially, in row-major order
//   (chunk index i = localRow*16 + localCol). Confirmed by reading each
//   MCNK's own IndexX/IndexY header fields (offsets 0x04/0x08) and finding
//   they exactly match the chunk's position in the sequential list, for
//   every chunk checked.
// - AreaId lives at offset 0x34 into the MCNK header (the task's own
//   starting guess, confirmed correct): a known-Dun-Morogh tile
//   (azeroth_33_42.adt) reads AreaId 1 (Dun Morogh's own AreaTable id) for
//   every interior chunk, and a border chunk correctly reads 138 (Misty
//   Pine Refuge, AreaTable ParentAreaID 1 -- a real Dun Morogh subzone). A
//   known-Durotar tile (kalimdor_40_31.adt) reads AreaId 14 (Durotar) the
//   same way.
// - A stray MCIN chunk (an older/alternate offset-table layout) IS handled
//   defensively below even though this build never uses one, in case a
//   future export does -- cheap to support, and this project has already
//   been burned once by trusting "this build's format" without a fallback.

const fs = require("fs");

const MCNK_HEADER_AREA_ID_OFFSET = 0x34;
const CHUNKS_PER_TILE = 16;
const MCNK_COUNT = CHUNKS_PER_TILE * CHUNKS_PER_TILE;

function readTopLevelChunks(buf) {
  const chunks = [];
  let off = 0;
  while (off + 8 <= buf.length) {
    const magic = buf.toString("ascii", off, off + 4).split("").reverse().join("");
    const size = buf.readUInt32LE(off + 4);
    chunks.push({ magic, dataOffset: off + 8, size });
    off += 8 + size;
    if (size < 0 || off > buf.length) break; // corrupt/truncated -- stop rather than throw
  }
  return chunks;
}

// Returns a length-256 array of AreaIds, index = localRow*16+localCol, or
// null if the file doesn't look like a valid root ADT (missing/short MCNK
// set -- reported by the caller, not thrown, since a handful of edge tiles
// being unreadable shouldn't abort a whole continent's build).
function readAdtAreaIds(adtPath) {
  const buf = fs.readFileSync(adtPath);
  const chunks = readTopLevelChunks(buf);
  const mcin = chunks.find((c) => c.magic === "MCIN");
  const mcnkChunks = chunks.filter((c) => c.magic === "MCNK");

  let ordered;
  if (mcin) {
    // Legacy layout: MCIN gives {offset, size, flags, asyncId} per cell, in
    // row-major order already -- read AreaId directly from each offset
    // rather than trusting the sequential MCNK list's own order.
    ordered = [];
    for (let i = 0; i < MCNK_COUNT; i++) {
      const entryOff = mcin.dataOffset + i * 16;
      const mcnkOffset = buf.readUInt32LE(entryOff);
      ordered.push({ dataOffset: mcnkOffset + 8 });
    }
  } else {
    ordered = mcnkChunks;
  }

  if (ordered.length !== MCNK_COUNT) return null;

  const areaIds = new Uint16Array(MCNK_COUNT);
  for (let i = 0; i < MCNK_COUNT; i++) {
    areaIds[i] = buf.readUInt32LE(ordered[i].dataOffset + MCNK_HEADER_AREA_ID_OFFSET);
  }
  return areaIds;
}

module.exports = { readAdtAreaIds, readTopLevelChunks, CHUNKS_PER_TILE, MCNK_COUNT };
