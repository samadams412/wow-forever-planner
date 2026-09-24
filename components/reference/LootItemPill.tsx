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
  qty,
  iconOnly,
}: {
  item: LootItem;
  tooltipId: string;
  context?: "loot" | "catalog";
  // A reagent's consumption count, or a recipe's crafted-output count
  // (ProfessionRecipeTable/ProfessionSmeltingTable's `makesQty`) -- either
  // way, rendered as a small badge overlaid on the icon's corner, not a
  // separate "xN" text label. Matches foreverchanges.pro's own real
  // in-game-tooltip-style convention for a reagent (studied live:
  // <a class="cr-mat"><img/><b>5</b></a>, with NO <b> at all for qty 1,
  // same as WoW's own UI never badging a single-count reagent) -- extended
  // to the output icon too as of 2026-09-24, replacing that separate "×N"
  // text line, which looked poor and is exactly the same "count" concept.
  qty?: number;
  // Icon + qty badge only, no visible name/status text -- used by the
  // Leveling 1-300 view's reagent list specifically (ProfessionLevelingGuide),
  // where icon+name for every reagent was wide enough to push a step off a
  // single row. Hover/focus tooltip behavior (full name, tooltip text,
  // Classic diff) and the item-page link are unchanged -- only the visible
  // label disappears, same as every other icon-only item elsewhere on the
  // site that relies on hover for its name.
  iconOnly?: boolean;
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
      className={`inline-flex cursor-default items-center gap-1.5 rounded border transition-colors ${
        iconOnly ? "p-0.5" : "px-1.5 py-1 text-xs"
      } ${
        item.unknown
          ? "border-border/60 bg-surface/40 italic text-foreground-muted/70"
          : missing
            ? "border-border/40 bg-surface/30 text-foreground-muted/60"
            : "border-border bg-surface/60 text-foreground hover:border-accent"
      }`}
    >
      {item.icon &&
        (() => {
          const iconEl = (
            <span className="relative inline-block h-5 w-5 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediumIconUrl(item.icon)}
                alt=""
                className={`h-5 w-5 rounded-sm ${missing ? "grayscale" : ""}`}
              />
              {qty !== undefined && qty > 1 && (
                <span className="absolute -bottom-1.5 -right-1.5 rounded-sm bg-black/80 px-1 text-[11px] font-bold leading-tight text-white">
                  {qty}
                </span>
              )}
            </span>
          );
          // iconOnly drops the visible name (and with it, the name's own
          // Link) -- put the link on the icon itself instead so the item
          // is still reachable by click, not just by hover.
          return iconOnly && item.itemId !== null ? (
            <Link href={`/items/${item.itemId}`}>{iconEl}</Link>
          ) : (
            iconEl
          );
        })()}
      {!iconOnly &&
        (item.itemId !== null ? (
          <Link href={`/items/${item.itemId}`} className="hover:underline">
            {nameEl}
          </Link>
        ) : (
          nameEl
        ))}
      {!iconOnly && item.status === "new" && (
        <span className="rounded-sm border border-green-300/70 bg-green-600 px-1 text-[9px] font-semibold uppercase tracking-wide text-white">
          New
        </span>
      )}
      {!iconOnly && missing && (
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
