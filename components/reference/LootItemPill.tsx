"use client";

import { createPortal } from "react-dom";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { TooltipCard, TooltipName, TooltipType, TooltipDataNote } from "@/components/planner/TooltipCard";
import type { LootItem } from "@/lib/dungeon-loot";

const TOOLTIP_WIDTH = 220;

// A lightweight item tooltip -- reuses the same dark-navy/gold-border
// TooltipCard primitives the talent tree and spellbook tooltips use (for
// visual consistency), not their full machinery (no single-tooltip-owner
// claim system, no mobile tap/peek variant). This is a low-traffic
// reference page listing many small items at once; the same scope call
// LegacyPerkNode's tooltip made for the same reason.
export default function LootItemPill({ item }: { item: LootItem }) {
  const { ref, tooltipRef, pos, show, hide } = useHoverTooltip<HTMLSpanElement>(TOOLTIP_WIDTH, "below", 90);

  const slotLine = item.unknown ? null : [item.slot, item.type].filter(Boolean).join(", ");

  return (
    <span
      ref={ref}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className={`inline-flex cursor-default items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
        item.unknown
          ? "border-border/60 bg-surface/40 italic text-foreground-muted/70"
          : "border-border bg-surface/60 text-foreground hover:border-accent"
      }`}
    >
      {item.name}
      {item.isNew && (
        <span className="rounded-sm bg-green-600/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-green-800">
          New
        </span>
      )}

      {pos &&
        createPortal(
          <TooltipCard
            divRef={tooltipRef}
            style={{ top: pos.top, left: pos.left, width: pos.width ?? TOOLTIP_WIDTH }}
          >
            <TooltipName>{item.name}</TooltipName>
            <TooltipType>{slotLine || "Slot/type unknown"}</TooltipType>
            {item.dropChance !== null && (
              <TooltipDataNote>
                Drop chance: {item.dropChanceUnder ? "<" : ""}
                {item.dropChance}%
              </TooltipDataNote>
            )}
            {item.unknown && (
              <TooltipDataNote>Not yet discovered by the community -- slot/type unknown.</TooltipDataNote>
            )}
          </TooltipCard>,
          document.body
        )}
    </span>
  );
}
