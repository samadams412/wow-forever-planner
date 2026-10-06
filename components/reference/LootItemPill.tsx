"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { useLongPress } from "@/lib/use-long-press";
import { claimActiveTooltip, releaseActiveTooltip, useIsActiveTooltip } from "@/lib/active-tooltip";
import { TooltipCard } from "@/components/planner/TooltipCard";
import ItemTooltipBody from "@/components/reference/ItemTooltipBody";
import { useItemLinkSource } from "@/components/reference/ItemLinkSource";
import { buildItemHref } from "@/lib/item-link";
import { mediumIconUrl, itemQualityColor } from "@/lib/wow-data";
import type { LootItem } from "@/lib/dungeon-loot";

const TOOLTIP_WIDTH = 240;

export default function LootItemPill({
  item,
  tooltipId,
  context = "loot",
  qty,
  iconOnly,
  iconSize = "normal",
  showSlotType,
  slotTypeBelow = false,
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
  // Slightly larger materials in the desktop recipe table are easier to
  // scan without enlarging the denser mobile recipe cards.
  iconSize?: "normal" | "large";
  // Shows the item's slot/type (e.g. "Chest, Cloth") as a small muted tag
  // next to the name, so loot/reward choices are scannable at a glance
  // without needing the hover tooltip -- used by BossCard and
  // LootQuestRewardsCard, where several options sit side by side and
  // "which is the plate chest vs. the caster trinket" is exactly what a
  // glance should answer. Non-gear items (reagents, trade goods, bags,
  // ammo, ...) never get a label even when this is set -- see
  // isEquippableGear below.
  showSlotType?: boolean;
  // Stacks the slot/type tag under the item name instead of beside it, so a
  // grid of pills stays narrow enough to fit several per row (BossCard's loot
  // grid). The name never wraps or truncates: the pill is as wide as its name
  // (min-w-max), so short names share a row and a long name takes a row of
  // its own, while every pill stays one name line plus one slot line tall.
  // Ignored without showSlotType.
  slotTypeBelow?: boolean;
}) {
  const { ref, tooltipRef, pos, show, hide } = useHoverTooltip<HTMLSpanElement>(TOOLTIP_WIDTH, "below", 140);
  const isClaimed = useIsActiveTooltip(tooltipId);
  const linkSource = useItemLinkSource();
  const itemHref = item.itemId !== null ? buildItemHref(item.itemId, linkSource) : null;

  function handleShow() {
    claimActiveTooltip(tooltipId);
    show();
  }
  function handleHide() {
    releaseActiveTooltip(tooltipId);
    hide();
  }

  // On mobile, a normal tap should still navigate to the item page (so the
  // link behavior isn't lost) -- a long-press instead peeks the tooltip
  // without navigating, same pattern as the talent tree's long-press-to-read
  // (see lib/use-long-press.ts). Only onLongPress/onLongPressEnd are wired
  // up; onTap is left undefined so a plain tap falls through to the
  // browser's default click/navigation instead of being intercepted here.
  const longPress = useLongPress({
    onLongPress: handleShow,
    onLongPressEnd: handleHide,
  });

  // Same scroll-dismiss approach as the mobile talent tree tooltip and the
  // spellbook tooltip (a real scroll listener, not a timeout) -- without
  // this, tapping/long-pressing an item open on mobile and then scrolling
  // left the tooltip floating in place over whatever scrolled underneath
  // it. Attached once per mount and read through a ref so the listener
  // doesn't need to be re-added every render.
  const hideRef = useRef(handleHide);
  useEffect(() => {
    hideRef.current = handleHide;
  });
  useEffect(() => {
    function handleScroll() {
      hideRef.current();
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const qualityColor = itemQualityColor(item.quality);
  const iconClass = iconSize === "large" ? "h-6 w-6" : "h-5 w-5";
  // "missing" means the same thing everywhere it appears: the beta client
  // hasn't touched this Classic item/drop yet -- NOT "removed from the
  // game." Verified directly against foreverchanges.pro: a dungeon whose
  // entire loot table is "missing" status (e.g. Scarlet Monastery: Armory)
  // renders its own page with the disclaimer "Nobody has seen these drops
  // in the beta yet: the stats and chances are Classic's for now," and a
  // "missing" item's own /item/<id> page describes it as "(No Forever data
  // yet)" -- neither shows any "removed"/"no longer drops" treatment. There
  // is currently no real "this was removed from Forever" signal anywhere in
  // the sourced data, so no muted/grayscale/"Gone" treatment is applied for
  // any status here.
  const nameEl = <span style={item.quality !== null ? { color: qualityColor } : undefined}>{item.name}</span>;
  // Only equippable gear/weapons get a slot/type tag -- reagents, trade
  // goods, quest items, bags, and ammo all carry a `slot` value too (e.g.
  // "Bag") but aren't what "slot/type" means to a player glancing at loot.
  // foreverchanges-sourced items know their real itemClass (2 = Weapon,
  // 4 = Armor); wowtbc-sourced items never carry itemClass (see LootItem's
  // comment), so fall back to excluding the couple of non-gear slot values
  // that source still fills in.
  const NON_GEAR_SLOTS = new Set(["Bag", "Ammo"]);
  const isEquippableGear =
    item.itemClass !== null ? item.itemClass === 2 || item.itemClass === 4 : !!item.slot && !NON_GEAR_SLOTS.has(item.slot);
  const slotTypeLabel = item.unknown || !isEquippableGear ? null : [item.slot, item.type].filter(Boolean).join(", ");
  const stacked = !iconOnly && slotTypeBelow && showSlotType && !!slotTypeLabel;

  return (
    <span
      ref={ref}
      tabIndex={0}
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
      onTouchStart={longPress.onTouchStart}
      onTouchMove={longPress.onTouchMove}
      onTouchEnd={longPress.onTouchEnd}
      className={`${stacked ? "flex min-w-max flex-[1_1_12rem]" : "inline-flex"} cursor-default items-center gap-1.5 rounded border transition-colors ${
        iconOnly ? "p-0.5" : "px-1.5 py-1 text-xs"
      } ${
        item.unknown
          ? "border-border/60 bg-surface/40 italic text-foreground-muted/70"
          : "border-border bg-surface/60 text-foreground hover:border-accent"
      }`}
    >
      {item.icon &&
        (() => {
          const iconEl = (
            <span className={`relative inline-block ${iconClass} shrink-0`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediumIconUrl(item.icon)} alt="" className={`${iconClass} rounded-sm`} />
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
          return iconOnly && itemHref ? <Link href={itemHref}>{iconEl}</Link> : iconEl;
        })()}
      {!iconOnly && (
        <span className={stacked ? "flex min-w-0 flex-col leading-tight" : "contents"}>
          {itemHref ? (
            <Link href={itemHref} className={`hover:underline ${stacked ? "block whitespace-nowrap" : ""}`}>
              {nameEl}
            </Link>
          ) : (
            <span className={stacked ? "block whitespace-nowrap" : ""}>{nameEl}</span>
          )}
          {showSlotType && slotTypeLabel && (
            <span className={`text-[10px] text-foreground-muted ${stacked ? "truncate" : ""}`}>{slotTypeLabel}</span>
          )}
        </span>
      )}
      {!iconOnly && item.status === "new" && (
        <span className="rounded-sm border border-green-300/70 bg-green-600 px-1 text-[9px] font-semibold uppercase tracking-wide text-white">
          New
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
