import type { RankState } from "@/lib/build-code";
import type { TalentTree } from "@/lib/wow-data";
import { canAddPoint, pointsSpentInTree } from "@/lib/talent-rules";
import TalentNode, { CELL, STEP } from "./TalentNode";

const TIERS = 7;
const COLS = 4;

export default function TalentTreeGrid({
  tree,
  ranks,
  onAdd,
  onRemove,
}: {
  tree: TalentTree;
  ranks: RankState;
  onAdd: (talentId: string) => void;
  onRemove: (talentId: string) => void;
}) {
  const byId = new Map(tree.talents.map((t) => [t.id, t]));
  const spent = pointsSpentInTree(tree, ranks);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{tree.name}</h3>
        <span className="text-sm text-foreground-muted">{spent} points</span>
      </div>
      <div className="overflow-x-auto">
        <div
          className="relative"
          style={{ width: COLS * STEP - 16, height: TIERS * STEP - 16, minWidth: COLS * STEP - 16 }}
        >
          {/* connector lines, rendered behind the talent nodes */}
          {tree.talents
            .filter((t) => t.prereq)
            .map((t) => {
              const prereq = byId.get(t.prereq!.id);
              if (!prereq) return null;
              const met = (ranks[prereq.id] ?? 0) >= t.prereq!.ranks;
              const top = (prereq.tier - 1) * STEP + CELL;
              const height = (t.tier - 1) * STEP - top;
              const left = (t.col - 1) * STEP + CELL / 2 - 1;
              return (
                <div
                  key={`connector-${t.id}`}
                  className={met ? "absolute bg-accent/50" : "absolute bg-border"}
                  style={{ left, top, width: 2, height }}
                />
              );
            })}

          {tree.talents.map((t) => (
            <TalentNode
              key={t.id}
              talent={t}
              rank={ranks[t.id] ?? 0}
              canAdd={canAddPoint(tree, t, ranks)}
              onAdd={() => onAdd(t.id)}
              onRemove={() => onRemove(t.id)}
              prereqName={t.prereq ? byId.get(t.prereq.id)?.name : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
