// Every First Aid item has no slot at all (bandages/potions/kits aren't
// equippable), so this is name-pattern only -- but the profession is small
// (32 recipes) and the 3 given categories cover it cleanly with no leftover
// bucket needed.
const NAME_RULES = [
  [/Bandage$|Tourniquet$/i, "Bandages"],
  [/Anti-Venom$|Potion$|Poultice$/i, "Anti-Venoms and Potions"],
];

function categorize(recipeName) {
  for (const [pattern, category] of NAME_RULES) {
    if (pattern.test(recipeName)) return { category, confident: true };
  }
  // First Aid Kit, Plague Doctor's Laboratory, Toxin Study and similar
  // tools/fixtures -- the profession's own "Camp Objects" bucket.
  return { category: "Camp Objects", confident: false };
}

module.exports = { categorize };
