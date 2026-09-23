// Shared "Camp, skill rewards and perks" build-side helpers -- used by both
// build-professions.js (8 crafting professions) and build-gathering-
// professions.js (Mining/Herbalism/Skinning), since the #camp chapter's
// markup (and therefore its parsed shape from parseCampSection) is
// identical between crafting and gathering pages -- only WHICH 3 Legacy
// Perks show differs (crafting professions get Performance Bonus/Working
// Overtime/Dedicated Study; gathering professions get Bountiful Harvest/
// Working Overtime/Dedicated Study, confirmed live against Mining,
// Herbalism, and Skinning all showing the identical 3).

const fs = require("fs");
const path = require("path");
const { itemRef, unresolvedItemRef, itemIdFromUrl } = require("./item-ref");

function buildCampMilestones(rawItems, byId) {
  return (rawItems || []).map((raw) => {
    const id = itemIdFromUrl(raw.item_url);
    const item = id !== null ? byId.get(id) : null;
    return {
      name: raw.name,
      // The row's own trade/profession icon (e.g. "trade_tailoring") for a
      // plain skill-rank milestone with no real item -- null once a real
      // item resolved, since that item's own icon is what LootItemPill
      // renders instead.
      icon: item ? null : raw.icon,
      description: raw.description,
      legacyPoints: raw.legacy_points,
      skill: raw.skill,
      // Genuinely null (not unresolvedItemRef) when the source page never
      // linked an item at all -- a skill-rank milestone with no item is a
      // different, correct state from a real item we failed to resolve.
      item: id !== null ? itemRef(item) || unresolvedItemRef(raw.name) : null,
      blueprint: (() => {
        const bpId = itemIdFromUrl(raw.blueprint_url);
        const bpItem = bpId !== null ? byId.get(bpId) : null;
        return bpId !== null ? itemRef(bpItem) || unresolvedItemRef("Blueprint") : null;
      })(),
    };
  });
}

// `perkIds`: which 3 (so far always 3) ids to pull from data/legacy-perks.
// json's "Professions" tree -- callers pass the crafting or gathering set.
// If foreverchanges ever shows a 4th perk on either page type, adjust the
// caller's list from a fresh look at the live page rather than assuming
// count.
function loadLegacyPerks(perkIds) {
  const legacyPerksPath = path.join(__dirname, "..", "..", "data", "legacy-perks.json");
  const data = JSON.parse(fs.readFileSync(legacyPerksPath, "utf8"));
  const professionsTree = data.trees.find((t) => t.name === "Professions");
  return perkIds.map((id) => {
    const perk = professionsTree.perks.find((p) => p.id === id);
    if (!perk) throw new Error(`Legacy perk "${id}" not found in data/legacy-perks.json's Professions tree`);
    // The tree only stores a prereq's id -- resolve its display name here so
    // the profession page's simple perk list doesn't need its own copy of
    // the whole Professions tree just to answer "which perk is that".
    const prereqName = perk.prereq ? professionsTree.perks.find((p) => p.id === perk.prereq.id)?.name ?? null : null;
    return {
      id: perk.id,
      name: perk.name,
      icon: perk.icon,
      maxRank: perk.maxRank,
      gate: perk.gate,
      prereqName,
      // The max-rank description is the "fully invested" effect -- the
      // clearest single line to show in a static list (this tab isn't the
      // interactive per-rank tree /reference/legacy-perks already is).
      description: perk.ranks[perk.ranks.length - 1],
    };
  });
}

const CRAFTING_LEGACY_PERK_IDS = ["professions_performance_bonus", "professions_working_overtime", "professions_dedicated_study"];
const GATHERING_LEGACY_PERK_IDS = ["professions_bountiful_harvest", "professions_working_overtime", "professions_dedicated_study"];

module.exports = { buildCampMilestones, loadLegacyPerks, CRAFTING_LEGACY_PERK_IDS, GATHERING_LEGACY_PERK_IDS };
