import type { Talent, TalentTree } from "@/lib/wow-data";
import type { RankState } from "@/lib/build-code";

export const POINTS_PER_ROW = 5;
export const MAX_TALENT_POINTS = 51;

// Core WoW rule (confirmed against talentsforever.com's own level dropdown,
// and matches the "Talented" Legacy Perk's baseline text: "you gain talent
// points every level starting at level 10"): 1 point per level, levels
// 10-60, capping at MAX_TALENT_POINTS (51) at the level cap. No points at
// all below level 10.
export const MIN_TALENT_LEVEL = 10;
export const MAX_LEVEL = 60;

export function pointsAtLevel(level: number): number {
  return Math.max(0, Math.min(level, MAX_LEVEL) - (MIN_TALENT_LEVEL - 1));
}

export function pointsSpentInTree(tree: TalentTree, ranks: RankState): number {
  return tree.talents.reduce((sum, t) => sum + (ranks[t.id] ?? 0), 0);
}

export function totalPointsSpent(trees: TalentTree[], ranks: RankState): number {
  return trees.reduce((sum, tree) => sum + pointsSpentInTree(tree, ranks), 0);
}

// Which tree currently has the clear point lead, for deriving a spec label
// like "Holy Paladin" (ClassHero). Returns null -- no spec label -- both at
// 0/0/0 and whenever two or more trees are tied for the max, rather than
// picking an arbitrary "first tree wins" winner: a tie is genuinely
// ambiguous (an even hybrid build isn't "Holy" just because Holy happens to
// be listed first), so showing nothing there reads as more honest than a
// label implying a lead that doesn't exist.
export function leadingTreeIndex(trees: TalentTree[], ranks: RankState): number | null {
  const spent = trees.map((tree) => pointsSpentInTree(tree, ranks));
  const max = Math.max(...spent);
  if (max === 0) return null;
  const leaders = spent.filter((n) => n === max).length;
  if (leaders > 1) return null;
  return spent.indexOf(max);
}

export function tierUnlocked(tier: number, pointsInTree: number): boolean {
  return pointsInTree >= POINTS_PER_ROW * (tier - 1);
}

export function canAddPoint(
  tree: TalentTree,
  talent: Talent,
  ranks: RankState,
  totalSpent: number,
  maxPoints: number = MAX_TALENT_POINTS
): boolean {
  const current = ranks[talent.id] ?? 0;
  if (current >= talent.maxRank) return false;
  if (totalSpent >= maxPoints) return false;
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
