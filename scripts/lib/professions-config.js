// Single source of truth for the 8 profession catalog pages: route slug,
// the data/professions/<dataFile>.json this reads from (firstaid.json has
// no hyphen even though its slug does), display name, and the category
// list for its sidebar filter (order matches display order). Category
// lists are exactly what was specified for this task, with two additions
// made explicit during this session (see scripts/build-professions.js's
// header comment for why):
// - Enchanting gets an 11th "Other" category for wands/rods/oils/relics
//   (55 of 222 recipes -- none of the given 10 slot categories fit them).
// - Cooking's "Stamina and Spirit" and standalone "Spirit" are collapsed
//   into one "Stamina and Spirit" category (the given list had both; no
//   cooking item grants a combined Stamina+Spirit buff, so these were
//   confirmed to be the same bucket, not two).
const PROFESSIONS = [
  {
    id: "alchemy",
    dataFile: "alchemy",
    name: "Alchemy",
    hasLeveling: true,
    categories: ["Potions", "Elixirs", "Flasks", "Transmutes", "Oils and Other", "Camp Objects"],
  },
  {
    id: "blacksmithing",
    dataFile: "blacksmithing",
    name: "Blacksmithing",
    hasLeveling: true,
    categories: [
      "One-Hand Weapons", "Two-Hand Weapons", "Shields", "Head", "Shoulders",
      "Chest", "Bracers", "Gloves", "Belts", "Legs", "Boots",
      "Sharpening/Weight/Grinding Stones", "Shield Spikes/Chain/Spurs",
      "Keys/Rods/Tools", "Camp Objects",
    ],
  },
  {
    id: "cooking",
    dataFile: "cooking",
    name: "Cooking",
    hasLeveling: true,
    categories: [
      "Stamina and Spirit", "Strength and Attack Power", "Agility",
      "Intellect/Spell Power/Mana", "Other Buffs", "Health and Mana Only",
      "Camp Objects",
    ],
  },
  {
    id: "enchanting",
    dataFile: "enchanting",
    name: "Enchanting",
    hasLeveling: true,
    categories: [
      "Weapon", "Two-Hand", "Shield", "Off-Hand", "Chest", "Cloak",
      "Bracers", "Gloves", "Boots", "Neck", "Other",
    ],
  },
  {
    id: "engineering",
    dataFile: "engineering",
    name: "Engineering",
    hasLeveling: true,
    categories: [
      "Bombs and Explosives", "Trinkets and Devices", "Goggles and Helms",
      "Other Gear", "Guns and Scopes", "Ammunition", "Fireworks and Toys",
      "Pets and Mounts", "Parts", "Other", "Camp Objects",
    ],
  },
  {
    id: "first-aid",
    dataFile: "firstaid",
    name: "First Aid",
    hasLeveling: true,
    // Confirmed against foreverchanges.pro's own live First Aid page:
    // it has no Merchant's Favor vendor/section at all, unlike every
    // other profession -- not a scrape gap. build-professions.js skips
    // parsing favor_section for this profession, and the page hides the
    // tab entirely rather than showing an empty "coming soon" state.
    hasFavor: false,
    categories: ["Bandages", "Anti-Venoms and Potions", "Camp Objects"],
  },
  {
    id: "leatherworking",
    dataFile: "leatherworking",
    name: "Leatherworking",
    hasLeveling: true,
    categories: [
      "Head", "Shoulders", "Cloaks", "Chest", "Bracers", "Gloves", "Belts",
      "Legs", "Boots", "Armor Kits", "Bags", "Cured Leather", "Other",
      "Camp Objects",
    ],
  },
  {
    id: "tailoring",
    dataFile: "tailoring",
    name: "Tailoring",
    hasLeveling: true,
    categories: [
      "Head", "Shoulders", "Cloaks", "Chest", "Bracers", "Gloves", "Belts",
      "Legs", "Boots", "Shirts and Robes for Show", "Bags", "Bolts of Cloth",
      "Other", "Camp Objects",
    ],
  },
];

function getProfession(id) {
  return PROFESSIONS.find((p) => p.id === id);
}

module.exports = { PROFESSIONS, getProfession };
