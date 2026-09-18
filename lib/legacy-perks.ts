import legacyPerksData from "@/data/legacy-perks.json";
import type { RankState } from "@/lib/build-code";

// Shaped like lib/wow-data.ts's Talent/TalentTree on purpose (id/tier/col/
// maxRank/ranks/prereq/icon) so components/planner's grid + connector-arrow
// rendering can be reused almost as-is -- see components/reference/
// LegacyPerkTreeGrid.tsx. The one real difference is `gate`: a class talent
// tier unlocks at a fixed 5-points-per-row formula (lib/talent-rules.ts's
// POINTS_PER_ROW), but Legacy Perks specify an explicit, perk-by-perk point
// gate that doesn't follow row math at all -- e.g. Resourcefulness's row-1
// "For Great Honor" has gate:5 while its own row-2 neighbor "Gourmand" has
// gate:0. Since prereqs here also run strictly within a row (never between
// rows, unlike class talents), TalentTreeGrid's existing same-tier connector
// path is the only one ever exercised for this data.
export type LegacyPerk = {
  id: string;
  name: string;
  tier: number;
  col: number;
  maxRank: number;
  ranks: string[];
  icon: string;
  gate: number;
  prereq: { id: string; ranks: number } | null;
  // An unrevealed "Unknown" slot -- the vendor's own placeholder for a perk
  // that exists in the tree layout but has no name/effect yet.
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
  iconPlaceholder?: boolean;
};

export type LegacyPerksData = {
  source: string;
  spendCap: number;
  earnCapNote: string;
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

export function pointsSpentInLegacyTree(tree: LegacyPerkTree, ranks: RankState): number {
  return tree.perks.reduce((sum, p) => sum + (ranks[p.id] ?? 0), 0);
}

export function canAddLegacyPoint(
  tree: LegacyPerkTree,
  perk: LegacyPerk,
  ranks: RankState,
  totalSpent: number,
  maxPoints: number = legacyPerks.spendCap
): boolean {
  if (perk.placeholder) return false;
  const current = ranks[perk.id] ?? 0;
  if (current >= perk.maxRank) return false;
  if (totalSpent >= maxPoints) return false;
  if (pointsSpentInLegacyTree(tree, ranks) < perk.gate) return false;
  if (perk.prereq) {
    const prereqRank = ranks[perk.prereq.id] ?? 0;
    if (prereqRank < perk.prereq.ranks) return false;
  }
  return true;
}

export function canRemoveLegacyPoint(tree: LegacyPerkTree, perk: LegacyPerk, ranks: RankState): boolean {
  const current = ranks[perk.id] ?? 0;
  if (current <= 0) return false;
  const nextRank = current - 1;

  // Don't drop a perk below what a dependent perk (with points already
  // spent) requires from it.
  const breaksDependent = tree.perks.some((p) => {
    if (p.prereq?.id !== perk.id) return false;
    const dependentRank = ranks[p.id] ?? 0;
    return dependentRank > 0 && nextRank < p.prereq.ranks;
  });
  if (breaksDependent) return false;

  // Don't drop the tree's total below the gate that already-spent points in
  // a higher-gated perk rely on.
  const highestGateWithPoints = tree.perks.reduce((max, p) => {
    const rank = p.id === perk.id ? nextRank : (ranks[p.id] ?? 0);
    return rank > 0 ? Math.max(max, p.gate) : max;
  }, 0);
  const newTotal = pointsSpentInLegacyTree(tree, ranks) - 1;
  if (newTotal < highestGateWithPoints) return false;

  return true;
}
