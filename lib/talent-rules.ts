import type { Talent, TalentTree } from "@/lib/wow-data";
import type { RankState } from "@/lib/build-code";

export const POINTS_PER_ROW = 5;
export const MAX_TALENT_POINTS = 51;

export function pointsSpentInTree(tree: TalentTree, ranks: RankState): number {
  return tree.talents.reduce((sum, t) => sum + (ranks[t.id] ?? 0), 0);
}

export function totalPointsSpent(trees: TalentTree[], ranks: RankState): number {
  return trees.reduce((sum, tree) => sum + pointsSpentInTree(tree, ranks), 0);
}

export function tierUnlocked(tier: number, pointsInTree: number): boolean {
  return pointsInTree >= POINTS_PER_ROW * (tier - 1);
}

export function canAddPoint(
  tree: TalentTree,
  talent: Talent,
  ranks: RankState,
  totalSpent: number
): boolean {
  const current = ranks[talent.id] ?? 0;
  if (current >= talent.maxRank) return false;
  if (totalSpent >= MAX_TALENT_POINTS) return false;
  if (!tierUnlocked(talent.tier, pointsSpentInTree(tree, ranks))) return false;
  if (talent.prereq) {
    const prereqRank = ranks[talent.prereq.id] ?? 0;
    if (prereqRank < talent.prereq.ranks) return false;
  }
  return true;
}

export function canRemovePoint(tree: TalentTree, talent: Talent, ranks: RankState): boolean {
  const current = ranks[talent.id] ?? 0;
  if (current <= 0) return false;
  const nextRank = current - 1;

  // Don't drop a talent below what a dependent talent (with points already
  // spent) requires from it.
  const breaksDependent = tree.talents.some((t) => {
    if (t.prereq?.id !== talent.id) return false;
    const dependentRank = ranks[t.id] ?? 0;
    return dependentRank > 0 && nextRank < t.prereq.ranks;
  });
  if (breaksDependent) return false;

  // Don't drop the tree's total below the row-gate that already-spent
  // points in a later tier rely on. Compute the highest invested tier from
  // the state *after* this removal, since a talent going to 0 may itself
  // have been the only thing holding that tier's gate open.
  const highestTierWithPoints = tree.talents.reduce((max, t) => {
    const rank = t.id === talent.id ? nextRank : (ranks[t.id] ?? 0);
    return rank > 0 ? Math.max(max, t.tier) : max;
  }, 0);
  const newTotal = pointsSpentInTree(tree, ranks) - 1;
  if (!tierUnlocked(highestTierWithPoints, newTotal)) return false;

  return true;
}
