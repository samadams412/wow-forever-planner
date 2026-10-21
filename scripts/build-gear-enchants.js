#!/usr/bin/env node
// Builds data/gear/enchants.json: every permanent item enhancement a
// profession can make (enchants, armor kits, scopes, blacksmith
// attachments), with the stats parsed from the enchant item's "Use:" line by
// lib/item-stats.ts parseEnchantText.
//
// Sources: data/professions-catalog/{enchanting,engineering,leatherworking,
// blacksmithing}.json (recipe -> crafted item, learn skill) joined by itemId
// against data/items.json (the enchant item's Forever tooltip). The enchant
// id is the enchant item's itemId: stable, and our catalog's own key.
//
// Not included: enchants with no profession recipe (Arcanums, Zandalar and
// Argent Dawn shoulder enchants), all level 50+; add a source when the
// planner goes past level 30.
//
// Fails (exit 1) when an enchant has no recognisable target slot or leaves
// numbers unparsed, so a new phrasing can't slip through silently.
//
// Usage: node scripts/build-gear-enchants.js

const fs = require("fs");
const path = require("path");
const { parseEnchantText } = require("../lib/item-stats.ts");

const ROOT = path.join(__dirname, "..");
const PROFESSIONS = { enchanting: "Enchanting", engineering: "Engineering", leatherworking: "Leatherworking", blacksmithing: "Blacksmithing" };
const OUT_FILE = path.join(ROOT, "data", "gear", "enchants.json");
// "Use: Enchant a piece of chest armor so..." (the Absorption line) has no "Permanently".
const ENCHANT_USE = /^Use: (Permanently (enchant|increase|adds)|Attaches |Enchant )/;

const items = new Map(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "items.json"), "utf8")).items.map((i) => [i.itemId, i]));
// "Recipe" enchants are learned from a formula item ("Formula: Enchant ...", "Pattern: ...").
// recipeSourced: that item has a known source (quest, dungeon, vendor, drop) in our data.
const availability = require("./lib/gear-availability.js").loadAvailability();
const formulasByName = new Map();
for (const i of items.values()) {
  const m = /^(?:Formula|Schematic|Pattern|Plans): (.+)$/.exec(i.name);
  if (m) formulasByName.set(m[1], [...(formulasByName.get(m[1]) ?? []), i]);
}
const itemsBuild = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sources", "foreverchanges", "items", "sources.json"), "utf8")).forever_build;

const enchants = new Map();
const problems = [];
for (const [file, profession] of Object.entries(PROFESSIONS)) {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "professions-catalog", `${file}.json`), "utf8"));
  for (const recipe of catalog.recipes) {
    const item = items.get(recipe.item?.itemId);
    const use = item?.tooltip.find((l) => ENCHANT_USE.test(l));
    if (!use) continue;
    const parsed = parseEnchantText(use);
    if (!parsed.slots.length) problems.push(`${item.itemId} ${item.name}: no target slot in "${use}"`);
    if (parsed.leftover) problems.push(`${item.itemId} ${item.name}: unparsed "${parsed.leftover}" in "${use}"`);
    const skill = Number(recipe.skills?.orange);
    const prev = enchants.get(item.itemId);
    // Two recipes for one enchant item: keep the one learnable earliest.
    if (prev && prev.skill <= skill) continue;
    const formulas = recipe.source === "Trainer" ? [] : (formulasByName.get(recipe.name) ?? []);
    enchants.set(item.itemId, {
      id: item.itemId,
      name: item.name,
      text: use.replace(/^Use: /, ""),
      slots: parsed.slots,
      types: parsed.types,
      stats: parsed.stats,
      armor: parsed.armor,
      weaponDamage: parsed.weaponDamage,
      minIlvl: parsed.minIlvl,
      effect: parsed.effect,
      profession,
      skill: Number.isFinite(skill) ? skill : null,
      learnedFrom: recipe.source === "Trainer" ? "trainer" : "recipe",
      recipeItemIds: formulas.map((f) => f.itemId),
      recipeSourced: recipe.source === "Trainer" || formulas.some((f) => availability(f) !== null),
      requiredLevel: item.requiredLevel,
      requires: item.tooltip.filter((l) => /^Requires (?!Level \d+$)/.test(l)),
      status: item.status,
      confidence: "datamined",
    });
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

const list = [...enchants.values()].sort((a, b) => a.profession.localeCompare(b.profession) || a.skill - b.skill || a.id - b.id);
fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify({ itemsBuild, generatedBy: "scripts/build-gear-enchants.js", enchants: list }, null, 1) + "\n");
const by = (f) => list.reduce((a, e) => ((a[f(e)] = (a[f(e)] ?? 0) + 1), a), {});
console.log(`wrote ${path.relative(ROOT, OUT_FILE)}: ${list.length} enchants`);
console.log("by profession", by((e) => e.profession));
console.log("learned", by((e) => (e.learnedFrom === "trainer" ? "trainer" : e.recipeSourced ? "recipe, sourced" : e.recipeItemIds.length ? "recipe, formula has no known source" : "recipe, no formula item")));
console.log("scored", list.filter((e) => Object.keys(e.stats).length || e.armor || e.weaponDamage).length, "| effect-only", list.filter((e) => !Object.keys(e.stats).length && !e.armor && !e.weaponDamage).length, "| scored + effect text", list.filter((e) => e.effect && (Object.keys(e.stats).length || e.armor || e.weaponDamage)).length);
