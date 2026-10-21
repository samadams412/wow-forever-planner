#!/usr/bin/env node
// Builds data/base-stats.json: naked base attributes, health and mana per
// level -> class -> race, for every race/class pair data/races.json allows.
//
// Source: cmangos/classic-db (GPL-3.0) Full_DB dump, tables player_levelstats
// (race, class, level -> str/agi/sta/int/spi) and player_classlevelstats
// (class, level -> base health/mana), pinned to the commit below. Same dump
// as scripts/build-cmangos-quest-*.js; fetched into memory, never committed.
//
// Every entry carries `basis`:
//   classic         the Classic 1.12 row itself (confidence "datamined": a
//                   Classic-era value, not verified against Forever).
//   race-offset     a race/class pair Classic never had (Undead Paladin,
//                   Dwarf Shaman...): for each Classic race that has the
//                   class, take its row and add the target race's average
//                   stat difference from that race at the same level (over
//                   the classes both had in Classic); average those
//                   estimates and round. confidence "estimated".
//   class-average   Skyborne, which has no Classic race row at all: the
//                   class's mean over every Classic race that has it.
//                   confidence "estimated"; the real race offset is unknown.
// Health and mana depend only on class and level, so they are Classic values
// for every race. `--check` prints a leave-one-out error for both
// derivations against real Classic rows.
//
// Usage: node scripts/build-base-stats.js [--check]

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const https = require("https");

const COMMIT = "28ef6259c782928b08a8dc9cacf6bc02e64f2b29"; // last commit touching Full_DB/ (2024-01-17)
const FILE = "Full_DB/ClassicDB_1_12_1_z2815.sql.gz";
const DUMP_URL = `https://raw.githubusercontent.com/cmangos/classic-db/${COMMIT}/${FILE}`;
const ROOT = path.join(__dirname, "..");
const OUT_FILE = path.join(ROOT, "data", "base-stats.json");

const RACE_IDS = { human: 1, orc: 2, dwarf: 3, "night-elf": 4, undead: 5, tauren: 6, gnome: 7, troll: 8 };
const CLASS_IDS = { warrior: 1, paladin: 2, hunter: 3, rogue: 4, priest: 5, shaman: 7, mage: 8, warlock: 9, druid: 11 };
const ATTRS = ["str", "agi", "sta", "int", "spi"];
const MAX_LEVEL = 60;

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`${url}: HTTP ${res.statusCode}`));
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function insertRows(sql, table, arity) {
  const line = sql.split("\n").find((l) => l.startsWith(`INSERT INTO \`${table}\` VALUES `));
  if (!line) throw new Error(`table ${table} not found in dump`);
  const tuple = new RegExp(`\\(${Array(arity).fill("(-?\\d+)").join(",")}\\)`, "g");
  return [...line.matchAll(tuple)].map((m) => m.slice(1).map(Number));
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

function buildIndex(levelRows) {
  const stats = new Map(); // "race-class-level" -> [str, agi, sta, int, spi]
  for (const [race, cls, level, ...attrs] of levelRows) stats.set(`${race}-${cls}-${level}`, attrs);
  return stats;
}

// Average per-attribute difference (race - refRace) at `level` over the
// classes both races have in Classic, skipping `excludeClass`.
function raceOffset(stats, race, refRace, level, excludeClass) {
  const diffs = [];
  for (const cls of Object.values(CLASS_IDS)) {
    if (cls === excludeClass) continue;
    const a = stats.get(`${race}-${cls}-${level}`);
    const b = stats.get(`${refRace}-${cls}-${level}`);
    if (a && b) diffs.push(a.map((v, i) => v - b[i]));
  }
  return diffs.length ? ATTRS.map((_, i) => mean(diffs.map((d) => d[i]))) : null;
}

function raceOffsetEstimate(stats, race, cls, level) {
  const estimates = [];
  for (const ref of Object.values(RACE_IDS)) {
    if (ref === race) continue;
    const row = stats.get(`${ref}-${cls}-${level}`);
    const off = row && raceOffset(stats, race, ref, level, cls);
    if (off) estimates.push(row.map((v, i) => v + off[i]));
  }
  return estimates.length ? ATTRS.map((_, i) => Math.round(mean(estimates.map((e) => e[i])))) : null;
}

function classAverage(stats, cls, level, excludeRace) {
  const rows = Object.values(RACE_IDS)
    .filter((r) => r !== excludeRace)
    .map((r) => stats.get(`${r}-${cls}-${level}`))
    .filter(Boolean);
  return ATTRS.map((_, i) => Math.round(mean(rows.map((row) => row[i]))));
}

function leaveOneOut(stats) {
  const err = { "race-offset": [], "class-average": [] };
  for (const [key, actual] of stats) {
    const [race, cls, level] = key.split("-").map(Number);
    const ro = raceOffsetEstimate(stats, race, cls, level);
    const ca = classAverage(stats, cls, level, race);
    for (let i = 0; i < ATTRS.length; i++) {
      if (ro) err["race-offset"].push(Math.abs(ro[i] - actual[i]));
      err["class-average"].push(Math.abs(ca[i] - actual[i]));
    }
  }
  for (const [name, e] of Object.entries(err)) {
    const sorted = [...e].sort((a, b) => a - b);
    console.log(`${name}: mean abs error ${mean(e).toFixed(2)}, p95 ${sorted[Math.floor(0.95 * sorted.length)]}, max ${sorted.at(-1)} (per attribute, ${e.length} values)`);
  }
}

async function main() {
  const races = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "races.json"), "utf8"));
  console.log(`fetching ${DUMP_URL}`);
  const sql = zlib.gunzipSync(await fetchBuffer(DUMP_URL)).toString("utf8");
  const stats = buildIndex(insertRows(sql, "player_levelstats", 8));
  const classLevel = new Map(insertRows(sql, "player_classlevelstats", 4).map(([c, l, hp, mana]) => [`${c}-${l}`, { hp, mana }]));
  console.log(`player_levelstats ${stats.size} rows, player_classlevelstats ${classLevel.size} rows`);
  if (process.argv.includes("--check")) leaveOneOut(stats);

  const levels = {};
  const counts = { classic: 0, "race-offset": 0, "class-average": 0 };
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const byClass = (levels[level] = {});
    for (const [classId, cls] of Object.entries(CLASS_IDS)) {
      const base = classLevel.get(`${cls}-${level}`);
      if (!base) throw new Error(`no player_classlevelstats row for class ${classId} level ${level}`);
      for (const race of races) {
        if (!race.allowedClasses.includes(classId)) continue;
        const raceNum = RACE_IDS[race.id];
        let attrs = raceNum && stats.get(`${raceNum}-${cls}-${level}`);
        let basis = "classic";
        if (!attrs && raceNum) { attrs = raceOffsetEstimate(stats, raceNum, cls, level); basis = "race-offset"; }
        if (!attrs) { attrs = classAverage(stats, cls, level, null); basis = "class-average"; }
        counts[basis]++;
        (byClass[classId] ??= {})[race.id] = {
          ...Object.fromEntries(ATTRS.map((a, i) => [a, attrs[i]])),
          health: base.hp,
          mana: base.mana,
          confidence: basis === "classic" ? "datamined" : "estimated",
          basis,
        };
      }
    }
  }

  const out = {
    source: {
      repo: "cmangos/classic-db",
      commit: COMMIT,
      file: FILE,
      tables: ["player_levelstats", "player_classlevelstats"],
      license: "GPL-3.0",
      era: "Classic 1.12 values; not verified against Forever",
    },
    generatedBy: "scripts/build-base-stats.js",
    derivation: {
      classic: "the Classic row as-is",
      "race-offset": "race/class pair new in Forever: mean over Classic races with the class of (their row + target race's mean per-attribute difference from them at that level), rounded",
      "class-average": "race with no Classic data (Skyborne): mean of the class over Classic races, rounded; the true race offset is unknown",
    },
    levels,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(out) + "\n");
  console.log(`wrote ${path.relative(ROOT, OUT_FILE)} (${(fs.statSync(OUT_FILE).size / 1024).toFixed(0)} KB) per level: ${JSON.stringify(Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / MAX_LEVEL])))}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
