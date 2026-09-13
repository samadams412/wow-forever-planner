import type { ClassTalentData } from "@/lib/wow-data";

export type RankState = Record<string, number>;

function orderedTalents(classData: ClassTalentData) {
  return classData.trees.map((tree) =>
    [...tree.talents].sort((a, b) => a.tier - b.tier || a.col - b.col)
  );
}

// One base36 digit per talent (max rank is well under 36), trees separated by "-".
export function encodeBuild(classData: ClassTalentData, ranks: RankState): string {
  return orderedTalents(classData)
    .map((talents) => talents.map((t) => (ranks[t.id] ?? 0).toString(36)).join(""))
    .join("-");
}

export function decodeBuild(classData: ClassTalentData, code: string): RankState {
  const ranks: RankState = {};
  const treeCodes = code.split("-");
  const trees = orderedTalents(classData);
  trees.forEach((talents, i) => {
    const treeCode = treeCodes[i] ?? "";
    talents.forEach((t, j) => {
      const char = treeCode[j];
      const rank = char ? parseInt(char, 36) : 0;
      if (Number.isFinite(rank) && rank > 0) {
        ranks[t.id] = Math.min(rank, t.maxRank);
      }
    });
  });
  return ranks;
}
