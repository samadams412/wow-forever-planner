import type { RankState } from "@/lib/build-code";
import type { LegacyPerkTree } from "@/lib/legacy-perks";
import { canAddLegacyPoint, canRemoveLegacyPoint } from "@/lib/legacy-perks";
import { mediumIconUrl } from "@/lib/wow-data";
import CornerBracket from "@/components/site/CornerBracket";
import LegacyPerkNode from "./LegacyPerkNode";

const TIERS = 4;
const COLS = 4;
const TREE_BACKGROUNDS: Record<string, string> = {
  Adventure: "/backgrounds/hunter/survival.jpg",
  Resourcefulness: "/backgrounds/rogue/assassination.jpg",
  Professions: "/backgrounds/mage/arcane.jpg",
};

// A compact adaptation of components/planner/TalentTreeGrid.tsx's grid and
// connector arrows. Legacy Perk prerequisites stay within a row, so only the
// same-tier connector path is needed here.
export default function LegacyPerkTreeGrid({
  tree,
  ranks,
  spent,
  totalSpent,
  spendCap,
  onAdd,
  onRemove,
  onResetTree,
  onResetAll,
}: {
  tree: LegacyPerkTree;
  ranks: RankState;
  spent: number;
  totalSpent: number;
  spendCap: number;
  onAdd: (perkId: string) => void;
  onRemove: (perkId: string) => void;
  onResetTree: () => void;
  onResetAll: () => void;
}) {
  const byId = new Map(tree.perks.map((p) => [p.id, p]));
  return (
    <div className="relative w-full rounded-sm border border-accent/60 bg-surface p-3 shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_28px_rgba(0,0,0,0.3)]">
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
      </div>
      <div className="mb-2.5 flex items-center justify-between rounded border border-accent/30 bg-background/80 px-2.5 py-2 shadow-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-lg font-bold tabular-nums text-accent">{spent}</span>
          <span className="text-sm text-foreground-muted">/ {spendCap} points</span>
        </div>
        <div className="flex gap-1.5">
          <button type="button" onClick={onResetTree} disabled={spent === 0} className="rounded border border-border px-2 py-1 text-xs text-foreground-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">Reset tree</button>
          <button type="button" onClick={onResetAll} disabled={totalSpent === 0} className="rounded border border-border px-2 py-1 text-xs text-foreground-muted transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">Reset all</button>
        </div>
      </div>
      <div
        className="relative grid gap-3.5 overflow-hidden rounded border border-white/10 bg-background/60 p-2.5"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(60px, 1fr))`,
          gridTemplateRows: `repeat(${TIERS}, 1fr)`,
          backgroundImage: `linear-gradient(rgba(10, 10, 12, 0.78), rgba(10, 10, 12, 0.86)), url('${TREE_BACKGROUNDS[tree.name] ?? "/backgrounds/mage/arcane.jpg"}')`,
          backgroundPosition: "center",
          backgroundSize: "cover",
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
