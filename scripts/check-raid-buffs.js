#!/usr/bin/env node
// Validates data/raid-buffs.json against the site's own class data, so a
// renamed or removed spell/talent fails the build instead of silently
// dropping a buff from the raid comp planner. Runs in `prebuild`.
//
//   node scripts/check-raid-buffs.js [path/to/raid-buffs.json]
//
// Exit 1 with one line per problem; exit 0 and a one-line summary otherwise.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, "data", "raid-buffs.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const spellbooks = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "spellbooks.json"), "utf8")).classes;

const CLASSES = ["warrior", "paladin", "hunter", "rogue", "priest", "shaman", "mage", "warlock", "druid"];
const CONFIDENCE = new Set(["confirmed", "datamined", "estimated"]);
const SCOPES = { buff: new Set(["raid", "group", "target"]), debuff: new Set(["enemy"]) };

const talentsByClass = {};
for (const c of CLASSES) {
  talentsByClass[c] = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "talents", `${c}.json`), "utf8"));
}
const spellIn = (classId, name) =>
  spellbooks[classId]?.tabs.flatMap((t) => t.spells).find((s) => s.name === name);

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

if (!data.source) err("top level", "missing `source` provenance");
if (!data.build) err("top level", "missing `build`");

const setIds = (key) => {
  const ids = new Set();
  for (const s of data[key] ?? []) {
    if (ids.has(s.id)) err(`${key}.${s.id}`, "duplicate id");
    ids.add(s.id);
    if (!CONFIDENCE.has(s.confidence)) err(`${key}.${s.id}`, `bad confidence "${s.confidence}"`);
    if (key === "perCaster" && !CLASSES.includes(s.classId)) err(`${key}.${s.id}`, `unknown classId "${s.classId}"`);
  }
  return ids;
};
const onlyOneIds = setIds("onlyOneCounts");
const perCasterIds = setIds("perCaster");
const perCasterClass = Object.fromEntries((data.perCaster ?? []).map((s) => [s.id, s.classId]));

const effectIds = new Set();
for (const e of data.effects ?? []) {
  const at = `effect "${e.id}"`;
  if (effectIds.has(e.id)) err(at, "duplicate id");
  effectIds.add(e.id);
  if (!e.name) err(at, "missing name");
  if (!SCOPES[e.kind]) err(at, `bad kind "${e.kind}"`);
  else if (!SCOPES[e.kind].has(e.scope)) err(at, `scope "${e.scope}" isn't valid for a ${e.kind}`);
  if (!CONFIDENCE.has(e.confidence)) err(at, `bad confidence "${e.confidence}"`);
  if (e.onlyOneCounts && !onlyOneIds.has(e.onlyOneCounts)) err(at, `unknown onlyOneCounts "${e.onlyOneCounts}"`);
  if (e.perCaster && !perCasterIds.has(e.perCaster)) err(at, `unknown perCaster "${e.perCaster}"`);
  if (!Array.isArray(e.sources) || e.sources.length === 0) {
    err(at, "no sources");
    continue;
  }
  if (e.raidSpell && !e.sources.some((s) => spellIn(s.classId, e.raidSpell))) {
    err(at, `raidSpell "${e.raidSpell}" not found in any source class's spellbook`);
  }

  for (const s of e.sources) {
    const sat = `${at} source ${s.classId}/${s.spell ?? s.talent}`;
    if (!CLASSES.includes(s.classId)) {
      err(sat, `unknown classId "${s.classId}"`);
      continue;
    }
    if (!CONFIDENCE.has(s.confidence)) err(sat, `bad confidence "${s.confidence}"`);
    if (e.perCaster && perCasterClass[e.perCaster] !== s.classId) {
      err(sat, `perCaster set "${e.perCaster}" is for ${perCasterClass[e.perCaster]}, not ${s.classId}`);
    }
    const trees = talentsByClass[s.classId].trees;
    if (s.specs !== "all") {
      if (!Array.isArray(s.specs) || s.specs.length === 0) err(sat, `specs must be "all" or a list of tree names`);
      else for (const t of s.specs) if (!trees.some((tr) => tr.name === t)) err(sat, `no "${t}" talent tree for ${s.classId}`);
    }
    if (!!s.spell === !!s.talent) {
      err(sat, "needs exactly one of `spell` or `talent`");
    } else if (s.spell) {
      const sp = spellIn(s.classId, s.spell);
      if (!sp) err(sat, `spell "${s.spell}" not found in ${s.classId}'s spellbook`);
      else if (sp.talent && s.specs === "all") {
        err(sat, `"${s.spell}" is flagged talent: true in the spellbook; credit it to its tree, not "all"`);
      }
    } else {
      const homes = trees.filter((tr) => tr.talents.some((t) => t.name === s.talent)).map((tr) => tr.name);
      if (homes.length === 0) err(sat, `talent "${s.talent}" not found in ${s.classId}'s talent trees`);
      else if (s.specs === "all") err(sat, `a talent can't be credited to "all" specs (it's in ${homes.join(", ")})`);
      else if (Array.isArray(s.specs) && !s.specs.every((t) => homes.includes(t))) {
        err(sat, `talent "${s.talent}" is in ${homes.join(", ")}, not ${s.specs.join(", ")}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`check-raid-buffs: ${errors.length} problem(s) in ${path.relative(ROOT, file)}`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`check-raid-buffs: ${effectIds.size} effects OK (${path.relative(ROOT, file)})`);
