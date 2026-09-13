import racesData from "@/data/races.json";
import racialsData from "@/data/racials.json";
import warriorData from "@/data/talents/warrior.json";

export type Confidence = "confirmed" | "datamined" | "estimated";
export type TalentStatus = "new" | "changed" | "moved" | "unchanged";

export type Race = {
  id: string;
  name: string;
  faction: "Alliance" | "Horde";
  allowedClasses: string[];
  notes: string;
};

export type Racial = {
  name: string;
  type: "active" | "passive";
  description: string;
  confidence: Confidence;
};

export type Talent = {
  id: string;
  name: string;
  tier: number;
  col: number;
  maxRank: number;
  ranks: string[];
  prereq: { id: string; ranks: number } | null;
  status: TalentStatus;
  confidence: Confidence;
};

export type TalentTree = {
  name: string;
  talents: Talent[];
};

export type ClassTalentData = {
  class: string;
  trees: TalentTree[];
};

const CLASS_TALENT_DATA: Record<string, ClassTalentData> = {
  warrior: warriorData as ClassTalentData,
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
