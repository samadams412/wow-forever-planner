"use client";

import { GEAR_SLOT_LABEL, type GearSlot } from "@/lib/gear-slots";
import type { GearState, PoolItem } from "@/lib/gear-code";
import type { PlannerPool } from "@/lib/gear-planner";
import { suffixesOf } from "@/lib/gear-planner";
import { itemQualityColor, mediumIconUrl } from "@/lib/item-display";
import RequirementChips from "./RequirementChips";
import SlotTooltip from "./SlotTooltip";
import { enchantEffect } from "@/lib/gear-sheet";
import { useState } from "react";
import { claimActiveTooltip, releaseActiveTooltip, useIsActiveTooltip } from "@/lib/active-tooltip";

// Real hover only: a phone's tap fires mouseenter too, and must just open the picker.
const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

// Paper-doll order: armor down the left, jewelry and the rest down the right, weapons below.
export const LEFT: GearSlot[] = ["head", "neck", "shoulder", "back", "chest", "wrist"];
export const RIGHT: GearSlot[] = ["hands", "waist", "legs", "feet", "finger1", "finger2", "trinket1", "trinket2"];
export const WEAPONS: GearSlot[] = ["main", "off", "ranged"];

export function SlotCard({
  slot,
  pool,
  items,
  slots,
  onOpen,
  disabled,
}: {
  slot: GearSlot;
  pool: PlannerPool;
  items: Map<number, PoolItem>;
  slots: GearState["slots"];
  onOpen: (slot: GearSlot) => void;
  disabled?: string;
}) {
  const pick = slots[slot];
  const item = pick && items.get(pick.itemId);
  const suffix = item && pick?.suffixId ? suffixesOf(pool, item).find((s) => s.id === pick.suffixId) : undefined;
  const enchant = pick?.enchantId ? pool.enchants.find((e) => e.id === pick.enchantId) : undefined;
  // One tooltip open at a time, shared with every other tooltip on the site (lib/active-tooltip.ts).
  const tooltipId = `gear-slot:${slot}`;
  const open = useIsActiveTooltip(tooltipId);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  return (
    <button
      type="button"
      onClick={() => {
        releaseActiveTooltip(tooltipId);
        onOpen(slot);
      }}
      onMouseEnter={(e) => {
        if (!item || !canHover()) return;
        setAnchor(e.currentTarget.getBoundingClientRect());
        claimActiveTooltip(tooltipId);
      }}
      onMouseLeave={() => releaseActiveTooltip(tooltipId)}
      disabled={Boolean(disabled)}
      title={disabled}
      className="flex w-full min-w-0 items-center gap-2 rounded border border-border bg-surface px-2 py-1.5 text-left hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {item?.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediumIconUrl(item.icon)} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded border border-border" />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded border border-dashed border-border" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] uppercase tracking-wide text-foreground-muted">{GEAR_SLOT_LABEL[slot]}</span>
        {item ? (
          <>
            <span className="block truncate text-sm font-medium" style={{ color: itemQualityColor(item.quality) }}>
              {item.name}
              {suffix ? ` ${suffix.name}` : ""}
            </span>
            {enchant && (
              // What it does (lib/gear-sheet.ts enchantEffect, the same numbers the sheet applies).
              <span title={enchantEffect(enchant)} className="block truncate text-[11px] text-green-400 [html.light-mode_&]:text-green-700">
                {enchantEffect(enchant)}
              </span>
            )}
            <RequirementChips requires={item.requires} />
          </>
        ) : (
          <span className="block text-sm text-foreground-muted">{disabled ? "Two-hander equipped" : "Empty"}</span>
        )}
      </span>
      {open && item && pick && anchor && <SlotTooltip pool={pool} item={item} pick={pick} anchor={anchor} />}
    </button>
  );
}
