import { mediumIconUrl, getTreeIcon, CLASS_COLOR, TREE_ACCENT_COLORS, classLabel, type TalentTree } from "@/lib/wow-data";
import { pointsSpentInTree, leadingTreeIndex } from "@/lib/talent-rules";
import type { RankState } from "@/lib/build-code";

export default function ClassHero({
  classId,
  trees,
  ranks,
  maxPoints,
}: {
  classId: string;
  trees: TalentTree[];
  ranks: RankState;
  maxPoints: number;
}) {
  const color = CLASS_COLOR[classId] ?? "var(--accent)";
  const spentPerTree = trees.map((tree) => pointsSpentInTree(tree, ranks));
  const leadIdx = leadingTreeIndex(trees, ranks);
  const specLabel = leadIdx !== null ? `${trees[leadIdx].name} ${classLabel(classId)}` : null;

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: `${color}55`,
        borderBottomWidth: 3,
        borderBottomColor: color,
        background: `linear-gradient(90deg, ${color}22, transparent 80%)`,
      }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(`class_${classId}`)} alt="" className="h-9 w-9 shrink-0 rounded" />
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-semibold tracking-wide" style={{ color }}>
            {classLabel(classId)}
          </h2>
          <p className="text-xs text-foreground-muted">
            {specLabel && (
              <span className="mr-1.5 font-semibold" style={{ color: TREE_ACCENT_COLORS[leadIdx!] }}>
                {specLabel}
              </span>
            )}
            {trees.map((tree, i) => (
              <span key={tree.name}>
                {i > 0 && " · "}
                {spentPerTree[i]} {tree.name}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:w-44 sm:shrink-0">
        {trees.map((tree, i) => {
          const pct = maxPoints > 0 ? Math.min(100, (spentPerTree[i] / maxPoints) * 100) : 0;
          const barColor = i === leadIdx ? color : "#ffd700";
          return (
            <div key={tree.name} className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediumIconUrl(getTreeIcon(classId, tree.name))}
                alt=""
                className="h-4 w-4 shrink-0 rounded-full"
              />
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-background/60">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-foreground-muted">
                {spentPerTree[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
