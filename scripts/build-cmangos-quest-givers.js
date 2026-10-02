#!/usr/bin/env node
// Pulls creature_questrelation/creature_involvedrelation (+ creature_template
// for names) and gameobject_questrelation/gameobject_involvedrelation (+
// gameobject_template for names) from cmangos/classic-db (GPL-3.0, same dump
// as scripts/build-cmangos-quest-text.js) and extracts "who gives/ends this
// quest" into data/sources/cmangos/quest-givers.json, keyed by quest id.
//
// Table naming note (confirmed by inspecting the dump directly, not
// assumed): mangos-family schemas split quest givers into two relation
// tables per npc/object type -- `*_questrelation` (quest START) and
// `*_involvedrelation` (quest END/turn-in), NOT `*_queststarter`/
// `*_questender` as the task brief guessed. This script only surfaces the
// START giver's name ("Quest Giver: <name>") -- the turn-in npc may differ
// and isn't surfaced here, matching the task's own "name only" scope.
//
// The full ~73MB decompressed SQL dump is fetched into memory and discarded
// after parsing -- never committed (see CLAUDE.md's standing rule against
// committing large external pulls).
//
// Usage: node scripts/build-cmangos-quest-givers.js

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const https = require("https");

const DUMP_URL = "https://raw.githubusercontent.com/cmangos/classic-db/master/Full_DB/ClassicDB_1_12_1_z2815.sql.gz";
const OUT_FILE = path.join(__dirname, "..", "data", "sources", "cmangos", "quest-givers.json");

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

// Same positional INSERT-tuple parser as build-cmangos-quest-text.js --
// duplicated rather than shared, consistent with this repo's existing
// one-shot-script convention (see that file's own header).
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

async function main() {
  console.log("Fetching cmangos/classic-db Full_DB dump (~13MB gzipped)...");
  const gz = await fetchBuffer(DUMP_URL);
  const sql = zlib.gunzipSync(gz).toString("utf8");
  console.log(`Decompressed to ${(sql.length / 1024 / 1024).toFixed(1)} MB.`);

  // id -> name lookups. Both *_template tables' first two columns are
  // (Entry, Name) -- confirmed by reading each CREATE TABLE statement
  // directly.
  const creatureNames = new Map();
  for (const row of extractTable(sql, "creature_template")) creatureNames.set(row[0], row[1]);
  const gameobjectNames = new Map();
  for (const row of extractTable(sql, "gameobject_template")) gameobjectNames.set(row[0], row[1]);

  // relation tables: (id, quest) -- id is the creature/gameobject entry.
  const giverByQuest = new Map(); // quest -> [{name, type, id}]
  function addRelations(tableName, nameMap, type) {
    for (const row of extractTable(sql, tableName)) {
      const [entry, quest] = row;
      const name = nameMap.get(entry);
      if (!name) continue;
      if (!giverByQuest.has(quest)) giverByQuest.set(quest, []);
      const list = giverByQuest.get(quest);
      // `id` (the creature/gameobject template entry) is kept alongside the
      // display name so build-cmangos-quest-coords.js can join spawn rows
      // back to this exact giver without re-deriving ids from names.
      if (!list.some((g) => g.name === name && g.type === type)) list.push({ name, type, id: Number(entry) });
    }
  }
  addRelations("creature_questrelation", creatureNames, "creature");
  addRelations("gameobject_questrelation", gameobjectNames, "gameobject");

  const out = {};
  for (const [quest, givers] of giverByQuest) out[quest] = givers;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        source: "https://github.com/cmangos/classic-db",
        license: "GPL-3.0",
        tables: ["creature_questrelation", "gameobject_questrelation", "creature_template", "gameobject_template"],
        pulledDate: new Date().toISOString().slice(0, 10),
        questCount: Object.keys(out).length,
        givers: out,
      },
      null,
      0,
    ),
  );
  console.log(`Wrote quest-giver data for ${Object.keys(out).length} quests to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
