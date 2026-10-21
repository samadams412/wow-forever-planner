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
//   - no reputation or profession requirement (presets assume neither),
//     except a pin, which may need a profession trainable by that level;
//     the side's `requires` lists those lines for the UI
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
const { readCsv } = require("./lib/csv");
const { itemSuffixes } = require("../lib/item-suffixes.ts");

const ROOT = path.join(__dirname, "..");
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8"));
const RANKED = 6;
const SIDES = ["a", "h"];
const CLASS_NAME = (id) => id[0].toUpperCase() + id.slice(1);
const MAIN_HAND_SLOTS = {
  "two-hand": { main: ["Two-Hand"], off: [] },
  "one-hand-shield": { main: ["One-Hand", "Main Hand"], off: ["Shield"] },
  "dual-wield": { main: ["One-Hand", "Main Hand"], off: ["One-Hand", "Off Hand"] },
  "one-hand-off-hand": { main: ["One-Hand", "Main Hand"], off: ["Held In Off-hand"] },
};
const SUFFIXES = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "gear", "suffixes.json"), "utf8"));
const PAIRED = { finger1: "finger2", trinket1: "trinket2" };
// Shown wherever a generated preset is displayed (the gear planner UI reads it from the preset file).
const DISCLAIMER =
  "These sets are generated from stat weights plus a few hand corrections: a starting point, not a definitive best-in-slot list. Build your own and share it.";

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
    if (parsed.classes && !parsed.classes.includes(className)) continue;
    // Gated items (profession, reputation, PvP rank) stay in the pool for pins only.
    // A faction-only reputation (The Defilers) also limits the item to that side.
    const gates = parsed.requires.map(classifyRequirement);
    // No tooltip shows a PvP rank; the client's ItemSparse.RequiredPVPRank does (value - 4 = rank).
    const rank = PVP_RANK_BY_ITEM.get(item.itemId);
    if (rank) gates.push({ kind: "pvpRank", text: `Requires PvP rank ${rank} (${PVP_RANKS.a[rank - 1]} / ${PVP_RANKS.h[rank - 1]})` });
    const sides = new Set([...avail.sides].filter((s) => gates.every((g) => !g.side || g.side === s)));
    // A random-suffix item always drops with a suffix: one candidate per roll, base + suffix stats.
    const rolls = itemSuffixes(item, SUFFIXES);
    if (!rolls.length) out.push({ item, parsed, gates, sides, fromLevel: avail.fromLevel, suffixId: null });
    for (const r of rolls) {
      const stats = { ...parsed.stats };
      for (const [k, n] of Object.entries(r.stats)) stats[k] = (stats[k] ?? 0) + n;
      out.push({ item, parsed: { ...parsed, stats }, gates, sides, fromLevel: avail.fromLevel, suffixId: r.id });
    }
  }
  return { rules, candidates: out };
}

// Classic PvP rank titles, Alliance then Horde; "Requires <rank>" is how a rank-gated tooltip reads.
const PVP_RANKS = { a: ["Private", "Corporal", "Sergeant", "Master Sergeant", "Sergeant Major", "Knight", "Knight-Lieutenant", "Knight-Captain", "Knight-Champion", "Lieutenant Commander", "Commander", "Marshal", "Field Marshal", "Grand Marshal"], h: ["Scout", "Grunt", "Sergeant", "Senior Sergeant", "First Sergeant", "Stone Guard", "Blood Guard", "Legionnaire", "Centurion", "Champion", "Lieutenant General", "General", "Warlord", "High Warlord"] };
// ItemSparse is partial in the client, but carries every rank-gated item it knows (449 at 70450).
const PVP_RANK_BY_ITEM = new Map(
  readCsv(path.join(ROOT, "data", "sources", "client-db2", "1.60.1.70450", "itemsparse.csv"))
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

function pickEnchant(weights, slot, c, enchants, level, excluded) {
  const maxSkill = maxProfessionSkill(level);
  let best = null, armorOnly = null;
  for (const e of enchants) {
    if (excluded.has(e.id)) continue;
    if (!e.slots.includes(c.item.slot) || (e.types && !e.types.includes(c.item.type))) continue;
    if (e.minIlvl > (c.item.itemLevel ?? 0) || (e.skill ?? 0) > maxSkill || (e.requiredLevel ?? 0) > level || e.status === "missing") continue;
    const speed = c.parsed.weapon?.speed;
    const perDps = (slot === "ranged" ? weights.rangedDps : weights.dps) ?? 0;
    const s = score(weights, { stats: e.stats, armor: e.armor, weapon: null }, null, e.weaponDamage && speed ? perDps * (e.weaponDamage / speed) : 0);
    if (s > 0 && (!best || s > best.s || (s === best.s && e.skill < best.e.skill))) best = { e, s };
    // Nothing the weights value (a caster's cloak): the most armor still beats no enchant.
    if (e.armor > 0 && (!armorOnly || e.armor > armorOnly.armor || (e.armor === armorOnly.armor && e.skill < armorOnly.skill))) armorOnly = e;
  }
  return best?.e.id ?? armorOnly?.id ?? null;
}

function buildVariant(classId, v, vo, shared, rules, candidates, enchants, level) {
  const where = `${classId}/${v.key}`;
  const modes = [].concat(v.mainHand).map((m) => {
    if (!MAIN_HAND_SLOTS[m]) throw new Error(`${where}: unknown mainHand ${m}`);
    return m;
  }).filter((m) => m !== "dual-wield" || (rules.dualWieldLevel !== null && rules.dualWieldLevel <= level));
  if (!modes.length) throw new Error(`${where}: no usable mainHand mode at ${level} (dual wield needs ${rules.dualWieldLevel})`);
  const mainOk = (c, m) => MAIN_HAND_SLOTS[m].main.includes(c.item.slot) && (!v.mainTypes || v.mainTypes.includes(c.item.type));
  const offOk = (c, m) => MAIN_HAND_SLOTS[m].off.includes(c.item.slot);
  const fits = (slot, c) => {
    if (!gearSlotsFor(c.item.slot).includes(slot)) return false;
    if (slot === "main") return modes.some((m) => mainOk(c, m));
    if (slot === "off") return modes.some((m) => offOk(c, m));
    if (slot === "ranged") return rules.ranged.includes(c.item.slot);
    return true;
  };
  const scoreOf = (slot, c) => score(v.weights, c.parsed, slot);
  const byScore = (slot) => (a, b) => b.s - a.s || (b.c.item.itemLevel ?? 0) - (a.c.item.itemLevel ?? 0) || a.c.item.itemId - b.c.item.itemId || (a.c.suffixId ?? 0) - (b.c.suffixId ?? 0);
  // Groups a variant joins (preset-weights.json `groups`, e.g. pvp, caster) add shared pins,
  // alternates and forced enchants from preset-overrides.json `_groups`; the variant's own entries win.
  const groups = (v.groups ?? []).map((g) => {
    if (!shared.groups?.[g]) throw new Error(`${where}: unknown group ${g}`);
    return shared.groups[g];
  });
  // Group pins sit under the class's and the variant's own pins.
  vo = { ...vo, pin: Object.assign({}, ...groups.map((g) => g.pin), vo.pin) };
  const alternates = Object.assign({}, ...groups.map((g) => g.alternates), vo.alternates);
  const forcedEnchants = Object.assign({}, ...groups.map((g) => g.enchants), vo.enchants);
  const sides = {};
  const ranked = {};
  for (const side of SIDES) {
    const pool = candidates.filter((c) => c.sides.has(side));
    // Gates a pin or alternate may carry: a profession trainable by `level`, a reputation or a
    // PvP rank (shown to the UI through `requires`). Anything else fails.
    const gated = (entry, slot, what) => {
      const id = withReason(entry, "itemId", `${where}/${what}/${slot}`);
      const matches = pool.filter((x) => x.item.itemId === id && fits(slot, x) && (entry.suffixId === undefined || x.suffixId === entry.suffixId));
      if (!matches.length) return null;
      // A suffix item without a chosen suffix: its best-scoring roll for this slot.
      const c = matches.map((x) => ({ c: x, s: scoreOf(slot, x) })).sort(byScore(slot))[0].c;
      for (const g of c.gates)
        if (g.kind === "other" || (g.kind === "profession" && g.skill > maxProfessionSkill(level)))
          throw new Error(`${where}/${side}: ${what} ${id} "${g.text}" isn't reachable at ${level}`);
      // `requires` on the entry: a gate no data shows.
      return { ...c, gates: [...c.gates, ...(entry.requires ?? []).map((text) => ({ kind: "override", text }))] };
    };
    const byPin = (slot) => {
      // A pin is one entry for both sides, or { a: entry, h: entry } (either may be left out).
      const raw = vo.pin?.[slot];
      const pin = raw && ("a" in raw || "h" in raw) ? raw[side] : raw;
      if (pin === undefined) return undefined;
      const c = gated(pin, slot, "pin");
      if (!c) throw new Error(`${where}/${side}: pinned ${pin.itemId} isn't a ${slot} candidate`);
      return c;
    };
    const lists = {};
    for (const slot of GEAR_SLOTS) {
      if (slot === "finger2" || slot === "trinket2") continue;
      lists[slot] = pool
        .filter((c) => fits(slot, c) && !c.gates.length)
        .map((c) => ({ c, s: scoreOf(slot, c) }))
        .filter((x) => x.s > 0)
        .sort(byScore(slot));
    }
    const items = {};
    for (const slot of GEAR_SLOTS) {
      if (slot === "finger2" || slot === "trinket2" || slot === "main" || slot === "off") continue;
      const first = byPin(slot) ?? lists[slot][0]?.c;
      if (!first) continue;
      items[slot] = first;
      const pair = PAIRED[slot];
      if (pair) {
        // A non-unique ring or trinket can be worn twice; a unique group
        // ("Unique-Equipped: Rune of Battle (1)") allows one of its members.
        const group = first.parsed.uniqueGroup;
        const second = byPin(pair) ?? (first.parsed.unique ? lists[slot].find((x) => x.c.item.itemId !== first.item.itemId && !(group && x.c.parsed.uniqueGroup === group))?.c : first);
        if (second) items[pair] = second;
      }
    }
    // Weapons: the best-scoring allowed mode (main + off together); a pin fixes its own slot.
    let best = null;
    for (const m of modes) {
      const pinMain = byPin("main"), pinOff = byPin("off");
      if (pinMain && !mainOk(pinMain, m)) continue;
      const main = pinMain ?? lists.main.find((x) => mainOk(x.c, m))?.c;
      if (!main) continue;
      const off = MAIN_HAND_SLOTS[m].off.length ? (pinOff ?? lists.off.find((x) => offOk(x.c, m) && !(main.parsed.unique && x.c.item.itemId === main.item.itemId))?.c) : undefined;
      const total = scoreOf("main", main) + (off ? scoreOf("off", off) : 0);
      if (!best || total > best.total) best = { m, main, off, total };
    }
    if (best) {
      items.main = best.main;
      if (best.off && !isTwoHand(best.main.item.slot)) items.off = best.off;
    }
    // Ranked list per slot: pins, then alternates (offered, not picked), then the scored top RANKED.
    for (const slot of Object.keys(lists)) {
      const rankKey = PAIRED[slot] ? slot.slice(0, -1) : slot;
      const keyOf = (c) => `${c.item.itemId}:${c.suffixId ?? ""}`;
      const seen = new Set();
      const entries = [];
      const add = (c, tag) => {
        if (seen.has(keyOf(c))) return;
        seen.add(keyOf(c));
        const requires = c.gates.map(({ kind, text }) => ({ kind, text }));
        entries.push({ itemId: c.item.itemId, ...(c.suffixId && { suffixId: c.suffixId }), score: Math.round(scoreOf(slot, c) * 10) / 10, ...(tag && { tag }), ...(requires.length && { requires }) });
      };
      for (const s of [slot, PAIRED[slot]].filter(Boolean)) if (items[s] && vo.pin?.[s]) add(items[s], "pin");
      for (const alt of alternates[rankKey] ?? []) {
        const c = gated(alt, slot, "alternate");
        if (c) add(c, "alternate");
        else if (!candidates.some((x) => x.item.itemId === alt.itemId)) throw new Error(`${where}: alternate ${alt.itemId} isn't a candidate for ${classId}`);
      }
      for (const x of lists[slot].slice(0, RANKED)) add(x.c);
      (ranked[rankKey] ??= {})[side] = entries;
    }
    const enchantIds = {};
    for (const [slot, c] of Object.entries(items)) {
      if (slot in forcedEnchants) {
        const forced = withReason(forcedEnchants[slot], "enchantId", `${where}/enchants/${slot}`);
        if (forced !== null && !enchants.some((e) => e.id === forced)) throw new Error(`${where}: enchant ${forced} not in enchants.json`);
        if (forced !== null) enchantIds[slot] = forced;
        continue;
      }
      const e = pickEnchant(v.weights, slot, c, enchants, level, shared.excludeEnchants);
      if (e) enchantIds[slot] = e;
    }
    const requires = Object.fromEntries(Object.entries(items).filter(([, c]) => c.gates.length).map(([s, c]) => [s, c.gates.map(({ kind, text }) => ({ kind, text }))]));
    const suffixes = Object.fromEntries(Object.entries(items).filter(([, c]) => c.suffixId).map(([s, c]) => [s, c.suffixId]));
    sides[side] = {
      items: Object.fromEntries(Object.entries(items).map(([s, c]) => [s, c.item.itemId])),
      ...(Object.keys(suffixes).length && { suffixes }),
      enchants: enchantIds,
      ...(Object.keys(requires).length && { requires }),
    };
  }
  return { key: v.key, name: v.name, role: v.role, mainHand: v.mainHand, ...(v.groups && { groups: v.groups }), confidence: "estimated", sides, ranked };
}

// Override entries are { <idKey>: id, reason: "..." }; a missing reason fails the build.
function withReason(entry, idKey, where) {
  if (!entry || typeof entry !== "object" || !(idKey in entry) || typeof entry.reason !== "string" || !entry.reason.trim())
    throw new Error(`${where}: override needs { ${idKey}, reason }`);
  return entry[idKey];
}

function main() {
  const level = DEFAULT_GEAR_LEVEL;
  const weights = readJson("data", "gear", "preset-weights.json");
  const overrides = readJson("data", "gear", "preset-overrides.json");
  const { enchants } = readJson("data", "gear", "enchants.json");
  const { items } = readJson("data", "items.json");
  const availability = loadAvailability();
  // Enchants no preset picks (no known recipe source, or a value that changed after our item pull).
  const excludeEnchants = new Set((overrides._excludeEnchants ?? []).map((e, i) => withReason(e, "enchantId", `_excludeEnchants/${i}`)));
  for (const id of excludeEnchants) if (!enchants.some((e) => e.id === id)) throw new Error(`_excludeEnchants: ${id} not in enchants.json`);
  const classIds = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(weights).filter((k) => !k.startsWith("_"));
  fs.mkdirSync(path.join(ROOT, "data", "gear", "presets"), { recursive: true });
  for (const classId of classIds) {
    if (!weights[classId]) throw new Error(`no weights for ${classId}`);
    const o = overrides[classId] ?? {};
    const excluded = new Set((o.exclude ?? []).map((e, i) => withReason(e, "itemId", `${classId}/exclude/${i}`)));
    const { rules, candidates } = classCandidates(classId, items, availability, excluded, level);
    const variants = weights[classId].map((v) => buildVariant(classId, v, { ...o.variants?.[v.key], pin: { ...o.pin, ...o.variants?.[v.key]?.pin } }, { groups: overrides._groups, excludeEnchants }, rules, candidates, enchants, level));
    const out = { classId, level, generatedBy: "scripts/build-gear-presets.js", confidence: "estimated", disclaimer: DISCLAIMER, candidates: candidates.length, variants };
    const file = path.join(ROOT, "data", "gear", "presets", `${classId}.json`);
    fs.writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
    console.log(`wrote ${path.relative(ROOT, file)}: ${candidates.length} candidates; ${variants.map((v) => `${v.key} a:${Object.keys(v.sides.a.items).length}/h:${Object.keys(v.sides.h.items).length} slots`).join(", ")}`);
  }
}

main();
