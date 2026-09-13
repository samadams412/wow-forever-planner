import type { Talent } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import ConfidenceBadge from "./ConfidenceBadge";

export const CELL = 64;
export const GAP = 16;
export const STEP = CELL + GAP;

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
  const invested = rank > 0;
  const locked = !invested && !canAdd;
  const currentRankText = rank > 0 ? talent.ranks[rank - 1] : null;
  const nextRankText = rank < talent.maxRank ? talent.ranks[rank] : null;

  return (
    <div
      className="group absolute"
      style={{
        left: (talent.col - 1) * STEP,
        top: (talent.tier - 1) * STEP,
        width: CELL,
        height: CELL,
      }}
    >
      <button
        type="button"
        disabled={locked && !invested}
        onClick={(e) => {
          if (e.shiftKey) onRemove();
          else onAdd();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className={`relative flex h-full w-full flex-col items-center justify-center rounded-lg border-2 text-xs font-semibold transition-colors ${
          invested
            ? "border-accent bg-surface-hover text-accent"
            : locked
              ? "cursor-not-allowed border-border/40 bg-surface/40 text-foreground-muted/40"
              : "border-border bg-surface text-foreground hover:border-accent/60"
        }`}
      >
        {rank}/{talent.maxRank}
      </button>

      <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-2.5 text-left shadow-lg group-hover:block group-focus-within:block">
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
            Requires {talent.prereq.ranks} rank{talent.prereq.ranks > 1 ? "s" : ""} in {prereqName ?? "prerequisite talent"}
          </p>
        )}
      </div>
    </div>
  );
}
