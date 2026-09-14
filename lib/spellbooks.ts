import spellbooksData from "@/data/spellbooks.json";

export type SpellbookEntry = {
  name: string;
  rank?: number;
  passive?: boolean;
  talent?: boolean;
  tag?: string;
  icon?: string;
  // Set on entries using the inv_misc_questionmark fallback because a real
  // icon hasn't been verified yet -- easy to grep for and swap in later.
  iconPlaceholder?: boolean;
};

export type SpellbookTab = {
  name: string;
  spells: SpellbookEntry[];
};

export type NewAbility = {
  name: string;
  status: "confirmed" | "unconfirmed";
  note: string;
  icon: string;
};

export type ClassSpellbook = {
  demoRace: string;
  notes: string[];
  notOpened: string[];
  tabs: SpellbookTab[];
  newAbilities: NewAbility[];
};

export type SpellbooksData = {
  source: string;
  classes: Record<string, ClassSpellbook>;
};

export const spellbooks: SpellbooksData = spellbooksData as SpellbooksData;

export const SPELLBOOK_CLASS_ORDER = [
  "warrior",
  "paladin",
  "hunter",
  "rogue",
  "priest",
  "shaman",
  "mage",
  "warlock",
  "druid",
];
