#!/usr/bin/env node
// Builds data/professions-catalog/{mining,herbalism,skinning}.json from
// the latest data/sources/gathering-professions-<date>.json snapshot (see
// scripts/fetch-gathering-professions.js). A separate pipeline from
// build-professions.js's crafting one -- these 3 pages have a genuinely
// different shape (no reagent-based recipes, no category sidebar, no
// Merchant's Favor, no Legacy-point milestone track; see scripts/lib/
// parse-gathering-page.js's header comment) -- but shares the same item-
// resolution and camp-section helpers (scripts/lib/item-ref.js, scripts/
// lib/camp-section.js) so nothing here diverges from that pipeline's own
// "resolve by id when an id is available" discipline.
//
// Every node/step/smelting item comes with a real foreverchanges.pro item
// URL already, so every reference here resolves by id (itemIdFromUrl),
// never by name.

const fs = require("fs");
const path = require("path");
const { itemRef, unresolvedItemRef, resolveItemByUrl } = require("./lib/item-ref");
const { buildCampMilestones, loadLegacyPerks, GATHERING_LEGACY_PERK_IDS } = require("./lib/camp-section");

const ROOT = path.join(__dirname, "..");
const SOURCES_DIR = path.join(ROOT, "data", "sources");
const OUT_DIR = path.join(ROOT, "data", "professions-catalog");

const GATHERING_PROFESSIONS = [
  { id: "mining", name: "Mining" },
  { id: "herbalism", name: "Herbalism" },
  { id: "skinning", name: "Skinning" },
];

function latestSnapshotPath() {
  const files = fs
    .readdirSync(SOURCES_DIR)
    .filter((f) => /^gathering-professions-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  if (!files.length) return null;
  return path.join(SOURCES_DIR, files[files.length - 1]);
}

function buildNode(raw, byId) {
  return {
    name: raw.name,
    icon: raw.icon,
    zones: raw.zones,
    items: (raw.items || []).map((it) => resolveItemByUrl(byId, it.url, it.name)),
    skills: raw.skills,
  };
}

// Mining/Herbalism's Leveling steps point back at named nodes (icons only,
// no item of their own -- the real items are on the node itself, already
// resolved by buildNode above) -- Skinning's single band list has no
// separate nodes chapter, so its steps carry real items directly instead.
function buildStep(raw, byId) {
  return {
    range: raw.range,
    name: raw.name,
    zones: raw.zones,
    icons: raw.icons,
    items: (raw.items || []).map((it) => resolveItemByUrl(byId, it.url, it.name)),
  };
}

function buildSmelting(raw, byId) {
  return {
    name: raw.name,
    makesQty: raw.makesQty,
    item: resolveItemByUrl(byId, raw.itemUrl, raw.name),
    mats: (raw.mats || []).map((m) => resolveItemByUrl(byId, m.url, m.name)),
    skills: raw.skills,
    source: raw.source,
  };
}

function main() {
  const snapshotPath = latestSnapshotPath();
  if (!snapshotPath) {
    console.error("No data/sources/gathering-professions-*.json snapshot found -- run scripts/fetch-gathering-professions.js first.");
    process.exit(1);
  }
  console.log(`Reading ${snapshotPath}`);
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));

  const items = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "items.json"), "utf8")).items;
  const byId = new Map(items.map((i) => [i.itemId, i]));
  const legacyPerks = loadLegacyPerks(GATHERING_LEGACY_PERK_IDS);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const prof of GATHERING_PROFESSIONS) {
    const raw = snapshot[prof.id];
    if (!raw) {
      console.warn(`${prof.id}: no data in snapshot, skipping`);
      continue;
    }

    const catalog = {
      id: prof.id,
      name: prof.name,
      kind: "gathering",
      nodes: raw.nodes ? raw.nodes.map((n) => buildNode(n, byId)) : null,
      leveling: raw.leveling ? raw.leveling.map((s) => buildStep(s, byId)) : null,
      skin: raw.skin ? raw.skin.map((s) => buildStep(s, byId)) : null,
      smelting: raw.smelting ? raw.smelting.map((r) => buildSmelting(r, byId)) : null,
      camp: raw.camp_section
        ? {
            milestones: buildCampMilestones(raw.camp_section.milestones, byId),
            campObjects: buildCampMilestones(raw.camp_section.camp_objects, byId),
            legacyPerks,
          }
        : null,
    };

    fs.writeFileSync(path.join(OUT_DIR, `${prof.id}.json`), JSON.stringify(catalog, null, 1));
    console.log(
      `${prof.id}: nodes=${catalog.nodes?.length ?? "n/a"} leveling=${catalog.leveling?.length ?? "n/a"} ` +
        `skin=${catalog.skin?.length ?? "n/a"} smelting=${catalog.smelting?.length ?? "n/a"} camp=${!!catalog.camp}`
    );
  }
}

main();
