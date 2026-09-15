import { createPortal } from "react-dom";
import { useRef } from "react";
import type { Talent } from "@/lib/wow-data";
import { iconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { STATUS_DOT_CLASS } from "@/lib/talent-status";
import { POINTS_PER_ROW, MAX_TALENT_POINTS, tierUnlocked } from "@/lib/talent-rules";
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
  row,
  rank,
  canAdd,
  onAdd,
  onRemove,
  prereqName,
  compareMode,
  treeName,
  pointsInTree,
  totalSpent,
  tappedTalentId,
  onTap,
  onPeek,
}: {
  talent: Talent;
  // Grid row line for this talent -- not always talent.tier, since a tier
  // below the tree's active inline tooltip shifts down a line to make room
  // for it (see TalentTreeGrid).
  row: number;
  rank: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
  prereqName?: string;
  compareMode?: boolean;
  treeName: string;
  pointsInTree: number;
  totalSpent: number;
  // Which talent (if any) was most recently tapped on a touch device --
  // shows a small minus badge on it and turns a second tap into "remove"
  // instead of "add". Lifted above this component since only one talent
  // across the whole tree should show it at a time.
  tappedTalentId: string | null;
  onTap: (talentId: string | null) => void;
  // Long-press-to-read: temporarily shows this talent's inline tooltip
  // without spending a point, reverting to tappedTalentId on release.
  onPeek: (talentId: string | null) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pos: hoverPos, show: showHover, hide: hideHover } = useHoverTooltip<HTMLButtonElement>(
    TOOLTIP_WIDTH,
    "below",
    220,
    buttonRef
  );

  const isTapped = tappedTalentId === talent.id;
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchStart() {
    longPressFired.current = false;
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onPeek(talent.id);
    }, 450);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    clearLongPressTimer();
    // Long-press already showed the tooltip for reading -- releasing just
    // ends the read, no point spent. Also stops the browser's follow-up
    // synthetic click from re-triggering add/remove below.
    if (longPressFired.current) {
      e.preventDefault();
      onPeek(null);
      return;
    }
    e.preventDefault();
    if (isTapped) {
      onRemove();
    } else {
      onAdd();
      onTap(talent.id);
    }
  }

  const invested = rank > 0;
  const maxed = rank === talent.maxRank;
  const locked = !invested && !canAdd;
  // A single-rank talent at 0 still shows its (only) rank text, matching
  // the reference tooltip's "Rank 0 of 1" case -- there's no other rank to
  // preview instead. A multi-rank talent at 0 has nothing "current" yet,
  // so it shows only the Next Rank preview rather than duplicating that
  // same text as both "current" and "next".
  const currentRankText = rank > 0 ? talent.ranks[rank - 1] : talent.maxRank === 1 ? talent.ranks[0] : null;
  const nextRankText = talent.maxRank > 1 && rank < talent.maxRank ? talent.ranks[rank] : null;
  const typeLabel = talent.passive ? "Passive" : (talent.cost ?? "Active");
  const tierPointsRequired = POINTS_PER_ROW * (talent.tier - 1);
  const tierLocked = !tierUnlocked(talent.tier, pointsInTree);
  // Independent of tier/prereq gating -- the tree may be fully unlocked and
  // this talent still un-clickable because every point is already spent
  // somewhere else. Point auto-shifting isn't a feature (matches the
  // original game), so the fix here is just telling the player what to do.
  const capReached = rank < talent.maxRank && totalSpent >= MAX_TALENT_POINTS;

  const borderClass = locked
    ? "border-border/40"
    : maxed
      ? "border-amber-400"
      : invested
        ? "border-green-500"
        : "border-border hover:border-accent/60";

  const badgeTextClass = locked
    ? "text-foreground-muted"
    : maxed
      ? "text-amber-300"
      : invested
        ? "text-green-400"
        : "text-foreground";

  return (
    <div style={{ gridColumn: talent.col, gridRow: row }} className="relative aspect-square">
      <button
        ref={buttonRef}
        type="button"
        data-cursor={locked ? "gear" : undefined}
        onMouseEnter={showHover}
        onMouseLeave={hideHover}
        onFocus={showHover}
        onBlur={hideHover}
        onTouchStart={handleTouchStart}
        onTouchMove={clearLongPressTimer}
        onTouchEnd={handleTouchEnd}
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

      {isTapped && (
        // Sits outside the button (which clips via overflow-hidden for its
        // icon) so the badge can overlap the icon's top-left corner without
        // being cut off by that clip.
        <span
          aria-hidden="true"
          className="absolute -left-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-xs font-bold leading-none text-white ring-1 ring-background"
        >
          −
        </span>
      )}

      {hoverPos &&
        createPortal(
          <TooltipCard style={{ top: hoverPos.top, left: hoverPos.left, width: TOOLTIP_WIDTH }}>
            <TooltipName>{talent.name}</TooltipName>
            <TooltipRank>
              Rank {rank} of {talent.maxRank} · {typeLabel}
            </TooltipRank>
            {currentRankText && <TooltipDescription>{formatTooltipText(currentRankText)}</TooltipDescription>}
            {nextRankText && (
              <>
                <TooltipRank>Next Rank</TooltipRank>
                <TooltipDescription>{formatTooltipText(nextRankText)}</TooltipDescription>
              </>
            )}
            {talent.prereq && (
              <TooltipRequirement>
                Requires {talent.prereq.ranks} rank{talent.prereq.ranks > 1 ? "s" : ""} in{" "}
                {prereqName ?? "prerequisite talent"}
              </TooltipRequirement>
            )}
            {talent.reqText && <TooltipRequirement>{talent.reqText}</TooltipRequirement>}
            {tierLocked && (
              <TooltipRequirement>
                Requires {tierPointsRequired} points in {treeName} Talents
              </TooltipRequirement>
            )}
            {capReached && (
              <TooltipRequirement>
                All {MAX_TALENT_POINTS} talent points are spent -- unlearn a point elsewhere before you can
                spend one here.
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
                {talent.classic.renamedFrom && (
                  <>
                    Was called &quot;{talent.classic.renamedFrom}&quot; in Classic.
                    <br />
                  </>
                )}
                {talent.classic.text ? formatTooltipText(talent.classic.text) : null}
              </TooltipClassicNote>
            )}
          </TooltipCard>,
          document.body
        )}
    </div>
  );
}
