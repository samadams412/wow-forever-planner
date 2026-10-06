import type { BossTrigger, LootBoss } from "@/lib/dungeon-loot";
import BossCard from "@/components/reference/BossCard";

// Amber "!" callout that sits to the left of a boss card (stacked above it
// on narrow screens) for fights foreverchanges flags as Important. Pulled out
// of BossCard's inline trigger box so the warning is visible at a glance
// without scanning the boss's ability list. Only the "Important" flag is
// lifted out; other triggers stay inline in the card.
function ImportantCallout({ text }: { text: string }) {
  return (
    <aside
      aria-label="Important"
      className="flex gap-2.5 rounded-lg border border-amber-400/50 bg-amber-400/5 px-3 py-2.5"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-300"
      >
        !
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">Important</p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">{text}</p>
      </div>
    </aside>
  );
}

// Full-page boss entry: BossCard, with an Important trigger (if any) lifted
// into a callout on its left. The compact DungeonInlinePanel popup still uses
// BossCard directly, so it keeps the inline trigger.
export default function BossWithCallout({
  boss,
  dungeonId,
  anchorId,
}: {
  boss: LootBoss;
  dungeonId: string;
  anchorId: string;
}) {
  const important: BossTrigger | null = boss.trigger?.flag === "Important" ? boss.trigger : null;
  if (!important) return <BossCard boss={boss} dungeonId={dungeonId} anchorId={anchorId} />;

  return (
    <div className="grid scroll-mt-20 gap-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-start" id={anchorId}>
      <ImportantCallout text={important.text} />
      <BossCard boss={{ ...boss, trigger: null }} dungeonId={dungeonId} />
    </div>
  );
}
