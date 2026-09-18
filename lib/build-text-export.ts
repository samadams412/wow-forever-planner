import type { ClassTalentData } from "@/lib/wow-data";
import { classLabel } from "@/lib/wow-data";
import { pointsSpentInTree, totalPointsSpent } from "@/lib/talent-rules";
import type { RankState } from "@/lib/build-code";

// Plain-text summary of the current build for pasting into an AI chat --
// distinct from the shareable URL (that's just a link; this spells out
// every spent talent's actual tooltip text so an AI reading it doesn't
// need to follow the link or already know the game's talent data). Only
// trees/talents with at least 1 point spent are included -- an empty tree
// or an untouched talent has nothing to summarize.
export function buildAiTextSummary(
  classData: ClassTalentData,
  ranks: RankState,
  level: number,
  shareUrl: string
): string {
  const spentPerTree = classData.trees.map((tree) => pointsSpentInTree(tree, ranks));
  const total = totalPointsSpent(classData.trees, ranks);
  const specLine = classData.trees.map((_, i) => spentPerTree[i]).join("/");
  const treeNames = classData.trees.map((tree) => tree.name).join(" / ");

  const lines: string[] = [];
  lines.push(
    `WoW Forever ${classLabel(classData.class)} talent build: ${specLine} (${treeNames}), ` +
      `level ${level}, ${total} points spent. Built on forevercraft.app; talent text comes ` +
      `from the WoW Forever beta client.`
  );
  lines.push(shareUrl);

  for (let i = 0; i < classData.trees.length; i++) {
    const tree = classData.trees[i];
    const spent = spentPerTree[i];
    if (spent === 0) continue;

    lines.push("");
    lines.push(`${tree.name} (${spent} point${spent === 1 ? "" : "s"})`);
    for (const talent of tree.talents) {
      const rank = ranks[talent.id] ?? 0;
      if (rank === 0) continue;
      const description = talent.ranks[rank - 1] ?? "";
      lines.push(`- ${talent.name} ${rank}/${talent.maxRank}: ${description}`);
    }
  }

  lines.push("");
  lines.push(
    "Notes: each line is the in-game tooltip at the rank chosen. Every 5 points spent in a " +
      "tree unlocks its next row."
  );

  return lines.join("\n");
}
