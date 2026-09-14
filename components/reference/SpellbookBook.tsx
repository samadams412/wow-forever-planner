"use client";

import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { mediumIconUrl, CLASS_ICON, getClassTalentData } from "@/lib/wow-data";
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

// The "first talent in the tree" heuristic below picks a poor/misleading
// representative icon for some trees (e.g. Warrior Fury landed on a
// situational tier-1 talent instead of anything Fury-flavored) -- these
// verified overrides (from the reference site's own tab icons) take
// priority over the heuristic. Keyed by `${classId}:${tabName}`.
const TAB_ICON_OVERRIDES: Record<string, string> = {
  "warrior:Fury": "ability_warrior_innerrage",
  "warrior:Protection": "ability_warrior_defensivestance",
  "warrior:Arms": "ability_warrior_offensivestance",
};

function resolveTabIcon(classId: string, tabName: string): string {
  const override = TAB_ICON_OVERRIDES[`${classId}:${tabName}`];
  if (override) return override;
  if (tabName === "General") return CLASS_ICON[classId] ?? "inv_misc_questionmark";
  const tree = getClassTalentData(classId)?.trees.find((t) => t.name === tabName);
  return tree?.talents[0]?.icon ?? "inv_misc_questionmark";
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SpellEntry({ classId, spell }: { classId: string; spell: SpellbookEntry }) {
  const subtitle = spell.passive ? "Passive" : spell.rank ? `Rank ${spell.rank}` : spell.tag;
  const tooltip = getSpellTooltip(classId, spell.name);
  const { ref, pos, show, hide } = useHoverTooltip<HTMLLIElement>(TOOLTIP_WIDTH);

  return (
    <li
      ref={tooltip ? ref : undefined}
      onMouseEnter={tooltip ? show : undefined}
      onMouseLeave={tooltip ? hide : undefined}
      onFocus={tooltip ? show : undefined}
      onBlur={tooltip ? hide : undefined}
      tabIndex={tooltip ? 0 : undefined}
      className="flex items-start gap-2.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediumIconUrl(spell.icon ?? "inv_misc_questionmark")}
        alt=""
        title={spell.iconPlaceholder ? "Placeholder icon, not yet confirmed" : undefined}
        className="h-9 w-9 shrink-0 rounded-sm border border-[#8a6d3b]/50"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-semibold text-[#2b2013]">{spell.name}</span>
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
  const tabs = [...book.tabs].sort((a, b) => (a.name === "General" ? -1 : b.name === "General" ? 1 : 0));

  const [tabIndex, setTabIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [display, setDisplay] = useState({ tabIndex: 0, page: 0 });
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");
  const pending = useRef<{ tabIndex: number; page: number } | null>(null);

  const activeTab = tabs[display.tabIndex];
  const totalPages = Math.max(1, Math.ceil(activeTab.spells.length / PAGE_SIZE));
  const pageSpells = activeTab.spells.slice(display.page * PAGE_SIZE, display.page * PAGE_SIZE + PAGE_SIZE);

  function goTo(nextTabIndex: number, nextPage: number) {
    if (nextTabIndex === tabIndex && nextPage === page) return;
    setTabIndex(nextTabIndex);
    setPage(nextPage);

    if (prefersReducedMotion()) {
      setDisplay({ tabIndex: nextTabIndex, page: nextPage });
      return;
    }
    pending.current = { tabIndex: nextTabIndex, page: nextPage };
    setPhase("out");
  }

  function handleAnimationEnd() {
    if (phase === "out" && pending.current) {
      setDisplay(pending.current);
      pending.current = null;
      setPhase("in");
    } else if (phase === "in") {
      setPhase("idle");
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="flex gap-1.5 overflow-x-auto sm:w-14 sm:shrink-0 sm:flex-col sm:overflow-visible">
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

      <div className="relative flex-1 rounded-sm border-2 border-accent/70 bg-surface p-2 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] sm:p-3">
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        <div style={{ perspective: 1400 }}>
          <div
            onAnimationEnd={handleAnimationEnd}
            className={`spellbook-page relative overflow-hidden rounded-sm border border-[#8a6d3b]/50 bg-[#e8dcc4] p-3 sm:p-5 ${
              phase === "out" ? "flip-out" : phase === "in" ? "flip-in" : ""
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
                <h3 className="font-heading text-lg font-semibold text-[#2b2013] sm:text-xl">{activeTab.name}</h3>
                <span className="shrink-0 text-xs text-[#6b5a3d]">{activeTab.spells.length} spells</span>
              </div>

              <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {pageSpells.map((spell) => (
                  <SpellEntry key={spell.name} classId={classId} spell={spell} />
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
