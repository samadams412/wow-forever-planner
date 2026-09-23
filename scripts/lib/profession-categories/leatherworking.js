const SLOT_TO_CATEGORY = {
  Head: "Head",
  Shoulder: "Shoulders",
  Back: "Cloaks",
  Chest: "Chest",
  Wrist: "Bracers",
  Hands: "Gloves",
  Waist: "Belts",
  Legs: "Legs",
  Feet: "Boots",
  Bag: "Bags",
};

const NAME_RULES = [
  [/Armor Kit$/i, "Armor Kits"],
  [/^Cured .*(Hide|Scale)$|Leather$/i, "Cured Leather"],
  [/Camp Tent$|Tanning Rack$/i, "Camp Objects"],
];

function categorize(recipeName, item) {
  const slot = item ? item.slot : null;
  if (slot && SLOT_TO_CATEGORY[slot]) {
    return { category: SLOT_TO_CATEGORY[slot], confident: true };
  }
  for (const [pattern, category] of NAME_RULES) {
    if (pattern.test(recipeName)) return { category, confident: true };
  }
  return { category: "Other", confident: false };
}

module.exports = { categorize };
