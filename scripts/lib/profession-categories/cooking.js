// Cooking has no slot signal at all (food isn't equippable) -- the real
// signal is the "well fed" buff text in the item's own tooltip, e.g. "...
// you will become well fed and gain 6 Attack Power for 15 min." 117 of 123
// cooking.json recipes resolve to an item with real tooltip text (checked
// directly before relying on this), so this covers the large majority;
// items with no tooltip (mostly "same"-status Classic food the beta client
// hasn't re-rendered) fall back uncertain.
//
// "Stamina and Spirit" and the given list's separate standalone "Spirit"
// were confirmed this session to be the same bucket (no cooking item grants
// a combined Stamina+Spirit buff) -- collapsed to one category in
// professions-config.js.
const STAT_TO_CATEGORY = {
  "Stamina": "Stamina and Spirit",
  "Spirit": "Stamina and Spirit",
  "Strength": "Strength and Attack Power",
  "Attack Power": "Strength and Attack Power",
  "Agility": "Agility",
  "Intellect": "Intellect/Spell Power/Mana",
  "Spell Power": "Intellect/Spell Power/Mana",
  "Spell Damage": "Intellect/Spell Power/Mana",
  "Mana": "Intellect/Spell Power/Mana",
};

function categorize(recipeName, item) {
  const tooltip = item && item.tooltip ? item.tooltip.join(" ") : "";
  // Campfire kits and cooking stations all carry the catalog's own
  // `type: "Other"` (confirmed against Basic/Journeyman/Expert Campfire
  // Kit and Iron Oven directly) plus a "Builds a ... campfire" / "Places a
  // ... Oven" Use line -- broader than a single literal phrase since each
  // tier's kit words it slightly differently ("a basic campfire", "an
  // expert campfire", "an Iron Oven").
  if (item && item.type === "Other" && /Builds a[n]? .*campfire|Places a[n]? .*Oven|Requires Cooking/i.test(tooltip)) {
    return { category: "Camp Objects", confident: true };
  }
  const buffMatch = tooltip.match(/gain \d+ ([A-Za-z ]+?) for \d+ min/);
  if (buffMatch) {
    const stat = buffMatch[1].trim();
    if (STAT_TO_CATEGORY[stat]) return { category: STAT_TO_CATEGORY[stat], confident: true };
    return { category: "Other Buffs", confident: true };
  }
  if (/Restores \d+ (health|mana)/i.test(tooltip)) {
    return { category: "Health and Mana Only", confident: true };
  }
  // No tooltip text to read at all -- can't tell what buff (if any) this
  // grants, so this is a real "don't know" rather than a confident guess.
  return { category: "Other Buffs", confident: false };
}

module.exports = { categorize };
