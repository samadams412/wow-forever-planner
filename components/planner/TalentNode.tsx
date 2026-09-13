import { createPortal } from "react-dom";
import type { Talent } from "@/lib/wow-data";
import { iconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { STATUS_DOT_CLASS } from "@/lib/talent-status";
import {
  TooltipCard,
  TooltipName,
  TooltipRank,
  TooltipDescription,
  TooltipRequirement,
  TooltipClassicNote,
} from "./TooltipCard";

const TOOLTIP_WIDTH = 260;

export default function TalentNode({
  talent,
  rank,
  canAdd,
  onAdd,
  onRemove,
  prereqName,
  compareMode,
}: {
  talent: Talent;
  rank: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
  prereqName?: string;
  compareMode?: boolean;
}) {
  const { ref: buttonRef, pos: tooltipPos, show: showTooltip, hide: hideTooltip } =
    useHoverTooltip<HTMLButtonElement>(TOOLTIP_WIDTH);

  const invested = rank > 0;
  const maxed = rank === talent.maxRank;
  const locked = !invested && !canAdd;
  const currentRankText = rank > 0 ? talent.ranks[rank - 1] : null;
  const nextRankText = rank < talent.maxRank ? talent.ranks[rank] : null;

  const borderClass = locked
    ? "cursor-not-allowed border-border/40 opacity-40"
    : maxed
      ? "border-green-500"
      : invested
        ? "border-amber-400"
        : "border-border hover:border-accent/60";

  const badgeTextClass = locked
    ? "text-foreground-muted"
    : maxed
      ? "text-green-400"
      : invested
        ? "text-amber-300"
        : "text-foreground";

  return (
    <div style={{ gridColumn: talent.col, gridRow: talent.tier }} className="aspect-square">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
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
          src={iconUrl(talent.icon)}
          alt={talent.name}
          className={`h-full w-full object-cover ${locked ? "grayscale" : ""}`}
        />
        <span
          className={`absolute bottom-0 right-0 rounded-tl bg-background/80 px-0.5 text-[12px] font-semibold leading-tight ${badgeTextClass}`}
        >
          {rank}/{talent.maxRank}
        </span>
        {compareMode && talent.status !== "unchanged" && (
          <span
            className={`absolute left-0.5 top-0.5 h-2 w-2 rounded-full ring-1 ring-background/80 ${STATUS_DOT_CLASS[talent.status]}`}
          />
        )}
      </button>

      {tooltipPos &&
        createPortal(
          <TooltipCard style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}>
            <TooltipName>{talent.name}</TooltipName>
            <TooltipRank>
              Rank {rank}/{talent.maxRank}
            </TooltipRank>
            {currentRankText && <TooltipDescription>{formatTooltipText(currentRankText)}</TooltipDescription>}
            {nextRankText && (
              <TooltipDescription muted>
                Next Rank: {formatTooltipText(nextRankText)}
              </TooltipDescription>
            )}
            {talent.prereq && (
              <TooltipRequirement>
                Requires {talent.prereq.ranks} rank{talent.prereq.ranks > 1 ? "s" : ""} in{" "}
                {prereqName ?? "prerequisite talent"}
              </TooltipRequirement>
            )}
            {compareMode && talent.classic && (
              <TooltipClassicNote
                status={talent.status}
                position={
                  talent.status === "moved" && talent.classic.tree && talent.classic.tier && talent.classic.col
                    ? `${talent.classic.tree} tier ${talent.classic.tier}, col ${talent.classic.col}`
                    : undefined
                }
              >
                {talent.classic.text ? formatTooltipText(talent.classic.text) : null}
              </TooltipClassicNote>
            )}
          </TooltipCard>,
          document.body
        )}
    </div>
  );
}
