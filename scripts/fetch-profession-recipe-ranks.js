#!/usr/bin/env node
// One-time backfill for recipes whose hand-provided data/professions/
// <dataFile>.json has "–" (en-dash) for `rank` -- confirmed genuinely
// missing at that source, but present on foreverchanges.pro's live pages,
// just not in plain visible HTML (see scripts/lib/parse-profession-page.js's
// parseRecipeRows/parseEnchantRows/parseEnchantOtherItemRanks for the three
// different extraction techniques this needed, one per data shape found).
//
// Patches data/professions/<dataFile>.json directly (rank and skills.orange,
// which are always equal in this data -- confirmed before relying on it),
// matching this project's precedent of fixing hand-provided source files in
// place (see the 2026-09-24 Alchemy/Blacksmithing Merchant's Favor re-scrape)
// rather than adding a separate overlay file for one field.
//
// Usage: node scripts/fetch-profession-recipe-ranks.js

const fs = require("fs");
const path = require("path");
const { fetchProfessionPage } = require("./lib/parse-profession-page");
const { PROFESSIONS } = require("./lib/professions-config");
const { buildNameIndex, resolveItemByName } = require("./lib/profession-item-resolver");

const ROOT = path.join(__dirname, "..");
const PROF_DIR = path.join(ROOT, "data", "professions");

const DASH = "–";

async function main() {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "items.json"), "utf8")).items;
  const byName = buildNameIndex(items);

  let totalMissing = 0;
  let totalPatched = 0;
  const unresolved = {};

  for (const prof of PROFESSIONS) {
    const rawPath = path.join(PROF_DIR, `${prof.dataFile}.json`);
    if (!fs.existsSync(rawPath)) continue;
    const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));

    const missingIdx = raw.map((r, i) => ({ r, i })).filter((x) => x.r.rank === DASH);
    if (missingIdx.length === 0) {
      console.log(`${prof.id}: 0 missing`);
      continue;
    }
    totalMissing += missingIdx.length;
    console.log(`Fetching ${prof.id} (${missingIdx.length} missing)...`);
    const result = await fetchProfessionPage(prof.id);
    if (!result.ok) {
      console.warn(`  FAILED: HTTP ${result.status} -- skipping ${prof.id}`);
      unresolved[prof.id] = missingIdx.map((x) => x.r.name);
      continue;
    }

    const rowsById = result.recipe_rows ? new Map(result.recipe_rows.map((row) => [row.id, row])) : null;
    const enchantsByName = result.enchant_rows
      ? new Map(result.enchant_rows.map((row) => [row.name.trim().toLowerCase(), row]))
      : null;
    const otherItemRanks = result.enchant_other_item_ranks;

    let patched = 0;
    const stillUnresolved = [];
    for (const { r, i } of missingIdx) {
      // The raw recipe has no item id of its own -- resolve it the same
      // way build-professions.js does, by name against the item catalog.
      const { item, cleanName } = resolveItemByName(byName, r.name);
      const itemId = item ? item.itemId : null;

      let learn = null;
      if (rowsById && itemId != null && rowsById.has(itemId)) {
        learn = rowsById.get(itemId).learn;
      } else if (otherItemRanks && itemId != null && otherItemRanks.has(itemId)) {
        learn = Number(otherItemRanks.get(itemId));
      } else if (enchantsByName && enchantsByName.has(cleanName.trim().toLowerCase())) {
        learn = enchantsByName.get(cleanName.trim().toLowerCase()).learn;
      }

      if (learn != null) {
        raw[i].rank = String(learn);
        raw[i].skills.orange = String(learn);
        patched++;
      } else {
        stillUnresolved.push(r.name);
      }
    }

    fs.writeFileSync(rawPath, JSON.stringify(raw, null, 2) + "\n");
    totalPatched += patched;
    console.log(`  patched ${patched} of ${missingIdx.length}`);
    if (stillUnresolved.length) {
      unresolved[prof.id] = stillUnresolved;
      console.log(`  unresolved: ${stillUnresolved.join(", ")}`);
    }

    // Rate-limit: one-time backfill, be polite.
    await new Promise((r) => setTimeout(r, 400));
  }

  console.log(`\n${totalPatched} of ${totalMissing} missing ranks patched.`);
  if (Object.keys(unresolved).length) {
    console.log("Unresolved (left as –):", JSON.stringify(unresolved, null, 1));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
