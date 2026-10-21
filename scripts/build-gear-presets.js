#!/usr/bin/env node
// Generates data/gear/presets/<classId>.json: per class variant and faction
// side ("a" Alliance, "h" Horde), one starting loadout plus a ranked
// candidate list per slot. Items are scored with the variant's hand-written
// weights (data/gear/preset-weights.json), then hand corrections apply
// (data/gear/preset-overrides.json). Every pick is confidence "estimated".
//
// Eligible item at the planner level (lib/gear-config.ts):
//   - maps to a planner slot (lib/gear-slots.ts); status isn't "missing"
//   - obtainable by that level and faction (scripts/lib/gear-availability.js:
//     quest/dungeon level and side; no known source = not eligible, which
//     drops test and unobtainable records like "Bad Hat" or "(DNT)" items)
//   - the class can equip it (lib/gear-classes.ts), and any "Classes:" line
//     or class-locked quest includes the class
//   - no reputation or profession requirement (presets assume neither)
// Enchants: data/gear/enchants.json entries that fit the item, with skill <=
// maxProfessionSkill(level) and requiredLevel <= level.
//
// Usage: node scripts/build-gear-presets.js [classId ...]   (default: every
// class in preset-weights.json)

const fs = require("fs");
const path = require("path");
const { parseItemTooltip } = require("../lib/item-stats.ts");
const { GEAR_SLOTS, gearSlotsFor, isTwoHand } = require("../lib/gear-slots.ts");
const { DEFAULT_GEAR_LEVEL, maxProfessionSkill } = require("../lib/gear-config.ts");
const { CLASS_GEAR, canEquip } = require("../lib/gear-classes.ts");
const { loadAvailability } = require("./lib/gear-availability.js");

const ROOT = path.join(__dirname, "..");
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8"));
const RANKED = 6;
const SIDES = ["a", "h"];
const CLASS_NAME = (id) => id[0].toUpperCase() + id.slice(1);
const MAIN_HAND_SLOTS = {
  "two-hand": { main: ["Two-Hand"], off: [] },
  "one-hand-shield": { main: ["One-Hand", "Main Hand"], off: ["Shield"] },
  "dual-wield": { main: ["One-Hand", "Main Hand"], off: ["One-Hand", "Off Hand"] },
};
const PAIRED = { finger1: "finger2", trinket1: "trinket2" };

function score(weights, parsed, slot, bonus = 0) {
  let s = bonus;
  for (const [k, v] of Object.entries(parsed.stats)) s += (weights[k] ?? 0) * v;
  s += (weights.armor ?? 0) * (parsed.armor + (parsed.stats.bonusArmor ?? 0));
  const dps = parsed.weapon?.dps ?? 0;
  if (slot === "main" || slot === "off") s += (weights.dps ?? 0) * dps * (slot === "off" ? 0.5 : 1);
  if (slot === "ranged") s += (weights.rangedDps ?? 0) * dps;
  return s;
}

function classCandidates(classId, items, availability, excluded, level) {
  const rules = CLASS_GEAR[classId];
  if (!rules) throw new Error(`no lib/gear-classes.ts rules for ${classId}`);
  const className = CLASS_NAME(classId);
  const out = [];
  for (const item of items) {
    if (item.status === "missing" || excluded.has(item.itemId) || !gearSlotsFor(item.slot).length) continue;
    if (!canEquip(rules, level, item.slot, item.type, item.itemClass)) continue;
    const avail = availability(item);
    if (!avail || avail.fromLevel > level || (avail.classes && !avail.classes.has(className))) continue;
    const parsed = parseItemTooltip(item.tooltip);
    if ((parsed.classes && !parsed.classes.includes(className)) || parsed.requires.length) continue;
    out.push({ item, parsed, sides: avail.sides, fromLevel: avail.fromLevel });
  }
  return { rules, candidates: out };
}

function pickEnchant(weights, slot, c, enchants, level) {
  const maxSkill = maxProfessionSkill(level);
  let best = null;
  for (const e of enchants) {
    if (!e.slots.includes(c.item.slot) || (e.types && !e.types.includes(c.item.type))) continue;
    if (e.minIlvl > (c.item.itemLevel ?? 0) || (e.skill ?? 0) > maxSkill || (e.requiredLevel ?? 0) > level || e.status === "missing") continue;
    const speed = c.parsed.weapon?.speed;
    const perDps = (slot === "ranged" ? weights.rangedDps : weights.dps) ?? 0;
    const s = score(weights, { stats: e.stats, armor: e.armor, weapon: null }, null, e.weaponDamage && speed ? perDps * (e.weaponDamage / speed) : 0);
    if (s > 0 && (!best || s > best.s || (s === best.s && e.skill < best.e.skill))) best = { e, s };
  }
  return best?.e.id ?? null;
}

function buildVariant(classId, v, vo, rules, candidates, enchants, level) {
  const hands = MAIN_HAND_SLOTS[v.mainHand];
  if (!hands) throw new Error(`${classId}/${v.key}: unknown mainHand ${v.mainHand}`);
  if (v.mainHand === "dual-wield" && (rules.dualWieldLevel === null || rules.dualWieldLevel > level))
    throw new Error(`${classId}/${v.key}: can't dual wield at ${level}`);
  const fits = (slot, c) => {
    if (!gearSlotsFor(c.item.slot).includes(slot)) return false;
    if (slot === "main") return hands.main.includes(c.item.slot);
    if (slot === "off") return hands.off.includes(c.item.slot);
    if (slot === "ranged") return rules.ranged.includes(c.item.slot);
    return true;
  };
  const sides = {};
  const ranked = {};
  for (const side of SIDES) {
    const pool = candidates.filter((c) => c.sides.has(side));
    const items = {};
    for (const slot of GEAR_SLOTS) {
      if (slot === "finger2" || slot === "trinket2") continue;
      const list = pool
        .filter((c) => fits(slot, c))
        .map((c) => ({ c, s: score(v.weights, c.parsed, slot) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || (b.c.item.itemLevel ?? 0) - (a.c.item.itemLevel ?? 0) || a.c.item.itemId - b.c.item.itemId);
      const rankKey = PAIRED[slot] ? slot.slice(0, -1) : slot;
      (ranked[rankKey] ??= {})[side] = list.slice(0, RANKED).map((x) => ({ itemId: x.c.item.itemId, score: Math.round(x.s * 10) / 10 }));
      const byPin = (s) => {
        const id = vo.pin?.[s];
        if (id === undefined) return undefined;
        const c = pool.find((x) => x.item.itemId === id && fits(s, x));
        if (!c) throw new Error(`${classId}/${v.key}/${side}: pinned ${id} isn't a ${s} candidate`);
        return c;
      };
      const first = byPin(slot) ?? list[0]?.c;
      if (!first) continue;
      items[slot] = first;
      const pair = PAIRED[slot];
      if (pair) {
        // A non-unique ring or trinket can be worn twice; a unique group
        // ("Unique-Equipped: Rune of Battle (1)") allows one of its members.
        const group = first.parsed.uniqueGroup;
        const second = byPin(pair) ?? (first.parsed.unique ? list.find((x) => x.c !== first && !(group && x.c.parsed.uniqueGroup === group))?.c : first);
        if (second) items[pair] = second;
      }
    }
    if (items.main && isTwoHand(items.main.item.slot)) delete items.off;
    const enchantIds = {};
    for (const [slot, c] of Object.entries(items)) {
      if (vo.enchants && slot in vo.enchants) {
        const forced = vo.enchants[slot];
        if (forced !== null && !enchants.some((e) => e.id === forced)) throw new Error(`${classId}/${v.key}: enchant ${forced} not in enchants.json`);
        if (forced !== null) enchantIds[slot] = forced;
        continue;
      }
      const e = pickEnchant(v.weights, slot, c, enchants, level);
      if (e) enchantIds[slot] = e;
    }
    sides[side] = { items: Object.fromEntries(Object.entries(items).map(([s, c]) => [s, c.item.itemId])), enchants: enchantIds };
  }
  return { key: v.key, name: v.name, role: v.role, mainHand: v.mainHand, confidence: "estimated", sides, ranked };
}

function main() {
  const level = DEFAULT_GEAR_LEVEL;
  const weights = readJson("data", "gear", "preset-weights.json");
  const overrides = readJson("data", "gear", "preset-overrides.json");
  const { enchants } = readJson("data", "gear", "enchants.json");
  const { items } = readJson("data", "items.json");
  const availability = loadAvailability();
  const classIds = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(weights).filter((k) => !k.startsWith("_"));
  fs.mkdirSync(path.join(ROOT, "data", "gear", "presets"), { recursive: true });
  for (const classId of classIds) {
    if (!weights[classId]) throw new Error(`no weights for ${classId}`);
    const o = overrides[classId] ?? {};
    const { rules, candidates } = classCandidates(classId, items, availability, new Set(o.exclude ?? []), level);
    const variants = weights[classId].map((v) => buildVariant(classId, v, o.variants?.[v.key] ?? {}, rules, candidates, enchants, level));
    const out = { classId, level, generatedBy: "scripts/build-gear-presets.js", confidence: "estimated", candidates: candidates.length, variants };
    const file = path.join(ROOT, "data", "gear", "presets", `${classId}.json`);
    fs.writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
    console.log(`wrote ${path.relative(ROOT, file)}: ${candidates.length} candidates; ${variants.map((v) => `${v.key} a:${Object.keys(v.sides.a.items).length}/h:${Object.keys(v.sides.h.items).length} slots`).join(", ")}`);
  }
}

main();
