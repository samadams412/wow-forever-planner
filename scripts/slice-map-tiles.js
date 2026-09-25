#!/usr/bin/env node
// Builds a full-continent Leaflet-compatible tile pyramid from wow.export
// continent map exports (see CLAUDE.md's world-map architecture note for
// full background). Output is LOCAL ONLY -- public/map/<continent>/tiles/
// is gitignored; only public/map/<continent>/meta.json is committed. Run
// this again any time the source exports change; nothing here depends on
// prior output except the pyramid-building step, which reads its own
// previous zoom level (see buildLowerLevels).
//
// Usage: node scripts/slice-map-tiles.js <continent>
//   node scripts/slice-map-tiles.js eastern-kingdoms
//   node scripts/slice-map-tiles.js kalimdor   (not run yet -- see CLAUDE.md)
//
// ── Coordinate system ──────────────────────────────────────────────────
// wow.export's image axes are swapped relative to the game's own
// world_x/world_y (WoW's engine has +X as north/row, +Y as west/column,
// rotated from the image's own horizontal/vertical axes) -- confirmed
// exactly via tile-count arithmetic and visually against real terrain, see
// CLAUDE.md. pixel-x comes from world_y against the sidecar's world_y
// corners; pixel-y from world_x against the world_x corners.
//
// Tiles are addressed by GLOBAL ADT grid coordinates (0-63 on each axis --
// WoW's fixed per-continent tile grid), not by position within whichever
// source image happens to cover them: global col/row = sourceMeta.tiles.
// min_x/min_y + the tile's local position in that source image. This is
// what lets multiple source images (Kalimdor's two halves) contribute
// tiles to the same coordinate space without ever being merged into one
// file, and what makes the pyramid a standard z/x/y scheme where zoom z
// has exactly 2^z tiles per side -- z6 (native, 512px tiles) lines up
// exactly with the real 64x64 ADT grid (2^6 = 64).
//
// ── Pyramid construction ───────────────────────────────────────────────
// z6 (native) tiles are sliced directly from the source image(s), one
// sharp() pipeline decoded per source (not per tile -- see sliceNativeLevel).
// Every level below (z5..z0) is built ONLY from the level above's ALREADY-
// WRITTEN output tiles, never re-derived from the source images -- required
// because Kalimdor's two halves stop lining up on parent-tile boundaries a
// few levels down (533.333-world-unit tiles don't factor evenly against an
// arbitrary two-way split), so combining from the source at a coarse level
// could straddle both halves incorrectly. Combining from the tile tree
// sidesteps that: each parent is just "whatever children exist, composited,
// downsampled" regardless of which source(s) they originally came from.
// A parent with zero existing children is not created; a parent with 1-3
// (of a possible 4) is created with the missing quadrant(s) left transparent.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const TILE_SIZE = 512;
const GRID_SIZE = 64; // WoW's fixed per-continent ADT grid (0-63 each axis)
const NATIVE_ZOOM = 6; // 2^6 = 64 -- z6 tiles are 1:1 with real ADT tiles
const ADT_WORLD_SIZE = 1600 / 3; // 533.333... world units per ADT tile (engine constant)

// Per-continent source config. Source exports are large (100-250MB+) and
// live outside the repo entirely on the machine that ran wow.export -- see
// CLAUDE.md, never committed. Update these paths if re-exported elsewhere.
const CONTINENTS = {
  "eastern-kingdoms": {
    mapId: 0,
    mapDir: "azeroth",
    mapName: "Eastern Kingdoms",
    sources: [
      {
        png: "C:/Users/samue/wow.export/maps/azeroth/eastern_kingdoms_forever/azeroth_ec7b93ee.png",
        json: "C:/Users/samue/wow.export/maps/azeroth/eastern_kingdoms_forever/azeroth_ec7b93ee.json",
      },
    ],
  },
  kalimdor: {
    mapId: 1,
    mapDir: "kalimdor",
    mapName: "Kalimdor",
    sources: [
      {
        // ~514M px, above sharp's default limitInputPixels (~268M) --
        // every source is opened with limitInputPixels:false below.
        png: "C:/Users/samue/wow.export/maps/azeroth/kalimdor_forever/kalimdor_top_half_e750bc91.png",
        json: "C:/Users/samue/wow.export/maps/azeroth/kalimdor_forever/kalimdor_e750bc91.json",
      },
      {
        png: "C:/Users/samue/wow.export/maps/azeroth/kalimdor_forever/kalimdor_bottom_half_8bf8e9c5.png",
        json: "C:/Users/samue/wow.export/maps/azeroth/kalimdor_forever/kalimdor_8bf8e9c5.json",
      },
    ],
  },
};

function outDirFor(continentId) {
  return path.join(__dirname, "..", "public", "map", continentId);
}

// ── Memory tracking (for reporting peak RSS -- process.resourceUsage()'s
// maxRSS isn't populated on Windows, so sample process.memoryUsage() on an
// interval instead, which works cross-platform). ─────────────────────────
function startMemoryTracking() {
  let peak = 0;
  const timer = setInterval(() => {
    const rss = process.memoryUsage().rss;
    if (rss > peak) peak = rss;
  }, 250);
  timer.unref();
  return { stop: () => clearInterval(timer), peak: () => peak };
}

// ── Native level (z6): slice directly from the source image(s) ──────────
async function sliceNativeLevel(continentId, source) {
  const sourceMeta = JSON.parse(fs.readFileSync(source.json, "utf8"));
  const { min_x, min_y, wide, high } = sourceMeta.tiles;
  const dir = path.join(outDirFor(continentId), "tiles", String(NATIVE_ZOOM));
  fs.mkdirSync(dir, { recursive: true });

  // limitInputPixels:false -- required for Kalimdor's ~514M px halves;
  // harmless for Eastern Kingdoms' ~253M px (already under the default
  // ~268M limit, confirmed by this file's own successful proof-of-concept
  // crop earlier). sequentialRead:true matches this function's own access
  // pattern (row-major, top-to-bottom, matching the source file's own
  // scanline order) -- avoids libvips needing full random-access caching
  // of a 100-250MB+ image.
  const image = sharp(source.png, { limitInputPixels: false, sequentialRead: true });
  const metadata = await image.metadata();
  if (metadata.width !== wide * TILE_SIZE || metadata.height !== high * TILE_SIZE) {
    throw new Error(
      `${source.png}: image is ${metadata.width}x${metadata.height}, expected ${wide * TILE_SIZE}x${high * TILE_SIZE} from its own JSON's tile grid`
    );
  }

  let written = 0;
  let skipped = 0;
  for (let row = 0; row < high; row++) {
    for (let col = 0; col < wide; col++) {
      const region = { left: col * TILE_SIZE, top: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
      // One extract+encode per tile, reused for both the emptiness check
      // and the file write (not two separate passes). Wrapping the result
      // in a fresh sharp(buffer) for .stats() is required: .stats()
      // chained directly onto .clone().extract(...) was found to silently
      // ignore the extract and return whole-image stats instead (verified
      // live -- two extracts of visibly different, far-apart regions
      // produced byte-identical .stats() output; re-wrapping the encoded
      // buffer in a new sharp() instance fixed it). This is a real sharp/
      // libvips quirk, not a guess.
      const buffer = await image.clone().extract(region).webp({ quality: 85 }).toBuffer();
      const stats = await sharp(buffer).stats();
      const alpha = stats.channels[3];
      // Confirmed live: "no data" areas in wow.export's own PNG export are
      // fully transparent RGBA(0,0,0,0), not solid black -- a corner tile
      // known to be void (the bounding box's own top-left, outside any
      // real landmass) came back as flat 0/0/0/0 across all four channels,
      // vs. a populated tile's varied RGB and opaque (max) alpha.
      const isEmpty = alpha && alpha.max === 0;
      if (isEmpty) {
        skipped++;
        continue;
      }
      const globalCol = min_x + col;
      const globalRow = min_y + row;
      fs.writeFileSync(path.join(dir, `${globalCol}_${globalRow}.webp`), buffer);
      written++;
    }
  }
  return { written, skipped };
}

// ── Lower levels (z5..z0): combine 2x2 children from the OUTPUT tree ────
async function buildLowerLevels(continentId) {
  const results = [];
  for (let childZoom = NATIVE_ZOOM; childZoom > 0; childZoom--) {
    const parentZoom = childZoom - 1;
    const childDir = path.join(outDirFor(continentId), "tiles", String(childZoom));
    const parentDir = path.join(outDirFor(continentId), "tiles", String(parentZoom));
    fs.mkdirSync(parentDir, { recursive: true });

    const childFiles = fs.existsSync(childDir) ? fs.readdirSync(childDir).filter((f) => f.endsWith(".webp")) : [];
    const parents = new Map(); // "pc_pr" -> [{ file, dx, dy }, ...] (1-4 children)
    for (const file of childFiles) {
      const [colStr, rowStr] = file.replace(/\.webp$/, "").split("_");
      const col = Number(colStr);
      const row = Number(rowStr);
      const pc = Math.floor(col / 2);
      const pr = Math.floor(row / 2);
      const key = `${pc}_${pr}`;
      if (!parents.has(key)) parents.set(key, []);
      parents.get(key).push({ file: path.join(childDir, file), dx: (col % 2) * TILE_SIZE, dy: (row % 2) * TILE_SIZE });
    }

    let written = 0;
    let blankSkipped = 0;
    for (const [key, children] of parents) {
      const [pc, pr] = key.split("_").map(Number);
      // Blank (fully transparent) canvas -- missing quadrants (a child
      // that doesn't exist) simply never get composited over, so they stay
      // transparent in the output, per spec.
      //
      // Composite is materialized to a real buffer, THEN re-wrapped in a
      // fresh sharp() instance for resize+encode -- chaining .resize()
      // directly after .composite() in one pipeline was found to silently
      // drop any child NOT positioned at (0,0): verified live by
      // compositing a single known-real tile at left:512 and comparing
      // with/without an immediate .resize() in the same chain -- content
      // was present pre-resize (confirmed by extracting just that region)
      // and gone after, every time, for any non-origin offset. Same
      // category of bug as sliceNativeLevel's .stats() quirk elsewhere in
      // this file: don't trust a second pixel-reading/transforming
      // operation chained directly onto an in-progress pipeline in this
      // sharp version -- materialize first.
      const composited = await sharp({
        create: { width: TILE_SIZE * 2, height: TILE_SIZE * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .composite(children.map((c) => ({ input: c.file, left: c.dx, top: c.dy })))
        .png()
        .toBuffer();
      const buffer = await sharp(composited).resize(TILE_SIZE, TILE_SIZE).webp({ quality: 85 }).toBuffer();
      // Belt-and-suspenders: a parent whose only existing children turned
      // out to be blank-but-still-written tiles (shouldn't happen now that
      // every level checks this, but this guard is what would have caught
      // the resize bug above even without noticing it directly) never gets
      // written as a real file either.
      const stats = await sharp(buffer).stats();
      const isBlank = stats.channels.every((c) => c.max === 0);
      if (isBlank) {
        blankSkipped++;
        continue;
      }
      fs.writeFileSync(path.join(parentDir, `${pc}_${pr}.webp`), buffer);
      written++;
    }
    if (blankSkipped > 0) console.log(`  z${parentZoom}: ${blankSkipped} composited-but-blank parent(s) skipped`);
    results.push({ zoom: parentZoom, tiles: written });
  }
  return results;
}

// ── meta.json: the full 64x64 grid's own world-coordinate bounds, not
// just the populated sub-rectangle a single source happens to cover -- so
// the app can convert any world coordinate straight to a global tile
// position without needing to know which source (if any) covers it. ─────
function computeFullGridCorners(sourceMeta) {
  const { top_left } = sourceMeta.corners;
  const { min_x, min_y } = sourceMeta.tiles;
  return {
    top_left: {
      world_x: top_left.world_x + min_y * ADT_WORLD_SIZE,
      world_y: top_left.world_y + min_x * ADT_WORLD_SIZE,
    },
    bottom_right: {
      world_x: top_left.world_x - (GRID_SIZE - min_y) * ADT_WORLD_SIZE,
      world_y: top_left.world_y - (GRID_SIZE - min_x) * ADT_WORLD_SIZE,
    },
  };
}

function writeMeta(continentId, continent, populated) {
  const fullGridCorners = computeFullGridCorners(continent.sources[0]._meta);
  // Sanity check, not just informational: this should always come out to
  // WoW's well-known universal per-continent coordinate extent
  // (±(GRID_SIZE/2)*ADT_WORLD_SIZE = ±17066.667), independent of which
  // sub-region is actually populated -- confirmed for Eastern Kingdoms.
  // A mismatch here would mean a wrong assumption somewhere upstream.
  const expected = (GRID_SIZE / 2) * ADT_WORLD_SIZE;
  const cornerCheck =
    Math.abs(fullGridCorners.top_left.world_x - expected) < 0.01 &&
    Math.abs(fullGridCorners.top_left.world_y - expected) < 0.01 &&
    Math.abs(fullGridCorners.bottom_right.world_x + expected) < 0.01 &&
    Math.abs(fullGridCorners.bottom_right.world_y + expected) < 0.01;
  console.log(`full-grid corner sanity check (expect exactly \u00b1${expected}): ${cornerCheck ? "OK" : "MISMATCH"}`, fullGridCorners);

  const meta = {
    mapId: continent.mapId,
    mapDir: continent.mapDir,
    mapName: continent.mapName,
    tileSize: TILE_SIZE,
    gridSize: GRID_SIZE,
    nativeZoom: NATIVE_ZOOM,
    adtWorldSize: ADT_WORLD_SIZE,
    // Bounding box of tiles that actually have data, across all sources --
    // informational (e.g. for choosing an initial view), not required for
    // the world<->tile math itself, which uses fullGridCorners below.
    populated,
    // World-coordinate corners of the full 0-63 grid (see the sanity check
    // above) -- NOT yet consumed by lib/map-tiles.ts, which only knows the
    // proof-badlands single-crop shape. A future session adds a reader for
    // this shape when the map page itself is updated (out of scope here).
    fullGridCorners,
  };
  fs.writeFileSync(path.join(outDirFor(continentId), "meta.json"), JSON.stringify(meta, null, 1));
}

async function main() {
  const continentId = process.argv[2];
  const continent = CONTINENTS[continentId];
  if (!continent) {
    console.error(`Usage: node scripts/slice-map-tiles.js <continent>\nKnown continents: ${Object.keys(CONTINENTS).join(", ")}`);
    process.exit(1);
  }

  const mem = startMemoryTracking();
  const startedAt = Date.now();

  fs.rmSync(path.join(outDirFor(continentId), "tiles"), { recursive: true, force: true });

  let totalWritten = 0;
  let totalSkipped = 0;
  let populated = null;
  for (const source of continent.sources) {
    const sourceMeta = JSON.parse(fs.readFileSync(source.json, "utf8"));
    source._meta = sourceMeta; // stashed for writeMeta's corner computation
    const { min_x, max_x, min_y, max_y } = sourceMeta.tiles;
    populated = populated
      ? {
          minCol: Math.min(populated.minCol, min_x),
          maxCol: Math.max(populated.maxCol, max_x),
          minRow: Math.min(populated.minRow, min_y),
          maxRow: Math.max(populated.maxRow, max_y),
        }
      : { minCol: min_x, maxCol: max_x, minRow: min_y, maxRow: max_y };

    console.log(`slicing native (z${NATIVE_ZOOM}) tiles from ${path.basename(source.png)} ...`);
    const { written, skipped } = await sliceNativeLevel(continentId, source);
    console.log(`  ${path.basename(source.png)}: ${written} tiles written, ${skipped} empty tiles skipped`);
    totalWritten += written;
    totalSkipped += skipped;
  }

  console.log("building lower zoom levels from the output tree (z5..z0) ...");
  const lowerLevels = await buildLowerLevels(continentId);
  for (const level of lowerLevels) console.log(`  z${level.zoom}: ${level.tiles} tiles`);

  writeMeta(continentId, continent, populated);

  mem.stop();
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("\n--- summary ---");
  console.log(`z${NATIVE_ZOOM} (native): ${totalWritten} tiles written, ${totalSkipped} empty tiles skipped`);
  for (const level of lowerLevels) console.log(`z${level.zoom}: ${level.tiles} tiles`);
  console.log(`elapsed: ${elapsedSec}s`);
  console.log(`peak RSS: ${(mem.peak() / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
