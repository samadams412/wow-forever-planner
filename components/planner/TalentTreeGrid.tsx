import type { RankState } from "@/lib/build-code";
import type { TalentTree } from "@/lib/wow-data";
import { treeBackgroundUrl } from "@/lib/wow-data";
import { canAddPoint, pointsSpentInTree } from "@/lib/talent-rules";
import TalentNode from "./TalentNode";

const TIERS = 7;
const COLS = 4;

const CORNER_POSITION_CLASS = {
  tl: "-top-[3px] -left-[3px] border-t-2 border-l-2",
  tr: "-top-[3px] -right-[3px] border-t-2 border-r-2",
  bl: "-bottom-[3px] -left-[3px] border-b-2 border-l-2",
  br: "-bottom-[3px] -right-[3px] border-b-2 border-r-2",
} as const;

function CornerBracket({ position }: { position: keyof typeof CORNER_POSITION_CLASS }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-3 w-3 border-accent ${CORNER_POSITION_CLASS[position]}`}
    />
  );
}

export default function TalentTreeGrid({
  classId,
  tree,
  ranks,
  totalSpent,
  onAdd,
  onRemove,
  compareMode,
}: {
  classId: string;
  tree: TalentTree;
  ranks: RankState;
  totalSpent: number;
  onAdd: (talentId: string) => void;
  onRemove: (talentId: string) => void;
  compareMode?: boolean;
}) {
  const byId = new Map(tree.talents.map((t) => [t.id, t]));
  const spent = pointsSpentInTree(tree, ranks);

  return (
    <div className="relative w-full max-w-77 rounded-sm border-2 border-accent/70 bg-surface p-3 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]">
      <CornerBracket position="tl" />
      <CornerBracket position="tr" />
      <CornerBracket position="bl" />
      <CornerBracket position="br" />
      <div className="mb-1.5 flex items-center justify-between border-b border-accent/30 px-0.5 pb-1.5">
        <h3 className="font-heading text-sm font-semibold tracking-wide text-foreground">{tree.name}</h3>
        <span className="text-xs text-foreground-muted">{spent} pts</span>
      </div>
      <div
        className="relative grid gap-2.5 rounded bg-cover bg-center p-2"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(52px, 1fr))`,
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
            return (
              <div
                key={`connector-${t.id}`}
                className="pointer-events-none flex items-stretch justify-center"
                style={{
                  gridColumn: t.col,
                  gridRow: `${prereq.tier} / ${t.tier + 1}`,
                }}
              >
                <div className={`w-1.5 rounded-full ${met ? "bg-accent" : "bg-foreground-muted/50"}`} />
              </div>
            );
          })}

        {tree.talents.map((t) => (
          <TalentNode
            key={t.id}
            talent={t}
            rank={ranks[t.id] ?? 0}
            canAdd={canAddPoint(tree, t, ranks, totalSpent)}
            onAdd={() => onAdd(t.id)}
            onRemove={() => onRemove(t.id)}
            prereqName={t.prereq ? byId.get(t.prereq.id)?.name : undefined}
            compareMode={compareMode}
          />
        ))}

        {tree.talents
          .filter((t) => t.prereq)
          .map((t) => {
            const prereq = byId.get(t.prereq!.id);
            if (!prereq) return null;
            const met = (ranks[prereq.id] ?? 0) >= t.prereq!.ranks;
            return (
              <div
                key={`arrow-${t.id}`}
                className="pointer-events-none relative"
                style={{ gridColumn: t.col, gridRow: t.tier }}
              >
                <div
                  className={`absolute -top-[5px] left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[7px] ${
                    met ? "border-t-accent" : "border-t-foreground-muted/50"
                  }`}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
