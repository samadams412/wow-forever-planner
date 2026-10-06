import type { LootItem } from "@/lib/dungeon-loot";

// What an item's Forever/Classic status should LOOK like on a loot tooltip.
//
// The stored `status` is foreverchanges' own bucket, and a "changed" item is
// one whose tooltip differs from Classic's in any way. For display, a
// difference that is only the Sell Price line isn't a gameplay change, so an
// item whose only diff is its sell price is shown as unchanged. Any other
// difference (stats, effects, required level, slot, ...) keeps "changed",
// and the sell price line still shows in the Classic comparison alongside
// those real changes.
//
// Client-safe (no fs/path): imported by the tooltip body, which renders in
// the browser.

const SELL_PRICE = /^Sell Price:/;

function sameLines(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((line, i) => line === sb[i]);
}

export function displayStatus(item: Pick<LootItem, "status" | "tooltip" | "classicTooltip">): LootItem["status"] {
  if (item.status !== "changed") return item.status;
  if (!item.tooltip || !item.classicTooltip) return item.status;
  const forever = item.tooltip.filter((line) => !SELL_PRICE.test(line));
  const classic = item.classicTooltip.filter((line) => !SELL_PRICE.test(line));
  return sameLines(forever, classic) ? "same" : "changed";
}
