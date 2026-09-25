// Trims wow.export's raw DB2 CSV exports down to the columns this project's
// map-data scripts actually read, and writes them into
// data/sources/client-db2/<build>/ as a small, committed, reproducible
// snapshot -- same "dated/versioned snapshot, never overwritten in place by
// accident" discipline as data/sources/talentsforever's own pulls, just
// keyed by client build instead of pull date since that's what actually
// changes this data.
//
// Source: the raw exports live outside this repo, in wow.export's own output
// folder (a local WoW.export install, not something to commit -- see
// CLAUDE.md's map-tile-pyramid note for the same "large local source, small
// derived snapshot in the repo" pattern already used for the map tiles).
//
// Usage: node scripts/trim-client-db2.js [sourceDir] [build]
//   sourceDir defaults to C:/Users/samue/wow.export (this machine's install)
//   build defaults to 1.60.1.70009, confirmed against this machine's
//   `World of Warcraft/.build.info` (wow_classic_beta product line) at the
//   time this script was written -- pass a different build explicitly if a
//   newer export is ever trimmed.
//
// NOTE: UiMap.csv (the base table UiMapAssignment.csv keys into -- display
// name, map type, flags) was NOT present in the source export this script
// was first run against, only UiMapAssignment.csv itself. This script does
// not fabricate it. Every field this project's zone-building script needs
// (zone display name, continent name, the assignment's own UiMapID) comes
// from AreaTable/Map/UiMapAssignment instead, so this gap doesn't block
// zones.json -- but if UiMap-level data (e.g. a UiMapID's own flags/type) is
// ever needed, export UiMap.csv from wow.export and add it here.

const fs = require("fs");
const path = require("path");
const { readCsv, writeCsv } = require("./lib/csv");

const sourceDir = process.argv[2] || "C:/Users/samue/wow.export";
const build = process.argv[3] || "1.60.1.70009";

const TABLES = {
  uimapassignment: {
    file: "UiMapAssignment.csv",
    columns: ["ID", "UiMin", "UiMax", "Region", "UiMapID", "OrderIndex", "MapID", "AreaID"],
  },
  areatable: {
    file: "AreaTable.csv",
    // FactionGroupMask added 2026-09-25: the real client-side zone-
    // territory field (0 = contested/neutral, 2 = Alliance, 4 = Horde --
    // confirmed against every EK/Kalimdor zone's own known Classic
    // territory before trusting it, see CLAUDE.md's "Zone territory"
    // session note). Not a bitmask combination in practice for these 49
    // zones -- only 0/2/4 ever appear.
    columns: ["ID", "ZoneName", "AreaName_lang", "ContinentID", "ParentAreaID", "ContentTuningID", "FactionGroupMask"],
  },
  contenttuning: {
    file: "ContentTuning.csv",
    columns: ["ID", "MinLevelSquish", "MaxLevelSquish", "LfgMinLevel", "LfgMaxLevel"],
  },
  map: {
    file: "Map.csv",
    columns: [
      "ID",
      "Directory",
      "MapName_lang",
      "InstanceType",
      "ParentMapID",
      "Corpse",
      "CorpseMapID",
      "AreaTableID",
    ],
  },
  areapoi: {
    file: "AreaPOI.csv",
    columns: ["ID", "Name_lang", "Pos", "ContinentID", "AreaID", "Icon", "Importance"],
  },
  // uimap: intentionally absent from this run -- see header comment.
};

const outDir = path.join(__dirname, "..", "data", "sources", "client-db2", build);
fs.mkdirSync(outDir, { recursive: true });

for (const [name, { file, columns }] of Object.entries(TABLES)) {
  const srcPath = path.join(sourceDir, file);
  if (!fs.existsSync(srcPath)) {
    console.log(`SKIP ${name}: ${srcPath} not found`);
    continue;
  }
  const rows = readCsv(srcPath);
  writeCsv(path.join(outDir, `${name}.csv`), rows, columns);
  console.log(`${name}: ${rows.length} rows -> data/sources/client-db2/${build}/${name}.csv`);
}

const uimapSrc = path.join(sourceDir, "UiMap.csv");
if (!fs.existsSync(uimapSrc)) {
  console.log(`SKIP uimap: ${uimapSrc} not found -- not exported this run, see this file's own header comment`);
}
