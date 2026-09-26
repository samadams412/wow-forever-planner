// Builds data/map-pois/flight-masters.json from the client's own TaxiNodes
// table (data/sources/client-db2/<build>/taxinodes.csv).
//
// Faction comes from TaxiNodes' own `Flags` field, a bitmask (1 = Alliance,
// 2 = Horde, 3 = both) -- confirmed against known real nodes before trusting
// it, not guessed: Ironforge/Stormwind/Sentinel Hill = 1, Orgrimmar/Thunder
// Bluff/Undercity = 2, Ratchet/Marshal's Refuge/the four Eastern Plaguelands
// towers (both factions can use these, a real vanilla mechanic) = 3. Cross-
// checked a second, independent way against the same rows'
// `MountCreatureID` pair (`<hordeMountId>,<allianceMountId>`, 0 where that
// faction has no mount) -- every Flags=1 row has mount slot 2 only (Gryphon
// 541, or Hippogryph 3837 for Night Elf zones), every Flags=2 row has mount
// slot 1 only (Wind Rider 2224, or Bat 3574 for Undercity/Tirisfal/EPL),
// and every Flags=3 row has both slots filled -- zero disagreements across
// all 87 rows, so Flags alone is a reliable, complete signal.
//
// `Flags === 0` is treated as "not a real, currently-visible flight point"
// and excluded outright -- every one of the 16 rows this applies to is
// independently confirmed by name/context to be a non-player node: plain
// waypoints used only for flight-path routing (Northshire Abbey, the
// duplicate/superseded Booty Bay entry, the bare "Eastern Plaguelands"
// entry since superseded by Light's Hope Chapel, "Fishing Village,
// Teldrassil"), boat/zeppelin transport stops ("Transport, ...", "Generic,
// World target..."), a raid-mechanic point (Naxxramas -- not a player taxi
// destination), a dev/test island (Programmer Isle), and three quest-scoped
// one-off taxi paths ("Quest Path 9571/9574/9620: ..."). See the exclusion
// list this script prints for the full per-node reasoning.
//
// Two further nodes (Dun Baldar / Frostwolf Keep) are real, faction-visible
// flight points but sit on ContinentID 30 -- the Alterac Valley battleground
// instance map, not Eastern Kingdoms (0) or Kalimdor (1) -- so they're
// excluded as out of scope for the two continents this project renders, not
// as non-player nodes.
//
// Usage: node scripts/build-flight-masters.js [build]

const fs = require("fs");
const path = require("path");
const { readCsv } = require("./lib/csv");

const build = process.argv[2] || "1.60.1.70009";
const dbDir = path.join(__dirname, "..", "data", "sources", "client-db2", build);

const rows = readCsv(path.join(dbDir, "taxinodes.csv"));

const CONTINENT_SLUG = { "0": "eastern-kingdoms", "1": "kalimdor" };
const FACTION_BY_FLAGS = { "1": "Alliance", "2": "Horde", "3": "Both" };

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const included = [];
const excluded = [];

for (const row of rows) {
  const clientId = row.ID;
  const name = row.Name_lang;
  const flags = row.Flags;

  if (flags === "0" || !flags) {
    excluded.push({
      clientId,
      name,
      reason: "Flags=0 -- not a live, faction-visible flight point in this build (transport/quest-path/waypoint/test node)",
    });
    continue;
  }

  const faction = FACTION_BY_FLAGS[flags];
  if (!faction) {
    excluded.push({ clientId, name, reason: `unexpected Flags value "${flags}"` });
    continue;
  }

  const continent = CONTINENT_SLUG[row.ContinentID];
  if (!continent) {
    const reason =
      row.ContinentID === "30"
        ? "ContinentID 30 -- the Alterac Valley battleground instance map, not Eastern Kingdoms/Kalimdor"
        : `ContinentID ${row.ContinentID} is not Eastern Kingdoms (0) or Kalimdor (1)`;
    excluded.push({ clientId, name, reason });
    continue;
  }

  const [xStr, yStr] = row.Pos.split(",");
  const x = Number(xStr);
  const y = Number(yStr);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    excluded.push({ clientId, name, reason: `unparseable Pos "${row.Pos}"` });
    continue;
  }

  included.push({
    id: `${slugify(name)}-${clientId}`,
    name,
    continent,
    worldPosition: { x, y },
    faction,
    source: "Forever client (TaxiNodes)",
  });
}

included.sort((a, b) => (a.continent === b.continent ? a.name.localeCompare(b.name) : a.continent.localeCompare(b.continent)));

const outDir = path.join(__dirname, "..", "data", "map-pois");
fs.mkdirSync(outDir, { recursive: true });

const output = {
  _readme:
    "Flight-master nodes from the client's own TaxiNodes table (data/sources/client-db2/<build>/taxinodes.csv), built by scripts/build-flight-masters.js -- see that script's own header comment for the Flags-bitmask faction derivation, its MountCreatureID cross-check, and the full exclusion reasoning (16 non-player/inactive nodes, plus 2 real flight points on the Alterac Valley battleground instance map that this project's two-continent map doesn't render). `id` is a name slug plus the client's own numeric TaxiNodes id, for traceability back to the source row.",
  flightMasters: included,
};

fs.writeFileSync(path.join(outDir, "flight-masters.json"), JSON.stringify(output, null, 2) + "\n");

const byContinentFaction = {};
for (const f of included) {
  byContinentFaction[f.continent] = byContinentFaction[f.continent] || {};
  byContinentFaction[f.continent][f.faction] = (byContinentFaction[f.continent][f.faction] || 0) + 1;
}

console.log(`Wrote ${included.length} flight masters -> data/map-pois/flight-masters.json`);
for (const [continent, byFaction] of Object.entries(byContinentFaction)) {
  const total = Object.values(byFaction).reduce((a, b) => a + b, 0);
  console.log(`  ${continent}: ${total} total (${Object.entries(byFaction).map(([f, n]) => `${f} ${n}`).join(", ")})`);
}

console.log(`\nExcluded ${excluded.length}:`);
for (const e of excluded) {
  console.log(`  [${e.clientId}] ${e.name}: ${e.reason}`);
}
