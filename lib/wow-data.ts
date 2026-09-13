import racesData from "@/data/races.json";
import racialsData from "@/data/racials.json";
import warriorData from "@/data/talents/warrior.json";
import paladinData from "@/data/talents/paladin.json";
import hunterData from "@/data/talents/hunter.json";
import rogueData from "@/data/talents/rogue.json";
import priestData from "@/data/talents/priest.json";

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
};

export const races: Race[] = racesData as Race[];
export const racialsByRace: Record<string, Racial[]> = racialsData as Record<string, Racial[]>;

export function getRaceById(id: string): Race | undefined {
  return races.find((r) => r.id === id);
}

export function getRacialsForRace(raceId: string): Racial[] {
  return racialsByRace[raceId] ?? [];
}

export function getClassTalentData(classId: string): ClassTalentData | undefined {
  return CLASS_TALENT_DATA[classId];
}

export function iconUrl(icon: string): string {
  return `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`;
}

export function mediumIconUrl(icon: string): string {
  return `https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`;
}

export function treeBackgroundUrl(classId: string, treeName: string): string {
  return `/backgrounds/${classId}/${treeName.toLowerCase()}.jpg`;
}
