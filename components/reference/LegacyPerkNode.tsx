import { createPortal } from "react-dom";
import { useRef } from "react";
import type { LegacyPerk, LegacyPerkTree } from "@/lib/legacy-perks";
import { iconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import {
  TooltipCard,
  TooltipName,
  TooltipRank,
  TooltipDescription,
  TooltipRequirement,
} from "@/components/planner/TooltipCard";

const TOOLTIP_WIDTH = 260;

// Desktop-only: this is a lower-traffic reference page (not the main
// planner), and the source data has no per-rank confidence/classic-compare
// concept to show (every Legacy Perk here is beta-client-sourced, see this
// session's summary), so this is a deliberately smaller fork of
// components/planner/TalentNode.tsx -- same rank badge/tooltip look and the
// same click-to-add/shift-click-to-remove interaction, but no touch/long-
// press/haptic handling. If that model turns out to be wanted here too,
// port it from TalentNode rather than rebuilding it from scratch.
export default function LegacyPerkNode({
  tree,
  perk,
  rank,
  canAdd,
  onAdd,
  onRemove,
  prereqName,
  pointsInTree,
  totalSpent,
  spendCap,
}: {
  tree: LegacyPerkTree;
  perk: LegacyPerk;
  rank: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
  prereqName?: string;
  pointsInTree: number;
  totalSpent: number;
  spendCap: number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pos: tooltipPos, show, hide } = useHoverTooltip<HTMLButtonElement>(
    TOOLTIP_WIDTH,
    "below",
    200,
    buttonRef
  );

  if (perk.placeholder) {
    return (
      <div style={{ gridColumn: perk.col, gridRow: perk.tier }} className="relative aspect-square">
        <button
          ref={buttonRef}
          type="button"
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          className="relative block h-full w-full cursor-default overflow-hidden rounded border-2 border-border/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconUrl(perk.icon)} alt="" className="h-full w-full object-cover grayscale opacity-50" />
        </button>
        {tooltipPos &&
          createPortal(
            <TooltipCard style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}>
              <TooltipName>Unknown</TooltipName>
              <TooltipDescription>{perk.ranks[0]}</TooltipDescription>
            </TooltipCard>,
            document.body
          )}
      </div>
    );
  }

  const invested = rank > 0;
  const maxed = rank === perk.maxRank;
  const locked = !invested && !canAdd;
  const currentRankText = rank > 0 ? perk.ranks[rank - 1] : perk.maxRank === 1 ? perk.ranks[0] : null;
  const nextRankText = perk.maxRank > 1 && rank < perk.maxRank ? perk.ranks[rank] : null;
  const gateLocked = pointsInTree < perk.gate;
  const capReached = rank < perk.maxRank && totalSpent >= spendCap;

  const borderClass = locked ? "border-border/40" : maxed ? "border-amber-400" : "border-green-500";
  const badgeTextClass = locked
    ? "text-foreground-muted"
    : maxed
      ? "text-amber-300"
      : invested
        ? "text-green-400"
        : "text-foreground";

  return (
    <div style={{ gridColumn: perk.col, gridRow: perk.tier }} className="relative aspect-square">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          if (e.shiftKey) onRemove();
          else onAdd();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className={`relative block h-full w-full overflow-hidden rounded border-2 transition-colors ${borderClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl(perk.icon)}
          alt={perk.name}
          className={`h-full w-full object-cover ${locked ? "grayscale" : ""}`}
        />
        <span
          className={`absolute bottom-0 right-0 rounded-tl bg-background/80 px-0.5 text-[12px] font-semibold leading-tight ${badgeTextClass}`}
        >
          {rank}/{perk.maxRank}
        </span>
      </button>

      {tooltipPos &&
        createPortal(
          <TooltipCard style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}>
            <TooltipName>{perk.name}</TooltipName>
            <TooltipRank>
              Rank {rank} of {perk.maxRank} · Passive
            </TooltipRank>
            {currentRankText && <TooltipDescription>{formatTooltipText(currentRankText)}</TooltipDescription>}
            {nextRankText && (
              <>
                <TooltipRank>Next Rank</TooltipRank>
                <TooltipDescription>{formatTooltipText(nextRankText)}</TooltipDescription>
              </>
            )}
            {perk.prereq && (
              <TooltipRequirement>
                Requires {perk.prereq.ranks} rank{perk.prereq.ranks > 1 ? "s" : ""} in{" "}
                {prereqName ?? "prerequisite perk"}
              </TooltipRequirement>
            )}
            {gateLocked && (
              <TooltipRequirement>
                Requires {perk.gate} points in {tree.name}
              </TooltipRequirement>
            )}
            {capReached && (
              <TooltipRequirement>
                All {spendCap} Legacy Points are spent -- unlearn a point elsewhere before you can spend one
                here.
              </TooltipRequirement>
            )}
          </TooltipCard>,
          document.body
        )}
    </div>
  );
}
