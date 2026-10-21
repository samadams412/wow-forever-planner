// Which items a class can use at a planner level: the one eligibility rule
// shared by the preset generator (scripts/build-gear-presets.js) and the item
// pool generator (scripts/build-gear-pool.js), so the two can't drift.
//
// Eligible base item at `level` (lib/gear-config.ts):
//   - maps to a planner slot (lib/gear-slots.ts); status isn't "missing"
//   - obtainable by that level and faction (./gear-availability.js: the level
//     comes from the item's sources -- quest level, dungeon level, crafting
//     skill gate -- because many Forever items have no "Requires Level" line;
//     no known source = not eligible, which drops test records like "Bad Hat")
//   - the class can equip it (lib/gear-classes.ts), and any "Classes:" line
//     or class-locked quest includes the class
// Each item carries its gates (profession, reputation, PvP rank) for the UI.
// A faction-only reputation (The Defilers) also limits the item to that side.

const fs = require("fs");
const path = require("path");
const { parseItemTooltip } = require("../../lib/item-stats.ts");
const { gearSlotsFor } = require("../../lib/gear-slots.ts");
const { CLASS_GEAR, canEquip } = require("../../lib/gear-classes.ts");
const { itemSuffixes } = require("../../lib/item-suffixes.ts");
const { readCsv } = require("./csv");

const ROOT = path.join(__dirname, "..", "..");
const CLIENT_BUILD = "1.60.1.70450";
const SUFFIXES = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "gear", "suffixes.json"), "utf8"));
const className = (id) => id[0].toUpperCase() + id.slice(1);

// Classic PvP rank titles, Alliance then Horde; "Requires <rank>" is how a rank-gated tooltip reads.
const PVP_RANKS = { a: ["Private", "Corporal", "Sergeant", "Master Sergeant", "Sergeant Major", "Knight", "Knight-Lieutenant", "Knight-Captain", "Knight-Champion", "Lieutenant Commander", "Commander", "Marshal", "Field Marshal", "Grand Marshal"], h: ["Scout", "Grunt", "Sergeant", "Senior Sergeant", "First Sergeant", "Stone Guard", "Blood Guard", "Legionnaire", "Centurion", "Champion", "Lieutenant General", "General", "Warlord", "High Warlord"] };
// ItemSparse is partial in the client, but carries every rank-gated item it knows (449 at 70450).
const PVP_RANK_BY_ITEM = new Map(
  readCsv(path.join(ROOT, "data", "sources", "client-db2", CLIENT_BUILD, "itemsparse.csv"))
    .filter((r) => Number(r.RequiredPVPRank) > 4)
    .map((r) => [Number(r.ID), Number(r.RequiredPVPRank) - 4]),
);
const FACTION_SIDE = { "The League of Arathor": "a", "Silverwing Sentinels": "a", "Stormpike Guard": "a", "The Defilers": "h", "Warsong Outriders": "h", "Frostwolf Clan": "h" };

// A tooltip "Requires ..." line (never "Requires Level N") -> { kind, text, skill?, side? }.
function classifyRequirement(text) {
  const prof = /^Requires [A-Za-z ]+ \((\d+)\)$/.exec(text);
  if (prof) return { kind: "profession", text, skill: Number(prof[1]) };
  const rep = /^Requires (.+) - (Neutral|Friendly|Honored|Revered|Exalted)$/.exec(text);
  if (rep) return { kind: "reputation", text, side: FACTION_SIDE[rep[1]] };
  const rank = text.replace(/^Requires /, "");
  const side = PVP_RANKS.a.includes(rank) ? (PVP_RANKS.h.includes(rank) ? undefined : "a") : PVP_RANKS.h.includes(rank) ? "h" : null;
  if (side !== null) return { kind: "pvpRank", text, side };
  return { kind: "other", text };
}

// -> [{ item, parsed, gates, sides: Set<"a"|"h">, fromLevel }], one per base item.
function classBaseItems(classId, items, availability, excluded, level) {
  const rules = CLASS_GEAR[classId];
  if (!rules) throw new Error(`no lib/gear-classes.ts rules for ${classId}`);
  const out = [];
  for (const item of items) {
    if (item.status === "missing" || excluded.has(item.itemId) || !gearSlotsFor(item.slot).length) continue;
    if (!canEquip(rules, level, item.slot, item.type, item.itemClass)) continue;
    const avail = availability(item);
    if (!avail || avail.fromLevel > level || (avail.classes && !avail.classes.has(className(classId)))) continue;
    const parsed = parseItemTooltip(item.tooltip);
    if (parsed.classes && !parsed.classes.includes(className(classId))) continue;
    const gates = parsed.requires.map(classifyRequirement);
    // No tooltip shows a PvP rank; the client's ItemSparse.RequiredPVPRank does (value - 4 = rank).
    const rank = PVP_RANK_BY_ITEM.get(item.itemId);
    if (rank) gates.push({ kind: "pvpRank", text: `Requires PvP rank ${rank} (${PVP_RANKS.a[rank - 1]} / ${PVP_RANKS.h[rank - 1]})` });
    const sides = new Set([...avail.sides].filter((s) => gates.every((g) => !g.side || g.side === s)));
    if (sides.size) out.push({ item, parsed, gates, sides, fromLevel: avail.fromLevel });
  }
  return { rules, items: out };
}

// A random-suffix item always drops with a suffix: one candidate per roll, base + suffix stats.
function expandSuffixes(base) {
  const rolls = itemSuffixes(base.item, SUFFIXES);
  if (!rolls.length) return [{ ...base, suffixId: null }];
  return rolls.map((r) => {
    const stats = { ...base.parsed.stats };
    for (const [k, n] of Object.entries(r.stats)) stats[k] = (stats[k] ?? 0) + n;
    return { ...base, parsed: { ...base.parsed, stats }, suffixId: r.id };
  });
}

module.exports = { classBaseItems, expandSuffixes, classifyRequirement, SUFFIXES, CLIENT_BUILD };
