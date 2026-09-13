import type { RankState } from "@/lib/build-code";
import type { TalentTree } from "@/lib/wow-data";
import { treeBackgroundUrl } from "@/lib/wow-data";
import { canAddPoint, pointsSpentInTree } from "@/lib/talent-rules";
import TalentNode from "./TalentNode";

const TIERS = 7;
const COLS = 4;

export default function TalentTreeGrid({
  classId,
  tree,
  ranks,
  totalSpent,
  onAdd,
  onRemove,
}: {
  classId: string;
  tree: TalentTree;
  ranks: RankState;
  totalSpent: number;
  onAdd: (talentId: string) => void;
  onRemove: (talentId: string) => void;
}) {
  const byId = new Map(tree.talents.map((t) => [t.id, t]));
  const spent = pointsSpentInTree(tree, ranks);

  return (
    <div className="w-full max-w-[308px] rounded-lg border border-border bg-surface p-3">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <h3 className="text-sm font-semibold text-foreground">{tree.name}</h3>
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
                <div className={`w-1 ${met ? "bg-accent/60" : "bg-border"}`} />
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
          />
        ))}
      </div>
    </div>
  );
}
