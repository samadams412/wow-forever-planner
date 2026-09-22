import LootItemPill from "@/components/reference/LootItemPill";
import type { QuestReward } from "@/lib/dungeon-loot";

const FACTION_BADGE_CLASS: Record<"Alliance" | "Horde", string> = {
  Alliance: "bg-sky-500/15 text-sky-300",
  Horde: "bg-red-500/15 text-red-400",
};

// One "Quest Rewards" section for a dungeon -- a distinct card from the
// boss-loot cards above it (same border/bg language), one row per quest,
// each quest's own item pills below it. A quest's faction restriction (only
// some dungeons' pages show this -- Hall of Thanes' "Alliance Only" /
// Ragefire Chasm's "Horde Only" are the two confirmed examples) renders as
// a small badge next to that quest's name rather than a separate grouping
// wrapper, since the source data already resolves it down to one faction
// value per quest.
export default function LootQuestRewardsCard({ questRewards }: { questRewards: QuestReward[] }) {
  if (questRewards.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-heading text-base font-semibold text-accent">Quest Rewards</h3>
      <div className="mt-2 flex flex-col gap-3">
        {questRewards.map((quest, i) => (
          <div key={`${quest.questName}-${i}`}>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">{quest.questName}</span>
              {quest.level !== null && (
                <span className="text-[11px] text-foreground-muted">Level {quest.level}</span>
              )}
              {quest.faction && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${FACTION_BADGE_CLASS[quest.faction]}`}
                >
                  {quest.faction} Only
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {quest.items.map((item, j) => (
                <LootItemPill key={`${item.name}-${j}`} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
