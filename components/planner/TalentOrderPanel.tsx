import Collapsible from "@/components/site/Collapsible";
import { iconUrl, type ClassTalentData, type Talent } from "@/lib/wow-data";
import { levelForPoint } from "@/lib/talent-order";

// Which point went where, in spending order. Only rendered when the order is
// known (see lib/talent-order.ts); legacy builds get no panel at all.
export default function TalentOrderPanel({ classData, order }: { classData: ClassTalentData; order: string[] }) {
  const talents = new Map<string, Talent>();
  for (const tree of classData.trees) for (const t of tree.talents) talents.set(t.id, t);
  const rankSoFar: Record<string, number> = {};

  return (
    <Collapsible title="Talent order" subtitle="Which point at which level">
      <ol className="gap-x-6 sm:columns-2">
        {order.map((id, i) => {
          const talent = talents.get(id);
          if (!talent) return null;
          rankSoFar[id] = (rankSoFar[id] ?? 0) + 1;
          return (
            <li
              key={i}
              className="flex break-inside-avoid items-center gap-2 border-b border-border/50 py-1 text-sm last:border-b-0"
            >
              <span className="w-7 shrink-0 text-right text-xs tabular-nums text-foreground-muted">
                {levelForPoint(i)}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={iconUrl(talent.icon)} alt="" className="h-6 w-6 shrink-0 rounded-sm border border-border" />
              <span className="min-w-0 flex-1 truncate text-foreground">{talent.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-accent">
                {rankSoFar[id]}/{talent.maxRank}
              </span>
            </li>
          );
        })}
      </ol>
    </Collapsible>
  );
}
