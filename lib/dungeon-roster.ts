// Client-safe roster helpers for dungeon pages. No Node built-ins here: this
// module is imported by client components (DungeonInlinePanel, etc.) as well as
// server pages, so anything that touches fs/path belongs in lib/dungeon-loot.ts.
import type { LootBoss } from "@/lib/dungeon-loot";

// Named NPC encounters: regular bosses, rare spawns, and any NPC foreverchanges
// tagged "object" or "quest" that still has a portrait (e.g. Lord Hel'nurath,
// Sergeant Bly). Trash groups and containers/items (e.g. Defias Gunpowder,
// Plans) carry drops but aren't NPCs, so they stay out of the roster counts and
// the "On this page" nav. Every boss/rare has a portrait; containers never do.
export function isNamedBoss(boss: LootBoss): boolean {
  if (boss.kind === "trash") return false;
  return boss.kind === "boss" || boss.kind === "rare" || !!boss.portraitUrl;
}

// Rare spawns are kept as their own figure, not folded into the boss count.
// The split comes from foreverchanges' per-entry kind: sources.json tags every
// dungeon drop as "B" with no regular/rare distinction, so it can't make this call.
export function isRareSpawn(boss: LootBoss): boolean {
  return isNamedBoss(boss) && boss.kind === "rare";
}

export function isRegularBoss(boss: LootBoss): boolean {
  return isNamedBoss(boss) && !isRareSpawn(boss);
}

// Two separate figures for display: never summed into one roster total.
export function rosterCounts(bosses: LootBoss[]): { bosses: number; rares: number } {
  return {
    bosses: bosses.filter(isRegularBoss).length,
    rares: bosses.filter(isRareSpawn).length,
  };
}

// Boss level for display. A two-value level is a range, not a sum:
// [29, 30] -> "29-30", never "2930" (which is what React prints for an array).
export function formatBossLevel(level: LootBoss["level"]): string | null {
  if (level === null) return null;
  if (Array.isArray(level)) return level[0] === level[1] ? String(level[0]) : `${level[0]}-${level[1]}`;
  return String(level);
}

// "8 bosses, 1 rare spawn" -- pluralization kept in one place so the loot page
// header, sidebar, and inline panel can't drift apart.
export function formatRosterCounts(counts: { bosses: number; rares: number }): string {
  const b = `${counts.bosses} boss${counts.bosses === 1 ? "" : "es"}`;
  if (counts.rares === 0) return b;
  return `${b}, ${counts.rares} rare spawn${counts.rares === 1 ? "" : "s"}`;
}
