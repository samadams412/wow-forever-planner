import Link from "next/link";
import LootItemPill from "@/components/reference/LootItemPill";
import { MoneyRewardRow, RewardPill } from "@/components/reference/RewardPills";
import type { Quest, QuestSortKey } from "@/lib/quests";
import { mediumIconUrl } from "@/lib/wow-data";

function questHref(quest: Quest): string {
  const params = new URLSearchParams({ from: "/reference/quests", fromLabel: "Quests" });
  return `/quests/${quest.id}?${params.toString()}`;
}

const SIDE_BADGE: Record<Quest["side"], string> = {
  Alliance: "bg-sky-500/15 text-sky-300",
  Horde: "bg-red-500/15 text-red-400",
  Both: "bg-foreground-muted/15 text-foreground-muted",
};

const LOCATION_KIND_LABEL: Record<Quest["locationKind"], string> = {
  zone: "Zone",
  dungeon: "Dungeon",
  raid: "Raid",
  battleground: "Battleground",
  sort: "Other",
  unknown: "Unknown",
};

function locationLabel(quest: Quest): string {
  if (quest.locationName) return quest.locationName;
  return LOCATION_KIND_LABEL[quest.locationKind];
}

type SortProps = {
  sort?: QuestSortKey;
  dir: "asc" | "desc";
  sortHref: (key: QuestSortKey) => string;
};

// A plain Link (no client JS/state) that navigates to this column's sort
// href -- same server-rendered-navigation pattern as the page's own
// location-kind tabs and pagination links. Shows an ascending/descending
// arrow only on the currently active column.
function SortableHeader({ label, sortKey, sort, dir, sortHref }: { label: string; sortKey: QuestSortKey } & SortProps) {
  const active = sort === sortKey;
  return (
    <th className="px-3 py-2 font-semibold" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={sortHref(sortKey)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <span className={`text-[9px] ${active ? "text-accent" : "text-foreground-muted/40"}`}>
          {active ? (dir === "asc" ? "▲" : "▼") : "▲"}
        </span>
      </Link>
    </th>
  );
}

function RewardRow({ quest }: { quest: Quest }) {
  if (quest.choiceRewards.length === 0 && quest.guaranteedRewards.length === 0) {
    return <span className="text-foreground-muted">--</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {quest.guaranteedRewards.map((item, i) => (
        <LootItemPill key={`k-${i}`} item={item} tooltipId={`quest:${quest.id}:k:${i}`} iconOnly />
      ))}
      {quest.choiceRewards.map((item, i) => (
        <LootItemPill key={`r-${i}`} item={item} tooltipId={`quest:${quest.id}:r:${i}`} iconOnly />
      ))}
    </div>
  );
}

// Same table/card split as ItemsTable -- full table from `sm` up, one card
// per row below it.
// XP and money as the same icon pills the quest cards use, at table-row size.
// "--" when neither is present, matching the table's empty cells.
function RewardCell({ quest }: { quest: Quest }) {
  if (quest.xp <= 0 && quest.money <= 0) return <span className="text-foreground-muted">--</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {quest.xp > 0 && <RewardPill compact iconUrl={mediumIconUrl("xp_icon")}>{quest.xp.toLocaleString()}</RewardPill>}
      {quest.money > 0 && <MoneyRewardRow compact copper={quest.money} />}
    </span>
  );
}

export default function QuestsTable({ quests, sort, dir, sortHref }: { quests: Quest[] } & SortProps) {
  if (quests.length === 0) {
    return <p className="mt-6 text-sm text-foreground-muted">No quests match this filter.</p>;
  }
  const sortProps: SortProps = { sort, dir, sortHref };
  return (
    <>
      <div className="mt-4 hidden cursor-default overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-foreground-muted">
              <SortableHeader label="Quest" sortKey="name" {...sortProps} />
              <SortableHeader label="Level" sortKey="level" {...sortProps} />
              <SortableHeader label="Req. Level" sortKey="requiredLevel" {...sortProps} />
              <SortableHeader label="Side" sortKey="side" {...sortProps} />
              <SortableHeader label="Location" sortKey="location" {...sortProps} />
              <SortableHeader label="XP / Money" sortKey="xp" {...sortProps} />
              <th className="px-3 py-2 font-semibold">Rewards</th>
            </tr>
          </thead>
          <tbody>
            {quests.map((quest) => (
              <tr key={quest.id} className="border-b border-border/60 last:border-b-0 even:bg-surface/40">
                <td className="px-3 py-1.5 text-foreground">
                  <Link href={questHref(quest)} className="hover:text-accent hover:underline">
                    {quest.name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-foreground-muted">{quest.level ?? "--"}</td>
                <td className="px-3 py-1.5 text-foreground-muted">{quest.requiredLevel ?? "--"}</td>
                <td className="px-3 py-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SIDE_BADGE[quest.side]}`}>
                    {quest.side === "Both" ? "Both" : quest.side}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-foreground-muted">{locationLabel(quest)}</td>
                <td className="px-3 py-1.5 text-foreground-muted">
                  <RewardCell quest={quest} />
                </td>
                <td className="px-3 py-1.5">
                  <RewardRow quest={quest} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:hidden">
        {quests.map((quest) => (
          <div key={quest.id} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={questHref(quest)} className="text-sm font-medium text-foreground hover:text-accent hover:underline">
                {quest.name}
              </Link>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SIDE_BADGE[quest.side]}`}>
                {quest.side === "Both" ? "Both" : quest.side}
              </span>
            </div>
            <dl className="mt-2.5 flex flex-col gap-1.5 border-t border-border/60 pt-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Level</dt>
                <dd>{quest.level ?? "--"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Req. Level</dt>
                <dd>{quest.requiredLevel ?? "--"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Location</dt>
                <dd>{locationLabel(quest)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">XP / Money</dt>
                <dd>
                  <RewardCell quest={quest} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Rewards</dt>
                <dd>
                  <RewardRow quest={quest} />
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
