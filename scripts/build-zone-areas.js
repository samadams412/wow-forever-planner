// Builds public/map/<continent>/zone-areas.json (zone polygons, GeoJSON,
// keyed by areaId) and adds `labelAnchor` to each continent's zones.json.
// Data only -- never touches public/map/*/tiles/. See CLAUDE.md's "Zone
// areas from client ADTs" architecture note for the full pipeline writeup;
// this header only covers what a reader of the script itself needs.
//
// Two ocean-removal steps run before roll-up/tracing (so shared borders
// between neighboring zones stay bit-for-bit identical -- both are traced
// from the exact same post-removal grid):
//   Step 1 -- name-based: any raw AreaId in data/map-ocean-areas.json
//     (TheGreatSea/TheVeiledSea/TheForbiddingSea/SouthSeas) is always
//     treated as empty. Not optional -- this just fixes administrative
//     mis-tagging, it never touches real terrain.
//   Step 2 -- liquid-based coastal trim, behind --coastal-trim (on by
//     default; pass --no-coastal-trim to compare without it): a cell NOT
//     already removed by Step 1 is a REMOVAL CANDIDATE if its own MH2O
//     liquid layer's type matches what Step 1's own cells empirically
//     turned out to be made of (discovered at run time per continent, see
//     scripts/lib/adt-liquid.js), AND the chunk's own terrain (MCVT) is
//     entirely below that layer's lowest recorded height.
//   Step 2b -- connectivity filter (added after the "boxes in rivers" bug
//     was found: a wide/slow river segment can occasionally match Step 2's
//     liquidType+height criterion on its own, producing an isolated
//     "island" removal in the middle of a zone that shows up as a small
//     hole in that zone's traced polygon): a Step-2 candidate cell only
//     stays removed if it is 4-connected -- travelling only through other
//     removed-or-never-assigned cells -- to a real Step-1 ocean cell or the
//     outer edge of the 1024x1024 world grid. A candidate that fails this
//     (an enclosed pocket, reachable only through land) is restored to its
//     original zone. Lakes/rivers/slime/lava mostly never match Step 2's
//     liquidType test at all (different liquidType, verified against Loch
//     Modan's lake in adt-liquid.js's own header comment) -- this
//     connectivity filter catches the rarer case where one narrowly does.
//
// Every run computes the raw ADT read once, then three grid variants from
// it: Step-1-only, Step-1+2 WITHOUT the connectivity filter ("naive" --
// what shipped before this fix, kept only to diagnose/compare), and
// Step-1+2 WITH the connectivity filter ("fixed" -- what's actually
// written to public/ and checked). Debug images: "before" = naive (shows
// the bug), "after" = fixed (shows it gone).
//
// Usage: node scripts/build-zone-areas.js [build] [wowExportRoot] [--no-coastal-trim]

const fs = require("fs");
const path = require("path");
const { readCsv } = require("./lib/csv");
const { readAdtAreaIds, CHUNKS_PER_TILE } = require("./lib/adt-areas");
const { readAdtLiquidInfo } = require("./lib/adt-liquid");
const {
  TOTAL_CHUNKS,
  chunkColToWorldY,
  chunkRowToWorldX,
  worldYToChunkCol,
  worldXToChunkRow,
} = require("./lib/chunk-grid-coords");
const { traceAllRegions } = require("./lib/raster-to-polygons");
const { polylabel, pointInPolygon } = require("./lib/polylabel");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const build = args[0] || "1.60.1.70009";
const wowExportRoot = args[1] || "C:/Users/samue/wow.export";
const COASTAL_TRIM = !flags.has("--no-coastal-trim");
const dbDir = path.join(__dirname, "..", "data", "sources", "client-db2", build);
const repoRoot = path.join(__dirname, "..");

const areatable = readCsv(path.join(dbDir, "areatable.csv"));
const areaById = new Map(areatable.map((a) => [a.ID, a]));

const oceanAreasFile = JSON.parse(fs.readFileSync(path.join(repoRoot, "data", "map-ocean-areas.json"), "utf8"));
const OCEAN_AREA_IDS = new Set(oceanAreasFile.areas.map((a) => a.id));

const CONTINENTS = [
  { slug: "eastern-kingdoms", mapDir: "azeroth" },
  { slug: "kalimdor", mapDir: "kalimdor" },
];

// A uniform-AreaId-876 ("GM Island") 3x3 ADT cluster sits at Kalimdor grid
// columns/rows 0-2 -- isolated far outside the real landmass (the next real
// tile starts at column 19). Confirmed by reading every one of these 9
// tiles' own MCNK AreaIds directly (all 876, none of the surrounding real
// terrain) before excluding them, not assumed from position alone.
const EXCLUDE_ADT_TILES = {
  kalimdor: new Set(["0_0", "0_1", "0_2", "1_0", "1_1", "1_2", "2_0", "2_1", "2_2"]),
};

const report = {};

main();

async function main() {
  console.log(`Step 2 (coastal liquid trim): ${COASTAL_TRIM ? "ON" : "OFF"} (--no-coastal-trim to disable)`);
  for (const continent of CONTINENTS) {
    report[continent.slug] = processContinent(continent);
  }

  console.log("\n=== Step 1: hole diagnosis (pre-fix / naive Step 1+2 grid) ===");
  for (const continent of CONTINENTS) {
    const r = report[continent.slug];
    reportHoles(continent.slug, classifyHoles(r.naive, r._diag.rawGrid, r._diag.step1Grid, r._diag.afterGridNaiveFlat));
  }

  runChecks(report);

  console.log("\n=== Step 2: holes remaining after the connectivity fix ===");
  for (const continent of CONTINENTS) {
    const r = report[continent.slug];
    const holes = classifyHoles(r.fixed, r._diag.rawGrid, r._diag.step1Grid, r._diag.afterGridFixedFlat);
    reportHoles(continent.slug, holes);
    const nonZoneHoles = holes.filter((h) => h.categories.some(([cat]) => !cat.startsWith("zone:")));
    console.log(
      nonZoneHoles.length
        ? `  ${continent.slug}: ${nonZoneHoles.length} hole(s) remain that aren't purely another zone -- see the categories printed above for each.`
        : `  ${continent.slug}: every remaining hole is entirely another zone's territory (legitimate).`
    );
  }

  await renderDebugImages(report, "after", "fixed");
  await renderDebugImages(report, "before", "naive");
}

function worldToGridCell(worldX, worldY) {
  const col = Math.floor(worldYToChunkCol(worldY));
  const row = Math.floor(worldXToChunkRow(worldX));
  return { row, col };
}

function lookupZone(fixedResult, worldX, worldY) {
  const { row, col } = worldToGridCell(worldX, worldY);
  const { rolledGrid, zones } = fixedResult;
  if (row < 0 || row >= TOTAL_CHUNKS || col < 0 || col >= TOTAL_CHUNKS) return null;
  const areaId = rolledGrid[row * TOTAL_CHUNKS + col];
  if (!areaId) return null;
  return zones.find((z) => z.areaId === areaId) || null;
}

// For each traced zone's each hole ring, samples every grid cell strictly
// inside it (via bbox + point-in-polygon, same test the gaps/overlaps check
// already uses) against `afterFlat` (the exact grid this trace came from),
// `step1Grid`, and `rawGrid`, and buckets the cell count into one of:
//   "zone:<name>"                          -- another real zone (legitimate)
//   "removed by ocean-ID exclusion (Step 1)"
//   "removed by coastal trim (Step 2)"
//   "AreaId 0 (never assigned)"
//   "unknown ID (raw <id>, no known zone)" -- raw AreaId survived both
//                                              removal steps but rollup
//                                              still couldn't resolve it
function classifyHoles(result, rawGrid, step1Grid, afterFlat) {
  const zoneById = new Map(result.zones.map((z) => [z.areaId, z]));
  const holes = [];
  for (const [areaId, { polygons }] of result.traced) {
    for (const poly of polygons) {
      for (const holeRing of poly.holes) {
        let minC = Infinity, minR = Infinity, maxC = -Infinity, maxR = -Infinity;
        for (const [c, r] of holeRing) {
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
        }
        const cats = new Map();
        let cellCount = 0;
        for (let r = minR; r < maxR; r++) {
          for (let c = minC; c < maxC; c++) {
            if (!pointInPolygon(c + 0.5, r + 0.5, { outer: holeRing, holes: [] })) continue;
            cellCount++;
            const idx = r * TOTAL_CHUNKS + c;
            const rolled = result.rolledGrid[idx];
            let cat;
            if (rolled !== 0) {
              cat = `zone:${zoneById.get(rolled)?.name ?? `#${rolled}`}`;
            } else if (afterFlat[idx] !== 0) {
              cat = `unknown ID (raw ${afterFlat[idx]}${areaById.get(String(afterFlat[idx])) ? ` "${areaById.get(String(afterFlat[idx])).AreaName_lang}"` : ""}, no known zone)`;
            } else if (step1Grid[idx] !== 0) {
              cat = "removed by coastal trim (Step 2)";
            } else if (rawGrid[idx] === 0) {
              cat = "AreaId 0 (never assigned)";
            } else {
              cat = "removed by ocean-ID exclusion (Step 1)";
            }
            cats.set(cat, (cats.get(cat) || 0) + 1);
          }
        }
        const gc = [Math.round((minC + maxC) / 2), Math.round((minR + maxR) / 2)];
        holes.push({
          zoneName: zoneById.get(areaId)?.name ?? `#${areaId}`,
          areaId,
          cellCount,
          gridCenter: gc,
          world: [round2(chunkRowToWorldX(gc[1])), round2(chunkColToWorldY(gc[0]))],
          categories: [...cats.entries()].sort((a, b) => b[1] - a[1]),
        });
      }
    }
  }
  return holes;
}

function reportHoles(slug, holes) {
  console.log(`  ${slug}: ${holes.length} hole(s) across all traced zones`);
  for (const h of holes) {
    const catStr = h.categories.map(([cat, count]) => `${cat} (${count})`).join(", ");
    console.log(`    ${h.zoneName} (areaId ${h.areaId}): ${h.cellCount} cells at grid(${h.gridCenter[0]},${h.gridCenter[1]}) / world(${h.world[0]},${h.world[1]}) -- ${catStr}`);
  }
}

function runChecks(report) {
  const ek = report["eastern-kingdoms"].fixed;
  const kal = report["kalimdor"].fixed;

  console.log("\n=== Check (a): exclude list + cells removed by Step 1 vs Step 2 (naive vs fixed) ===");
  for (const slug of ["eastern-kingdoms", "kalimdor"]) {
    const r = report[slug];
    console.log(
      `  ${slug}: Step 1 removed ${r.step1RemovedCount} cells; Step 2 naive candidates ${r.step2CandidateCount}; ` +
        `connectivity fix restored ${r.step2RestoredCount} isolated cell(s); Step 2 final removal ${r.step2RemovedCountFixed} cells`
    );
    console.log(`    discovered ocean liquidType id(s) for this continent: ${[...r.oceanLiquidTypes.entries()].map(([t, c]) => `${t} (${c} sampled cells)`).join(", ") || "none found"}`);
  }

  console.log("\n=== Check (c): gaps/overlaps after tracing (final Step 1+2+connectivity grid) ===");
  for (const [slug, result] of [["eastern-kingdoms", ek], ["kalimdor", kal]]) {
    const { rolledGrid, traced, zones } = result;
    const coverCount = new Uint8Array(rolledGrid.length);
    for (const zone of zones) {
      const t = traced.get(zone.areaId);
      if (!t) continue;
      let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      for (const poly of t.polygons) {
        for (const [c, r] of poly.outer) {
          if (r < minR) minR = r;
          if (c < minC) minC = c;
          if (r > maxR) maxR = r;
          if (c > maxC) maxC = c;
        }
      }
      for (let r = Math.max(0, minR); r < Math.min(TOTAL_CHUNKS, maxR); r++) {
        for (let c = Math.max(0, minC); c < Math.min(TOTAL_CHUNKS, maxC); c++) {
          for (const poly of t.polygons) {
            if (pointInPolygon(c + 0.5, r + 0.5, { outer: poly.outer, holes: poly.holes })) {
              coverCount[r * TOTAL_CHUNKS + c]++;
              break;
            }
          }
        }
      }
    }
    let zeroButShouldBeCovered = 0;
    let overlap = 0;
    for (let i = 0; i < rolledGrid.length; i++) {
      if (rolledGrid[i] !== 0 && coverCount[i] === 0) zeroButShouldBeCovered++;
      if (coverCount[i] >= 2) overlap++;
    }
    console.log(
      `  ${slug}: ${zeroButShouldBeCovered} cells with a real zone but NOT covered by any traced polygon (gap), ${overlap} cells covered by 2+ zone polygons (overlap)`
    );
  }

  console.log("\n=== Check (d): point-in-zone (re-run from the prior sessions, same expected answers) ===");
  const riverglades = ek.zones.find((z) => z.name === "Riverglades");
  const rgCenter = riverglades
    ? [
        (riverglades.worldBounds.minX + riverglades.worldBounds.maxX) / 2,
        (riverglades.worldBounds.minY + riverglades.worldBounds.maxY) / 2,
      ]
    : null;
  const tests = [
    { label: "Uldaman map.corpse", continent: ek, x: -6060.18, y: -2954.997314453125, expectId: 38, expectName: "Loch Modan" },
    { label: "Stormwind Harbor (AreaPOI, unambiguously inside the city)", continent: ek, x: -8573.4697265625, y: 990.094970703125, expectId: 1519, expectName: "Stormwind City" },
    { label: "Stormwind city-label pin (AreaPOI)", continent: ek, x: -9153.76953125, y: 364.0570068359375, expectId: 12, expectName: "Elwynn Forest" },
    { label: "Goldshire (AreaPOI)", continent: ek, x: -9480.0888671875, y: 63.52175521850586, expectId: 12, expectName: "Elwynn Forest" },
    { label: "Thunder Bluff (AreaPOI)", continent: kal, x: -1205.4100341796875, y: 29.42140007019043, expectId: 1638, expectName: "Thunder Bluff" },
    { label: "Orgrimmar city-label pin (AreaPOI)", continent: kal, x: 1381.77001953125, y: -4371.16015625, expectId: 14, expectName: "Durotar" },
    {
      label: "Riverglades (zone bbox center -- no independent landmark point available)",
      continent: ek,
      x: rgCenter ? rgCenter[0] : null,
      y: rgCenter ? rgCenter[1] : null,
      expectId: riverglades ? riverglades.areaId : null,
      expectName: "Riverglades",
    },
  ];
  for (const t of tests) {
    if (t.x === null) {
      console.log(`  ${t.label}: SKIPPED (zone not found)`);
      continue;
    }
    const found = lookupZone(t.continent, t.x, t.y);
    const ok = found && found.areaId === t.expectId;
    console.log(
      `  ${t.label}: (${t.x}, ${t.y}) -> ${found ? `${found.areaId} (${found.name})` : "no zone"} -- expected ${t.expectId} (${t.expectName}) -- ${ok ? "OK" : "MISMATCH"}`
    );
  }

  console.log("\n=== File size ===");
  console.log(`  eastern-kingdoms: ${report["eastern-kingdoms"].geojsonSizeKB} KB`);
  console.log(`  kalimdor: ${report["kalimdor"].geojsonSizeKB} KB`);
}

// Check (e): render every traced polygon over that continent's own z3 tile
// mosaic (8x8 tiles = 4096x4096px, i.e. exactly 4px per chunk-grid cell --
// no world-coordinate math needed for this, just a x4 scale on the same
// grid coordinates the tracer already produced) so alignment, ocean spill,
// and the new Forever zones can be eyeballed directly. Written to a
// gitignored scratch folder, NOT public/ -- this is a one-off debug artifact
// for this session, not a site asset. `variant` picks the debug-image
// subfolder name ("before"/"after"); `resultKey` picks which of each
// continent's report entries to render ("naive" shows the boxes-in-rivers
// bug, "fixed" shows it resolved).
async function renderDebugImages(report, variant, resultKey) {
  const sharp = require("sharp");
  const outDir = path.join(repoRoot, "debug-output", "zone-areas", variant);
  fs.mkdirSync(outDir, { recursive: true });
  const MOSAIC_TILES = 8; // 2^3, matches z3
  const TILE_PX = 512;
  const mosaicSize = MOSAIC_TILES * TILE_PX; // 4096
  const scale = mosaicSize / TOTAL_CHUNKS; // 4px per chunk cell
  const colors = ["#ffd100", "#6fb1ff", "#ff7a6b", "#7CFC00", "#ff77ff", "#00e5ff", "#ffa500", "#ffffff"];

  const ringToPath = (ring) => "M " + ring.map(([c, r]) => `${(c * scale).toFixed(1)},${(r * scale).toFixed(1)}`).join(" L ") + " Z";

  for (const continent of CONTINENTS) {
    const result = report[continent.slug][resultKey];
    const tilesDir = path.join(repoRoot, "public", "map", continent.slug, "tiles", "3");
    const compositeOps = [];
    for (let row = 0; row < MOSAIC_TILES; row++) {
      for (let col = 0; col < MOSAIC_TILES; col++) {
        const tilePath = path.join(tilesDir, `${col}_${row}.webp`);
        if (fs.existsSync(tilePath)) compositeOps.push({ input: tilePath, left: col * TILE_PX, top: row * TILE_PX });
      }
    }
    const baseBuf = await sharp({
      create: { width: mosaicSize, height: mosaicSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .composite(compositeOps)
      .png()
      .toBuffer();

    let colorIdx = 0;
    let svgPaths = "";
    for (const zone of result.zones) {
      const t = result.traced.get(zone.areaId);
      if (!t) continue;
      const color = colors[colorIdx++ % colors.length];
      for (const poly of t.polygons) {
        const d = [ringToPath(poly.outer), ...poly.holes.map(ringToPath)].join(" ");
        svgPaths += `<path d="${d}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="2" fill-rule="evenodd"/>`;
      }
      const anchor = result.labelAnchors.get(zone.areaId);
      if (anchor) {
        const lx = worldYToChunkCol(anchor[1]) * scale;
        const ly = worldXToChunkRow(anchor[0]) * scale;
        svgPaths += `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${color}"/>`;
        svgPaths += `<text x="${lx.toFixed(1)}" y="${(ly - 6).toFixed(1)}" font-size="14" fill="${color}" font-family="sans-serif">${zone.name}</text>`;
      }
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${mosaicSize}" height="${mosaicSize}">${svgPaths}</svg>`;

    const outPath = path.join(outDir, `${continent.slug}.png`);
    await sharp(baseBuf)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toFile(outPath);
    console.log(`Debug image (${variant} = ${resultKey}) -> ${path.relative(repoRoot, outPath)}`);
  }
}

function processContinent(continent) {
  console.log(`\n=== ${continent.slug} ===`);

  // --- Step 0: read every ADT once -- raw AreaIds AND liquid info together ---
  const sourceDir = path.join(wowExportRoot, "maps", continent.mapDir);
  const fileRe = new RegExp(`^${continent.mapDir}_(\\d+)_(\\d+)\\.adt$`);
  const files = fs.readdirSync(sourceDir).filter((f) => fileRe.test(f));

  const rawGrid = new Uint16Array(TOTAL_CHUNKS * TOTAL_CHUNKS);
  const liquidByCell = new Map(); // cellIdx -> { layers, terrainMaxHeight }
  const excludeSet = EXCLUDE_ADT_TILES[continent.slug] || new Set();
  let tilesRead = 0;
  let tilesExcluded = 0;
  let tilesUnreadable = 0;

  for (const file of files) {
    const m = file.match(fileRe);
    const adtCol = Number(m[1]);
    const adtRow = Number(m[2]);
    const tileKey = `${adtCol}_${adtRow}`;
    if (excludeSet.has(tileKey)) {
      tilesExcluded++;
      continue;
    }
    const fullPath = path.join(sourceDir, file);
    const areaIds = readAdtAreaIds(fullPath);
    if (!areaIds) {
      tilesUnreadable++;
      console.log(`  WARN unreadable/unexpected MCNK layout: ${file}`);
      continue;
    }
    const liquidInfo = COASTAL_TRIM ? readAdtLiquidInfo(fullPath) : null;
    tilesRead++;
    for (let i = 0; i < areaIds.length; i++) {
      const localRow = Math.floor(i / CHUNKS_PER_TILE);
      const localCol = i % CHUNKS_PER_TILE;
      const gRow = adtRow * CHUNKS_PER_TILE + localRow;
      const gCol = adtCol * CHUNKS_PER_TILE + localCol;
      const cellIdx = gRow * TOTAL_CHUNKS + gCol;
      rawGrid[cellIdx] = areaIds[i];
      if (liquidInfo && liquidInfo[i]) liquidByCell.set(cellIdx, liquidInfo[i]);
    }
  }
  console.log(`  ADTs: ${tilesRead} read, ${tilesExcluded} excluded (GM Island), ${tilesUnreadable} unreadable`);

  // --- Step 1: name-based ocean removal ---
  const step1Grid = new Uint16Array(rawGrid.length);
  let step1RemovedCount = 0;
  for (let i = 0; i < rawGrid.length; i++) {
    if (rawGrid[i] !== 0 && OCEAN_AREA_IDS.has(rawGrid[i])) {
      step1RemovedCount++;
      continue; // leave step1Grid[i] at its zero-initialized default
    }
    step1Grid[i] = rawGrid[i];
  }

  // Discover this continent's own ocean liquidType id(s) empirically from
  // the Step-1-removed cells' own MH2O data (see adt-liquid.js header for
  // why this is discovered at run time rather than hardcoded).
  const oceanLiquidTypes = new Map(); // liquidType -> sample count
  if (COASTAL_TRIM) {
    for (let i = 0; i < rawGrid.length; i++) {
      if (rawGrid[i] === 0 || !OCEAN_AREA_IDS.has(rawGrid[i])) continue;
      const info = liquidByCell.get(i);
      if (!info) continue;
      for (const layer of info.layers) {
        oceanLiquidTypes.set(layer.liquidType, (oceanLiquidTypes.get(layer.liquidType) || 0) + 1);
      }
    }
  }
  const oceanLiquidTypeSet = new Set(oceanLiquidTypes.keys());

  // --- Step 2a: naive liquid-based coastal trim candidates (no connectivity check yet) ---
  const step2Candidate = new Uint8Array(step1Grid.length);
  let step2CandidateCount = 0;
  if (COASTAL_TRIM) {
    for (let i = 0; i < step1Grid.length; i++) {
      if (step1Grid[i] === 0) continue;
      const info = liquidByCell.get(i);
      if (!info) continue;
      const submerged = info.layers.some(
        (layer) => oceanLiquidTypeSet.has(layer.liquidType) && info.terrainMaxHeight < layer.minH
      );
      if (submerged) {
        step2Candidate[i] = 1;
        step2CandidateCount++;
      }
    }
  }

  // --- Step 2b: connectivity filter -- a Step-2 candidate only stays
  // removed if 4-connected, travelling only through other removed-or-
  // never-assigned cells, to a real Step-1 ocean cell or the grid edge.
  // `passable` is the traversal mask (raw-0 "never assigned" cells count
  // as passable, since most of them are open ocean/void beyond the
  // landmass -- but they are NOT seeds on their own, only real Step-1
  // ocean removals and the grid edge are).
  const passable = new Uint8Array(step1Grid.length);
  for (let i = 0; i < step1Grid.length; i++) {
    passable[i] = step1Grid[i] === 0 || step2Candidate[i] === 1 ? 1 : 0;
  }
  const visited = new Uint8Array(step1Grid.length);
  const queue = new Int32Array(step1Grid.length);
  let qHead = 0;
  let qTail = 0;
  for (let i = 0; i < step1Grid.length; i++) {
    if (step1Grid[i] === 0 && rawGrid[i] !== 0 && !visited[i]) {
      visited[i] = 1;
      queue[qTail++] = i;
    }
  }
  for (let col = 0; col < TOTAL_CHUNKS; col++) {
    for (const row of [0, TOTAL_CHUNKS - 1]) {
      const idx = row * TOTAL_CHUNKS + col;
      if (passable[idx] && !visited[idx]) {
        visited[idx] = 1;
        queue[qTail++] = idx;
      }
    }
  }
  for (let row = 0; row < TOTAL_CHUNKS; row++) {
    for (const col of [0, TOTAL_CHUNKS - 1]) {
      const idx = row * TOTAL_CHUNKS + col;
      if (passable[idx] && !visited[idx]) {
        visited[idx] = 1;
        queue[qTail++] = idx;
      }
    }
  }
  while (qHead < qTail) {
    const i = queue[qHead++];
    const row = Math.floor(i / TOTAL_CHUNKS);
    const col = i % TOTAL_CHUNKS;
    if (row > 0) {
      const n = i - TOTAL_CHUNKS;
      if (passable[n] && !visited[n]) {
        visited[n] = 1;
        queue[qTail++] = n;
      }
    }
    if (row < TOTAL_CHUNKS - 1) {
      const n = i + TOTAL_CHUNKS;
      if (passable[n] && !visited[n]) {
        visited[n] = 1;
        queue[qTail++] = n;
      }
    }
    if (col > 0) {
      const n = i - 1;
      if (passable[n] && !visited[n]) {
        visited[n] = 1;
        queue[qTail++] = n;
      }
    }
    if (col < TOTAL_CHUNKS - 1) {
      const n = i + 1;
      if (passable[n] && !visited[n]) {
        visited[n] = 1;
        queue[qTail++] = n;
      }
    }
  }

  const step2Final = new Uint8Array(step2Candidate);
  let step2RestoredCount = 0;
  for (let i = 0; i < step2Candidate.length; i++) {
    if (step2Candidate[i] && !visited[i]) {
      step2Final[i] = 0;
      step2RestoredCount++;
    }
  }

  const afterGridNaive = new Uint16Array(step1Grid);
  for (let i = 0; i < step2Candidate.length; i++) if (step2Candidate[i]) afterGridNaive[i] = 0;

  const afterGridFixed = new Uint16Array(step1Grid);
  let step2RemovedCountFixed = 0;
  for (let i = 0; i < step2Final.length; i++) {
    if (step2Final[i]) {
      afterGridFixed[i] = 0;
      step2RemovedCountFixed++;
    }
  }

  // --- roll up + trace both variants against the same zones.json ---
  const zonesPath = path.join(repoRoot, "public", "map", continent.slug, "zones.json");
  const zones = JSON.parse(fs.readFileSync(zonesPath, "utf8"));
  const zoneIdSet = new Set(zones.map((z) => z.areaId));

  const naive = rollupAndTrace(afterGridNaive, zones, zoneIdSet, "Step 1+2 naive (pre-fix)");
  const fixed = rollupAndTrace(afterGridFixed, zones, zoneIdSet, "Step 1+2 fixed (final)");

  // --- write outputs from the "fixed" (final) variant only ---
  const gridPointToWorld = ([col, row]) => [round2(chunkRowToWorldX(row)), round2(chunkColToWorldY(col))];
  const ringToWorld = (ring) => ring.map(gridPointToWorld);
  const zoneById = new Map(zones.map((z) => [z.areaId, z]));
  const geojson = {};
  for (const [areaId, { polygons }] of fixed.traced) {
    const zone = zoneById.get(areaId);
    if (!zone) continue;
    const anchor = fixed.labelAnchors.get(areaId);
    zone.labelAnchor = anchor;
    const polyCoords = polygons.map((p) => [ringToWorld(p.outer), ...p.holes.map(ringToWorld)]);
    geojson[areaId] = {
      type: "Feature",
      properties: { areaId, name: zone.name },
      geometry: polyCoords.length === 1 ? { type: "Polygon", coordinates: polyCoords[0] } : { type: "MultiPolygon", coordinates: polyCoords },
    };
  }

  const geojsonPath = path.join(repoRoot, "public", "map", continent.slug, "zone-areas.json");
  fs.writeFileSync(geojsonPath, JSON.stringify(geojson));
  const geojsonSize = fs.statSync(geojsonPath).size;
  console.log(`  zone-areas.json: ${Object.keys(geojson).length} zones, ${(geojsonSize / 1024).toFixed(1)} KB -> ${path.relative(repoRoot, geojsonPath)}`);

  fs.writeFileSync(zonesPath, JSON.stringify(zones, null, 2) + "\n");
  console.log(`  labelAnchor written into ${path.relative(repoRoot, zonesPath)}`);

  const zonesWithNoArea = zones.filter((z) => !fixed.traced.has(z.areaId));
  if (zonesWithNoArea.length) {
    console.log(`  Zones with ZERO chunks in this build (${zonesWithNoArea.length}): ${zonesWithNoArea.map((z) => `${z.areaId} (${z.name})`).join(", ")}`);
  }

  console.log(`  Step 2 connectivity fix: ${step2RestoredCount} of ${step2CandidateCount} naive candidates were isolated pockets, restored to their zone`);

  return {
    step1RemovedCount,
    step2CandidateCount,
    step2RestoredCount,
    step2RemovedCountFixed,
    oceanLiquidTypes,
    naive,
    fixed,
    geojsonSizeKB: Math.round(geojsonSize / 1024),
    _diag: { rawGrid, step1Grid, afterGridNaiveFlat: afterGridNaive, afterGridFixedFlat: afterGridFixed, liquidByCell },
  };
}

function rollupAndTrace(grid, zones, zoneIdSet, label) {
  const rollupCache = new Map();
  function resolve(rawId) {
    if (rollupCache.has(rawId)) return rollupCache.get(rawId);
    let current = rawId;
    const visited = new Set();
    let resolved = null;
    while (true) {
      if (zoneIdSet.has(current)) {
        resolved = current;
        break;
      }
      const area = areaById.get(String(current));
      if (!area) break;
      const parent = Number(area.ParentAreaID);
      if (!parent || visited.has(current)) break;
      visited.add(current);
      current = parent;
    }
    rollupCache.set(rawId, resolved);
    return resolved;
  }

  const rolledGrid = new Uint16Array(grid.length);
  const cellCounts = new Map();
  for (let i = 0; i < grid.length; i++) {
    const raw = grid[i];
    if (raw === 0) continue;
    const resolved = resolve(raw);
    if (resolved) {
      rolledGrid[i] = resolved;
      cellCounts.set(resolved, (cellCounts.get(resolved) || 0) + 1);
    }
  }

  const traced = traceAllRegions(rolledGrid, TOTAL_CHUNKS, TOTAL_CHUNKS, 0);
  let totalPinchPoints = 0;
  for (const { pinchPoints } of traced.values()) totalPinchPoints += pinchPoints;
  if (totalPinchPoints > 0) console.log(`  [${label}] NOTE: ${totalPinchPoints} pinch-point vertices resolved during tracing`);

  const labelAnchors = new Map();
  for (const [areaId, { polygons }] of traced) {
    const largest = polygons.reduce((a, b) => (b.area > a.area ? b : a), polygons[0]);
    const [lx, ly] = polylabel({ outer: largest.outer, holes: largest.holes });
    labelAnchors.set(areaId, round2FromGrid(lx, ly));
  }

  return { rolledGrid, zones, traced, cellCounts, labelAnchors };
}

function round2FromGrid(col, row) {
  return [round2(chunkRowToWorldX(row)), round2(chunkColToWorldY(col))];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = {};
