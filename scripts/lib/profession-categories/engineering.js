// Engineering is the profession with the weakest slot signal -- 154 of 242
// recipes craft something with no equip slot at all (bombs, ammo
// components, gizmos, tools), so this leans on name patterns more than any
// other profession's categorizer. Deliberately conservative: patterns only
// fire on fairly distinctive suffixes, and anything left over falls to
// "Parts" (a real crafted-component bucket, not a guess dressed as
// confident) flagged uncertain rather than forced into a specific-sounding
// category it might not belong in.
const SLOT_TO_CATEGORY = {
  Trinket: "Trinkets and Devices",
  Head: "Goggles and Helms",
  Ranged: "Guns and Scopes",
  Ammo: "Ammunition",
};

const NAME_RULES = [
  [/\b(Bomb|Dynamite|Charge|Blasting Powder|Grenade|Land Mine)s?$/i, "Bombs and Explosives"],
  [/Scope$/i, "Guns and Scopes"],
  [/Firework$|Rocket$|Rocket Cluster$/i, "Fireworks and Toys"],
  [/Mechanical (Squirrel|Yeti|Chicken|Dragonling)|Mechanostrider|Mount$/i, "Pets and Mounts"],
  [/^(Rough|Coarse|Heavy|Handful of).*(Blasting Powder|Bolts)$/i, "Parts"],
  // Usable devices, by classic-WoW-engineering naming convention: repair/
  // reagent/alarm bots, teleport devices, target dummies, and the
  // decoy-sheep line of combat trinkets are all activated items, not raw
  // crafted components.
  [/\bBot(\s\d+[A-Z]?)?$/i, "Trinkets and Devices"],
  [/^(Dimensional|Ultrasafe) (Ripper|Transporter)/i, "Trinkets and Devices"],
  [/Target Dummy$/i, "Trinkets and Devices"],
  [/Sheep$|Bombling$/i, "Trinkets and Devices"],
];

function categorize(recipeName, item) {
  const slot = item ? item.slot : null;
  if (slot && SLOT_TO_CATEGORY[slot]) {
    return { category: SLOT_TO_CATEGORY[slot], confident: true };
  }
  for (const [pattern, category] of NAME_RULES) {
    if (pattern.test(recipeName)) return { category, confident: true };
  }
  if (slot) {
    // Has SOME equip slot (Waist/Back/Feet/Neck/Shield/Main Hand -- rare
    // engineering-crafted gear pieces) that isn't one of the 4 slots this
    // profession's own categories name directly.
    return { category: "Other Gear", confident: false };
  }
  return { category: "Parts", confident: false };
}

module.exports = { categorize };
