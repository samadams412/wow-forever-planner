import type { Dungeon } from "@/lib/dungeons";

export type PlacedDungeon = { dungeon: Dungeon; row: number };

// Greedy interval-graph packing: sort by starting level, then place each
// dungeon in the first row whose most recently placed dungeon doesn't
// overlap it (same idea the reference level-range chart's stacked rows
// visually represent). Rows fill left-to-right; a row's own dungeons
// never overlap, so any two dungeons sharing a level range always end up
// in different rows.
//
// Level ranges are inclusive on both ends, and each level maps to its own
// CSS grid column (see levelToCol in DungeonsTimeline) -- so a dungeon
// ending at level 18 and one starting at level 18 both claim column 18
// and would render on top of one another. A strict `<` (rather than
// `<=`) treats a shared boundary level as a real overlap, keeping such
// pairs in separate rows so their bars never share a column.
export function packDungeonRows(dungeons: Dungeon[]): { placed: PlacedDungeon[]; rowCount: number } {
  const sorted = [...dungeons].sort((a, b) => a.levelMin - b.levelMin || a.levelMax - b.levelMax);
  const rowEnds: number[] = [];
  const placed: PlacedDungeon[] = [];

  for (const dungeon of sorted) {
    let row = rowEnds.findIndex((end) => end < dungeon.levelMin);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(dungeon.levelMax);
    } else {
      rowEnds[row] = dungeon.levelMax;
    }
    placed.push({ dungeon, row });
  }

  return { placed, rowCount: rowEnds.length };
}
