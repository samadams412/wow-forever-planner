import type { Talent } from "@/lib/wow-data";

export type NavDirection = "up" | "down" | "left" | "right";

// Picks the talent an arrow key should move to, within one tree. Distance
// along the arrow's own axis dominates (so the nearest row/column wins), and
// the perpendicular offset breaks ties. Talents with no cell in that
// direction return undefined, so pressing an arrow at a tree's edge is a
// no-op rather than wrapping around.
export function findAdjacentTalent(talents: Talent[], fromId: string, dir: NavDirection): Talent | undefined {
  const from = talents.find((t) => t.id === fromId);
  if (!from) return undefined;

  let best: Talent | undefined;
  let bestScore = Infinity;
  for (const t of talents) {
    if (t.id === from.id) continue;
    let primary: number;
    let secondary: number;
    switch (dir) {
      case "up":
        primary = from.tier - t.tier;
        secondary = Math.abs(t.col - from.col);
        break;
      case "down":
        primary = t.tier - from.tier;
        secondary = Math.abs(t.col - from.col);
        break;
      case "left":
        primary = from.col - t.col;
        secondary = Math.abs(t.tier - from.tier);
        break;
      case "right":
        primary = t.col - from.col;
        secondary = Math.abs(t.tier - from.tier);
        break;
    }
    if (primary <= 0) continue;
    const score = primary * 10 + secondary;
    if (score < bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}
