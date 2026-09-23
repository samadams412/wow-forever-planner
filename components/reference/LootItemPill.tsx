"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { claimActiveTooltip, releaseActiveTooltip, useIsActiveTooltip } from "@/lib/active-tooltip";
import { TooltipCard } from "@/components/planner/TooltipCard";
import ItemTooltipBody from "@/components/reference/ItemTooltipBody";
import { mediumIconUrl, itemQualityColor } from "@/lib/wow-data";
import type { LootItem } from "@/lib/dungeon-loot";

const TOOLTIP_WIDTH = 240;

export default function LootItemPill({
  item,
  tooltipId,
  context = "loot",
}: {
  item: LootItem;
  tooltipId: string;
  context?: "loot" | "catalog";
}) {
  const { ref, tooltipRef, pos, show, hide } = useHoverTooltip<HTMLSpanElement>(TOOLTIP_WIDTH, "below", 140);
  const isClaimed = useIsActiveTooltip(tooltipId);

  function handleShow() {
    claimActiveTooltip(tooltipId);
    show();
  }
  function handleHide() {
    releaseActiveTooltip(tooltipId);
    hide();
  }

  const qualityColor = itemQualityColor(item.quality);
  // "missing" only means "no longer drops" in a loot context -- in the item
  // catalog it means "beta hasn't touched this Classic item yet" (see
  // ItemTooltipBody's context-aware status note), so the muted/grayscale
  // "Gone" treatment below would misrepresent it there.
  const missing = context === "loot" && item.status === "missing";
  const nameEl = <span style={item.quality !== null ? { color: qualityColor } : undefined}>{item.name}</span>;

  return (
    <span
      ref={ref}
      tabIndex={0}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      className={`inline-flex cursor-default items-center gap-1.5 rounded border px-1.5 py-1 text-xs transition-colors ${
        item.unknown
          ? "border-border/60 bg-surface/40 italic text-foreground-muted/70"
          : missing
            ? "border-border/40 bg-surface/30 text-foreground-muted/60"
            : "border-border bg-surface/60 text-foreground hover:border-accent"
      }`}
    >
      {item.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediumIconUrl(item.icon)}
          alt=""
          className={`h-5 w-5 shrink-0 rounded-sm ${missing ? "grayscale" : ""}`}
        />
      )}
      {item.itemId !== null ? (
        <Link href={`/items/${item.itemId}`} className="hover:underline">
          {nameEl}
        </Link>
      ) : (
        nameEl
      )}
      {item.status === "new" && (
        <span className="rounded-sm border border-green-300/70 bg-green-600 px-1 text-[9px] font-semibold uppercase tracking-wide text-white">
          New
        </span>
      )}
      {missing && (
        <span className="rounded-sm bg-foreground-muted/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-foreground-muted">
          Gone
        </span>
      )}

      {pos &&
        isClaimed &&
        createPortal(
          <TooltipCard
            divRef={tooltipRef}
            style={{ top: pos.top, left: pos.left, width: pos.width ?? TOOLTIP_WIDTH }}
          >
            <ItemTooltipBody item={item} context={context} />
          </TooltipCard>,
          document.body
        )}
    </span>
  );
}
