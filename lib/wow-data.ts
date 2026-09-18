import racesData from "@/data/races.json";
import racialsData from "@/data/racials.json";
import warriorData from "@/data/talents/warrior.json";
import paladinData from "@/data/talents/paladin.json";
import hunterData from "@/data/talents/hunter.json";
import rogueData from "@/data/talents/rogue.json";
import priestData from "@/data/talents/priest.json";
import shamanData from "@/data/talents/shaman.json";
import mageData from "@/data/talents/mage.json";
import warlockData from "@/data/talents/warlock.json";
import druidData from "@/data/talents/druid.json";

export type Confidence = "confirmed" | "datamined" | "estimated";
export type TalentStatus = "new" | "changed" | "moved" | "unchanged";

export type Race = {
  id: string;
  name: string;
  faction: "Alliance" | "Horde";
  allowedClasses: string[];
  notes: string;
  icon: string;
};

export type Racial = {
  name: string;
  type: "active" | "passive";
  description: string;
  confidence: Confidence;
  icon: string;
};

export type ClassicTalentInfo = {
  status: TalentStatus;
  tree?: string;
  tier?: number;
  col?: number;
  maxRank?: number;
  text?: string;
  renamedFrom?: string;
};

export type Talent = {
  id: string;
  name: string;
  tier: number;
  col: number;
  maxRank: number;
  ranks: string[];
  prereq: { id: string; ranks: number } | null;
  reqText?: string;
  status: TalentStatus;
  confidence: Confidence;
  icon: string;
  classic?: ClassicTalentInfo;
  passive: boolean;
  cost?: string;
};

export type TalentTree = {
  name: string;
  talents: Talent[];
};

export type InferredBaselineAbility = {
  name: string;
  description: string;
  confidence: "inferred";
  mentionedBy: string[];
};

export type ClassTalentData = {
  class: string;
  trees: TalentTree[];
  inferredBaselineAbilities?: InferredBaselineAbility[];
};

const CLASS_TALENT_DATA: Record<string, ClassTalentData> = {
  warrior: warriorData as ClassTalentData,
  paladin: paladinData as ClassTalentData,
  hunter: hunterData as ClassTalentData,
  rogue: rogueData as ClassTalentData,
  priest: priestData as ClassTalentData,
  shaman: shamanData as ClassTalentData,
  mage: mageData as ClassTalentData,
  warlock: warlockData as ClassTalentData,
  druid: druidData as ClassTalentData,
};

export const CLASS_ICON: Record<string, string> = {
  warrior: "class_warrior",
  paladin: "class_paladin",
  hunter: "class_hunter",
  rogue: "class_rogue",
  priest: "class_priest",
  shaman: "class_shaman",
  mage: "class_mage",
  warlock: "class_warlock",
  druid: "class_druid",
};

// Standard WoW class colors.
export const CLASS_COLOR: Record<string, string> = {
  warrior: "#C79C6E",
  paladin: "#F58CBA",
  hunter: "#ABD473",
  rogue: "#FFF569",
  priest: "#FFFFFF",
  shaman: "#0070DE",
  mage: "#69CCF0",
  warlock: "#9482C9",
  druid: "#FF7D0A",
};

export function classLabel(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

export const races: Race[] = racesData as Race[];
export const racialsByRace: Record<string, Racial[]> = racialsData as Record<string, Racial[]>;

export function getRaceById(id: string): Race | undefined {
  return races.find((r) => r.id === id);
}

// Race-specific bonus spell sections (data/class-racials.json) key their
// races object by display name (e.g. "Night Elf"), matching races.json's
// own `name` field -- this looks up the circular portrait icon from that
// name directly rather than needing a name-to-id conversion.
export function getRaceIconByName(raceName: string): string {
  return races.find((r) => r.name === raceName)?.icon ?? "inv_misc_questionmark";
}

export function getRacialsForRace(raceId: string): Racial[] {
  return racialsByRace[raceId] ?? [];
}

export function getClassTalentData(classId: string): ClassTalentData | undefined {
  return CLASS_TALENT_DATA[classId];
}

// The "first talent in the tree" heuristic below picks a poor/misleading
// representative icon for some trees (e.g. Warrior Fury landed on a
// situational tier-1 talent instead of anything Fury-flavored) -- these
// verified overrides take priority over the heuristic. Keyed by
// `${classId}:${treeName}`. Shared by the planner's talent tree grid and
// the Class Spellbooks page, so both stay in sync as overrides are added.
// Talent-tree entries were checked against Wowhead's icon CDN; warlock:Pet
// and hunter:Pet have no talent tree (they're spellbook-only tabs) and
// were instead read directly off talentsforever.com's own spellbook tab
// rail via its `li[data-sk]`/`.btab img` markup -- both reuse their
// class's own icon there, not a pet-specific one.
const TREE_ICON_OVERRIDES: Record<string, string> = {
  "warrior:Arms": "ability_warrior_offensivestance",
  "warrior:Fury": "ability_warrior_innerrage",
  "warrior:Protection": "ability_warrior_defensivestance",
  "paladin:Holy": "spell_holy_holybolt",
  "paladin:Retribution": "spell_holy_auraoflight",
  "paladin:Protection": "spell_holy_devotionaura",
  "hunter:Beast Mastery": "ability_hunter_beasttaming",
  "hunter:Marksmanship": "ability_marksmanship",
  "hunter:Survival": "ability_hunter_swiftstrike",
  "hunter:Pet": "class_hunter",
  "rogue:Assassination": "ability_rogue_eviscerate",
  "rogue:Combat": "ability_backstab",
  "rogue:Subtlety": "ability_stealth",
  "priest:Discipline": "spell_holy_wordfortitude",
  "priest:Holy": "spell_holy_holybolt",
  // Priest's talent tree tab was renamed "Shadow Magic" -> "Shadow" in the
  // 2026-09-18 sync (see CLAUDE.md), but the vendor's own trainer-spellbook
  // tab name for the same spec is unchanged -- still "Shadow Magic" in
  // data/spellbooks.json. getTreeIcon() is called with each of those two
  // different strings from two different places (TalentTreeGrid.tsx passes
  // the talent tree name; SpellbookBook.tsx passes the spellbook tab name),
  // so both keys are needed here now that they've diverged -- this isn't
  // a duplicate to clean up.
  "priest:Shadow": "spell_shadow_shadowwordpain",
  "priest:Shadow Magic": "spell_shadow_shadowwordpain",
  // Same divergence, Shaman "Elemental Combat" -> "Elemental" (talent tree)
  // vs. unchanged "Elemental Combat" (spellbook tab) -- see note above.
  "shaman:Elemental": "spell_nature_lightning",
  "shaman:Elemental Combat": "spell_nature_lightning",
  "shaman:Enhancement": "spell_nature_lightningshield",
  "shaman:Restoration": "spell_nature_magicimmunity",
  "mage:Arcane": "spell_holy_magicalsentry",
  "mage:Fire": "spell_fire_firebolt02",
  "mage:Frost": "spell_frost_frostbolt02",
  "warlock:Affliction": "spell_shadow_deathcoil",
  "warlock:Demonology": "spell_shadow_metamorphosis",
  "warlock:Destruction": "spell_shadow_rainoffire",
  "warlock:Pet": "class_warlock",
  "druid:Balance": "spell_nature_starfall",
  "druid:Feral Combat": "ability_racial_bearform",
  "druid:Restoration": "spell_nature_healingtouch",
};

export function getTreeIcon(classId: string, treeName: string): string {
  const override = TREE_ICON_OVERRIDES[`${classId}:${treeName}`];
  if (override) return override;
  const tree = getClassTalentData(classId)?.trees.find((t) => t.name === treeName);
  return tree?.talents[0]?.icon ?? "inv_misc_questionmark";
}

export function iconUrl(icon: string): string {
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

export function mediumIconUrl(icon: string): string {
  return `https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`;
}

export function treeBackgroundUrl(classId: string, treeName: string): string {
  const slug = treeName.toLowerCase().replace(/\s+/g, "-");
  return `/backgrounds/${classId}/${slug}.jpg`;
}
