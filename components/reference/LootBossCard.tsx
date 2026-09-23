import LootItemPill from "@/components/reference/LootItemPill";
import type { LootBoss } from "@/lib/dungeon-loot";

const KIND_LABEL: Partial<Record<LootBoss["kind"], string>> = {
  trash: "Trash",
  rare: "Rare Spawn",
  object: "Object",
  quest: "Quest NPC",
};

// Same card language as Card.tsx/blog list items/reference collapsibles --
// rounded-lg, border-border, bg-surface -- just not a link (nothing to
// navigate to), so no .fx-standard-hover.
export default function LootBossCard({ boss, dungeonId }: { boss: LootBoss; dungeonId: string }) {
  const kindLabel = KIND_LABEL[boss.kind];
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h3 className="font-heading text-base font-semibold text-accent">{boss.name}</h3>
        {boss.level !== null && <span className="text-[11px] text-foreground-muted">Level {boss.level}</span>}
        {kindLabel && (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted bg-foreground-muted/10">
            {kindLabel}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {boss.items.map((item, i) => (
          <LootItemPill key={`${item.name}-${i}`} item={item} tooltipId={`${dungeonId}:${boss.name}:${i}`} />
        ))}
      </div>
    </div>
  );
}
