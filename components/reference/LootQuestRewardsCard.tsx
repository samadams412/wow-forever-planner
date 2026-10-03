import Image from "next/image";
import QuestCard from "@/components/reference/QuestCard";
import type { Quest } from "@/lib/dungeon-loot";

const FACTION_GROUPS: { key: "Alliance" | "Horde" | "Both" | "none"; label: string }[] = [
  { key: "Both", label: "Both Factions" },
  { key: "Alliance", label: "Alliance" },
  { key: "Horde", label: "Horde" },
  { key: "none", label: "Quests" },
];

// One "Quests" section for a dungeon -- a distinct card from the boss-loot
// cards above it (same border/bg language). Grouped by faction (Hall of
// Thanes' "Alliance Only" / Ragefire Chasm's "Horde Only") rather than one
// flat list, since several dungeons mix faction-restricted and shared
// quests; a dungeon with only one faction value present renders that one
// group with no heading noise from the others.
export default function LootQuestRewardsCard({
  quests,
  dungeonId,
  dungeonName,
}: {
  quests: Quest[];
  dungeonId: string;
  dungeonName: string;
}) {
  if (quests.length === 0) return null;

  const groups = FACTION_GROUPS.map((g) => ({
    ...g,
    quests: quests.filter((q) => (q.faction ?? "none") === g.key),
  })).filter((g) => g.quests.length > 0);
  // No faction grouping to show (every quest shares one value) -- fall back
  // to a flat list so a single-faction dungeon doesn't get a redundant
  // group heading.
  const showGroupHeadings = groups.length > 1;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="flex items-center gap-1.5 font-heading text-base font-semibold text-accent">
        <Image src="/images/icons/available.png" alt="" width={18} height={18} />
        Quests
      </h3>
      <div className="mt-2 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.key}>
            {showGroupHeadings && (
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">{group.label}</h4>
            )}
            <div className="flex flex-col gap-4">
              {group.quests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} dungeonId={dungeonId} dungeonName={dungeonName} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
