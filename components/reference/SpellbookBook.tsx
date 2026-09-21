"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type AnimationEvent, type WheelEvent } from "react";
import { mediumIconUrl, CLASS_ICON, getTreeIcon } from "@/lib/wow-data";
import {
  spellbooks,
  type ClassSpellbook,
  type SpellbookEntry,
  type SpellbookTab,
  type SpellRank,
  type SpellbookVerification,
} from "@/lib/spellbooks";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { claimActiveTooltip, releaseActiveTooltip, useIsActiveTooltip } from "@/lib/active-tooltip";
import {
  TooltipCard,
  TooltipName,
  TooltipRank,
  TooltipLevelReq,
  TooltipDescription,
  TooltipStatLine,
  TooltipSourceNote,
  TooltipDataNote,
  TooltipClassicDiff,
} from "@/components/planner/TooltipCard";
import CornerBracket from "@/components/site/CornerBracket";

const TOOLTIP_WIDTH = 260;

const PAGE_SIZE = 12;

// Some spells share one icon across every class's General tab rather than
// the per-weapon/per-class icon our data stores -- override by spell name.
// spell_nature_invisibilty is a real Blizzard file (verified against
// Wowhead's CDN); the missing "i" before "ty" is in-client, not a typo here.
const SPELL_ICON_OVERRIDES: Record<string, string> = {
  "Shoot Bow": "ability_marksmanship",
  "Shoot Gun": "ability_marksmanship",
  "Shoot Crossbow": "ability_marksmanship",
  Dodge: "spell_nature_invisibilty",
};

// A tab not derived from a talent tree (e.g. Rogue's "Poisons" recipe tab)
// carries its own icon straight from the vendor rather than needing an
// entry in getTreeIcon's TREE_ICON_OVERRIDES -- prefer that when present.
function resolveTabIcon(classId: string, tab: SpellbookTab): string {
  if (tab.icon) return tab.icon;
  if (tab.name === "General") return CLASS_ICON[classId] ?? "inv_misc_questionmark";
  return getTreeIcon(classId, tab.name);
}

function resolveSpellIcon(spell: SpellbookEntry): string {
  return SPELL_ICON_OVERRIDES[spell.name] ?? spell.icon ?? "inv_misc_questionmark";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// A spell's own "REWORKED"/"RENAMED"/"NEW" classification, derived the same
// way the live site's tags are (see CLAUDE.md's spellbook architecture
// note): a renamed-from name always means RENAMED, regardless of the
// vendor's own `ck` field, which doesn't cleanly map to the tag shown.
function spellStatus(rankEntry: SpellRank | undefined): "renamed" | "reworked" | "new" | null {
  if (!rankEntry) return null;
  if (rankEntry.renamedFrom) return "renamed";
  if (rankEntry.classicStatus === "new") return "new";
  if (rankEntry.classicStatus === "changed") return "reworked";
  return null;
}

const STATUS_PILL_CLASS: Record<"renamed" | "reworked" | "new", string> = {
  renamed: "bg-purple-600/20 text-purple-800",
  reworked: "bg-amber-500/25 text-amber-900",
  new: "bg-green-600/20 text-green-800",
};

const STATUS_PILL_LABEL: Record<"renamed" | "reworked" | "new", string> = {
  renamed: "Renamed",
  reworked: "Reworked",
  new: "New",
};

function StatusPill({ status }: { status: "renamed" | "reworked" | "new" }) {
  return (
    <span className={`rounded-sm px-1 text-[9px] font-semibold uppercase tracking-wide ${STATUS_PILL_CLASS[status]}`}>
      {STATUS_PILL_LABEL[status]}
    </span>
  );
}

// One row per rank when showAllRanks is on (matching talentsforever.com's
// own "Show all ranks" checkbox -- see CLAUDE.md), else one row per spell
// using its highest rank. A spell with no rank data at all (the General
// tab's baseline commands, which have no real tooltip in the game's own
// files either) gets exactly one row with no rank info.
type DisplayRow = { spell: SpellbookEntry; rankEntry?: SpellRank };

// "All" / "New and reworked" / "New only", matching the live site's own
// three tabs. "New and reworked" reads as one combined bucket there (their
// footer counts new + renamed together, e.g. "3 new in Forever, 6
// renamed") -- since a renamed spell is also `classicStatus: "changed"`,
// treating "reworked" as everything Classic-different (renamed or not) and
// only excluding untouched ("same") spells matches that framing without
// needing a separate renamed-specific bucket.
export type SpellbookFilter = "all" | "newAndReworked" | "newOnly";

function rankMatchesFilter(rankEntry: SpellRank | undefined, filter: SpellbookFilter): boolean {
  if (filter === "all") return true;
  if (!rankEntry) return false;
  if (filter === "newOnly") return rankEntry.classicStatus === "new";
  return rankEntry.classicStatus === "new" || rankEntry.classicStatus === "changed";
}

function buildDisplayRows(spells: SpellbookEntry[], showAllRanks: boolean, filter: SpellbookFilter): DisplayRow[] {
  const rows: DisplayRow[] = [];
  for (const spell of spells) {
    const ranks = spell.ranks ?? [];
    if (ranks.length === 0) {
      if (filter === "all") rows.push({ spell });
    } else if (showAllRanks) {
      for (const rankEntry of ranks) if (rankMatchesFilter(rankEntry, filter)) rows.push({ spell, rankEntry });
    } else {
      const maxRank = ranks[ranks.length - 1];
      if (rankMatchesFilter(maxRank, filter)) rows.push({ spell, rankEntry: maxRank });
    }
  }
  return rows;
}

// The small "8 18 28 38 48 58" row under a multi-rank spell -- every rank's
// learned-at level, with the level belonging to the rank this row is
// currently showing picked out in a filled badge (matches the reference
// image and the live site exactly).
function LevelsRow({ allRanks, currentRank }: { allRanks: SpellRank[]; currentRank?: SpellRank }) {
  const levels = allRanks.map((r) => r.level).filter((l): l is number => l !== null);
  if (levels.length === 0) return null;
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {levels.map((level, i) => (
        <span
          key={i}
          className={`rounded-sm px-1 text-[10px] font-semibold leading-tight ${
            currentRank?.level === level
              ? "bg-[#c9a961] text-[#2a2010]"
              : "bg-[#8a6d3b]/15 text-[#6b5a3d]"
          }`}
        >
          {level}
        </span>
      ))}
    </div>
  );
}

function SpellEntry({
  classId,
  spell,
  rankEntry,
  revealDelayMs,
  side,
  compareMode,
  // By-level view: which tree/tab this spell belongs to, shown as a small
  // caption under the rank line (talentsforever.com shows this per-row since
  // that view mixes spells from every tree together) -- undefined in the
  // book view, where the active tab already says which tree you're looking at.
  tabLabel,
  // By-level view groups rows by their own learned-at level, so repeating
  // the full "8 18 28 38 48 58" other-ranks row under every entry would be
  // redundant noise -- only the book view (one tree, one page) shows it.
  hideLevelsRow,
}: {
  classId: string;
  spell: SpellbookEntry;
  rankEntry?: SpellRank;
  revealDelayMs?: number;
  // Which side of the row the tooltip should open on -- the opposite side
  // of the page from the spell list, so it never stacks over the next row
  // down. Alternates with the 2-column grid (left-column rows open right,
  // right-column rows open left). Ignored below the mobile breakpoint,
  // where the tooltip anchors to the bottom of the viewport instead.
  side: "left" | "right";
  // Same "Compare to Classic" toggle as the talent tree -- gates the
  // tooltip's Classic-vs-Forever diff section so it isn't shown by default.
  compareMode: boolean;
  tabLabel?: string;
  hideLevelsRow?: boolean;
}) {
  const subtitle = rankEntry?.rank
    ? `Rank ${rankEntry.rank}${rankEntry.variant ? ` (${rankEntry.variant})` : ""}`
    : spell.passive
      ? "Passive"
      : rankEntry?.variant || spell.tag;
  const status = spellStatus(rankEntry);
  // A rank-keyed id (not just the spell name) so "Show all ranks" mode --
  // where the same spell renders as several rows at once -- gives each
  // rank its own independent tooltip claim instead of them fighting over one.
  const tooltipId = `${classId}:${spell.name}:${rankEntry?.rank ?? rankEntry?.variant ?? "base"}`;
  const { ref, tooltipRef: tooltipElRef, pos, show, hide } = useHoverTooltip<HTMLLIElement>(
    TOOLTIP_WIDTH,
    side,
    280,
    undefined,
    { mobileBottomSheet: true }
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  // Hard single-tooltip invariant, same as the talent tree tooltip (see
  // lib/active-tooltip.ts) -- a shared claim this entry's render gates on,
  // so a stuck local `pos` (e.g. from a mouseleave desynced by a window
  // blur/focus cycle mid-hover) can't stay visible once anything else
  // claims the tooltip, or the window loses focus outright.
  const isTooltipClaimed = useIsActiveTooltip(tooltipId);
  function releaseAndHide() {
    releaseActiveTooltip(tooltipId);
    hide();
  }

  // Same scroll-dismiss approach as the mobile talent tree tooltip (a real
  // scroll listener, not a timeout) -- without this, tapping a spell open on
  // mobile and then scrolling the page left the tooltip floating in place
  // over whatever scrolled underneath it. Attached once per mount (hide is
  // recreated every render, so it's read through a ref instead of being a
  // dependency) and safe to call even while already closed.
  const hideRef = useRef(releaseAndHide);
  useEffect(() => {
    hideRef.current = releaseAndHide;
  });
  useEffect(() => {
    function handleScroll() {
      hideRef.current();
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // A tooltip taller than the book needs to be hoverable (unlike the
  // talent tree's pointer-events-none tooltip) so the mouse can move into
  // it and scroll -- but moving from the icon to the tooltip below it
  // crosses a gap, so leaving the icon schedules a hide rather than firing
  // immediately, giving entering the tooltip a chance to cancel it. The
  // claim is released on that same delay, not immediately on mouseleave --
  // releasing right away would hide the tooltip before the grace period
  // even started, since the render gate checks the claim on every render.
  function clearHideTimer() {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }
  function scheduleHide() {
    clearHideTimer();
    hideTimer.current = window.setTimeout(releaseAndHide, 150);
  }
  function handleTriggerEnter() {
    clearHideTimer();
    claimActiveTooltip(tooltipId);
    show();
  }
  function handleTooltipEnter() {
    clearHideTimer();
  }
  // Scrolling while still over the icon (not yet over the tooltip) still
  // scrolls the tooltip instead of the page behind it, matching scrolling
  // once the mouse has moved onto the tooltip itself.
  function handleTriggerWheel(e: WheelEvent) {
    if (pos && scrollRef.current) {
      e.preventDefault();
      scrollRef.current.scrollTop += e.deltaY;
    }
  }

  return (
    <li
      ref={rankEntry ? ref : undefined}
      onMouseEnter={rankEntry ? handleTriggerEnter : undefined}
      onMouseLeave={rankEntry ? scheduleHide : undefined}
      onFocus={rankEntry ? handleTriggerEnter : undefined}
      onBlur={rankEntry ? scheduleHide : undefined}
      onWheel={rankEntry ? handleTriggerWheel : undefined}
      tabIndex={rankEntry ? 0 : undefined}
      style={revealDelayMs !== undefined ? { animationDelay: `${revealDelayMs}ms` } : undefined}
      className={`group -mx-1 flex items-start gap-2.5 rounded-sm px-1.5 py-1 transition-colors hover:bg-[#c9a961]/10 hover:ring-1 hover:ring-inset hover:ring-[#c9a961]/40 ${
        revealDelayMs !== undefined ? "spellbook-row-reveal" : ""
      }`}
    >
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm border-2 border-[#c9a961]/70 transition-colors group-hover:border-[#c9a961]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mediumIconUrl(resolveSpellIcon(spell))}
          alt=""
          title={spell.iconPlaceholder ? "Placeholder icon, not yet confirmed" : undefined}
          className="h-full w-full object-cover"
        />
        {/* Foil-card shine sweep, replayed each time the row is hovered. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[spellbook-icon-shine_0.8s_ease]"
        />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-semibold text-(--ink2)">{spell.name}</span>
          {spell.talent && (
            <span className="rounded-sm bg-[#8a6d3b]/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-[#6b4f22]">
              Talent
            </span>
          )}
          {status && <StatusPill status={status} />}
        </div>
        {subtitle && <p className="text-xs text-[#6b5a3d]">{subtitle}</p>}
        {/* Same muted tone as the subtitle line above it (#6b5a3d, the
            established parchment-page muted-text color -- see the page's
            "N spells, M ranks" line and Prev/Next) rather than a lighter
            one-off gray that read as too low-contrast against the parchment. */}
        {tabLabel && <p className="text-[10px] uppercase tracking-wide text-[#6b5a3d]">{tabLabel}</p>}
        {!hideLevelsRow && spell.ranks && spell.ranks.length > 1 && (
          <LevelsRow allRanks={spell.ranks} currentRank={rankEntry} />
        )}
      </div>

      {rankEntry &&
        pos &&
        isTooltipClaimed &&
        createPortal(
          <TooltipCard
            divRef={tooltipElRef}
            style={{ top: pos.top, left: pos.left, width: pos.width ?? TOOLTIP_WIDTH }}
            interactive
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={scheduleHide}
          >
            {/* max-height is computed from this tooltip's actual on-screen
                top (not a flat 70vh, which assumes it always opens near the
                top of the viewport) so long content scrolls inside the card
                instead of spilling past the bottom of the screen when the
                tooltip opens further down. */}
            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: `calc(100vh - ${pos.top}px - 16px)` }}>
              <TooltipName>{spell.name}</TooltipName>
              {subtitle && <TooltipRank>{subtitle}</TooltipRank>}
              {rankEntry.lines.map(([left, right], i) => (
                <TooltipStatLine key={i} left={left} right={right} />
              ))}
              {rankEntry.level !== null && <TooltipLevelReq>Learned at level {rankEntry.level}</TooltipLevelReq>}
              <TooltipDescription>{rankEntry.description}</TooltipDescription>
              {rankEntry.note && <TooltipDataNote>{rankEntry.note}</TooltipDataNote>}
              {compareMode && rankEntry.classicStatus === "changed" && rankEntry.classicDescription && (
                <TooltipClassicDiff classicText={rankEntry.classicDescription} foreverText={rankEntry.description} />
              )}
              <TooltipSourceNote confirmed={rankEntry.confirmed} source={rankEntry.source} />
            </div>
          </TooltipCard>,
          document.body
        )}
    </li>
  );
}

// "The book" (tab by tab) vs "By level" (every tree mixed together, grouped
// by the level each rank is actually learned at) -- matches talentsforever.com's
// own two view buttons, verified live on their Warlock page.
type SpellbookView = "book" | "byLevel";

type LevelRow = { spell: SpellbookEntry; rankEntry: SpellRank; tabName: string };

// Splits every non-General spell's ranks into two buckets: ones learned at a
// specific character level (grouped into "Level N" sections below), and
// talent-granted ranks with no level at all (rankEntry.level === null) --
// those only ever appear once their talent is spent, so the live site pulls
// them into their own "From your talents" section instead of a fake level.
// General is skipped entirely -- it's demo-sourced data with no per-rank
// level info to group by (same reason it's excluded from "Show all ranks").
function splitLevelRows(tabs: { name: string; spells: SpellbookEntry[] }[], filter: SpellbookFilter) {
  const leveled: (LevelRow & { level: number })[] = [];
  const talentGranted: LevelRow[] = [];
  for (const tab of tabs) {
    if (tab.name === "General") continue;
    for (const spell of tab.spells) {
      for (const rankEntry of spell.ranks ?? []) {
        if (!rankMatchesFilter(rankEntry, filter)) continue;
        // A talent-granted spell's first rank (no numbered rank at all, or
        // explicitly "Rank 1") always goes to "From your talents", even when
        // that rank's own data carries a real-looking level value -- verified
        // directly against talentsforever.com's live data.json: Conflagrate,
        // Incinerate, Siphon Life and Shadowburn all have a genuine level on
        // their Rank 1 (25/8/30/34 respectively, not a placeholder), yet the
        // live site still buckets that first rank as talent-granted, while
        // their higher ranks (still trained normally at the trainer as you
        // level) appear in their real level groups as usual. The point you
        // spend on the talent grants rank 1 outright regardless of what a
        // naive level reading would suggest; only ranks 2+ are ever a real
        // level gate for a talent-granted spell.
        const isTalentGrantedRank = spell.talent && (rankEntry.rank === null || rankEntry.rank === 1);
        if (rankEntry.level !== null && !isTalentGrantedRank) {
          leveled.push({ spell, rankEntry, tabName: tab.name, level: rankEntry.level });
        } else {
          talentGranted.push({ spell, rankEntry, tabName: tab.name });
        }
      }
    }
  }
  const byName = (a: LevelRow, b: LevelRow) => a.spell.name.localeCompare(b.spell.name);
  talentGranted.sort(byName);
  return { leveled, talentGranted };
}

function groupByLevel(rows: (LevelRow & { level: number })[]): [number, LevelRow[]][] {
  const groups = new Map<number, LevelRow[]>();
  for (const row of rows) {
    const list = groups.get(row.level) ?? [];
    list.push(row);
    groups.set(row.level, list);
  }
  for (const list of groups.values()) list.sort((a, b) => a.spell.name.localeCompare(b.spell.name));
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

// The "I'm level [slider]" view -- verified live against talentsforever.com's
// Warlock page rather than guessed from the schema alone (see CLAUDE.md).
// Two behaviors confirmed there and reproduced here:
// - The level gate only ever hides leveled rows; the talent-granted bucket
//   at the bottom always shows in full, regardless of the slider.
// - If the current filter + slider combination would leave zero leveled rows
//   visible (e.g. "New only" at a low level, before any new spell is learned),
//   the gate is dropped entirely and every remaining filtered row shows
//   instead, with the lowest level among them marked "Next up" -- an empty
//   page is worse than showing what's coming.
function ByLevelView({
  classId,
  tabs,
  filter,
  compareMode,
}: {
  classId: string;
  tabs: { name: string; spells: SpellbookEntry[] }[];
  filter: SpellbookFilter;
  compareMode: boolean;
}) {
  const [characterLevel, setCharacterLevel] = useState(60);
  const { leveled, talentGranted } = splitLevelRows(tabs, filter);
  const atOrBelow = leveled.filter((r) => r.level <= characterLevel);
  const above = leveled.filter((r) => r.level > characterLevel);
  const usingFallback = atOrBelow.length === 0 && above.length > 0;
  const groups = groupByLevel(usingFallback ? leveled : atOrBelow);
  const nextUpLevel = usingFallback ? Math.min(...above.map((r) => r.level)) : null;
  const nextLevelAfter = above.length > 0 ? Math.min(...above.map((r) => r.level)) : null;

  return (
    <div className="relative w-full rounded-sm border-2 border-accent/70 bg-surface p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] sm:p-3">
      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />

      {/* spellbook-page (not just the bg-(--pg) utility) is required here --
          it's the class that actually defines the --pg/--ink2 variables (see
          globals.css), which the book view's page div also carries. Without
          it this page rendered on the site's dark background instead of
          parchment, which is what made pill tags and the tab-label caption
          (both styled for a light page) unreadable here specifically. */}
      <div className="spellbook-page relative min-h-105 rounded-sm border border-[#8a6d3b]/50 bg-(--pg) p-3 sm:min-h-115 sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(circle at 12% 18%, rgba(120,88,42,0.16), transparent 38%)",
              "radial-gradient(circle at 88% 12%, rgba(120,88,42,0.12), transparent 32%)",
              "radial-gradient(circle at 78% 85%, rgba(101,72,32,0.16), transparent 42%)",
              "radial-gradient(circle at 8% 82%, rgba(110,80,35,0.14), transparent 38%)",
              "radial-gradient(circle at 50% 95%, rgba(101,72,32,0.10), transparent 45%)",
              "radial-gradient(ellipse at center, transparent 55%, rgba(69,50,24,0.18) 100%)",
            ].join(", "),
          }}
        />

        <div className="relative">
          <label className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[#8a6d3b]/40 pb-2">
            <span className="font-heading text-lg font-semibold text-(--ink2) sm:text-xl">
              I&apos;m level <span className="text-accent">{characterLevel}</span>
            </span>
            <input
              type="range"
              min={1}
              max={60}
              value={characterLevel}
              onChange={(e) => setCharacterLevel(Number(e.target.value))}
              aria-label="Your level"
              className="ml-1 w-full max-w-64 accent-accent sm:w-48"
            />
            <span className="w-full text-xs text-[#6b5a3d] sm:w-auto">
              {atOrBelow.length} of {leveled.length} learned by level {characterLevel} ·{" "}
              {nextLevelAfter !== null ? `next at level ${nextLevelAfter}` : "that is all of them"}
            </span>
          </label>

          <div className="mt-3 flex flex-col gap-4">
            {groups.map(([level, rows]) => (
              <div key={level}>
                <div className="flex items-baseline gap-2">
                  <h4 className="font-heading text-sm font-semibold text-(--ink2)">Level {level}</h4>
                  {usingFallback && level === nextUpLevel && (
                    <span className="rounded-sm bg-accent/20 px-1 text-[9px] font-semibold uppercase tracking-wide text-accent">
                      Next up
                    </span>
                  )}
                </div>
                <ul className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {rows.map((row, i) => (
                    <SpellEntry
                      key={`${row.tabName}-${row.spell.name}-${row.rankEntry.rank ?? row.rankEntry.variant ?? "base"}`}
                      classId={classId}
                      spell={row.spell}
                      rankEntry={row.rankEntry}
                      side={i % 2 === 0 ? "right" : "left"}
                      compareMode={compareMode}
                      tabLabel={row.tabName}
                      hideLevelsRow
                    />
                  ))}
                </ul>
              </div>
            ))}

            {talentGranted.length > 0 && (
              <div>
                <div className="flex items-baseline gap-2">
                  <h4 className="font-heading text-sm font-semibold text-(--ink2)">From your talents</h4>
                  <span className="text-[10px] uppercase tracking-wide text-[#6b5a3d]">When you spend the point</span>
                </div>
                <ul className="mt-1.5 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {talentGranted.map((row, i) => (
                    <SpellEntry
                      key={`${row.tabName}-${row.spell.name}-${row.rankEntry.rank ?? row.rankEntry.variant ?? "base"}`}
                      classId={classId}
                      spell={row.spell}
                      rankEntry={row.rankEntry}
                      side={i % 2 === 0 ? "right" : "left"}
                      compareMode={compareMode}
                      tabLabel={row.tabName}
                      hideLevelsRow
                    />
                  ))}
                </ul>
              </div>
            )}

            {groups.length === 0 && talentGranted.length === 0 && (
              <p className="text-sm text-[#6b5a3d]">No spells match this filter.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Own-voice equivalent of talentsforever.com's two-checkmark verification
// banner (see CLAUDE.md) -- same substance, not their exact wording: every
// rank in the book is read straight from the beta client's own files rather
// than stream/demo footage (true for every class, so always shown), and a
// class gets a second line only once someone has actually walked its
// trainer in-game and cross-checked what it sells against these files --
// currently just Mage (`book.checked`). No promise about when the rest get
// done; that would go stale the moment it's read after this session.
function VerificationBanner({ checked }: { checked?: SpellbookVerification }) {
  // toLocaleDateString on a bare "YYYY-MM-DD" would parse it as UTC midnight
  // and then render in the browser's local zone, which can roll it back a
  // day west of UTC -- format from the UTC parts instead so the date always
  // reads as the calendar day this actually happened on.
  const checkedDate = checked
    ? new Date(checked.date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : null;
  return (
    <div className="mb-2 flex flex-col gap-1 rounded border border-border bg-surface/50 px-3 py-2 text-xs text-foreground-muted">
      <div className="flex items-start gap-1.5">
        <span className="text-[#1eff00]">✓</span>
        <span>
          Every spell, rank and level here is read straight from the {spellbooks.source.replace(" (via talentsforever.com)", "")}
          , not stream footage.
        </span>
      </div>
      {checked ? (
        <div className="flex items-start gap-1.5">
          <span className="text-[#1eff00]">✓</span>
          <span>
            Cross-checked against the real trainer -- {checked.npc} in {checked.zone}, {checkedDate}: {checked.rows}{" "}
            spells confirmed
            {checked.lacked > 0 ? `, ${checked.lacked} the trainer didn't actually sell` : ""}
            {checked.levelDiffs > 0
              ? `, ${checked.levelDiffs} learned at a different level than the files said`
              : ", every level matched"}
            .
          </span>
        </div>
      ) : (
        <div className="text-foreground-muted/70">Not yet cross-checked against an in-game trainer for this class.</div>
      )}
    </div>
  );
}

export default function SpellbookBook({
  classId,
  book,
  compareMode = false,
}: {
  classId: string;
  book: ClassSpellbook;
  compareMode?: boolean;
}) {
  // Tab order and default selection are independent: General sits first in
  // the rail (restored to its original position), but the tab shown when
  // the book first opens is still the class's first spec tree, not General.
  const tabs = [...book.tabs].sort((a, b) => (a.name === "General" ? -1 : b.name === "General" ? 1 : 0));
  const defaultTabIndex = Math.max(
    0,
    tabs.findIndex((t) => t.name !== "General")
  );

  const [view, setView] = useState<SpellbookView>("book");
  const [tabIndex, setTabIndex] = useState(defaultTabIndex);
  const [page, setPage] = useState(0);
  // Defaults to checked, matching talentsforever.com's own default (verified
  // live -- the book opens with every rank shown as its own row).
  const [showAllRanks, setShowAllRanks] = useState(true);
  const [filter, setFilter] = useState<SpellbookFilter>("all");
  const [display, setDisplay] = useState({ tabIndex: defaultTabIndex, page: 0 });
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  // Bumped once a flip-in settles, to key the spell list into a fresh mount
  // so its per-row reveal animation replays. Left alone under
  // prefers-reduced-motion (no flip ever runs), so the list just updates
  // in place with no animation at all.
  const [revealSeq, setRevealSeq] = useState(0);
  const pending = useRef<{ tabIndex: number; page: number } | null>(null);
  const reducedMotion = prefersReducedMotion();

  const activeTab = tabs[display.tabIndex];
  const displayRows = buildDisplayRows(activeTab.spells, showAllRanks, filter);
  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));
  const pageRows = displayRows.slice(display.page * PAGE_SIZE, display.page * PAGE_SIZE + PAGE_SIZE);
  const totalRankCount = activeTab.spells.reduce((sum, s) => sum + Math.max(1, s.ranks?.length ?? 0), 0);
  // Any spell in this tab has ranks worth toggling between -- if every
  // spell is single-rank (or rank-less, like General), the checkbox would
  // have nothing to do, so it's hidden rather than shown inert.
  const hasMultiRankSpells = activeTab.spells.some((s) => (s.ranks?.length ?? 0) > 1);

  function goTo(nextTabIndex: number, nextPage: number) {
    if (nextTabIndex === tabIndex && nextPage === page) return;
    const isForward = nextTabIndex > tabIndex || (nextTabIndex === tabIndex && nextPage > page);
    setDirection(isForward ? "forward" : "backward");
    setTabIndex(nextTabIndex);
    setPage(nextPage);

    if (prefersReducedMotion()) {
      setDisplay({ tabIndex: nextTabIndex, page: nextPage });
      return;
    }
    pending.current = { tabIndex: nextTabIndex, page: nextPage };
    setPhase("out");
  }

  function handleAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    // animationend bubbles -- without this guard, a child's short animation
    // (the icon hover shine, a row's stagger-reveal) reaches this handler
    // and fires it way before the page's own multi-hundred-ms flip is done,
    // which was cutting the flip short and made it read as barely-there.
    if (e.target !== e.currentTarget) return;
    if (phase === "out" && pending.current) {
      setDisplay(pending.current);
      pending.current = null;
      setPhase("in");
    } else if (phase === "in") {
      setPhase("idle");
      setRevealSeq((s) => s + 1);
    }
  }

  const FILTERS: { value: SpellbookFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "newAndReworked", label: "New and reworked" },
    { value: "newOnly", label: "New only" },
  ];

  function handleFilterChange(next: SpellbookFilter) {
    if (next === filter) return;
    setFilter(next);
    setPage(0);
    setDisplay((d) => ({ ...d, page: 0 }));
  }

  const VIEWS: { value: SpellbookView; label: string }[] = [
    { value: "book", label: "The book" },
    { value: "byLevel", label: "By level" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <VerificationBanner checked={book.checked} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded border border-border bg-surface p-0.5 text-xs">
          {VIEWS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`rounded-sm px-2 py-1 transition-colors ${
                view === value ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded border border-border bg-surface p-0.5 text-xs">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleFilterChange(value)}
              className={`rounded-sm px-2 py-1 transition-colors ${
                filter === value
                  ? "bg-accent/20 text-accent"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === "byLevel" ? (
        <ByLevelView classId={classId} tabs={tabs} filter={filter} compareMode={compareMode} />
      ) : (
      <div className="flex flex-col gap-2 sm:flex-row">
      <div className="order-2 flex gap-1.5 overflow-x-auto sm:order-0 sm:w-14 sm:shrink-0 sm:flex-col sm:overflow-visible">
        {tabs.map((tab, i) => (
          <button
            key={tab.name}
            type="button"
            title={tab.name}
            onClick={() => goTo(i, 0)}
            className={`flex shrink-0 items-center gap-1.5 rounded border p-1.5 transition-colors sm:justify-center ${
              i === tabIndex
                ? "border-accent bg-surface-hover"
                : "border-border bg-surface hover:border-accent/60 hover:bg-surface-hover"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediumIconUrl(resolveTabIcon(classId, tab))} alt="" className="h-6 w-6 shrink-0 rounded-sm" />
          </button>
        ))}
      </div>

      <div className="order-1 relative w-full rounded-sm border-2 border-accent/70 bg-surface p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] sm:order-0 sm:w-175 sm:shrink-0 sm:p-3">
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        <div style={{ perspective: 1800 }}>
          <div
            onAnimationEnd={handleAnimationEnd}
            className={`spellbook-page relative min-h-105 overflow-hidden rounded-sm border border-[#8a6d3b]/50 bg-(--pg) p-3 sm:min-h-115 sm:p-5 ${
              phase === "out" ? `flip-out-${direction}` : phase === "in" ? `flip-in-${direction}` : ""
            }`}
          >
            {/* Aging: uneven warm blotches + a darkened vignette toward the edges, layered over the base parchment color. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: [
                  "radial-gradient(circle at 12% 18%, rgba(120,88,42,0.16), transparent 38%)",
                  "radial-gradient(circle at 88% 12%, rgba(120,88,42,0.12), transparent 32%)",
                  "radial-gradient(circle at 78% 85%, rgba(101,72,32,0.16), transparent 42%)",
                  "radial-gradient(circle at 8% 82%, rgba(110,80,35,0.14), transparent 38%)",
                  "radial-gradient(circle at 50% 95%, rgba(101,72,32,0.10), transparent 45%)",
                  "radial-gradient(ellipse at center, transparent 55%, rgba(69,50,24,0.18) 100%)",
                ].join(", "),
              }}
            />
            {/* Spine shadow: where the two halves of an open book would meet.
                Hidden below sm -- mobile stacks the two columns into one
                continuous page (see the column-major layout note below), so
                there's no seam between page halves to shade there. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-16 -translate-x-1/2 sm:block"
              style={{
                backgroundImage:
                  "linear-gradient(to right, transparent, rgba(45,32,15,0.22) 45%, rgba(45,32,15,0.28) 50%, rgba(45,32,15,0.22) 55%, transparent)",
              }}
            />

            <div className="relative">
              <div className="flex items-baseline justify-between gap-2 border-b border-[#8a6d3b]/40 pb-2">
                <h3 className="font-heading text-lg font-semibold text-(--ink2) sm:text-xl">{activeTab.name}</h3>
                <span className="shrink-0 text-xs text-[#6b5a3d]">
                  {activeTab.spells.length} spells
                  {totalRankCount > activeTab.spells.length ? `, ${totalRankCount} ranks` : ""}
                </span>
              </div>
              {activeTab.note && <p className="mt-1 text-[11px] italic text-[#6b5a3d]">{activeTab.note}</p>}

              {/* Column-major, matching talentsforever.com's actual book layout
                  (verified against .reference/spellbook_ordering_correct.png):
                  the left page reads straight top-to-bottom through the first
                  half of this page's rows, then the right page continues the
                  same sequence from where the left page left off -- not a
                  2-column grid's row-major/checkerboard fill (item 1 top-left,
                  item 2 top-right, item 3 second-left, ...), which is what an
                  earlier version of this rendered and .reference/
                  spellbook_ordering_incorrect.png shows. Two independent
                  single-column lists side by side achieve this directly; on
                  mobile they stack (flex-col), and stacking the left list
                  fully above the right list reconstructs the exact same
                  original order, so no separate mobile-only logic is needed. */}
              {(() => {
                const half = Math.ceil(pageRows.length / 2);
                const leftRows = pageRows.slice(0, half);
                const rightRows = pageRows.slice(half);
                const renderColumn = (rows: DisplayRow[], side: "left" | "right") =>
                  rows.map((row, i) => (
                    <SpellEntry
                      key={`${row.spell.name}-${row.rankEntry?.rank ?? row.rankEntry?.variant ?? "base"}`}
                      classId={classId}
                      spell={row.spell}
                      rankEntry={row.rankEntry}
                      revealDelayMs={reducedMotion ? undefined : i * 40}
                      side={side}
                      compareMode={compareMode}
                    />
                  ));
                return (
                  <div key={revealSeq} className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-x-6">
                    <ul className="flex flex-col gap-3 sm:w-1/2">{renderColumn(leftRows, "right")}</ul>
                    <ul className="flex flex-col gap-3 sm:w-1/2">{renderColumn(rightRows, "left")}</ul>
                  </div>
                );
              })()}

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#8a6d3b]/40 pt-2">
                {hasMultiRankSpells ? (
                  // Custom checkbox, not the bare browser default -- built from
                  // this component's own already-established parchment/gold
                  // palette (the CornerBracket trim's border tone and the same
                  // filled gold LevelsRow uses for a rank's active badge)
                  // rather than the site's separate dark-theme pill-button
                  // toggle (PlannerControls' "Compare to Classic"), which is
                  // built for the dark site chrome outside this parchment page
                  // and would clash sitting inside it. The real input stays
                  // present and keyboard-focusable (sr-only, not display:none),
                  // with a styled sibling box standing in visually.
                  <label className="group flex cursor-pointer items-center gap-1.5 text-xs text-[#5a4a30]">
                    <input
                      type="checkbox"
                      checked={showAllRanks}
                      onChange={(e) => {
                        // Resets the page directly rather than through goTo()
                        // -- this isn't a page turn (no flip animation should
                        // play), and goTo() would also no-op silently if we
                        // happened to already be on page 0.
                        setShowAllRanks(e.target.checked);
                        setPage(0);
                        setDisplay((d) => ({ ...d, page: 0 }));
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 ${
                        showAllRanks
                          ? "border-[#8a6d3b] bg-[#c9a961]"
                          : "border-[#8a6d3b]/60 bg-[#e4d2a8] group-hover:border-[#8a6d3b]"
                      }`}
                    >
                      {showAllRanks && (
                        <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-[#2a2010]" fill="none" aria-hidden="true">
                          <path
                            d="M3 8.5l3 3 7-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    Show all ranks
                  </label>
                ) : (
                  <span />
                )}
                {totalPages > 1 && (
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => goTo(tabIndex, page - 1)}
                      className="text-xs font-semibold text-[#5a4a30] disabled:opacity-30"
                    >
                      ← Prev
                    </button>
                    <span className="text-xs text-[#6b5a3d]">
                      Page {page + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages - 1}
                      onClick={() => goTo(tabIndex, page + 1)}
                      className="text-xs font-semibold text-[#5a4a30] disabled:opacity-30"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
