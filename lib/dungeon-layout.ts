import type { Dungeon } from "@/lib/dungeons";

export type PlacedDungeon = { dungeon: Dungeon; row: number };

// Greedy interval-graph packing: sort by starting level, then place each
// dungeon in the first row whose most recently placed dungeon doesn't
// overlap it (same idea the reference level-range chart's stacked rows
// visually represent). Rows fill left-to-right; a row's own dungeons
// never overlap, so any two dungeons sharing a level range always end up
// in different rows.
export function packDungeonRows(dungeons: Dungeon[]): { placed: PlacedDungeon[]; rowCount: number } {
  const sorted = [...dungeons].sort((a, b) => a.levelMin - b.levelMin || a.levelMax - b.levelMax);
  const rowEnds: number[] = [];
  const placed: PlacedDungeon[] = [];

  for (const dungeon of sorted) {
    let row = rowEnds.findIndex((end) => end <= dungeon.levelMin);
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
