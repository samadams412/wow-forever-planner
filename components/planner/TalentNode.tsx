import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import type { Talent } from "@/lib/wow-data";
import { iconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { useCtrlHeld } from "@/lib/use-ctrl-held";
import { usePointerFine } from "@/lib/use-pointer-fine";
import { getLinkedSpells, splitTextWithLinks } from "@/lib/talent-spell-links";
import { STATUS_DOT_CLASS } from "@/lib/talent-status";
import { POINTS_PER_ROW, MAX_TALENT_POINTS, tierUnlocked } from "@/lib/talent-rules";
import {
  TooltipCard,
  TooltipName,
  TooltipRank,
  TooltipDescription,
  TooltipDescriptionWithLinks,
  TooltipCtrlPrompt,
  TooltipLinkedSpell,
  TooltipRequirement,
  TooltipClassicNote,
} from "./TooltipCard";

const TOOLTIP_WIDTH = 260;
// Standard tap-vs-scroll distinction: a touch that travels further than this
// before lifting is a scroll that happened to pass over the icon, not a tap.
const TAP_MOVE_THRESHOLD_PX = 10;

export default function TalentNode({
  classId,
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
  classId: string;
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
  // Shared across both hook calls below -- only one <TooltipCard> is ever
  // rendered at a time (tooltipPos = hoverPos ?? activePos), so both need to
  // observe the same real DOM node for viewport-edge measurement/flipping.
  const tooltipElRef = useRef<HTMLDivElement>(null);
  const { pos: hoverPos, show: showHover, hide: hideHover } = useHoverTooltip<HTMLButtonElement>(
    TOOLTIP_WIDTH,
    "below",
    220,
    buttonRef,
    { sharedTooltipRef: tooltipElRef }
  );
  // Tap-to-select and long-press-to-peek both float this same "below"
  // tooltip (an overlay, not part of document flow) -- it doesn't push the
  // grid's rows down, and stays pointer-events-none like the hover one so
  // taps meant for icons underneath/behind it still land on those icons.
  const { pos: activePos, show: showActive, hide: hideActive } = useHoverTooltip<HTMLButtonElement>(
    TOOLTIP_WIDTH,
    "below",
    220,
    buttonRef,
    { sharedTooltipRef: tooltipElRef }
  );
  const tooltipPos = hoverPos ?? activePos;
  const linkedSpells = getLinkedSpells(classId, talent.id);
  const ctrlHeld = useCtrlHeld(tooltipPos !== null);
  const pointerFine = usePointerFine();

  const isTapped = tappedTalentId === talent.id;
  const isActive = talent.id === (peekTalentId ?? tappedTalentId);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  // Where the touch started, and whether it's since traveled further than
  // TAP_MOVE_THRESHOLD_PX -- distinguishes a deliberate tap from a scroll
  // gesture that happens to pass over this icon (which must not spend a
  // point or open the tooltip, even though the finger lifts while still
  // over the icon).
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const movedPastThresholdRef = useRef(false);
  // Set for the duration of a touch gesture (plus a short tail) so the
  // focus a tap leaves behind doesn't also fire the desktop hover tooltip,
  // which previously produced two tooltips on screen at once on real
  // touch devices.
  const justTouchedRef = useRef(false);

  // Mobile-only "acknowledged" pulse + haptic tick on an actual rank
  // change. Set true right before a touch-driven onAdd/onRemove call and
  // cleared by a desktop click, so the effect below -- which only reacts
  // once `rank` really changes -- knows whether that change came from a
  // touch tap rather than a mouse click, without a separate viewport or
  // pointer-type check.
  const touchChangeRef = useRef(false);
  const prevRankRef = useRef(rank);
  const pulseCounter = useRef(0);
  const [pulse, setPulse] = useState<{ dir: "add" | "remove"; key: number } | null>(null);

  useEffect(() => {
    if (isActive) showActive();
    else hideActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (rank !== prevRankRef.current) {
      const dir: "add" | "remove" = rank > prevRankRef.current ? "add" : "remove";
      if (touchChangeRef.current) {
        pulseCounter.current += 1;
        setPulse({ dir, key: pulseCounter.current });
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(dir === "add" ? 10 : [10, 30, 10]);
          } catch {
            // Vibration can throw in some restricted contexts (e.g. an
            // iframe without the "vibrate" permission) -- the pulse
            // animation alone is still plenty of feedback either way.
          }
        }
      }
      touchChangeRef.current = false;
      prevRankRef.current = rank;
    }
  }, [rank]);

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    touchStartPos.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    movedPastThresholdRef.current = false;
    justTouchedRef.current = true;
    longPressFired.current = false;
    clearLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      onPeek(talent.id);
    }, 450);
  }

  function handleTouchMove(e: React.TouchEvent) {
    // Any movement cancels a pending long-press, same as before. Distance
    // is tracked separately so a real scroll -- which naturally involves
    // more movement than a long-press-in-place would tolerate anyway --
    // still gets to suppress the tap/peek entirely once it lifts.
    clearLongPressTimer();
    const start = touchStartPos.current;
    const touch = e.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) {
      movedPastThresholdRef.current = true;
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    clearLongPressTimer();
    touchStartPos.current = null;
    if (movedPastThresholdRef.current) {
      // This was a scroll that happened to pass over the icon, not a tap --
      // don't preventDefault, so the browser's own scroll/momentum handling
      // finishes undisturbed, and don't spend a point or open anything.
      window.setTimeout(() => {
        justTouchedRef.current = false;
      }, 300);
      return;
    }
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
    touchChangeRef.current = true;
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

  // Four states, matching the planner's talent legend: locked (grayed),
  // maxed (gold), and "open" (available, unlearned) + "learning" (has
  // points, not maxed) both green -- available-but-empty and in-progress
  // read the same at the border, differentiated only by the rank badge
  // (0/N vs N/M). That's a deliberate match to talentsforever.com's own
  // talent tree, not an oversight: zoomed screenshots of their live site
  // confirm an unlearned-but-available talent (0/5) gets the identical
  // green border their in-progress talents do.
  const borderClass = locked ? "border-border/40" : maxed ? "border-amber-400" : "border-green-500";

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
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          // A real mouse click, not touch -- don't let a pulse fire for it,
          // and invalidate any leftover touch flag from an earlier tap that
          // never actually changed rank (e.g. a locked/capped talent).
          touchChangeRef.current = false;
          if (e.shiftKey) onRemove();
          else onAdd();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          touchChangeRef.current = false;
          onRemove();
        }}
        className={`relative block h-full w-full overflow-hidden rounded border-2 transition-colors ${borderClass}`}
      >
        {/* Wrapped separately from the button so the pulse animation (keyed
            to force a restart on every rapid repeat tap) only remounts this
            small span, never the interactive button/ref itself. */}
        <span
          key={pulse ? `${pulse.dir}-${pulse.key}` : "idle"}
          className={`block h-full w-full ${pulse ? (pulse.dir === "add" ? "talent-pulse-add" : "talent-pulse-remove") : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconUrl(talent.icon)}
            alt={talent.name}
            className={`h-full w-full object-cover ${locked ? "grayscale" : ""}`}
          />
        </span>
        <span
          className={`absolute bottom-0 right-0 rounded-tl bg-background/80 px-0.5 text-[12px] font-semibold leading-tight sm:text-[10px] ${badgeTextClass}`}
        >
          {rank}/{talent.maxRank}
        </span>
        {compareMode && talent.status !== "unchanged" && (
          <span
            className={`absolute left-0.5 top-0.5 h-2 w-2 rounded-full ring-1 ring-background/80 ${STATUS_DOT_CLASS[talent.status]}`}
          />
        )}
      </button>

      {isTapped && rank > 0 && (
        // Sits outside the button (which clips via overflow-hidden for its
        // icon) so the badge can overlap the icon's top-left corner without
        // being cut off by that clip. A real button, not a decorative span
        // -- it needs its own tap/click target to actually remove a point.
        // Gated on rank > 0 same as the tooltip's "Next Rank" block below --
        // there's nothing to remove from a talent that's still at 0.
        <button
          type="button"
          aria-label={`Remove a point from ${talent.name}`}
          onClick={(e) => {
            e.stopPropagation();
            touchChangeRef.current = false;
            onRemove();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            e.stopPropagation();
            touchChangeRef.current = true;
            onRemove();
          }}
          className="absolute -left-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-xs font-bold leading-none text-white ring-1 ring-background hover:bg-red-400"
        >
          −
        </button>
      )}

      {tooltipPos &&
        createPortal(
          <TooltipCard
            divRef={tooltipElRef}
            style={{ top: tooltipPos.top, left: tooltipPos.left, width: TOOLTIP_WIDTH }}
          >
            <TooltipName>{talent.name}</TooltipName>
            <TooltipRank>
              Rank {rank} of {talent.maxRank} · {typeLabel}
            </TooltipRank>
            {currentRankText &&
              (linkedSpells.length > 0 ? (
                <TooltipDescriptionWithLinks
                  segments={splitTextWithLinks(formatTooltipText(currentRankText), linkedSpells)}
                />
              ) : (
                <TooltipDescription>{formatTooltipText(currentRankText)}</TooltipDescription>
              ))}
            {nextRankText && (
              <>
                <TooltipRank>Next Rank</TooltipRank>
                {linkedSpells.length > 0 ? (
                  <TooltipDescriptionWithLinks
                    segments={splitTextWithLinks(formatTooltipText(nextRankText), linkedSpells)}
                  />
                ) : (
                  <TooltipDescription>{formatTooltipText(nextRankText)}</TooltipDescription>
                )}
              </>
            )}
            {linkedSpells.length > 0 && pointerFine && !ctrlHeld && <TooltipCtrlPrompt count={linkedSpells.length} />}
            {linkedSpells.length > 0 &&
              ctrlHeld &&
              linkedSpells.map((entry) => <TooltipLinkedSpell key={entry.name} entry={entry} />)}
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
