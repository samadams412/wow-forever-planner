// What each class can equip, for the gear planner's item filters. Classic
// trainable proficiencies (Forever changes not checked yet: confidence
// "estimated"). Cross-checked 2026-10-20 against foreverchanges' per-class item
// pools, which agree.
//
// Forever changes from Classic (confirmed, applied below):
//   - Druid: Polearms (two-handed). Confirmed by the site owner 2026-10-21;
//     foreverchanges' Druid pool includes them too. Nothing in our own sourced
//     data (spellbooks, talents, racials, items, quests) mentions it.
// Client-safe, no imports.

export type ClassGearRules = {
  // [level from which it applies, highest armor type]; last matching row wins.
  armor: [number, "Cloth" | "Leather" | "Mail" | "Plate"][];
  shield: boolean;
  // data/items.json `type` values for weapons.
  weapons: string[];
  // Types allowed as a Two-Hand weapon, when narrower than `weapons` (Mages: staves, not two-handed swords).
  twoHand?: string[];
  // Catalog slots allowed in the ranged slot (Thrown has no `type` of its own).
  ranged: string[];
  dualWieldLevel: number | null;
  // Relic type for the ranged slot (Libram, Idol, Totem); classes without one can't equip relics.
  relic?: "Libram" | "Idol" | "Totem";
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
  paladin: {
    armor: [[1, "Mail"], [40, "Plate"]],
    shield: true,
    weapons: ["Axe", "Sword", "Mace", "Polearm"],
    ranged: ["Relic"],
    dualWieldLevel: null,
    relic: "Libram",
    confidence: "estimated",
  },
  hunter: {
    armor: [[1, "Leather"], [40, "Mail"]],
    shield: false,
    weapons: ["Axe", "Sword", "Polearm", "Staff", "Dagger", "Fist Weapon", "Bow", "Crossbow", "Gun"],
    ranged: ["Ranged", "Thrown"],
    dualWieldLevel: 20,
    confidence: "estimated",
  },
  mage: {
    armor: [[1, "Cloth"]],
    shield: false,
    weapons: ["Sword", "Staff", "Dagger", "Wand"],
    twoHand: ["Staff"],
    ranged: ["Ranged"],
    dualWieldLevel: null,
    confidence: "estimated",
  },
  rogue: {
    armor: [[1, "Leather"]],
    shield: false,
    weapons: ["Dagger", "Sword", "Mace", "Fist Weapon", "Bow", "Crossbow", "Gun"],
    twoHand: [],
    ranged: ["Ranged", "Thrown"],
    dualWieldLevel: 10,
    confidence: "estimated",
  },
  priest: {
    armor: [[1, "Cloth"]],
    shield: false,
    weapons: ["Mace", "Staff", "Dagger", "Wand"],
    twoHand: ["Staff"],
    ranged: ["Ranged"],
    dualWieldLevel: null,
    confidence: "estimated",
  },
  warlock: {
    armor: [[1, "Cloth"]],
    shield: false,
    weapons: ["Sword", "Staff", "Dagger", "Wand"],
    twoHand: ["Staff"],
    ranged: ["Ranged"],
    dualWieldLevel: null,
    confidence: "estimated",
  },
  druid: {
    armor: [[1, "Leather"]],
    shield: false,
    weapons: ["Staff", "Mace", "Dagger", "Fist Weapon", "Polearm"],
    twoHand: ["Staff", "Mace", "Polearm"],
    ranged: ["Relic"],
    dualWieldLevel: null,
    relic: "Idol",
    confidence: "estimated",
  },
  shaman: {
    armor: [[1, "Leather"], [40, "Mail"]],
    shield: true,
    weapons: ["Axe", "Mace", "Staff", "Dagger", "Fist Weapon"],
    twoHand: ["Axe", "Mace", "Staff"],
    ranged: ["Relic"],
    dualWieldLevel: null,
    relic: "Totem",
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
    if (type === null || !rules.weapons.includes(type)) return false;
    return slot !== "Two-Hand" || (rules.twoHand ?? rules.weapons).includes(type);
  }
  if (slot === "Shield" || type === "Shield") return rules.shield;
  if (type === "Idol" || type === "Libram" || type === "Totem") return rules.relic === type;
  const tier = ARMOR_ORDER.indexOf(type ?? "");
  // Not an armor type (rings, necks, trinkets, cloaks report Cloth, misc).
  if (tier === -1) return true;
  return tier <= ARMOR_ORDER.indexOf(maxArmorType(rules, level));
}
