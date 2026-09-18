import type { RankState } from "@/lib/build-code";
import type { LegacyPerkTree } from "@/lib/legacy-perks";
import { pointsSpentInLegacyTree, canAddLegacyPoint, canRemoveLegacyPoint } from "@/lib/legacy-perks";
import { mediumIconUrl } from "@/lib/wow-data";
import CornerBracket from "@/components/site/CornerBracket";
import LegacyPerkNode from "./LegacyPerkNode";

const TIERS = 4;
const COLS = 4;

// A near-fork of components/planner/TalentTreeGrid.tsx's grid + connector-
// arrow rendering, kept separate (rather than generalized to share one
// component) because the two data shapes genuinely differ where it matters
// for rendering: Legacy Perk prereqs run strictly within a row (see
// lib/legacy-perks.ts), so only the same-tier connector path below is ever
// exercised, and there's no per-class tree background artwork to paint in.
export default function LegacyPerkTreeGrid({
  tree,
  ranks,
  totalSpent,
  spendCap,
  onAdd,
  onRemove,
  onResetTree,
}: {
  tree: LegacyPerkTree;
  ranks: RankState;
  totalSpent: number;
  spendCap: number;
  onAdd: (perkId: string) => void;
  onRemove: (perkId: string) => void;
  onResetTree: () => void;
}) {
  const byId = new Map(tree.perks.map((p) => [p.id, p]));
  const spent = pointsSpentInLegacyTree(tree, ranks);

  return (
    <div className="relative w-full rounded-sm border-2 border-accent/70 bg-surface p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]">
      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />
      <div className="mb-1.5 flex items-center justify-between border-b border-accent/30 px-0.5 pb-1.5">
        <div className="flex items-center gap-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediumIconUrl(tree.icon)} alt="" className="h-5 w-5 shrink-0 rounded-full border border-accent/60" />
          <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">{tree.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-foreground-muted">{spent} pts</span>
          <button
            type="button"
            onClick={onResetTree}
            disabled={spent === 0}
            title={`Reset ${tree.name} perks`}
            aria-label={`Reset ${tree.name} perks`}
            className="text-foreground-muted/70 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-foreground-muted/70"
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4">
              <path d="M12.8 4.8A5 5 0 1 0 13.5 8.5" strokeLinecap="round" />
              <path d="M12.8 1.8v3.4h-3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <div
        className="relative grid gap-3.5 rounded bg-background/40 p-2.5"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(60px, 1fr))`,
          gridTemplateRows: `repeat(${TIERS}, 1fr)`,
        }}
      >
        {tree.perks
          .filter((p) => p.prereq)
          .map((p) => {
            const prereq = byId.get(p.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= p.prereq!.ranks;
            const barClass = met ? "bg-accent" : "bg-foreground-muted/40";
            const minCol = Math.min(prereq.col, p.col);
            const maxCol = Math.max(prereq.col, p.col);
            return (
              <div
                key={`connector-${p.id}`}
                className="pointer-events-none flex items-center justify-stretch"
                style={{ gridColumn: `${minCol} / ${maxCol + 1}`, gridRow: p.tier }}
              >
                <div className={`h-2.5 w-full rounded-full ${barClass}`} />
              </div>
            );
          })}

        {tree.perks.map((p) => (
          <LegacyPerkNode
            key={p.id}
            tree={tree}
            perk={p}
            rank={ranks[p.id] ?? 0}
            canAdd={canAddLegacyPoint(tree, p, ranks, totalSpent, spendCap)}
            onAdd={() => onAdd(p.id)}
            onRemove={() => canRemoveLegacyPoint(tree, p, ranks) && onRemove(p.id)}
            prereqName={p.prereq ? byId.get(p.prereq.id)?.name : undefined}
            pointsInTree={spent}
            totalSpent={totalSpent}
            spendCap={spendCap}
          />
        ))}

        {tree.perks
          .filter((p) => p.prereq)
          .map((p) => {
            const prereq = byId.get(p.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= p.prereq!.ranks;
            const prereqIsRight = prereq.col > p.col;
            return (
              <div
                key={`arrow-${p.id}`}
                className="pointer-events-none relative"
                style={{ gridColumn: p.col, gridRow: p.tier }}
              >
                <div
                  className={`absolute top-1/2 h-0 w-0 -translate-y-1/2 border-y-[7px] border-y-transparent ${
                    prereqIsRight
                      ? `-right-[7px] border-r-[10px] ${met ? "border-r-accent" : "border-r-foreground-muted/40"}`
                      : `-left-[7px] border-l-[10px] ${met ? "border-l-accent" : "border-l-foreground-muted/40"}`
                  }`}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
