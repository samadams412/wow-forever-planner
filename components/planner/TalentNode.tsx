import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
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
  peekTalentId,
  onPeek,
}: {
  talent: Talent;
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
  // shows a small minus badge on it and keeps its tooltip open. Lifted
  // above this component since only one talent across the whole tree
  // should show it at a time.
  tappedTalentId: string | null;
  onTap: (talentId: string | null) => void;
  // Long-press-to-read: temporarily shows this talent's tooltip without
  // spending a point, reverting to tappedTalentId on release.
  peekTalentId: string | null;
  onPeek: (talentId: string | null) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pos: hoverPos, show: showHover, hide: hideHover } = useHoverTooltip<HTMLButtonElement>(
    TOOLTIP_WIDTH,
    "below",
    220,
    buttonRef
  );
  // Tap-to-select and long-press-to-peek both float this same "below"
  // tooltip (an overlay, not part of document flow) -- it doesn't push the
  // grid's rows down, and stays pointer-events-none like the hover one so
  // taps meant for icons underneath/behind it still land on those icons.
  const { pos: activePos, show: showActive, hide: hideActive } = useHoverTooltip<HTMLButtonElement>(
    TOOLTIP_WIDTH,
    "below",
    220,
    buttonRef
  );
  const tooltipPos = hoverPos ?? activePos;

  const isTapped = tappedTalentId === talent.id;
  const isActive = talent.id === (peekTalentId ?? tappedTalentId);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  // Set for the duration of a touch gesture (plus a short tail) so the
  // focus a tap leaves behind doesn't also fire the desktop hover tooltip,
  // which previously produced two tooltips on screen at once on real
  // touch devices.
  const justTouchedRef = useRef(false);

  useEffect(() => {
    if (isActive) showActive();
    else hideActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchStart() {
    justTouchedRef.current = true;
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
    // synthetic click from re-triggering add below.
    if (longPressFired.current) {
      e.preventDefault();
      onPeek(null);
      buttonRef.current?.blur();
      window.setTimeout(() => {
        justTouchedRef.current = false;
      }, 300);
      return;
    }
    e.preventDefault();
    // Always adds, exactly like a desktop click -- repeated taps on the
    // same talent spend repeated points up to its max. Removing a point is
    // a separate, explicit action via the minus button below, never an
    // implicit second tap on the icon itself.
    onAdd();
    onTap(talent.id);
    buttonRef.current?.blur();
    window.setTimeout(() => {
      justTouchedRef.current = false;
    }, 300);
  }

  function handleFocus() {
    // Skip the hover tooltip if this focus was just a side effect of the
    // tap/touch gesture above -- a real keyboard Tab a moment later still
    // shows it normally.
    if (justTouchedRef.current) return;
    showHover();
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
    <div style={{ gridColumn: talent.col, gridRow: talent.tier }} className="relative aspect-square">
      <button
        ref={buttonRef}
        type="button"
        data-cursor={locked ? "gear" : undefined}
        onMouseEnter={showHover}
        onMouseLeave={hideHover}
        onFocus={handleFocus}
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
        // being cut off by that clip. A real button, not a decorative span
        // -- it needs its own tap/click target to actually remove a point.
        <button
          type="button"
          aria-label={`Remove a point from ${talent.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -left-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-xs font-bold leading-none text-white ring-1 ring-background hover:bg-red-400"
        >
          −
        </button>
      )}

      {tooltipPos &&
        createPortal(
          <TooltipCard style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}>
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
