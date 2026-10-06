import Link from "next/link";
import LootItemPill from "@/components/reference/LootItemPill";
import { MoneyRewardRow, RewardPill } from "@/components/reference/RewardPills";
import type { Quest } from "@/lib/dungeon-loot";
import { parseExperience, parseMoneyCopper } from "@/lib/quest-rewards";
import { mediumIconUrl } from "@/lib/wow-data";

// Dungeon quest ids are "quest-<n>" (foreverchanges' own prefix) where <n>
// is the same numeric id this site's /quests/<id> catalog uses (both trace
// back to the same foreverchanges list -- confirmed by cross-checking
// quest-2904 "A Fine Mess" against data/sources/foreverchanges/quests/list.json's
// i:2904 row, same name). Falls back to no link if the id doesn't parse --
// the detail page itself handles a parseable-but-uncataloged id gracefully.
function questDetailHref(questId: string): string | null {
  const match = /^quest-(\d+)$/.exec(questId);
  return match ? `/quests/${match[1]}` : null;
}

export const FACTION_BADGE_CLASS: Record<"Alliance" | "Horde" | "Both", string> = {
  Alliance: "bg-sky-500/15 text-sky-300",
  Horde: "bg-red-500/15 text-red-400",
  Both: "bg-foreground-muted/15 text-foreground-muted",
};

// Shared quest card -- owns all quest display logic (name/level/faction
// header, flavor text, giver/objectives definition list, reward pills) so
// the full loot table page and DungeonInlinePanel's compact popup render
// identically. Rebuilt in this site's own card language rather than copied
// from foreverchanges' "Starts / Slay / Bring back" layout.
export default function QuestCard({
  quest,
  dungeonId,
  dungeonName,
  compact = false,
}: {
  quest: Quest;
  dungeonId: string;
  dungeonName: string;
  // Tighter type scale for the DungeonInlinePanel popup.
  compact?: boolean;
}) {
  const href = questDetailHref(quest.id);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {href ? (
          <Link
            href={`${href}?from=${encodeURIComponent(`/reference/dungeons/loot/${dungeonId}`)}&fromLabel=${encodeURIComponent(dungeonName)}`}
            className={`font-medium text-foreground underline decoration-dotted hover:text-accent ${compact ? "text-xs" : "text-sm"}`}
          >
            {quest.name}
          </Link>
        ) : (
          <span className={`font-medium text-foreground ${compact ? "text-xs" : "text-sm"}`}>{quest.name}</span>
        )}
        {quest.level !== null && (
          <span className="text-[11px] text-foreground-muted">
            Level {quest.level}
            {quest.minLevel !== null ? `, from level ${quest.minLevel}` : ""}
          </span>
        )}
        {quest.faction && quest.faction !== "Both" && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${FACTION_BADGE_CLASS[quest.faction]}`}
          >
            {quest.faction} Only
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
              <dd className="flex flex-wrap items-center gap-1.5 text-foreground">
                {parseExperience(quest.experience) !== null ? (
                  <RewardPill iconUrl={mediumIconUrl("xp_icon")}>{parseExperience(quest.experience)!.toLocaleString()}</RewardPill>
                ) : (
                  quest.experience && <span>{quest.experience}</span>
                )}
                {parseMoneyCopper(quest.money) !== null ? (
                  <MoneyRewardRow copper={parseMoneyCopper(quest.money)!} />
                ) : (
                  quest.money && <span>{quest.money}</span>
                )}
              </dd>
            </div>
          )}
        </dl>
      )}

      {quest.rewards.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {quest.rewards.map((item, j) => (
            <LootItemPill key={`${item.name}-${j}`} item={item} tooltipId={`${dungeonId}:${quest.id}:${j}`} showSlotType={!compact} />
          ))}
        </div>
      )}
    </div>
  );
}
