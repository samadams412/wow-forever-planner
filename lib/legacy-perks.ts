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
  icon: string;
  // Temporary best-guess icon, not yet a confirmed match -- swap once a
  // better-matching icon is found.
  iconPlaceholder?: boolean;
};

export type LegacyPerksData = {
  source: string;
  confidence: "confirmed" | "datamined" | "estimated";
  pointCapNote: string;
  mountCostNote: string;
  expansionNote: string;
  trees: LegacyPerkTree[];
  rewards: {
    note: string;
    rewardTrackNote: string;
    items: LegacyReward[];
  };
};

export const legacyPerks: LegacyPerksData = legacyPerksData as LegacyPerksData;
