import LootItemPill from "@/components/reference/LootItemPill";
import type { Quest } from "@/lib/dungeon-loot";

const FACTION_BADGE_CLASS: Record<"Alliance" | "Horde" | "Both", string> = {
  Alliance: "bg-sky-500/15 text-sky-300",
  Horde: "bg-red-500/15 text-red-400",
  Both: "bg-foreground-muted/15 text-foreground-muted",
};

// One quest card -- name/level/faction header, the quest's own flavor text
// (when foreverchanges has it), giver + objectives as a small definition
// list (mirroring foreverchanges' own "Starts / Slay / Bring back" layout,
// rebuilt in this site's own card language rather than copied), then its
// reward choices as the same LootItemPill row every boss-loot card uses.
function QuestCard({ quest, dungeonId }: { quest: Quest; dungeonId: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium text-foreground">{quest.name}</span>
        {quest.level !== null && (
          <span className="text-[11px] text-foreground-muted">
            Level {quest.level}
            {quest.minLevel !== null ? `, from level ${quest.minLevel}` : ""}
          </span>
        )}
        {quest.faction && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${FACTION_BADGE_CLASS[quest.faction]}`}
          >
            {quest.faction === "Both" ? "Both Factions" : `${quest.faction} Only`}
          </span>
        )}
      </div>

      {quest.text && <p className="mt-1 text-xs leading-relaxed text-foreground-muted">{quest.text}</p>}

      {(quest.giver || quest.prereq || quest.objectives.length > 0 || quest.experience) && (
        <dl className="mt-1.5 flex flex-col gap-0.5 text-[11px]">
          {quest.prereq && (
            <div className="flex gap-1.5">
              <dt className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">Comes after</dt>
              <dd className="text-foreground">{quest.prereq}</dd>
            </div>
          )}
          {quest.giver && (
            <div className="flex gap-1.5">
              <dt className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">Starts</dt>
              <dd className="text-foreground">{quest.giver.location}</dd>
            </div>
          )}
          {quest.objectives.map((obj, i) => (
            <div key={i} className="flex gap-1.5">
              <dt className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">{obj.label}</dt>
              <dd className="text-foreground">{obj.needItems ? obj.needItems.map((it) => `${it.name}${it.qty ? ` ${it.qty}` : ""}`).join(", ") : obj.value}</dd>
            </div>
          ))}
          {(quest.experience || quest.money) && (
            <div className="flex gap-1.5">
              <dt className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">Reward</dt>
              <dd className="text-foreground">{[quest.experience, quest.money].filter(Boolean).join(" + ")}</dd>
            </div>
          )}
        </dl>
      )}

      {quest.rewards.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {quest.rewards.map((item, j) => (
            <LootItemPill key={`${item.name}-${j}`} item={item} tooltipId={`${dungeonId}:${quest.id}:${j}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// One "Quests" section for a dungeon -- a distinct card from the boss-loot
// cards above it (same border/bg language), one row per quest. Faction
// grouping (Hall of Thanes' "Alliance Only" / Ragefire Chasm's "Horde
// Only") renders as a small badge next to each quest's own name rather than
// a separate grouping wrapper, since the underlying data already resolves
// down to one faction value per quest.
export default function LootQuestRewardsCard({ quests, dungeonId }: { quests: Quest[]; dungeonId: string }) {
  if (quests.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="font-heading text-base font-semibold text-accent">Quests</h3>
      <div className="mt-2 flex flex-col gap-4">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} dungeonId={dungeonId} />
        ))}
      </div>
    </div>
  );
}
