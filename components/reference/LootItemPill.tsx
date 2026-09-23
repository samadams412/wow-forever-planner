"use client";

import { createPortal } from "react-dom";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { claimActiveTooltip, releaseActiveTooltip, useIsActiveTooltip } from "@/lib/active-tooltip";
import { TooltipCard, TooltipName, TooltipType, TooltipDataNote } from "@/components/planner/TooltipCard";
import { mediumIconUrl, itemQualityColor } from "@/lib/wow-data";
import type { LootItem } from "@/lib/dungeon-loot";

const TOOLTIP_WIDTH = 240;

const STATUS_NOTE: Record<NonNullable<LootItem["status"]>, string> = {
  new: "New in Forever -- not in Classic's loot table.",
  changed: "Changed from Classic (see below).",
  same: "Unchanged from Classic.",
  missing: "No longer drops in Forever -- this was Classic's loot table.",
};

// One tooltip line, colored to loosely match the in-game tooltip's own
// per-line language: the combined "Slot\tType" line as a gold header (same
// treatment as TooltipType elsewhere on the site), "Requires Level" as the
// red requirement color, "Equip:"/"Use:"/"Chance on hit:" effect lines as
// the green spell-effect color, everything else plain gray stat/flavor
// text. Not a full per-line WoW tooltip parser -- close enough to read
// correctly without trying to reproduce every rule.
function TooltipLine({ line, index }: { line: string; index: number }) {
  if (line.includes("\t")) {
    const [slot, type] = line.split("\t");
    return (
      <div key={index} className="mt-1 text-xs font-medium uppercase tracking-wide text-[#ffd100]">
        {[slot, type].filter(Boolean).join(", ")}
      </div>
    );
  }
  if (/^Requires Level/.test(line)) {
    return (
      <div key={index} className="mt-0.5 text-xs text-[#ff4040]">
        {line}
      </div>
    );
  }
  if (/^(Equip:|Use:|Chance on hit:)/.test(line)) {
    return (
      <div key={index} className="mt-0.5 text-xs text-[#1eff00]">
        {line}
      </div>
    );
  }
  if (/^Sell Price:/.test(line)) {
    return (
      <div key={index} className="mt-1 text-[10px] text-gray-500">
        {line}
      </div>
    );
  }
  return (
    <div key={index} className="mt-0.5 text-xs text-gray-300">
      {line}
    </div>
  );
}

export default function LootItemPill({ item, tooltipId }: { item: LootItem; tooltipId: string }) {
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

  const slotLine = item.unknown ? null : [item.slot, item.type].filter(Boolean).join(", ");
  const qualityColor = itemQualityColor(item.quality);
  const missing = item.status === "missing";

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
      <span style={item.quality !== null ? { color: qualityColor } : undefined}>{item.name}</span>
      {item.status === "new" && (
        <span className="rounded-sm bg-green-600/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-green-800">
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
            <TooltipName>
              <span style={item.quality !== null ? { color: qualityColor } : undefined}>{item.name}</span>
            </TooltipName>
            {item.tooltip ? (
              item.tooltip.map((line, i) => <TooltipLine key={i} line={line} index={i} />)
            ) : (
              <TooltipType>{slotLine || "Slot/type unknown"}</TooltipType>
            )}
            {item.tooltip && item.tooltipSynthesized && (
              <TooltipDataNote>
                Reconstructed from item data, not the beta client&apos;s own tooltip text -- foreverchanges.pro
                doesn&apos;t store full tooltip text for unchanged items. Armor and stat bonuses aren&apos;t
                available here.
              </TooltipDataNote>
            )}
            {item.dropChance !== null && (
              <TooltipDataNote>
                Drop chance: {item.dropChanceUnder ? "<" : ""}
                {item.dropChance}%
              </TooltipDataNote>
            )}
            {item.unknown && (
              <TooltipDataNote>Not yet discovered by the community -- slot/type unknown.</TooltipDataNote>
            )}
            {item.status && (
              <div className="mt-2 border-t border-[#c8aa6e]/30 pt-1.5">
                <p className="text-[10px] text-gray-500">{STATUS_NOTE[item.status]}</p>
                {item.classicTooltip && (
                  <div className="mt-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">
                      Classic&apos;s version
                    </div>
                    {item.classicTooltip.map((line, i) => (
                      <div key={i} className="mt-0.5 text-[11px] text-gray-500">
                        {line.includes("\t") ? line.split("\t").filter(Boolean).join(", ") : line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TooltipCard>,
          document.body
        )}
    </span>
  );
}
