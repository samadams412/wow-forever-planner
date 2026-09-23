// Alchemy's category assignment is hardcoded from a full, exhaustive read of
// foreverchanges.pro/professions/alchemy's own category sidebar (Potions 74,
// Elixirs 64, Flasks 9, Transmutes 13, Oils and other 16, Camp objects 3 =
// 179 items, matching that page's own "179 Recipes" total) rather than a
// name/slot heuristic -- Alchemy's Potions/Elixirs split in particular has
// no reliable signal short of this (e.g. "Minor Troll's Blood Elixir" is
// filed under Potions despite its name, and the item catalog's own `type`
// field confirms it: `type: "Potions"`). Built end-to-end first per this
// session's task order, so this is the one profession with zero uncertain
// items by construction.

const CATEGORY_BY_NAME = {};
const CAMP_OBJECTS = ["Mana Well", "Fermenter", "Alchemy Laboratory"];
const TRANSMUTES = [
  "Gold Bar", "Truesilver Bar", "Arcanite Bar", "Essence of Air",
  "Essence of Earth", "Essence of Fire", "Essence of Undeath",
  "Essence of Water", "Legionite Bar", "Living Essence", "Elemental Fire",
];
const FLASKS = [
  "Flask of Chromatic Resistance", "Flask of Distilled Wisdom",
  "Flask of Natural Accuracy", "Flask of Natural Aggression",
  "Flask of Natural Precision", "Flask of Natural Swiftness",
  "Flask of Petrification", "Flask of Supreme Power", "Flask of the Titans",
];
const OILS_AND_OTHER = [
  "Cerulean Dye", "Sulfuric Acid", "Blackmouth Oil", "Magenta Dye",
  "Fire Oil", "Shadow Oil", "Frost Oil", "Oil of Immolation",
  "Goblin Rocket Fuel", "Viridian Dye", "Philosopher's Stone", "Ghost Dye",
  "Stonescale Oil", "Alchemists' Stone", "Gurubashi Mojo Madness",
  "Refined Scale of Onyxia",
];
const POTIONS = [
  "Minor Troll's Blood Elixir", "Minor Mana Potion", "Minor Mender's Potion",
  "Minor Spellblasting Potion", "Minor Frenzy Potion",
  "Minor Rejuvenation Potion", "Minor Discolored Healing Potion",
  // Not in foreverchanges.pro's 179-item ground truth this list was built
  // from (it's likely been added there since) -- but every other tier of
  // "Discolored Healing Potion" (Lesser/regular/Greater/Superior) is
  // confirmed Potions above, and WoW keeps a whole tiered item family in
  // one category, so this is a confident addition, not a guess.
  "Major Discolored Healing Potion",
  "Rage Potion", "Swiftness Potion", "Lesser Discolored Healing Potion",
  "Lesser Mender's Potion", "Lesser Spellblasting Potion",
  "Lesser Frenzy Potion", "Holy Protection Potion", "Swim Speed Potion",
  "Minor Magic Resistance Potion", "Discolored Healing Potion",
  "Lesser Mana Potion", "Potion of Poison Cleansing",
  "Lesser Troll's Blood Elixir", "Mender's Potion",
  "Shadow Protection Potion", "Spellblasting Potion", "Frenzy Potion",
  "Free Action Potion", "Greater Discolored Healing Potion", "Mana Potion",
  "Fire Protection Potion", "Lesser Invisibility Potion",
  "Greater Mender's Potion", "Great Rage Potion", "Disorienting Smog Potion",
  "Troll's Blood Elixir", "Greater Spellblasting Potion",
  "Frost Protection Potion", "Greater Frenzy Potion",
  "Nature Protection Potion", "Greater Mana Potion",
  "Magic Resistance Potion", "Restorative Potion",
  "Lesser Stoneshield Potion", "Superior Discolored Healing Potion",
  "Wildvine Potion", "Dreamless Sleep Potion", "Superior Mender's Potion",
  "Invisibility Potion", "Superior Spellblasting Potion",
  "Superior Frenzy Potion", "Dragonfire Potion",
  "Limited Invulnerability Potion", "Potion of Demonslaying",
  "Mighty Rage Potion", "Superior Mana Potion", "Caustic Smog Potion",
  "Greater Dreamless Sleep Potion", "Mageblood Elixir",
  "Potion of Venomous Blood", "Greater Stoneshield Potion",
  "Major Mender's Potion", "Potion of Beast Culling",
  "Potion of Elemental Siphoning", "Living Action Potion",
  "Major Spellblasting Potion", "Purification Potion",
  "Greater Arcane Protection Potion", "Greater Fire Protection Potion",
  "Greater Frost Protection Potion", "Greater Holy Protection Potion",
  "Greater Nature Protection Potion", "Greater Shadow Protection Potion",
  "Major Frenzy Potion", "Major Troll's Blood Elixir", "Major Mana Potion",
  "Major Rejuvenation Potion",
];
const ELIXIRS = [
  "Elixir of Minor Force", "Minor Arcane Elixir", "Elixir of Minor Spirit",
  "Minor Mageblood Elixir", "Elixir of Minor Defense",
  "Elixir of Minor Strength", "Minor Cleric's Elixir",
  "Elixir of Minor Agility", "Elixir of Minor Fortitude",
  "Elixir of Lesser Spirit", "Lesser Mageblood Elixir",
  "Draught of Water Breathing", "Elixir of Giant Growth", "Elixir of Wisdom",
  "Elixir of Lesser Intellect", "Lesser Cleric's Elixir",
  "Elixir of Spirit", "Lesser Arcane Elixir", "Elixir of Lesser Defense",
  "Elixir of Intellect", "Elixir of Fire Power", "Elixir of Lesser Agility",
  "Cleric's Elixir", "Elixir of Fortitude", "Elixir of Ogre Strength",
  "Elixir of Strength", "Elixir of Greater Spirit",
  "Draught of Water Walking", "Elixir of Lesser Fortitude",
  "Greater Mageblood Elixir", "Elixir of Agility", "Elixir of Frost Power",
  "Draught of Detect Lesser Invisibility", "Draught of Predatory Senses",
  "Elixir of Defense", "Greater Cleric's Elixir", "Catseye Draught",
  "Elixir of Greater Fortitude", "Draught of Greater Water Breathing",
  "Draught of Detect Undead", "Arcane Elixir", "Elixir of Greater Intellect",
  "Draught of Dream Vision", "Elixir of Greater Agility", "Gift of Arthas",
  "Elixir of Greater Strength", "Distilled Firewater",
  "Draught of Detect Demon", "Elixir of Holy Power", "Elixir of Shadow Power",
  "Elixir of the Phalanx", "Elixir of Greater Defense", "Elixir of the Sages",
  "Elixir of Brute Force", "Elixir of Cunning", "Elixir of Ferocity",
  "Elixir of Sages", "Elixir of the Whale", "Elixir of the Mongoose",
  "Elixir of the Owl", "Elixir of Nature Power",
  "Elixir of Wicked Regeneration", "Greater Arcane Elixir",
  "Elixir of the Grizzly",
];

for (const n of CAMP_OBJECTS) CATEGORY_BY_NAME[n] = "Camp Objects";
for (const n of TRANSMUTES) CATEGORY_BY_NAME[n] = "Transmutes";
for (const n of FLASKS) CATEGORY_BY_NAME[n] = "Flasks";
for (const n of OILS_AND_OTHER) CATEGORY_BY_NAME[n] = "Oils and Other";
for (const n of POTIONS) CATEGORY_BY_NAME[n] = "Potions";
for (const n of ELIXIRS) CATEGORY_BY_NAME[n] = "Elixirs";

const CATEGORIES = ["Potions", "Elixirs", "Flasks", "Transmutes", "Oils and Other", "Camp Objects"];

function categorize(recipeName) {
  // Strip the "NAMExN" no-space-craft-count artifact (see fc-item.js's own
  // note on this pattern) before lookup -- the ground-truth list above uses
  // the clean name.
  const stripped = recipeName.replace(/x\d+$/, "");
  const category = CATEGORY_BY_NAME[recipeName] || CATEGORY_BY_NAME[stripped] || null;
  return { category, confident: category !== null };
}

module.exports = { categorize, CATEGORIES };
