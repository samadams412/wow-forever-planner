"use client";

import { createPortal } from "react-dom";
import { useRef, useState, type AnimationEvent } from "react";
import { mediumIconUrl, CLASS_ICON, getTreeIcon } from "@/lib/wow-data";
import type { ClassSpellbook, SpellbookEntry } from "@/lib/spellbooks";
import { getSpellTooltip } from "@/lib/spell-tooltips";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import {
  TooltipCard,
  TooltipName,
  TooltipRank,
  TooltipDescription,
  TooltipStatLine,
  TooltipSourceNote,
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

function resolveTabIcon(classId: string, tabName: string): string {
  if (tabName === "General") return CLASS_ICON[classId] ?? "inv_misc_questionmark";
  return getTreeIcon(classId, tabName);
}

function resolveSpellIcon(spell: SpellbookEntry): string {
  return SPELL_ICON_OVERRIDES[spell.name] ?? spell.icon ?? "inv_misc_questionmark";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SpellEntry({
  classId,
  spell,
  revealDelayMs,
}: {
  classId: string;
  spell: SpellbookEntry;
  revealDelayMs?: number;
}) {
  const subtitle = spell.passive ? "Passive" : spell.rank ? `Rank ${spell.rank}` : spell.tag;
  const tooltip = getSpellTooltip(classId, spell.name);
  const { ref, pos, show, hide } = useHoverTooltip<HTMLLIElement>(TOOLTIP_WIDTH, "below", 280);

  return (
    <li
      ref={tooltip ? ref : undefined}
      onMouseEnter={tooltip ? show : undefined}
      onMouseLeave={tooltip ? hide : undefined}
      onFocus={tooltip ? show : undefined}
      onBlur={tooltip ? hide : undefined}
      tabIndex={tooltip ? 0 : undefined}
      style={revealDelayMs !== undefined ? { animationDelay: `${revealDelayMs}ms` } : undefined}
      className={`group -mx-1 flex items-start gap-2.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-[#c9a961]/10 hover:ring-1 hover:ring-inset hover:ring-[#c9a961]/40 ${
        revealDelayMs !== undefined ? "spellbook-row-reveal" : ""
      }`}
    >
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm border border-[#c9a961]/50 transition-colors group-hover:border-[#c9a961]">
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
        </div>
        {subtitle && <p className="text-xs text-[#6b5a3d]">{subtitle}</p>}
      </div>

      {tooltip &&
        pos &&
        createPortal(
          <TooltipCard style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}>
            <TooltipName>{spell.name}</TooltipName>
            {subtitle && <TooltipRank>{subtitle}</TooltipRank>}
            {tooltip.lines.map(([left, right], i) => (
              <TooltipStatLine key={i} left={left} right={right} />
            ))}
            <TooltipDescription muted={!tooltip.confirmed}>{tooltip.description}</TooltipDescription>
            <TooltipSourceNote confirmed={tooltip.confirmed} source={tooltip.source} />
          </TooltipCard>,
          document.body
        )}
    </li>
  );
}

export default function SpellbookBook({ classId, book }: { classId: string; book: ClassSpellbook }) {
  // Tab order and default selection are independent: General sits first in
  // the rail (restored to its original position), but the tab shown when
  // the book first opens is still the class's first spec tree, not General.
  const tabs = [...book.tabs].sort((a, b) => (a.name === "General" ? -1 : b.name === "General" ? 1 : 0));
  const defaultTabIndex = Math.max(
    0,
    tabs.findIndex((t) => t.name !== "General")
  );

  const [tabIndex, setTabIndex] = useState(defaultTabIndex);
  const [page, setPage] = useState(0);
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
  const totalPages = Math.max(1, Math.ceil(activeTab.spells.length / PAGE_SIZE));
  const pageSpells = activeTab.spells.slice(display.page * PAGE_SIZE, display.page * PAGE_SIZE + PAGE_SIZE);

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

  return (
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
            <img src={mediumIconUrl(resolveTabIcon(classId, tab.name))} alt="" className="h-6 w-6 shrink-0 rounded-sm" />
            <span className="text-xs text-foreground sm:hidden">{tab.name}</span>
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
            {/* Spine shadow: where the two halves of an open book would meet. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-1/2 w-16 -translate-x-1/2"
              style={{
                backgroundImage:
                  "linear-gradient(to right, transparent, rgba(45,32,15,0.22) 45%, rgba(45,32,15,0.28) 50%, rgba(45,32,15,0.22) 55%, transparent)",
              }}
            />

            <div className="relative">
              <div className="flex items-baseline justify-between gap-2 border-b border-[#8a6d3b]/40 pb-2">
                <h3 className="font-heading text-lg font-semibold text-(--ink2) sm:text-xl">{activeTab.name}</h3>
                <span className="shrink-0 text-xs text-[#6b5a3d]">{activeTab.spells.length} spells</span>
              </div>

              <ul key={revealSeq} className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {pageSpells.map((spell, i) => (
                  <SpellEntry
                    key={spell.name}
                    classId={classId}
                    spell={spell}
                    revealDelayMs={reducedMotion ? undefined : Math.floor(i / 2) * 40}
                  />
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-4 border-t border-[#8a6d3b]/40 pt-2">
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
  );
}
