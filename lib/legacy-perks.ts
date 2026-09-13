import legacyPerksData from "@/data/legacy-perks.json";

export type LegacyPerk = {
  name: string;
  ranks: number;
  icon: string;
  description: string;
  castTime?: string;
  cooldown?: string;
};

export type LegacyPerkTree = {
  name: string;
  icon: string;
  perks: LegacyPerk[];
};

export type LegacyReward = {
  name: string;
  type: string;
  description: string;
};

export type LegacyPerksData = {
  source: string;
  confidence: "confirmed" | "datamined" | "estimated";
  pointCapNote: string;
  trees: LegacyPerkTree[];
  rewards: {
    note: string;
    items: LegacyReward[];
  };
};

export const legacyPerks: LegacyPerksData = legacyPerksData as LegacyPerksData;
