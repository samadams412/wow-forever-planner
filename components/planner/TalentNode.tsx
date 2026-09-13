import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Talent } from "@/lib/wow-data";
import { iconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import ConfidenceBadge from "./ConfidenceBadge";

const TOOLTIP_WIDTH = 224;

export default function TalentNode({
  talent,
  rank,
  canAdd,
  onAdd,
  onRemove,
  prereqName,
}: {
  talent: Talent;
  rank: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
  prereqName?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const invested = rank > 0;
  const locked = !invested && !canAdd;
  const currentRankText = rank > 0 ? talent.ranks[rank - 1] : null;
  const nextRankText = rank < talent.maxRank ? talent.ranks[rank] : null;

  const showTooltip = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, 8),
      window.innerWidth - TOOLTIP_WIDTH - 8
    );
    setTooltipPos({ top: rect.bottom + 6, left });
  };

  return (
    <div style={{ gridColumn: talent.col, gridRow: talent.tier }} className="aspect-square">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltipPos(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltipPos(null)}
        onClick={(e) => {
          if (e.shiftKey) onRemove();
          else onAdd();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className={`relative block h-full w-full overflow-hidden rounded border-2 transition-colors ${
          invested
            ? "border-accent"
            : locked
              ? "cursor-not-allowed border-border/40 opacity-40"
              : "border-border hover:border-accent/60"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconUrl(talent.icon)}
          alt={talent.name}
          className={`h-full w-full object-cover ${locked ? "grayscale" : ""}`}
        />
        <span className="absolute bottom-0 right-0 rounded-tl bg-background/80 px-0.5 text-[9px] font-semibold leading-tight text-foreground">
          {rank}/{talent.maxRank}
        </span>
      </button>

      {tooltipPos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 rounded-lg border border-border bg-surface p-2.5 text-left shadow-lg"
            style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{talent.name}</span>
              <ConfidenceBadge confidence={talent.confidence} />
            </div>
            {currentRankText && (
              <p className="mt-1 text-xs text-foreground-muted">{formatTooltipText(currentRankText)}</p>
            )}
            {nextRankText && (
              <p className="mt-1 text-xs text-foreground-muted/60">
                <span className="text-foreground-muted/80">Next rank:</span> {formatTooltipText(nextRankText)}
              </p>
            )}
            {talent.prereq && (
              <p className="mt-1 text-[11px] text-foreground-muted/70">
                Requires {talent.prereq.ranks} rank{talent.prereq.ranks > 1 ? "s" : ""} in{" "}
                {prereqName ?? "prerequisite talent"}
              </p>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
