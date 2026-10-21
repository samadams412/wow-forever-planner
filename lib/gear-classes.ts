// What each class can equip, for the gear planner's item filters. Classic
// trainable proficiencies (Forever changes not checked yet: confidence
// "estimated"). Only Warrior is filled in; add a class when its presets are
// generated, and check its row against the in-game trainer first.
// Client-safe, no imports.

export type ClassGearRules = {
  // [level from which it applies, highest armor type]; last matching row wins.
  armor: [number, "Cloth" | "Leather" | "Mail" | "Plate"][];
  shield: boolean;
  // data/items.json `type` values for weapons.
  weapons: string[];
  // Catalog slots allowed in the ranged slot (Thrown has no `type` of its own).
  ranged: string[];
  dualWieldLevel: number | null;
  confidence: "estimated";
};

export const CLASS_GEAR: Partial<Record<string, ClassGearRules>> = {
  warrior: {
    armor: [[1, "Mail"], [40, "Plate"]],
    shield: true,
    weapons: ["Axe", "Sword", "Mace", "Dagger", "Fist Weapon", "Polearm", "Staff", "Bow", "Crossbow", "Gun"],
    ranged: ["Ranged", "Thrown"],
    dualWieldLevel: 20,
    confidence: "estimated",
  },
};

const ARMOR_ORDER = ["Cloth", "Leather", "Mail", "Plate"];

export function maxArmorType(rules: ClassGearRules, level: number): string {
  let best = rules.armor[0][1];
  for (const [from, type] of rules.armor) if (level >= from) best = type;
  return best;
}

// Whether an item of this catalog slot/type is usable by the class at
// `level`. Class restrictions ("Classes: ...") are checked separately.
export function canEquip(rules: ClassGearRules, level: number, slot: string, type: string | null, itemClass: number): boolean {
  if (itemClass === 2) {
    if (slot === "Thrown") return rules.ranged.includes("Thrown");
    return type !== null && rules.weapons.includes(type);
  }
  if (slot === "Shield" || type === "Shield") return rules.shield;
  if (type === "Idol" || type === "Libram" || type === "Totem") return false;
  const tier = ARMOR_ORDER.indexOf(type ?? "");
  // Not an armor type (rings, necks, trinkets, cloaks report Cloth, misc).
  if (tier === -1) return true;
  return tier <= ARMOR_ORDER.indexOf(maxArmorType(rules, level));
}
