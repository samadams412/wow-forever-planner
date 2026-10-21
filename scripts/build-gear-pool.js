#!/usr/bin/env node
// Builds public/gear-pool/<level>/<classId>.json: the gear planner's item pool for
// one class, fetched by the client (never read on the server, per the
// standing rule on large data). One row per base item; a random-suffix item
// is flagged and its rolls are computed in the browser by lib/item-suffixes.ts
// from the file's own suffix slice (expanding them here would be ~5x the rows).
//
// Window: items whose source-derived level (scripts/lib/gear-pool.js ->
// gear-availability.js, not the raw "Requires Level" field, which many
// Forever items lack) is from POOL_MIN_LEVEL to the planner level, plus every
// item the class's presets use (picks, ranked lists, pins, alternates): the
// class Insignias (level 1, rank-gated), Minor Recombobulator (crafted from
// 10) and a few 17-19 items would otherwise fall out.
//
// No tooltip text: rows carry parsed stats; the item page (/items/<id>) has
// the full tooltip, sources and suffix list.
//
// Also carried, so the page needs one fetch and no server-side data: the
// class's presets (scores dropped) and its base stats at this level per race
// (data/base-stats.json, ~2 KB of a 419 KB file).
//
// Usage: node scripts/build-gear-pool.js [classId ...]   (default: every
// class with a preset file)

const fs = require("fs");
const path = require("path");
const { DEFAULT_GEAR_LEVEL, maxProfessionSkill } = require("../lib/gear-config.ts");
const { gearSlotsFor } = require("../lib/gear-slots.ts");
const { loadAvailability } = require("./lib/gear-availability.js");
const { classBaseItems, SUFFIXES } = require("./lib/gear-pool.js");
const { itemSuffixes } = require("../lib/item-suffixes.ts");

const ROOT = path.join(__dirname, "..");
const POOL_MIN_LEVEL = 20;
const POOL_VERSION = 1;
const readJson = (...p) => JSON.parse(fs.readFileSync(path.join(ROOT, ...p), "utf8"));

function presetItemIds(preset) {
  const ids = new Set();
  for (const v of preset.variants)
    for (const side of ["a", "h"]) {
      for (const id of Object.values(v.sides[side].items)) ids.add(id);
      for (const list of Object.values(v.ranked)) for (const e of list[side]) ids.add(e.itemId);
    }
  return ids;
}

function main() {
  const level = DEFAULT_GEAR_LEVEL;
  const { items } = readJson("data", "items.json");
  const { enchants, itemsBuild } = readJson("data", "gear", "enchants.json");
  const availability = loadAvailability();
  const classIds = process.argv.slice(2).length
    ? process.argv.slice(2)
    : fs.readdirSync(path.join(ROOT, "data", "gear", "presets")).map((f) => f.replace(/\.json$/, ""));
  // public/gear-pool, not public/gear: a public folder sharing its first segment
  // with the /gear/<class> page route made a fresh `next start` answer the
  // page's first requests with the 404 page (reproduced 2026-10-21).
  const outDir = path.join(ROOT, "public", "gear-pool", String(level));
  fs.mkdirSync(outDir, { recursive: true });

  for (const classId of classIds) {
    const preset = readJson("data", "gear", "presets", `${classId}.json`);
    const keep = presetItemIds(preset);
    const { items: base } = classBaseItems(classId, items, availability, new Set(), level);
    const rows = [];
    const trees = new Set();
    const ilvls = new Set();
    for (const c of base) {
      if (c.fromLevel < POOL_MIN_LEVEL && !keep.has(c.item.itemId)) continue;
      // Flag only items that actually roll (a tree but no budget for its quality/slot rolls nothing).
      const tree = itemSuffixes(c.item, SUFFIXES).length ? SUFFIXES.items[c.item.itemId] : undefined;
      if (tree !== undefined) { trees.add(tree); ilvls.add(c.item.itemLevel); }
      const w = c.parsed.weapon;
      const requiredLevel = Number((c.item.tooltip ?? []).map((l) => /^Requires Level (\d+)$/.exec(l.trim())?.[1]).find(Boolean)) || 0;
      rows.push({
        itemId: c.item.itemId,
        name: c.item.name,
        icon: c.item.icon,
        quality: c.item.quality,
        itemLevel: c.item.itemLevel,
        slot: c.item.slot,
        type: c.item.type,
        stats: c.parsed.stats,
        armor: c.parsed.armor,
        ...(w && { weapon: { min: w.damage[0]?.min ?? 0, max: w.damage[0]?.max ?? 0, speed: w.speed, dps: w.dps } }),
        // The tooltip's "Requires Level" line when it has one (many Forever items don't); fromLevel is the
        // derived level. Not the catalog's requiredLevel field: 25 Warrior items carry a placeholder 1 there with no line.
        ...(requiredLevel && { requiredLevel }),
        fromLevel: c.fromLevel,
        sides: [...c.sides].sort().join(""),
        ...(c.gates.length && { requires: c.gates.map(({ kind, text }) => ({ kind, text })) }),
        ...(c.parsed.unique && { unique: true }),
        ...(c.parsed.uniqueGroup && { uniqueGroup: c.parsed.uniqueGroup }),
        ...(tree !== undefined && { suffixes: true }),
      });
    }
    const missing = [...keep].filter((id) => !rows.some((r) => r.itemId === id));
    if (missing.length) throw new Error(`${classId}: preset items not in the pool: ${missing.join(", ")}`);

    // The SuffixData slice these items need (lib/item-suffixes.ts reads it as-is).
    const suffixIds = new Set([...trees].flatMap((t) => SUFFIXES.trees[t]));
    const suffixes = {
      build: SUFFIXES.build,
      suffixes: Object.fromEntries([...suffixIds].map((id) => [id, SUFFIXES.suffixes[id]])),
      trees: Object.fromEntries([...trees].map((t) => [t, SUFFIXES.trees[t]])),
      items: Object.fromEntries(rows.filter((r) => r.suffixes).map((r) => [r.itemId, SUFFIXES.items[r.itemId]])),
      budgets: Object.fromEntries([...ilvls].map((l) => [l, SUFFIXES.budgets[l]])),
    };

    // Enchants a character of this level can have: skill and required level, fitting a pool item's slot.
    const slots = new Set(rows.map((r) => r.slot));
    const usable = enchants
      .filter((e) => e.status !== "missing" && (e.skill ?? 0) <= maxProfessionSkill(level) && (e.requiredLevel ?? 0) <= level && e.slots.some((s) => slots.has(s)))
      .map((e) => ({
        id: e.id, name: e.name, text: e.text, slots: e.slots, ...(e.types && { types: e.types }),
        stats: e.stats, armor: e.armor, weaponDamage: e.weaponDamage, minIlvl: e.minIlvl,
        profession: e.profession, skill: e.skill, ...(e.requires.length && { requires: e.requires }),
        learnedFrom: e.learnedFrom, recipeSourced: e.recipeSourced,
      }));

    const races = readJson("data", "races.json").filter((r) => r.allowedClasses.includes(classId));
    const baseStats = Object.fromEntries(races.map((r) => {
      const b = readJson("data", "base-stats.json").levels[String(level)][classId][r.id];
      if (!b) throw new Error(`${classId}: no base stats for ${r.id} at ${level}`);
      return [r.id, { name: r.name, side: r.faction === "Alliance" ? "a" : "h", ...b }];
    }));
    const presets = {
      disclaimer: preset.disclaimer,
      variants: preset.variants.map((v) => ({
        key: v.key, name: v.name, role: v.role, ...(v.groups && { groups: v.groups }), sides: v.sides,
        ranked: Object.fromEntries(Object.entries(v.ranked).map(([k, bySide]) => [k, Object.fromEntries(Object.entries(bySide).map(([side, list]) => [side, list.map(({ score, ...e }) => e)]))])),
      })),
    };
    const out = {
      version: POOL_VERSION,
      classId,
      level,
      window: [POOL_MIN_LEVEL, level],
      itemsBuild,
      generatedBy: "scripts/build-gear-pool.js",
      confidence: "estimated",
      items: rows.sort((a, b) => a.itemId - b.itemId),
      suffixes,
      enchants: usable,
      presets,
      baseStats,
    };
    const file = path.join(outDir, `${classId}.json`);
    fs.writeFileSync(file, JSON.stringify(out) + "\n");
    const kept = rows.filter((r) => r.fromLevel < POOL_MIN_LEVEL).length;
    console.log(`wrote ${path.relative(ROOT, file)}: ${rows.length} items (${kept} below ${POOL_MIN_LEVEL}, kept for presets), ${rows.filter((r) => r.suffixes).length} with suffixes, ${usable.length} enchants, ${Math.round(fs.statSync(file).size / 1024)} KB`);
    for (const slot of ["head", "main", "trinket1"]) if (!rows.some((r) => gearSlotsFor(r.slot).includes(slot))) throw new Error(`${classId}: no ${slot} items`);
  }
}

main();
