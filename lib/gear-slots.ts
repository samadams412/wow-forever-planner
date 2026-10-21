// Gear planner slots: the frozen slot order and the map from data/items.json's
// catalog `slot` strings to planner slots. Client-safe, no imports.

// FROZEN: gear share codes are positional over this order. Never reorder or
// remove an entry; a new slot appends. If that can't hold, bump the gear code
// version and branch the decoder (same rule as SPEC_ORDER in lib/raid-comp.ts).
export const GEAR_SLOTS = [
  "head", "neck", "shoulder", "back", "chest", "wrist", "hands", "waist", "legs", "feet",
  "finger1", "finger2", "trinket1", "trinket2", "main", "off", "ranged",
] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];

export const GEAR_SLOT_LABEL: Record<GearSlot, string> = {
  head: "Head", neck: "Neck", shoulder: "Shoulder", back: "Back", chest: "Chest", wrist: "Wrist",
  hands: "Hands", waist: "Waist", legs: "Legs", feet: "Feet", finger1: "Finger", finger2: "Finger",
  trinket1: "Trinket", trinket2: "Trinket", main: "Main Hand", off: "Off Hand", ranged: "Ranged",
};

// Every catalog slot string an equippable item can carry. Which of the
// candidate slots an item may actually go in (dual wield for One-Hand in
// "off", class weapon/armor proficiency) is a class rule, not a slot rule.
export const CATALOG_SLOT_TO_GEAR_SLOTS: Record<string, readonly GearSlot[]> = {
  Head: ["head"], Neck: ["neck"], Shoulder: ["shoulder"], Back: ["back"], Chest: ["chest"],
  Wrist: ["wrist"], Hands: ["hands"], Waist: ["waist"], Legs: ["legs"], Feet: ["feet"],
  Finger: ["finger1", "finger2"], Trinket: ["trinket1", "trinket2"],
  "Two-Hand": ["main"], "Main Hand": ["main"], "One-Hand": ["main", "off"],
  "Off Hand": ["off"], Shield: ["off"], "Held In Off-hand": ["off"],
  Ranged: ["ranged"], Thrown: ["ranged"], Relic: ["ranged"],
};

// Equippable in game but outside the planner's 17 slots: cosmetic or storage.
export const NON_PLANNER_CATALOG_SLOTS = ["Shirt", "Tabard", "Bag", "Ammo"] as const;

export function gearSlotsFor(catalogSlot: string | null): readonly GearSlot[] {
  return (catalogSlot && CATALOG_SLOT_TO_GEAR_SLOTS[catalogSlot]) || [];
}

// A two-hander in "main" empties "off".
export const isTwoHand = (catalogSlot: string | null) => catalogSlot === "Two-Hand";
