// Enchant recipes name their own slot directly ("Enchant <Slot> - <Effect>"),
// which is far more reliable than the item catalog for this profession --
// most enchants have no physical crafted item at all (they're a permanent
// effect applied to gear), so item.slot is usually null anyway. Use the
// " - " delimiter (space-hyphen-space), not a bare hyphen: "Off-Hand"
// itself contains a hyphen with no surrounding spaces, so a bare-hyphen
// split misparses "Enchant Off-Hand - Wisdom" into slot "Off" -- confirmed
// by hand during this session before trusting the delimiter choice.
const NAME_TO_CATEGORY = {
  "Weapon": "Weapon",
  "2H Weapon": "Two-Hand",
  "Shield": "Shield",
  "Off-Hand": "Off-Hand",
  "Chest": "Chest",
  "Cloak": "Cloak",
  "Bracer": "Bracers",
  "Gloves": "Gloves",
  "Boots": "Boots",
  "Necklace": "Neck",
};

function categorize(recipeName) {
  const m = recipeName.match(/^Enchant (.+?) - /);
  if (m && NAME_TO_CATEGORY[m[1]]) {
    return { category: NAME_TO_CATEGORY[m[1]], confident: true };
  }
  // Wands, rods, enchanting oils, and class relics (librams/idols/totems) --
  // none of the given slot categories fit these; confirmed with the user
  // this session that "Other" is the right home for them (55 of 222
  // recipes), not a stretch-fit into one of the slot buckets.
  return { category: "Other", confident: true };
}

module.exports = { categorize };
