#!/usr/bin/env node
// Extends data/sources/cmangos/quest-givers.json (built by
// build-cmangos-quest-givers.js) with an optional map point per giver,
// derived from cmangos/classic-db's `creature`/`gameobject` spawn tables
// (position_x/position_y/map) -- the Full_DB dump this project already pulls
// quest text and giver names from.
//
// Coordinate approach (scoped in the 2026-10-02 quest-map-fixes-and-cmangos-
// coords-scoping handoff, Step 6): cmangos spawn coordinates are real WoW
// world coordinates (yards) on map 0 (Eastern Kingdoms) or map 1 (Kalimdor)
// -- the SAME coordinate system this project's own zone polygons
// (data/map/<continent>/zone-areas.json, built from wow.export ADT exports)
// already use, confirmed directly: Elwynn Forest's own worldBounds plus
// Northshire Abbey's well-known real-world coordinate (~-8950, -132) lands
// at roughly (48%, 44%) in zone-relative percent, close to Wowhead's own
// Brother Paxton point for the same chapel (49.4%, 40.4%) -- not exact (this
// project's zone worldBounds are a terrain-polygon bounding box, not
// Blizzard's own hand-authored WorldMapArea rectangle Wowhead's percent is
// relative to, so a few points of drift is expected and acceptable for a
// mini-map pin, not pixel-exact placement).
//
// Pipeline: point-in-polygon (reusing scripts/lib/polylabel.js, the same
// geometry build-zone-areas.js itself uses) assigns each spawn row to a zone
// polygon on its own continent; the spawn's position is then expressed as a
// percent of that zone's own worldBounds bbox, matching the xPct/yPct
// convention lib/quests.ts's WowheadPoint already uses (0-100, west->east /
// north->south) so QuestMap needs no new code path.
//
// A giver with spawns in more than one zone (patrol NPCs, reused generic
// templates) is resolved PER (quest, giver) pair -- not globally per npc --
// by preferring whichever candidate zone matches that quest's own known
// zone (data/sources/foreverchanges/quests/list.json's `c` field); falls
// back to the lowest spawn guid when there's no quest-zone match, or when
// the quest's own location isn't a real zone at all.
//
// Usage: node scripts/build-cmangos-quest-coords.js
// (Run build-cmangos-quest-givers.js first/again -- this script reads its
// name/type pairs as the giver list and REWRITES quest-givers.json with an
// added `id` and optional `point` field per giver entry.)

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const https = require("https");
const { pointInPolygon } = require("./lib/polylabel");

const DUMP_URL = "https://raw.githubusercontent.com/cmangos/classic-db/master/Full_DB/ClassicDB_1_12_1_z2815.sql.gz";
const GIVERS_FILE = path.join(__dirname, "..", "data", "sources", "cmangos", "quest-givers.json");
const QUESTS_FILE = path.join(__dirname, "..", "data", "sources", "foreverchanges", "quests", "list.json");
const ZONE_MAPS_DIR = path.join(__dirname, "..", "public", "images", "zone-maps");
const MAP_DATA_DIR = path.join(__dirname, "..", "data", "map");

// cmangos `map` id -> this project's own continent key (zones.json's own
// `continent` field for every zone used to come from this same mapping).
const CONTINENT_BY_MAP_ID = { 0: "eastern-kingdoms", 1: "kalimdor" };

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

// Same positional INSERT-tuple parser as build-cmangos-quest-text.js/
// build-cmangos-quest-givers.js -- duplicated per this repo's one-shot-script
// convention (see those files' own headers).
function parseInsertValues(text) {
  const rows = [];
  let pos = text.indexOf("VALUES");
  if (pos === -1) return rows;
  pos += "VALUES".length;
  const n = text.length;
  while (pos < n) {
    while (pos < n && /[\s;]/.test(text[pos])) pos++;
    if (pos >= n) break;
    if (text[pos] !== "(") {
      const nextInsert = text.indexOf("VALUES", pos);
      if (nextInsert === -1) break;
      pos = nextInsert + "VALUES".length;
      continue;
    }
    pos++;
    const row = [];
    for (;;) {
      while (pos < n && /\s/.test(text[pos])) pos++;
      if (text[pos] === "'") {
        pos++;
        let s = "";
        while (pos < n) {
          const ch = text[pos];
          if (ch === "\\") {
            const next = text[pos + 1];
            const map = { "'": "'", "\\": "\\", n: "\n", r: "\r", t: "\t", "0": "\0", '"': '"' };
            s += next in map ? map[next] : next;
            pos += 2;
            continue;
          }
          if (ch === "'") {
            if (text[pos + 1] === "'") {
              s += "'";
              pos += 2;
              continue;
            }
            pos++;
            break;
          }
          s += ch;
          pos++;
        }
        row.push(s);
      } else if (text.slice(pos, pos + 4) === "NULL") {
        row.push(null);
        pos += 4;
      } else {
        let s = "";
        while (pos < n && text[pos] !== "," && text[pos] !== ")") {
          s += text[pos];
          pos++;
        }
        row.push(s.trim());
      }
      while (pos < n && /\s/.test(text[pos])) pos++;
      if (text[pos] === ",") {
        pos++;
        continue;
      }
      if (text[pos] === ")") {
        pos++;
        break;
      }
      throw new Error(`Unexpected char at ${pos}: ${JSON.stringify(text.slice(pos, pos + 20))}`);
    }
    rows.push(row);
    while (pos < n && /\s/.test(text[pos])) pos++;
    if (text[pos] === ",") {
      pos++;
      continue;
    }
    if (text[pos] === ";") {
      const nextInsert = text.indexOf("VALUES", pos);
      if (nextInsert === -1) break;
      pos = nextInsert + "VALUES".length;
      continue;
    }
  }
  return rows;
}

function extractTable(sql, tableName) {
  const createIdx = sql.indexOf(`CREATE TABLE \`${tableName}\``);
  if (createIdx === -1) return [];
  const insertStart = sql.indexOf(`INSERT INTO \`${tableName}\``, createIdx);
  if (insertStart === -1) return [];
  const nextCreateIdx = sql.indexOf("\nCREATE TABLE", insertStart);
  const insertBlock = sql.slice(insertStart, nextCreateIdx === -1 ? sql.length : nextCreateIdx);
  return parseInsertValues(insertBlock);
}

// Builds, per continent key, a list of {areaId, worldBounds, rings} where
// rings is an array of {outer, holes} polygons (one per Polygon; a
// MultiPolygon contributes one per sub-polygon) -- read straight off disk,
// not via lib/zone-areas.ts (scripts/ is plain CommonJS, lib/ is TypeScript
// consumed by Next; see scripts/lib/chunk-grid-coords.js's own header for why
// this project never bridges the two).
function loadContinentZones(continentId) {
  const zones = JSON.parse(fs.readFileSync(path.join(MAP_DATA_DIR, continentId, "zones.json"), "utf8"));
  const areas = JSON.parse(fs.readFileSync(path.join(MAP_DATA_DIR, continentId, "zone-areas.json"), "utf8"));
  const out = [];
  for (const zone of zones) {
    const feature = areas[String(zone.areaId)];
    if (!feature) continue; // cities etc. with no terrain polygon (see zone-areas.ts's own comment)
    const polys =
      feature.geometry.type === "Polygon"
        ? [feature.geometry.coordinates]
        : feature.geometry.coordinates; // MultiPolygon: array of Polygon-shaped coordinate arrays
    const rings = polys.map((rings) => ({ outer: rings[0], holes: rings.slice(1) }));
    out.push({ areaId: zone.areaId, name: zone.name, worldBounds: zone.worldBounds, rings });
  }
  return out;
}

// worldX/worldY -> this zone's own (xPct, yPct), matching the west->east /
// north->south convention WowheadPoint already uses. WoW world coordinates
// increase worldX northward and worldY westward (see
// scripts/lib/chunk-grid-coords.js), so east = decreasing worldY and south =
// decreasing worldX.
function worldToZonePercent(worldBounds, worldX, worldY) {
  const { minX, maxX, minY, maxY } = worldBounds;
  const xPct = ((maxY - worldY) / (maxY - minY)) * 100;
  const yPct = ((maxX - worldX) / (maxX - minX)) * 100;
  return { xPct, yPct };
}

// Which zone (if any) on this continent's own zone list contains (worldX,
// worldY) -- null if it falls outside every traced polygon (ocean, an
// untraced gap, or a city with no polygon at all).
function findZone(zones, worldX, worldY) {
  for (const zone of zones) {
    for (const ring of zone.rings) {
      if (pointInPolygon(worldX, worldY, ring)) return zone;
    }
  }
  return null;
}

async function main() {
  console.log("Fetching cmangos/classic-db Full_DB dump (~13MB gzipped)...");
  const gz = await fetchBuffer(DUMP_URL);
  const sql = zlib.gunzipSync(gz).toString("utf8");
  console.log(`Decompressed to ${(sql.length / 1024 / 1024).toFixed(1)} MB.`);

  const zoneMapImageIds = new Set(
    fs
      .readdirSync(ZONE_MAPS_DIR)
      .filter((f) => f.endsWith(".jpg"))
      .map((f) => Number(f.slice(0, -4)))
  );
  const zonesByContinent = {
    "eastern-kingdoms": loadContinentZones("eastern-kingdoms"),
    kalimdor: loadContinentZones("kalimdor"),
  };

  // entry id -> [{guid, map, x, y}], per type (creature ids and gameobject
  // ids are separate id spaces).
  function loadSpawns(tableName) {
    const byEntry = new Map();
    for (const row of extractTable(sql, tableName)) {
      const guid = Number(row[0]);
      const id = Number(row[1]);
      const map = Number(row[2]);
      const x = Number(row[4]);
      const y = Number(row[5]);
      if (!byEntry.has(id)) byEntry.set(id, []);
      byEntry.get(id).push({ guid, map, x, y });
    }
    return byEntry;
  }
  const creatureSpawns = loadSpawns("creature");
  const gameobjectSpawns = loadSpawns("gameobject");

  // Resolve each spawn to a zone (cached per unique map+x+y+kind so a popular
  // spawn point is only point-in-polygon-tested once).
  const zoneCache = new Map();
  function resolveSpawnZone(map, x, y) {
    const continentId = CONTINENT_BY_MAP_ID[map];
    if (!continentId) return null;
    const key = `${continentId}:${x}:${y}`;
    if (zoneCache.has(key)) return zoneCache.get(key);
    const zone = findZone(zonesByContinent[continentId], x, y);
    const result = zone && zoneMapImageIds.has(zone.areaId) ? zone : null;
    zoneCache.set(key, result);
    return result;
  }

  // quest id -> its own known zone areaId, when foreverchanges resolved one
  // (locationKind "zone") -- used only as the ambiguous-giver tiebreaker.
  const questZoneById = new Map();
  for (const q of JSON.parse(fs.readFileSync(QUESTS_FILE, "utf8"))) {
    if (q.c && q.c[0] === "zone") questZoneById.set(q.i, q.c[1]);
  }

  const giversData = JSON.parse(fs.readFileSync(GIVERS_FILE, "utf8"));
  let questsWithPoint = 0;
  let questsConsidered = 0;
  let tiebreaksApplied = 0;
  let tiebreaksAmbiguousNoMatch = 0;

  for (const [questIdStr, givers] of Object.entries(giversData.givers)) {
    const questId = Number(questIdStr);
    const knownZoneId = questZoneById.get(questId) ?? null;
    for (const giver of givers) {
      questsConsidered++;
      const spawnMap = giver.type === "creature" ? creatureSpawns : gameobjectSpawns;
      const entryId = giver.id;
      const spawns = entryId !== undefined ? spawnMap.get(entryId) : undefined;
      if (!spawns || spawns.length === 0) continue;

      // Resolve each spawn to a (zone, pct) candidate; drop spawns with no
      // mappable zone.
      const candidates = [];
      for (const spawn of spawns) {
        const zone = resolveSpawnZone(spawn.map, spawn.x, spawn.y);
        if (!zone) continue;
        candidates.push({ guid: spawn.guid, zone, x: spawn.x, y: spawn.y });
      }
      if (candidates.length === 0) continue;

      const distinctZoneIds = new Set(candidates.map((c) => c.zone.areaId));
      let chosen;
      if (distinctZoneIds.size === 1) {
        chosen = candidates.reduce((a, b) => (b.guid < a.guid ? b : a));
      } else {
        const matchingKnownZone = knownZoneId !== null ? candidates.filter((c) => c.zone.areaId === knownZoneId) : [];
        if (matchingKnownZone.length > 0) {
          tiebreaksApplied++;
          chosen = matchingKnownZone.reduce((a, b) => (b.guid < a.guid ? b : a));
        } else {
          tiebreaksAmbiguousNoMatch++;
          chosen = candidates.reduce((a, b) => (b.guid < a.guid ? b : a));
        }
      }

      const { xPct, yPct } = worldToZonePercent(chosen.zone.worldBounds, chosen.x, chosen.y);
      giver.point = { zoneId: chosen.zone.areaId, zone: chosen.zone.name, xPct, yPct };
    }
    if (givers.some((g) => g.point)) questsWithPoint++;
  }

  giversData.coordsBuiltDate = new Date().toISOString().slice(0, 10);
  giversData.coordsSourceTables = ["creature", "gameobject"];
  fs.writeFileSync(GIVERS_FILE, JSON.stringify(giversData, null, 0));

  console.log(`Quests considered (have >=1 giver row): ${questsConsidered === 0 ? 0 : Object.keys(giversData.givers).length}`);
  console.log(`Quests that got a map point: ${questsWithPoint} / ${Object.keys(giversData.givers).length} (${((questsWithPoint / Object.keys(giversData.givers).length) * 100).toFixed(1)}%)`);
  console.log(`Ambiguous givers resolved via quest-zone tiebreaker: ${tiebreaksApplied}`);
  console.log(`Ambiguous givers with no quest-zone match (fell back to lowest guid): ${tiebreaksAmbiguousNoMatch}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
