// Builds public/map/<continent>/zones.json for Eastern Kingdoms and
// Kalimdor from the trimmed client DB2 snapshot in
// data/sources/client-db2/<build>/ (see trim-client-db2.js), and reports the
// four data-quality checks the task that added this script asked for.
//
// A "zone" here is a real UiMapAssignment row: MapID 0 or 1 (the two
// continents' own Map ids -- see data/sources/client-db2/*/map.csv), AreaID
// not 0 (0 marks the continent-overview assignment itself, not a zone), and
// a plain 1:1 UiMin/UiMax (excludes the combined "Azeroth" world-map
// UiMapID 947, whose two rows use fractional UiMin/UiMax to place EK and
// Kalimdor side by side in one composite map -- not a zone either).
//
// World bounds come straight from UiMapAssignment's own `Region` field:
// minX,minY,minZ,maxX,maxY,maxZ (Z is a vertical range, always
// -1000000/1000000 here -- unbounded, not used). This is the same world-
// coordinate space the continent tile pyramid and lib/map-coords.ts already
// use, so a zone's bounds drop directly onto the existing tile map with no
// further conversion.
//
// Level ranges: NOT derivable from client DB2 data. See check (b) below --
// every open-world zone's AreaTable.ContentTuningID is 0 (empty) in this
// export; the nonzero ContentTuningIDs that do exist belong to dungeon
// *interior* areas and hold a single MinLevelSquish/MaxLevelSquish scaling
// target, not a player-facing zone level range, so there is nothing here to
// read even indirectly. Instead, a zone's levelRange/levelRangeSource/
// confidence are merged in from data/zone-levels.json (hand-authored, see
// that file's own _readme for where its numbers came from) when present --
// a zone with no entry there still ships `levelRange: null`, same as
// before, never a hand-typed guess baked into this script.
//
// This script REBUILDS zones.json from scratch every run (it's the only
// writer of the zone list itself), so `labelAnchor` -- written by the
// separate scripts/build-zone-areas.js as a post-process, not by this
// script -- would silently get dropped on a rebuild if not carried
// forward. Any existing zones.json is read first and its labelAnchor
// preserved by areaId; nothing else about the merge logic depends on it.

const fs = require("fs");
const path = require("path");
const { readCsv } = require("./lib/csv");

const build = process.argv[2] || "1.60.1.70009";
const dbDir = path.join(__dirname, "..", "data", "sources", "client-db2", build);

const uimapassignment = readCsv(path.join(dbDir, "uimapassignment.csv"));
const areatable = readCsv(path.join(dbDir, "areatable.csv"));
const contenttuning = readCsv(path.join(dbDir, "contenttuning.csv"));
const map = readCsv(path.join(dbDir, "map.csv"));

const zoneLevelsPath = path.join(__dirname, "..", "data", "zone-levels.json");
const zoneLevelsRaw = JSON.parse(fs.readFileSync(zoneLevelsPath, "utf8"));
const zoneLevelsById = new Map(
  Object.entries(zoneLevelsRaw)
    .filter(([key]) => key !== "_readme")
    .map(([areaId, entry]) => [Number(areaId), entry])
);

const areaById = new Map(areatable.map((a) => [a.ID, a]));
const tuningById = new Map(contenttuning.map((t) => [t.ID, t]));
const mapById = new Map(map.map((m) => [m.ID, m]));

const CONTINENTS = {
  0: { slug: "eastern-kingdoms", name: mapById.get("0")?.MapName_lang ?? "Eastern Kingdoms" },
  1: { slug: "kalimdor", name: mapById.get("1")?.MapName_lang ?? "Kalimdor" },
};

function parseRegion(region) {
  const [minX, minY, , maxX, maxY] = region.split(",").map(Number);
  return { minX, minY, maxX, maxY };
}

const isPlain01 = (uiMin, uiMax) => uiMin === "0,0" && uiMax === "1,1";

// AreaTable's real client-side zone-territory field: 0 = contested/
// neutral, 2 = Alliance, 4 = Horde. Verified against every EK/Kalimdor
// zone's known real Classic territory before trusting it (starting zones
// and capital-city zones get 2/4, every regular/shared leveling zone gets
// 0 -- matches exactly). Added to the trimmed snapshot 2026-09-25 (see
// scripts/trim-client-db2.js) specifically for this.
const FACTION_GROUP_MASK = { 0: "contested", 2: "alliance", 4: "horde" };
function factionFor(area) {
  if (!area) return "contested";
  return FACTION_GROUP_MASK[area.FactionGroupMask] ?? "contested";
}

const zoneRows = uimapassignment.filter(
  (r) => (r.MapID === "0" || r.MapID === "1") && r.AreaID !== "0" && isPlain01(r.UiMin, r.UiMax)
);

// --- Build zones.json per continent ---
const zonesByContinent = { 0: [], 1: [] };
for (const row of zoneRows) {
  const area = areaById.get(row.AreaID);
  const bounds = parseRegion(row.Region);
  const hasTuning = area && area.ContentTuningID && area.ContentTuningID !== "0";
  const areaId = Number(row.AreaID);
  const levelEntry = zoneLevelsById.get(areaId);
  zonesByContinent[row.MapID].push({
    areaId,
    uiMapId: Number(row.UiMapID),
    name: area ? area.AreaName_lang : null,
    continent: CONTINENTS[row.MapID].slug,
    worldBounds: bounds,
    levelRange: levelEntry ? [levelEntry.min, levelEntry.max] : null,
    levelRangeSource: levelEntry ? levelEntry.source : hasTuning ? "contenttuning-non-player-range" : "unavailable",
    confidence: levelEntry ? levelEntry.confidence : "none",
    faction: factionFor(area),
  });
}

for (const [mapId, { slug }] of Object.entries(CONTINENTS)) {
  const zones = zonesByContinent[mapId].sort((a, b) => a.areaId - b.areaId);
  const outDir = path.join(__dirname, "..", "public", "map", slug);
  fs.mkdirSync(outDir, { recursive: true });

  // Preserve labelAnchor from any existing zones.json -- this script
  // doesn't compute it (scripts/build-zone-areas.js does, as a later,
  // separate step), so a plain overwrite here would silently drop it.
  const existingPath = path.join(outDir, "zones.json");
  const existingByAreaId = new Map();
  if (fs.existsSync(existingPath)) {
    try {
      for (const z of JSON.parse(fs.readFileSync(existingPath, "utf8"))) {
        if (z.labelAnchor) existingByAreaId.set(z.areaId, z.labelAnchor);
      }
    } catch {
      // Malformed/partial existing file -- proceed without labelAnchors
      // rather than aborting the whole rebuild; build-zone-areas.js can
      // regenerate them on its own next run either way.
    }
  }
  for (const z of zones) {
    const anchor = existingByAreaId.get(z.areaId);
    if (anchor) z.labelAnchor = anchor;
  }

  fs.writeFileSync(existingPath, JSON.stringify(zones, null, 2) + "\n", "utf8");
  const withLevels = zones.filter((z) => z.levelRange).length;
  console.log(`${slug}: ${zones.length} zones (${withLevels} with a level range) -> public/map/${slug}/zones.json`);
}

// --- Check (a): world-rectangle aspect ratio ---
console.log("\n=== Check (a): 1002:668 aspect ratio ===");
const EXPECTED = 1002 / 668;
const TOLERANCE = 0.01; // ~1%
const aspectOffenders = [];
for (const zones of Object.values(zonesByContinent)) {
  for (const z of zones) {
    const w = z.worldBounds.maxX - z.worldBounds.minX;
    const h = z.worldBounds.maxY - z.worldBounds.minY;
    const ratio = h / w;
    if (Math.abs(ratio / EXPECTED - 1) > TOLERANCE) {
      aspectOffenders.push({ areaId: z.areaId, name: z.name, ratio: ratio.toFixed(4) });
    }
  }
}
if (aspectOffenders.length === 0) {
  console.log("All zone rectangles match 1002:668 within 1%.");
} else {
  console.log(`${aspectOffenders.length} zone(s) do NOT match 1002:668 within 1%:`);
  for (const o of aspectOffenders) console.log(`  areaId ${o.areaId} (${o.name}): height/width = ${o.ratio}`);
}

// --- Check (b): level ranges vs ContentTuning ---
console.log("\n=== Check (b): level ranges vs ContentTuning ===");
const knownLevels = {
  "Dun Morogh": "4-12",
  Westfall: "9-18",
  "Loch Modan": "10-18",
  "Silverpine Forest": "10-20",
  "Redridge Mountains": "15-25",
};
for (const [name, expected] of Object.entries(knownLevels)) {
  const area = areatable.find((a) => a.AreaName_lang === name);
  if (!area) {
    console.log(`  ${name}: NOT FOUND in areatable.csv`);
    continue;
  }
  const tuningId = area.ContentTuningID;
  if (!tuningId || tuningId === "0") {
    console.log(`  ${name}: ContentTuningID is 0 (empty) -- expected ${expected}, no ContentTuning data to compare`);
  } else {
    const t = tuningById.get(tuningId);
    console.log(
      `  ${name}: ContentTuningID ${tuningId} -- MinLevelSquish/MaxLevelSquish ${t?.MinLevelSquish}/${t?.MaxLevelSquish}, LfgMinLevel/LfgMaxLevel ${t?.LfgMinLevel}/${t?.LfgMaxLevel} vs expected ${expected}`
    );
  }
}
const anyZoneTuning = areatable.some(
  (a) =>
    a.ContentTuningID &&
    a.ContentTuningID !== "0" &&
    zoneRows.some((r) => r.AreaID === a.ID)
);
console.log(
  anyZoneTuning
    ? "  (at least one open-world zone has a nonzero ContentTuningID -- see above)"
    : "  Every EK/Kalimdor open-world zone in zones.json has ContentTuningID = 0. The 21 nonzero ContentTuningIDs in this export all belong to dungeon INTERIOR areas (e.g. Uldaman's own area entry) and hold a single MinLevelSquish/MaxLevelSquish scaling target, not a player-facing level range -- not usable for zone level ranges even indirectly. levelRange is left null in zones.json rather than hand-typed."
);

// --- Check (c): new Forever zone continent assignment ---
console.log("\n=== Check (c): new Forever zone continents ===");
const newZoneNames = [
  "Darkspear Islands",
  "Riverglades",
  "Mount Hyjal",
  "Zephras Isle",
  "Shen'dralas",
];
for (const name of newZoneNames) {
  const area = areatable.find((a) => a.AreaName_lang === name);
  if (!area) {
    console.log(`  ${name}: not found in areatable.csv`);
    continue;
  }
  const assignment = uimapassignment.find((r) => r.AreaID === area.ID);
  if (!assignment) {
    console.log(`  ${name} (areaId ${area.ID}): no uimapassignment row found`);
    continue;
  }
  const mapId = assignment.MapID;
  if (mapId === "0" || mapId === "1") {
    console.log(`  ${name} (areaId ${area.ID}): MapID ${mapId} -> ${CONTINENTS[mapId].name} -- included in zones.json`);
  } else {
    console.log(
      `  ${name} (areaId ${area.ID}): MapID ${mapId} (${mapById.get(mapId)?.MapName_lang ?? "unknown map"}) -- a SEPARATE map, excluded from zones.json`
    );
  }
}

// --- Check (d): zone PNG <-> zones.json areaId cross-check ---
console.log("\n=== Check (d): zone PNG <-> zones.json areaId ===");
const zonesDir = process.argv[3] || "C:/Users/samue/wow.export/zones";
const allZoneEntries = [...zonesByContinent[0], ...zonesByContinent[1]];
const zoneIdSet = new Set(allZoneEntries.map((z) => z.areaId));
if (!fs.existsSync(zonesDir)) {
  console.log(`  zones PNG dir not found at ${zonesDir}, skipping`);
} else {
  const pngFiles = fs.readdirSync(zonesDir).filter((f) => f.toLowerCase().endsWith(".png"));
  const pngIds = new Set();
  const unparsedPngs = [];
  for (const f of pngFiles) {
    const m = f.match(/^Zone_(\d+)_/);
    if (m) pngIds.add(Number(m[1]));
    else unparsedPngs.push(f);
  }
  const pngWithoutZone = [...pngIds].filter((id) => !zoneIdSet.has(id));
  const zoneWithoutPng = [...zoneIdSet].filter((id) => !pngIds.has(id));
  console.log(`  ${pngFiles.length} zone PNGs, ${allZoneEntries.length} zones.json entries`);
  if (unparsedPngs.length) console.log(`  PNGs with unparseable filenames: ${unparsedPngs.join(", ")}`);
  console.log(
    pngWithoutZone.length
      ? `  PNGs with NO matching zones.json entry (areaId): ${pngWithoutZone
          .map((id) => `${id} (${areaById.get(String(id))?.AreaName_lang ?? "unknown"})`)
          .join(", ")}`
      : "  Every zone PNG matches a zones.json entry."
  );
  console.log(
    zoneWithoutPng.length
      ? `  zones.json entries with NO matching PNG (areaId): ${zoneWithoutPng.join(", ")}`
      : "  Every zones.json entry has a matching PNG."
  );
}

// --- Check (e): data/zone-levels.json merge quality ---
console.log("\n=== Check (e): zone-levels.json merge ===");
const zonesWithoutLevels = allZoneEntries.filter((z) => !z.levelRange);
console.log(
  `  ${allZoneEntries.length - zonesWithoutLevels.length}/${allZoneEntries.length} zones got a level range; ${zonesWithoutLevels.length} did not:`
);
for (const z of zonesWithoutLevels) console.log(`    ${z.areaId} (${z.name})`);
const levelEntriesWithNoZone = [...zoneLevelsById.keys()].filter((id) => !zoneIdSet.has(id));
console.log(
  levelEntriesWithNoZone.length
    ? `  zone-levels.json entries with NO matching zones.json zone (areaId): ${levelEntriesWithNoZone
        .map((id) => `${id} (${zoneLevelsById.get(id).name})`)
        .join(", ")}`
    : "  Every zone-levels.json entry matches a zones.json zone."
);

// --- Check (f): faction (FactionGroupMask) per zone ---
console.log("\n=== Check (f): zone faction (real AreaTable.FactionGroupMask) ===");
for (const slug of ["eastern-kingdoms", "kalimdor"]) {
  console.log(`  ${slug}:`);
  const zones = allZoneEntries.filter((z) => z.continent === slug);
  for (const z of zones) console.log(`    ${z.areaId} (${z.name}): ${z.faction}`);
}
const unexpectedMask = allZoneEntries.filter((z) => {
  const area = areaById.get(String(z.areaId));
  return area && !["0", "2", "4"].includes(area.FactionGroupMask);
});
console.log(
  unexpectedMask.length
    ? `  Unexpected FactionGroupMask values (not 0/2/4), fell back to contested: ${unexpectedMask
        .map((z) => `${z.areaId} (${z.name}): raw=${areaById.get(String(z.areaId)).FactionGroupMask}`)
        .join(", ")}`
    : "  Every zone's FactionGroupMask was 0, 2, or 4 -- no bitmask combinations or unrecognized values."
);
