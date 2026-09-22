import LootItemPill from "@/components/reference/LootItemPill";
import type { LootBoss } from "@/lib/dungeon-loot";

// Same card language as Card.tsx/blog list items/reference collapsibles --
// rounded-lg, border-border, bg-surface -- just not a link (nothing to
// navigate to), so no .fx-standard-hover.
export default function LootBossCard({ boss }: { boss: LootBoss }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-heading text-base font-semibold text-accent">{boss.name}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {boss.items.map((item, i) => (
          <LootItemPill key={`${item.name}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}
