import legacyPerksData from "@/data/legacy-perks.json";

export type LegacyPerk = {
  name: string;
  ranks: number;
  icon: string;
  // A string[] is per-rank text (index 0 = rank 1, etc.) for a perk whose
  // wording actually changes at each rank -- most perks are a flat bonus
  // and just use a single string regardless of rank.
  description: string | string[];
  castTime?: string;
  cooldown?: string;
  // A not-yet-implemented Professions slot -- the source only has two of
  // these and gives them no distinguishing name, just this placeholder text.
  placeholder?: boolean;
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
