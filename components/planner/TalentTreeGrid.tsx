import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import type { RankState } from "@/lib/build-code";
import type { TalentTree } from "@/lib/wow-data";
import { treeBackgroundUrl, mediumIconUrl, getTreeIcon } from "@/lib/wow-data";
import foreverTalentSource from "@/data/sources/talentsforever/talentsforever-2026-10-01.json";
import { canAddPoint, pointsSpentInTree } from "@/lib/talent-rules";
import CornerBracket from "@/components/site/CornerBracket";
import TalentNode from "./TalentNode";
import { getLinkedSpells } from "@/lib/talent-spell-links";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { TooltipCard, TooltipName, TooltipRank, TooltipDescription } from "./TooltipCard";
import { claimActiveTooltip, releaseActiveTooltip, useIsActiveTooltip } from "@/lib/active-tooltip";

const TIERS = 7;
const COLS = 4;

type RemovedTalent = { name: string; max: number; text: string; row: number };
type SourceTree = { name: string; removed?: RemovedTalent[] };
type SourceClass = { trees: SourceTree[] };
const classicSource = foreverTalentSource.talents as Record<string, SourceClass>;
type SourceSpellbookClass = { general?: [string, string][]; tabs?: { spells?: [string, string][] }[] };
const sourceSpellbooks = foreverTalentSource.spellbooks as unknown as Record<string, SourceSpellbookClass>;

function isBaselineAbility(classId: string, name: string): boolean {
  const className = classId.charAt(0).toUpperCase() + classId.slice(1);
  const book = sourceSpellbooks[className];
  return [...(book?.general ?? []), ...(book?.tabs ?? []).flatMap((tab) => tab.spells ?? [])]
    .some(([spellName]) => spellName.toLocaleLowerCase() === name.toLocaleLowerCase());
}

function RemovedTalentEntry({ talent, classId, treeName }: { talent: RemovedTalent; classId: string; treeName: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { pos, show, hide } = useHoverTooltip<HTMLButtonElement>(260, "below", 130, triggerRef, { sharedTooltipRef: tooltipRef });
  const tooltipId = `removed:${classId}:${treeName}:${talent.name}`;
  const isActive = useIsActiveTooltip(tooltipId);
  const baseline = isBaselineAbility(classId, talent.name);
  function openTooltip() {
    claimActiveTooltip(tooltipId);
    show();
  }
  function closeTooltip() {
    releaseActiveTooltip(tooltipId);
    hide();
  }
  return (
    <>
      <li>
        <button
          ref={triggerRef}
          type="button"
          onMouseEnter={openTooltip}
          onMouseLeave={closeTooltip}
          onFocus={openTooltip}
          onBlur={closeTooltip}
          aria-label={`${talent.name}${baseline ? ", now a baseline ability" : ", removed from this tree"}`}
          className={`text-left text-[11px] underline decoration-dotted underline-offset-2 transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#e2bd68] ${baseline ? "text-[#70d27b] hover:text-[#9aefa1]" : "text-[#d6d0c4] hover:text-[#ffe28a]"}`}
        >
          {talent.name}
          {baseline && <span className="ml-1 text-[#9a9a9a] no-underline">· baseline</span>}
        </button>
      </li>
      {pos && isActive && createPortal(
        <TooltipCard divRef={tooltipRef} style={{ top: pos.top, left: pos.left, width: 260 }}>
          <TooltipName>{talent.name}</TooltipName>
          <TooltipRank>Classic talent · {talent.max} rank{talent.max === 1 ? "" : "s"} · row {talent.row}</TooltipRank>
          {talent.text && <TooltipDescription>{talent.text}</TooltipDescription>}
        </TooltipCard>,
        document.body
      )}
    </>
  );
}

export default function TalentTreeGrid({
  classId,
  tree,
  ranks,
  totalSpent,
  maxPoints,
  onAdd,
  onRemove,
  compareMode,
  tappedTalentId,
  onTap,
  peekTalentId,
  onPeek,
  onResetTree,
}: {
  classId: string;
  tree: TalentTree;
  ranks: RankState;
  totalSpent: number;
  maxPoints: number;
  onAdd: (talentId: string) => void;
  onRemove: (talentId: string) => void;
  compareMode?: boolean;
  tappedTalentId: string | null;
  onTap: (talentId: string | null) => void;
  peekTalentId: string | null;
  onPeek: (talentId: string | null) => void;
  onResetTree: () => void;
}) {
  const [hoveredTalentId, setHoveredTalentId] = useState<string | null>(null);
  const byId = new Map(tree.talents.map((t) => [t.id, t]));
  const hoveredTalent = hoveredTalentId ? byId.get(hoveredTalentId) : undefined;
  const linkedNames = hoveredTalent ? getLinkedSpells(classId, hoveredTalent.id).map((entry) => entry.name.toLocaleLowerCase()) : [];
  const linkedTalentIds = new Set(tree.talents.filter((talent) => linkedNames.includes(talent.name.toLocaleLowerCase())).map((talent) => talent.id));
  const prerequisiteId = hoveredTalent?.prereq?.id;
  const spent = pointsSpentInTree(tree, ranks);
  const sourceTree = classicSource[classId.charAt(0).toUpperCase() + classId.slice(1)]?.trees.find((item) => item.name === tree.name);

  return (
    <div className={`relative w-full rounded-sm border-2 border-accent/70 bg-surface p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] transition-[border-color,box-shadow] duration-500 sm:max-w-[296px] ${compareMode ? "border-[#b38a3e] shadow-[0_0_18px_rgba(201,169,97,0.16)]" : ""}`}>
      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />
      <div className="mb-1.5 flex items-center justify-between border-b border-accent/30 px-0.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediumIconUrl(getTreeIcon(classId, tree.name))}
            alt=""
            className="h-5 w-5 shrink-0 rounded-full border border-accent/60"
          />
          <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">{tree.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-foreground-muted">{spent} pts</span>
          <button
            type="button"
            onClick={onResetTree}
            disabled={spent === 0}
            title={`Reset ${tree.name} talents`}
            aria-label={`Reset ${tree.name} talents`}
            className="text-foreground-muted/70 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-foreground-muted/70"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12.8 4.8A5 5 0 1 0 13.5 8.5" strokeLinecap="round" />
              <path d="M12.8 1.8v3.4h-3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="relative rounded bg-cover bg-center p-2.5 sm:gap-5" style={{ backgroundImage: `linear-gradient(rgba(12,13,16,0.55), rgba(12,13,16,0.55)), url(${treeBackgroundUrl(classId, tree.name)})` }}>
        <div className="grid">
        <div
          className={`talent-tree-view grid gap-3.5 sm:gap-5 ${compareMode ? "compare-tree-active" : ""}`}
          style={{ gridArea: "1 / 1", gridTemplateColumns: `repeat(${COLS}, minmax(44px, 1fr))`, gridTemplateRows: `repeat(${TIERS}, 1fr)` }}
        >
        {tree.talents
          .filter((t) => t.prereq)
          .map((t) => {
            const prereq = byId.get(t.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= t.prereq!.ranks;
            const isHoveredPath = hoveredTalentId === t.id;
            const barClass = isHoveredPath ? "bg-[#f4c95d] shadow-[0_0_9px_rgba(244,201,93,0.9)]" : met ? "bg-accent" : "bg-foreground-muted/40";

            // Same-tier prereq (e.g. Paladin Holy Shock -> Divine Precision,
            // Priest Mind Flay -> Improved Mind Flay): the two talents sit
            // side by side in the same row, so the connector runs
            // horizontally across the column gap between them instead of
            // vertically down a shared column.
            if (prereq.tier === t.tier) {
              const minCol = Math.min(prereq.col, t.col);
              const maxCol = Math.max(prereq.col, t.col);
              return (
                <div
                  key={`connector-${t.id}`}
                  className={`pointer-events-none flex items-center justify-stretch transition-[filter] duration-200 ${isHoveredPath ? "drop-shadow-[0_0_4px_rgba(244,201,93,0.8)]" : ""}`}
                  style={{
                    gridColumn: `${minCol} / ${maxCol + 1}`,
                    gridRow: t.tier,
                  }}
                >
                  <div className={`h-2.5 w-full rounded-full sm:h-2 ${barClass}`} />
                </div>
              );
            }

            return (
              <div
                key={`connector-${t.id}`}
                className={`pointer-events-none flex items-stretch justify-center transition-[filter] duration-200 ${isHoveredPath ? "drop-shadow-[0_0_4px_rgba(244,201,93,0.8)]" : ""}`}
                style={{
                  gridColumn: t.col,
                  gridRow: `${prereq.tier} / ${t.tier + 1}`,
                }}
              >
                <div className={`w-2.5 rounded-full sm:w-2 ${barClass}`} />
              </div>
            );
          })}

        {tree.talents.map((t) => (
          <TalentNode
            key={t.id}
            classId={classId}
            talent={t}
            rank={ranks[t.id] ?? 0}
            canAdd={canAddPoint(tree, t, ranks, totalSpent, maxPoints)}
            onAdd={() => onAdd(t.id)}
            onRemove={() => onRemove(t.id)}
            prereqName={t.prereq ? byId.get(t.prereq.id)?.name : undefined}
            compareMode={compareMode}
            treeName={tree.name}
            pointsInTree={spent}
            totalSpent={totalSpent}
            tappedTalentId={tappedTalentId}
            onTap={onTap}
            peekTalentId={peekTalentId}
            onPeek={onPeek}
            onHoverTalent={setHoveredTalentId}
            highlightPrerequisite={t.id === prerequisiteId}
            highlightLinked={linkedTalentIds.has(t.id)}
          />
        ))}

        {tree.talents
          .filter((t) => t.prereq)
          .map((t) => {
            const prereq = byId.get(t.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= t.prereq!.ranks;

            // Same-tier prereq: arrow pokes out of the side of the
            // dependent talent's cell that faces the prereq (left edge,
            // pointing right, if the prereq sits to the left; right edge,
            // pointing left, if it sits to the right -- e.g. Holy Shock at
            // col 2 pointing left into Divine Precision at col 1) instead
            // of the default top edge pointing down.
            if (prereq.tier === t.tier) {
              const prereqIsRight = prereq.col > t.col;
              return (
                <div
                  key={`arrow-${t.id}`}
                  className={`pointer-events-none relative transition-[filter] duration-200 ${hoveredTalentId === t.id ? "drop-shadow-[0_0_5px_rgba(244,201,93,0.9)]" : ""}`}
                  style={{ gridColumn: t.col, gridRow: t.tier }}
                >
                  <div
                    className={`absolute top-1/2 h-0 w-0 -translate-y-1/2 border-y-[7px] border-y-transparent sm:border-y-[6px] ${
                      prereqIsRight
                        ? `-right-[7px] border-r-[10px] sm:-right-[6px] sm:border-r-[8px] ${hoveredTalentId === t.id ? "border-r-[#f4c95d] drop-shadow-[0_0_5px_rgba(244,201,93,0.9)]" : met ? "border-r-accent" : "border-r-foreground-muted/40"}`
                        : `-left-[7px] border-l-[10px] sm:-left-[6px] sm:border-l-[8px] ${hoveredTalentId === t.id ? "border-l-[#f4c95d] drop-shadow-[0_0_5px_rgba(244,201,93,0.9)]" : met ? "border-l-accent" : "border-l-foreground-muted/40"}`
                    }`}
                  />
                </div>
              );
            }

            return (
              <div
                key={`arrow-${t.id}`}
                  className={`pointer-events-none relative transition-[filter] duration-200 ${hoveredTalentId === t.id ? "drop-shadow-[0_0_5px_rgba(244,201,93,0.9)]" : ""}`}
                style={{ gridColumn: t.col, gridRow: t.tier }}
              >
                <div
                  className={`absolute -top-[7px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-x-transparent border-t-[10px] sm:-top-[6px] sm:border-x-[6px] sm:border-t-[8px] transition-[filter] duration-200 ${
                    hoveredTalentId === t.id ? "border-t-[#f4c95d] drop-shadow-[0_0_5px_rgba(244,201,93,0.9)]" : met ? "border-t-accent" : "border-t-foreground-muted/40"
                  }`}
                />
              </div>
            );
          })}

        </div>
        </div>
      </div>
      {compareMode && (sourceTree?.removed?.length ?? 0) > 0 && (
        <div className="compare-removed-enter mt-2 rounded-sm border border-black/60 bg-black/50 px-2.5 py-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b6b]">No longer a talent</h4>
          <ul className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            {sourceTree!.removed!.map((talent) => <RemovedTalentEntry key={talent.name} talent={talent} classId={classId} treeName={tree.name} />)}
          </ul>
        </div>
      )}
    </div>
  );
}
