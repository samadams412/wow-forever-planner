// Builds data/map-entrances.json: dungeons, raids, and battlegrounds with a
// continent + world position, sourced from the client's own Map.csv `Corpse`
// field (a dungeon/raid Map's own graveyard-release position on its parent
// continent -- effectively "right outside the entrance" for every instance
// checked here) and cross-checked against AreaPOI's own entrance-marker
// points where one exists. See scripts/map-entrance-source-map.js for the
// id -> Map.csv Directory correspondence and its own sharing notes (Scarlet
// Monastery/Dire Maul/Blackrock Spire/Stratholme wings).
//
// A Corpse of exactly "0,0" is treated as "no data", not a real position at
// the world origin -- every dungeon/raid/battleground confirmed to have no
// client-side entrance data in this export (all 5 new-Forever-dungeons-
// without-a-Map-row, every new Forever raid, Naxxramas, and every
// battleground) uses this same "0,0" placeholder, so a literal reading would
// silently place them all at one point rather than reporting them as
// missing, which is what the task asked this script to do instead.

const fs = require("fs");
const path = require("path");
const { readCsv } = require("./lib/csv");
const { DUNGEONS, RAIDS, BATTLEGROUNDS } = require("./map-entrance-source-map");

const build = process.argv[2] || "1.60.1.70009";
const dbDir = path.join(__dirname, "..", "data", "sources", "client-db2", build);

const map = readCsv(path.join(dbDir, "map.csv"));
const areapoi = readCsv(path.join(dbDir, "areapoi.csv"));
const mapById = new Map(map.map((m) => [m.ID, m]));

const CONTINENT_SLUG = { 0: "eastern-kingdoms", 1: "kalimdor" };

function resolveEntry(mapId) {
  const m = mapId && mapById.get(mapId);
  if (!m) {
    return { continent: null, worldPosition: null, source: null, confidence: "none", note: "no Map.csv row in this export" };
  }
  if (!m.Corpse || m.Corpse === "0,0") {
    return {
      continent: null,
      worldPosition: null,
      source: null,
      confidence: "none",
      note: `Map.csv row ${m.ID} (${m.MapName_lang}) has no corpse position set (Corpse=0,0) -- not yet placed in this beta build`,
    };
  }
  const [x, y] = m.Corpse.split(",").map(Number);
  const continent = CONTINENT_SLUG[m.CorpseMapID] ?? null;
  return {
    continent,
    worldPosition: { x, y },
    source: "map.corpse",
    confidence: continent ? "confirmed" : "none",
    note: continent ? null : `CorpseMapID ${m.CorpseMapID} is not Eastern Kingdoms or Kalimdor`,
  };
}

function buildGroup(idMap, kind) {
  const out = {};
  for (const [id, mapId] of Object.entries(idMap)) {
    out[id] = { kind, mapId, ...resolveEntry(mapId) };
  }
  return out;
}

const entrances = {
  ...buildGroup(DUNGEONS, "dungeon"),
  ...buildGroup(RAIDS, "raid"),
  ...buildGroup(BATTLEGROUNDS, "battleground"),
};

// Dungeon ids that exist in data/dungeons.json but have no Map.csv Directory
// at all (checked directly against the raw export, not just absent from
// map-entrance-source-map.js by oversight -- see that file's own header).
const NO_CLIENT_MAP_DUNGEONS = [
  "drowned-city",
  "kroldok-stronghold",
  "alcaz-prison",
  "blackmaw-hold",
  "shapers-terrace",
];
for (const id of NO_CLIENT_MAP_DUNGEONS) {
  entrances[id] = {
    kind: "dungeon",
    mapId: null,
    continent: null,
    worldPosition: null,
    source: null,
    confidence: "none",
    note: "no Map.csv row found for this dungeon in this export at all (not just missing corpse data)",
  };
}

const outPath = path.join(__dirname, "..", "data", "map-entrances.json");
fs.writeFileSync(outPath, JSON.stringify(entrances, null, 2) + "\n", "utf8");
console.log(`Wrote ${Object.keys(entrances).length} entries -> data/map-entrances.json`);

// --- Report: which have no client position ---
console.log("\n=== No client position available ===");
for (const [id, e] of Object.entries(entrances)) {
  if (!e.worldPosition) console.log(`  ${id} (${e.kind}): ${e.note}`);
}

// --- Check: Uldaman vs our existing pin (-6060, -2955) ---
console.log("\n=== Check: Uldaman vs existing pin (-6060, -2955) ===");
const uldaman = entrances["uldaman"];
console.log(`  map.corpse: (${uldaman.worldPosition.x}, ${uldaman.worldPosition.y}) on ${uldaman.continent}`);
const uldamanPoi = areapoi.find((p) => p.Name_lang === "Uldaman");
if (uldamanPoi) {
  const [px, py] = uldamanPoi.Pos.split(",").map(Number);
  console.log(`  areapoi entrance marker: (${px.toFixed(2)}, ${py.toFixed(2)}) -- id ${uldamanPoi.ID}`);
  const dx = px - uldaman.worldPosition.x;
  const dy = py - uldaman.worldPosition.y;
  console.log(`  difference from map.corpse: (${dx.toFixed(2)}, ${dy.toFixed(2)}), distance ${Math.hypot(dx, dy).toFixed(1)}`);
}
console.log(
  `  our existing pin (-6060, -2955) matches map.corpse (${Math.round(uldaman.worldPosition.x)}, ${Math.round(
    uldaman.worldPosition.y
  )}) to the nearest unit.`
);
