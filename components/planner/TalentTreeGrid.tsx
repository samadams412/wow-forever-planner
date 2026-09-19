import type { RankState } from "@/lib/build-code";
import type { TalentTree } from "@/lib/wow-data";
import { treeBackgroundUrl, mediumIconUrl, getTreeIcon } from "@/lib/wow-data";
import { canAddPoint, pointsSpentInTree } from "@/lib/talent-rules";
import CornerBracket from "@/components/site/CornerBracket";
import TalentNode from "./TalentNode";

const TIERS = 7;
const COLS = 4;

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
  const byId = new Map(tree.talents.map((t) => [t.id, t]));
  const spent = pointsSpentInTree(tree, ranks);

  return (
    <div className="relative w-full rounded-sm border-2 border-accent/70 bg-surface p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] sm:max-w-[296px]">
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
      <div
        className="relative grid gap-3.5 rounded bg-cover bg-center p-2.5 sm:gap-5"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(44px, 1fr))`,
          gridTemplateRows: `repeat(${TIERS}, 1fr)`,
          backgroundImage: `linear-gradient(rgba(12,13,16,0.55), rgba(12,13,16,0.55)), url(${treeBackgroundUrl(classId, tree.name)})`,
        }}
      >
        {tree.talents
          .filter((t) => t.prereq)
          .map((t) => {
            const prereq = byId.get(t.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= t.prereq!.ranks;
            const barClass = met ? "bg-accent" : "bg-foreground-muted/40";

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
                  className="pointer-events-none flex items-center justify-stretch"
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
                className="pointer-events-none flex items-stretch justify-center"
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
                  className="pointer-events-none relative"
                  style={{ gridColumn: t.col, gridRow: t.tier }}
                >
                  <div
                    className={`absolute top-1/2 h-0 w-0 -translate-y-1/2 border-y-[7px] border-y-transparent sm:border-y-[6px] ${
                      prereqIsRight
                        ? `-right-[7px] border-r-[10px] sm:-right-[6px] sm:border-r-[8px] ${met ? "border-r-accent" : "border-r-foreground-muted/40"}`
                        : `-left-[7px] border-l-[10px] sm:-left-[6px] sm:border-l-[8px] ${met ? "border-l-accent" : "border-l-foreground-muted/40"}`
                    }`}
                  />
                </div>
              );
            }

            return (
              <div
                key={`arrow-${t.id}`}
                className="pointer-events-none relative"
                style={{ gridColumn: t.col, gridRow: t.tier }}
              >
                <div
                  className={`absolute -top-[7px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-x-transparent border-t-[10px] sm:-top-[6px] sm:border-x-[6px] sm:border-t-[8px] ${
                    met ? "border-t-accent" : "border-t-foreground-muted/40"
                  }`}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
