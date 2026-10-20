// Raid comp planner core: the spec list, roster shape and pure helpers.
// Client-safe (no Node built-ins) and deliberately free of lib/wow-data,
// which would pull every talent file into the client bundle: the server
// page resolves icons/colors into SpecView and passes them down.

export const GROUP_COUNT = 8;
export const GROUP_SIZE = 5;
export const ROSTER_SIZE = GROUP_COUNT * GROUP_SIZE;
export const MAX_NAME_LENGTH = 12; // WoW character names cap at 12 letters

export type Spec = {
  /** 1-based position in SPECS; 0 means an empty slot. */
  index: number;
  classId: string;
  /** Talent tree name exactly as in data/talents/<classId>.json. */
  tree: string;
};

// FROZEN ORDER: a spec's position here is its share-link digit, so never
// reorder or remove entries. A renamed tree just changes `tree` in place;
// new specs append to the end. lib/raid-comp.test.ts checks every `tree`
// still exists in the talent data.
const SPEC_ORDER: [string, string][] = [
  ["warrior", "Arms"], ["warrior", "Fury"], ["warrior", "Protection"],
  ["paladin", "Holy"], ["paladin", "Protection"], ["paladin", "Retribution"],
  ["hunter", "Beast Mastery"], ["hunter", "Marksmanship"], ["hunter", "Survival"],
  ["rogue", "Assassination"], ["rogue", "Combat"], ["rogue", "Subtlety"],
  ["priest", "Discipline"], ["priest", "Holy"], ["priest", "Shadow"],
  ["shaman", "Elemental"], ["shaman", "Enhancement"], ["shaman", "Restoration"],
  ["mage", "Arcane"], ["mage", "Fire"], ["mage", "Frost"],
  ["warlock", "Affliction"], ["warlock", "Demonology"], ["warlock", "Destruction"],
  ["druid", "Balance"], ["druid", "Feral Combat"], ["druid", "Restoration"],
];

export const SPECS: Spec[] = SPEC_ORDER.map(([classId, tree], i) => ({ index: i + 1, classId, tree }));

export function getSpec(index: number): Spec | undefined {
  return index > 0 ? SPECS[index - 1] : undefined;
}

/** A Spec plus display fields resolved on the server (icon is a full URL). */
export type SpecView = Spec & { label: string; className: string; color: string; icon: string };

/** One spec index per slot (0 = empty), length ROSTER_SIZE. */
export type Roster = number[];

export function emptyRoster(): Roster {
  return Array(ROSTER_SIZE).fill(0);
}

export function emptyNames(): string[] {
  return Array(ROSTER_SIZE).fill("");
}

/** Swap two slots' contents (spec and name together). */
export function swapSlots<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
