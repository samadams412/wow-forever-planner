#!/usr/bin/env node
// Builds data/professions-catalog/<id>.json (one per profession, read by
// lib/profession-recipes.ts) from the raw data/professions/<dataFile>.json
// recipe lists this session was given, plus the optional
// <dataFile>_leveling_and_merchants.json for Alchemy/Blacksmithing.
//
// Every recipe and reagent name is resolved against the full item catalog
// (data/items.json) by exact name match -- data/professions/*.json has no
// item ids at all. 99.84% of ~9,400 names resolve this way (checked
// directly before trusting it); a name is stripped of a trailing "x2"/"x3"/
// "x200" (a scrape artifact meaning "craft yields N", not part of the name,
// e.g. "Fire Oilx2") before the lookup, with the count carried through as
// `makesQty`. Unresolved names (mostly enchant spell effects with no
// physical item) keep `item: null` and render as plain text elsewhere,
// same degradation this site already uses for unknown items.
//
// Also writes data/professions-catalog/uncertain.json -- every recipe whose
// categorizer wasn't confident, grouped by profession, for review. Nothing
// is left uncategorized (every recipe gets a best-guess bucket), but a
// low-confidence guess is marked so it doesn't read as equally certain to
// the ones a real signal (item slot, tooltip text, or an exhaustive
// ground-truth read for Alchemy) actually confirmed.

const fs = require("fs");
const path = require("path");
const { PROFESSIONS } = require("./lib/professions-config");
const { buildNameIndex, resolveItemByName, parseReagentText } = require("./lib/profession-item-resolver");
const { itemRef, unresolvedItemRef } = require("./lib/item-ref");
const { buildCampMilestones, loadLegacyPerks, CRAFTING_LEGACY_PERK_IDS } = require("./lib/camp-section");

const ROOT = path.join(__dirname, "..");
const PROF_DIR = path.join(ROOT, "data", "professions");
const OUT_DIR = path.join(ROOT, "data", "professions-catalog");

const CATEGORIZERS = {
  alchemy: require("./lib/profession-categories/alchemy"),
  blacksmithing: require("./lib/profession-categories/blacksmithing"),
  cooking: require("./lib/profession-categories/cooking"),
  enchanting: require("./lib/profession-categories/enchanting"),
  engineering: require("./lib/profession-categories/engineering"),
  "first-aid": require("./lib/profession-categories/first-aid"),
  leatherworking: require("./lib/profession-categories/leatherworking"),
  tailoring: require("./lib/profession-categories/tailoring"),
};

// itemRef/unresolvedItemRef (the LootItem-shaped wrapper every item
// reference in this file uses) now live in scripts/lib/item-ref.js,
// shared with build-gathering-professions.js.

function buildRecipe(raw, byName, categorizer) {
  const { item, makesQty, cleanName } = resolveItemByName(byName, raw.name);
  const { category, confident } = categorizer.categorize(cleanName, item);
  const reagents = (raw.reagents || []).map((r) => {
    const { qty, name } = parseReagentText(r);
    const resolved = resolveItemByName(byName, name);
    return { qty, name: resolved.cleanName, item: itemRef(resolved.item) || unresolvedItemRef(resolved.cleanName) };
  });
  return {
    name: cleanName,
    rank: raw.rank,
    category,
    categoryConfident: confident,
    source: raw.source,
    skills: raw.skills,
    item: itemRef(item) || unresolvedItemRef(cleanName),
    makesQty,
    reagents,
  };
}

// Alchemy's and Blacksmithing's *_leveling_and_merchants.json don't share
// one schema, confirmed by hand when Blacksmithing's leveling guide
// rendered "–" ranges and blank rank-requirement text live: Alchemy's
// range is a [min, max] tuple and its rank requirement field is
// "requirement" (singular); Blacksmithing's range is a {min, max} object
// and its field is "requirements" (plural). Normalize both here rather
// than assuming a second data file matches the first one's shape.
function normalizeRange(range) {
  if (Array.isArray(range)) return [range[0], range[1]];
  if (range && typeof range === "object") return [range.min, range.max];
  return [null, null];
}

// itemIdFromUrl/buildCampMilestones/loadLegacyPerks now live in
// scripts/lib/camp-section.js and scripts/lib/item-ref.js, shared with
// build-gathering-professions.js -- the #camp chapter's markup (and this
// project's "id join over name guess" resolution) is identical between
// crafting and gathering pages, only the 3 Legacy Perk ids differ.

function buildLevelingSection(sections, byName) {
  if (!sections) return null;
  return sections.map((rank) => ({
    rank: rank.rank,
    requirement: rank.requirement || rank.requirements || "",
    steps: (rank.steps || []).map((step) => {
      const { item } = resolveItemByName(byName, step.item.name);
      return {
        range: normalizeRange(step.range),
        item: itemRef(item) || unresolvedItemRef(step.item.name),
        source: step.source,
        count: step.count,
        mats: (step.mats || []).map((mat) => {
          const { item: matItem } = resolveItemByName(byName, mat.name);
          return {
            qty: mat.quantity || 1,
            item: itemRef(matItem) || unresolvedItemRef(mat.name),
          };
        }),
      };
    }),
  }));
}

function buildFavorSection(sections, byName, recipesByName) {
  if (!sections) return null;
  return sections.map((tier) => ({
    // Alchemy's own tier string already embeds the skill range ("45
    // Merchant's Favor (skill 65 to 140)"); Blacksmithing's doesn't ("30
    // Merchant's Favor") and carries it in a separate skill_range object
    // instead -- append it so both professions' tier headers read the same.
    tier:
      tier.skill_range && !/skill/i.test(tier.tier)
        ? `${tier.tier} (skill ${tier.skill_range.min} to ${tier.skill_range.max})`
        : tier.tier,
    items: (tier.items || []).map((fav) => {
      const { item } = resolveItemByName(byName, fav.name);
      // Pull the full orange/yellow/green/grey set from the main recipe
      // list when this same item appears there (by name) -- favor_section
      // only ever gives one raw skill_threshold number, but it's always
      // equal to that recipe's own `skills.orange` (checked directly
      // against several before trusting it), so the fuller set is real
      // data, not inferred.
      const recipe = recipesByName.get(fav.name.trim().toLowerCase());
      return {
        item: itemRef(item) || unresolvedItemRef(fav.name),
        skillThreshold: fav.skill_threshold,
        skills: recipe ? recipe.skills : null,
      };
    }),
  }));
}

function main() {
  const items = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "items.json"), "utf8")).items;
  const byName = buildNameIndex(items);
  const byId = new Map(items.map((i) => [i.itemId, i]));
  const campLegacyPerks = loadLegacyPerks(CRAFTING_LEGACY_PERK_IDS);

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const uncertainReport = {};

  for (const prof of PROFESSIONS) {
    const categorizer = CATEGORIZERS[prof.id];
    const rawPath = path.join(PROF_DIR, `${prof.dataFile}.json`);
    if (!fs.existsSync(rawPath)) {
      console.warn(`${prof.id}: no data file at ${rawPath}, skipping`);
      continue;
    }
    const rawRecipes = JSON.parse(fs.readFileSync(rawPath, "utf8"));
    const recipes = rawRecipes.map((r) => buildRecipe(r, byName, categorizer));

    const recipesByName = new Map();
    for (const r of recipes) if (!recipesByName.has(r.name.toLowerCase())) recipesByName.set(r.name.toLowerCase(), r);

    let leveling = null;
    let favor = null;
    let camp = null;
    if (prof.hasLeveling) {
      const levelingPath = path.join(PROF_DIR, `${prof.dataFile}_leveling_and_merchants.json`);
      if (fs.existsSync(levelingPath)) {
        const raw = JSON.parse(fs.readFileSync(levelingPath, "utf8"));
        leveling = buildLevelingSection(raw.leveling_section, byName);
        favor = buildFavorSection(raw.favor_section, byName, recipesByName);
        if (raw.camp_section) {
          camp = {
            milestones: buildCampMilestones(raw.camp_section.milestones, byId),
            campObjects: buildCampMilestones(raw.camp_section.camp_objects, byId),
            legacyPerks: campLegacyPerks,
          };
        }
      }
    }

    const catalog = {
      id: prof.id,
      name: prof.name,
      categories: prof.categories,
      recipes,
      leveling,
      favor,
      camp,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${prof.id}.json`), JSON.stringify(catalog, null, 1));

    const uncertain = recipes.filter((r) => !r.categoryConfident);
    if (uncertain.length) {
      uncertainReport[prof.id] = uncertain.map((r) => ({ name: r.name, category: r.category, source: r.source }));
    }

    const byCategory = {};
    for (const r of recipes) byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    console.log(
      `${prof.id}: ${recipes.length} recipes, ${uncertain.length} uncertain, leveling=${!!leveling}, favor=${!!favor}, camp=${!!camp}`
    );
    console.log(`  ${JSON.stringify(byCategory)}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, "uncertain.json"), JSON.stringify(uncertainReport, null, 1));
  const totalUncertain = Object.values(uncertainReport).reduce((n, arr) => n + arr.length, 0);
  console.log(`\n${totalUncertain} total uncertain-category recipes written to data/professions-catalog/uncertain.json`);
}

main();
