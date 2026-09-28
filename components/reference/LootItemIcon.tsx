"use client";

import LootItemPill from "@/components/reference/LootItemPill";
import type { LootItem } from "@/lib/dungeon-loot";

// Icon-only item affordance with the shared item tooltip and long-press
// behavior from LootItemPill. Used where the item's name is already shown
// nearby but its icon should still reveal the full tooltip.
export default function LootItemIcon({
  item,
  tooltipId,
  context = "catalog",
  qty,
  size = "small",
}: {
  item: LootItem;
  tooltipId: string;
  context?: "loot" | "catalog";
  qty?: number;
  size?: "small" | "large";
}) {
  return (
    <span className={size === "large" ? "inline-flex h-10 w-10 items-center justify-center" : "inline-flex"}>
      <span style={size === "large" ? { transform: "scale(2)", transformOrigin: "center" } : undefined}>
        <LootItemPill item={item} tooltipId={tooltipId} context={context} qty={qty} iconOnly />
      </span>
    </span>
  );
}
