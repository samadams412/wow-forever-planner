#!/usr/bin/env node
// Builds data/map-pois/towns.json from the client's AreaPOI table
// (data/sources/client-db2/<build>/areapoi.csv) -- the world-map town/city
// markers. Generated, never hand-edited: re-run after a new client pull.
//
// AreaPOI's Icon column is the client's own world-map POI icon index. On
// the two continents (ContinentID 0/1) it splits cleanly, checked by
// listing every row per Icon/Importance before picking a rule:
//   Icon 5                    capital cities (Stormwind, Orgrimmar, ...)
//   Icon 4                    towns (Lakeshire, Crossroads, Booty Bay, ...)
//   Icon 6, Importance >= 2   villages (Northshire Abbey, Brill, Kharanos, ...)
// Everything else is excluded: Icon 6 Importance 0 is 149 minor landmarks
// (caves, keeps, outposts -- out of scope for this layer by decision), Icon
// 9-12/41/42 are Eastern Plaguelands towers and world-event markers, and
// Icon 7 is Stormwind shop signs whose Pos isn't a continent world position.
// Brackenwall Village (Kalimdor, AreaPOI 1684) is Icon 15, an icon the client
// otherwise only uses for Alterac Valley graveyards, so the rule would miss
// it -- it's added back as a Town by row id.
// AreaPOI has no faction column, so towns carry no faction (neutral pin).
//
// Usage: node scripts/build-towns.js [build]

const fs = require("fs");
const path = require("path");
const { readCsv } = require("./lib/csv");

const build = process.argv[2] || "1.60.1.70009";
const rows = readCsv(path.join(__dirname, "..", "data", "sources", "client-db2", build, "areapoi.csv"));

const CONTINENT_SLUG = { "0": "eastern-kingdoms", "1": "kalimdor" };

function tier(row) {
  const importance = Number(row.Importance);
  if (row.Icon === "5") return "Capital city";
  if (row.ID === "1684") return "Town"; // Brackenwall Village, see header
  if (row.Icon === "4") return "Town";
  if (row.Icon === "6" && importance >= 2) return "Village";
  return null;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const towns = [];
for (const row of rows) {
  const continent = CONTINENT_SLUG[row.ContinentID];
  const kind = tier(row);
  if (!continent || !kind) continue;
  const [x, y] = row.Pos.split(",").map(Number);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`AreaPOI ${row.ID} ${row.Name_lang}: unparseable Pos "${row.Pos}"`);
  towns.push({
    id: `${slugify(row.Name_lang)}-${row.ID}`,
    name: row.Name_lang.trim(),
    kind,
    continent,
    worldPosition: { x, y },
    source: "Forever client (AreaPOI)",
  });
}

towns.sort((a, b) => a.continent.localeCompare(b.continent) || a.name.localeCompare(b.name));

const output = {
  _readme: `World-map towns and cities from the client's AreaPOI table (build ${build}), built by scripts/build-towns.js -- see its header comment for the Icon/Importance rule. Generated; don't hand-edit. \`id\` is a name slug plus the AreaPOI row id.`,
  towns,
};
fs.writeFileSync(path.join(__dirname, "..", "data", "map-pois", "towns.json"), JSON.stringify(output, null, 2) + "\n");

const counts = {};
for (const t of towns) counts[`${t.continent} ${t.kind}`] = (counts[`${t.continent} ${t.kind}`] || 0) + 1;
console.log(`Wrote ${towns.length} towns -> data/map-pois/towns.json`, counts);
