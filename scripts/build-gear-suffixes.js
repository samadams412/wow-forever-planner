#!/usr/bin/env node
// Builds data/gear/suffixes.json: Forever's random suffixes ("...of the Eagle")
// from the client's own bonus tables, data/sources/client-db2/<build>/ (trimmed
// by scripts/trim-client-db2.js from a wow.export export).
//
// Forever has no Classic ItemRandomProperties/ItemRandomSuffix tables; it uses
// retail-style bonus lists:
//   eligibility  ItemXBonusTree (item -> tree) -> ItemBonusTreeNode rows of that
//                tree with ItemContext 0 -> ChildItemBonusListID. A list counts
//                as a suffix when it carries a name (ItemBonus type 5).
//   stats        ItemBonus type 2: Value[0] client stat id, Value[1] allocation
//                (/10000). Stat = round(budget x allocation / 10000), budget =
//                RandPropPoints[itemLevel] Good|Superior|Epic[slot group]; the
//                item's own fixed stats come on top (lib/item-suffixes.ts).
//   effects      ItemBonus type 23: an ItemEffect id ("of Eluding": 213334 -> spell
//                13669, +1% dodge). Decoding the text needs ItemEffect, Spell, SpellEffect.
//   name         ItemBonus type 5 -> ItemNameDescription.
// Checked 2026-10-20: the same formula reproduces 4,466 of 4,557 ItemSparse base
// items' fixed stats against our tooltips, and all 232 suffix items
// foreverchanges shows (their numbers graded ours, nothing copied).
//
// Not covered: items whose tree nests other trees or uses an ItemContext (49
// Forever "Restored ..." items; an upgrade system, not random suffixes).
//
// Fails (exit 1) on a suffix stat id without a key, an unknown bonus type in
// a suffix list, or a budget row missing a quality.
//
// Usage: node scripts/build-gear-suffixes.js [build]

const fs = require("fs");
const path = require("path");
const { readCsv } = require("./lib/csv");

const ROOT = path.join(__dirname, "..");
const build = process.argv[2] || "1.60.1.70450";
const dir = path.join(ROOT, "data", "sources", "client-db2", build);
const OUT_FILE = path.join(ROOT, "data", "gear", "suffixes.json");

// Client stat id -> lib/item-stats.ts StatKey. Every id here was matched against
// our parsed tooltips (ItemSparse base items, budget formula) and the suffix
// names it appears under: 51-56 "of Fire/Frost/.../Arcane Resistance",
// 84-89 "of Holy/Fiery/Nature's/Frozen/Shadow/Arcane Wrath".
const STAT_IDS = {
  3: "agi", 4: "str", 5: "int", 6: "spi", 7: "sta",
  12: "defRating", 13: "dodgeRating", 14: "parryRating", 15: "blockRating",
  31: "hitRating", 32: "critRating", 36: "hasteRating", 37: "expertiseRating",
  38: "ap", 39: "rap", 41: "heal", 42: "spellDmg", 43: "mp5", 45: "sp", 46: "hp5", 47: "spellPen",
  48: "blockValue", 50: "bonusArmor",
  51: "fireRes", 52: "frostRes", 54: "shadowRes", 55: "natureRes", 56: "arcaneRes",
  84: "holyDmg", 85: "fireDmg", 86: "natureDmg", 87: "frostDmg", 88: "shadowDmg", 89: "arcaneDmg",
};
const NAME = 5, STAT = 2, EFFECT = 23;
const IGNORED = new Set([54]); // zero-valued flag rows on some caster suffixes ("of Magic")

const read = (t) => readCsv(path.join(dir, `${t}.csv`));
const nums = (v) => v.split(",").map(Number);
const names = new Map(read("itemnamedescription").map((r) => [r.ID, r.Description_lang]));
const bonusByList = new Map();
for (const b of read("itembonus")) {
  if (!bonusByList.has(b.ParentItemBonusListID)) bonusByList.set(b.ParentItemBonusListID, []);
  bonusByList.get(b.ParentItemBonusListID).push(b);
}
const nodesByTree = new Map();
for (const n of read("itembonustreenode")) {
  if (!nodesByTree.has(n.ParentItemBonusTreeID)) nodesByTree.set(n.ParentItemBonusTreeID, []);
  nodesByTree.get(n.ParentItemBonusTreeID).push(n);
}

const problems = [];
const suffixes = {};
function suffix(listId) {
  if (listId in suffixes) return suffixes[listId];
  const rows = (bonusByList.get(listId) ?? []).sort((a, b) => Number(a.OrderIndex) - Number(b.OrderIndex));
  const nameRow = rows.find((r) => Number(r.Type) === NAME);
  if (!nameRow) return (suffixes[listId] = null);
  const out = { name: names.get(String(nums(nameRow.Value)[0])) ?? null, alloc: [], effects: [] };
  if (out.name === "Test") return (suffixes[listId] = null); // dev record (list 13758, item 274960, not in the catalog)
  if (!out.name) problems.push(`list ${listId}: name id ${nums(nameRow.Value)[0]} not in ItemNameDescription`);
  for (const r of rows) {
    const [a, b] = nums(r.Value), type = Number(r.Type);
    if (type === STAT) {
      if (!STAT_IDS[a]) problems.push(`list ${listId} (${out.name}): stat id ${a} has no key`);
      out.alloc.push([STAT_IDS[a], b]);
    } else if (type === EFFECT) out.effects.push(a);
    else if (type !== NAME && !IGNORED.has(type)) problems.push(`list ${listId} (${out.name}): bonus type ${type} not handled`);
  }
  return (suffixes[listId] = out);
}

const items = {}; // itemId -> treeId
const trees = {}; // treeId -> suffix list ids (many items share a tree)
const skipped = [];
for (const x of read("itemxbonustree")) {
  const nodes = nodesByTree.get(x.ItemBonusTreeID) ?? [];
  if (nodes.some((n) => n.ChildItemBonusTreeID !== "0" || n.ItemContext !== "0" || n.ChildItemBonusListGroupID !== "0")) {
    skipped.push(Number(x.ItemID));
    continue;
  }
  const lists = nodes.map((n) => n.ChildItemBonusListID).filter((l) => suffix(l));
  if (!lists.length) continue;
  items[x.ItemID] = Number(x.ItemBonusTreeID);
  trees[x.ItemBonusTreeID] = lists.map(Number);
}

// Budgets per item level: [Good, Superior, Epic] x 5 slot groups.
const budgets = {};
for (const r of read("randproppoints")) {
  const row = { 2: nums(r.Good), 3: nums(r.Superior), 4: nums(r.Epic) };
  if (Object.values(row).some((v) => v.length !== 5)) problems.push(`RandPropPoints ${r.ID}: expected 5 budgets per quality`);
  budgets[r.ID] = row;
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const used = Object.fromEntries(Object.entries(suffixes).filter(([, s]) => s));
fs.writeFileSync(
  OUT_FILE,
  JSON.stringify({ build, generatedBy: "scripts/build-gear-suffixes.js", confidence: "datamined", suffixes: used, trees, items, budgets, notCovered: skipped }) + "\n"
);
console.log(`wrote ${path.relative(ROOT, OUT_FILE)}: ${Object.keys(items).length} items, ${Object.keys(trees).length} trees, ${Object.keys(used).length} suffixes, ${Object.keys(budgets).length} budget rows; ${skipped.length} nested-tree items not covered`);
