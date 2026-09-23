"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BossPortrait from "@/components/reference/BossPortrait";
import LootItemPill from "@/components/reference/LootItemPill";
import type { DungeonData, LootBoss, Quest } from "@/lib/dungeon-loot";

const FACTION_BADGE_CLASS: Record<"Alliance" | "Horde", string> = {
  Alliance: "bg-sky-500/15 text-sky-300",
  Horde: "bg-red-500/15 text-red-400",
};

function BossDetail({ boss, dungeonId }: { boss: LootBoss; dungeonId: string }) {
  if (boss.items.length === 0) {
    return <p className="text-xs text-foreground-muted">No loot recorded for {boss.name} yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {boss.items.map((item, i) => (
        <LootItemPill key={`${item.name}-${i}`} item={item} tooltipId={`panel:${dungeonId}:${boss.name}:${i}`} />
      ))}
    </div>
  );
}

function QuestDetail({ quest, dungeonId }: { quest: Quest; dungeonId: string }) {
  return (
    <div>
      {quest.text && <p className="text-xs leading-relaxed text-foreground-muted">{quest.text}</p>}
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
      {quest.rewards.length > 0 && (
        <div className="mt-2">
          {quest.rewardHeading && <p className="text-[11px] font-medium text-foreground-muted">{quest.rewardHeading}</p>}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {quest.rewards.map((item, j) => (
              <LootItemPill key={`${item.name}-${j}`} item={item} tooltipId={`panel:${dungeonId}:${quest.id}:${j}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DungeonInlinePanel({ data, onClose }: { data: DungeonData; onClose: () => void }) {
  const [tab, setTab] = useState<"bosses" | "quests">("bosses");
  const [selectedBoss, setSelectedBoss] = useState(0);
  const [selectedQuest, setSelectedQuest] = useState(0);

  const boss = data.bosses[selectedBoss];
  const quest = data.quests[selectedQuest];
  const totalItems = data.bosses.reduce((n, b) => n + b.items.length, 0);

  return (
    <div className="relative mb-4 overflow-hidden rounded-lg border border-accent/40 shadow-lg">
      <div className="relative flex flex-col sm:flex-row">
        {/* Left: art + summary, same background-art treatment as the timeline bars themselves */}
        <div className="relative min-h-[220px] w-full shrink-0 sm:w-72">
          <Image src={data.backgroundImage} alt="" fill sizes="288px" style={{ objectFit: "cover" }} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "linear-gradient(to top, rgba(13,11,7,0.95) 0%, rgba(13,11,7,0.55) 45%, rgba(13,11,7,0.25) 100%)" }}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            {data.type === "new" && (
              <span className="mb-1.5 w-fit rounded-sm bg-green-600/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                New in Forever
              </span>
            )}
            <h3 className="font-heading text-lg font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
              {data.name}
            </h3>
            <p className="mt-0.5 text-xs text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
              Level {data.levelMin}-{data.levelMax}
              {data.zone ? ` · ${data.zone}` : ""}
            </p>
            {data.description && (
              <p className="mt-2 max-w-[40ch] text-xs leading-relaxed text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
                {data.description}
              </p>
            )}
          </div>
        </div>

        {/* Right: tabbed bosses/quests, list-then-detail like foreverchanges' own panel */}
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          <div className="flex items-center justify-between border-b border-border">
            <div className="flex">
              <button
                type="button"
                onClick={() => setTab("bosses")}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                  tab === "bosses" ? "border-b-2 border-accent text-accent" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Bosses and Loot {data.bosses.length > 0 && <span className="text-foreground-muted">{data.bosses.length}</span>}
              </button>
              <button
                type="button"
                onClick={() => setTab("quests")}
                className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${
                  tab === "quests" ? "border-b-2 border-accent text-accent" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                Quests {data.quests.length > 0 && <span className="text-foreground-muted">{data.quests.length}</span>}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="mr-2 rounded px-2 py-1 text-sm text-foreground-muted hover:bg-surface-hover hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="flex min-h-[220px] flex-1">
            {tab === "bosses" && data.bosses.length > 0 && (
              <>
                <ul className="w-32 shrink-0 overflow-y-auto border-r border-border py-1 sm:w-40">
                  {data.bosses.map((b, i) => (
                    <li key={`${b.name}-${i}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedBoss(i)}
                        className={`block w-full truncate px-2.5 py-1.5 text-left text-xs ${
                          i === selectedBoss ? "bg-accent/15 text-accent" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                        }`}
                      >
                        {b.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="min-w-0 flex-1 overflow-y-auto p-3">
                  {boss && (
                    <>
                      <div className="mb-1.5 flex items-center gap-2">
                        <BossPortrait src={boss.portraitUrl} alt="" size={28} />
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-accent">{boss.name}</h4>
                      </div>
                      <BossDetail boss={boss} dungeonId={data.id} />
                    </>
                  )}
                </div>
              </>
            )}

            {tab === "bosses" && data.bosses.length === 0 && (
              <p className="p-3 text-xs text-foreground-muted">No loot discovered for this dungeon yet.</p>
            )}

            {tab === "quests" && data.quests.length > 0 && (
              <>
                <ul className="w-32 shrink-0 overflow-y-auto border-r border-border py-1 sm:w-40">
                  {data.quests.map((q, i) => (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedQuest(i)}
                        className={`flex w-full items-center gap-1 truncate px-2.5 py-1.5 text-left text-xs ${
                          i === selectedQuest ? "bg-accent/15 text-accent" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                        }`}
                      >
                        {q.faction && q.faction !== "Both" && (
                          <span className={`shrink-0 rounded px-1 text-[9px] font-semibold uppercase ${FACTION_BADGE_CLASS[q.faction]}`}>
                            {q.faction[0]}
                          </span>
                        )}
                        <span className="truncate">{q.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="min-w-0 flex-1 overflow-y-auto p-3">
                  {quest && (
                    <>
                      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-accent">{quest.name}</h4>
                        {quest.level !== null && (
                          <span className="text-[10px] text-foreground-muted">
                            Level {quest.level}
                            {quest.minLevel !== null ? `, from level ${quest.minLevel}` : ""}
                          </span>
                        )}
                        {quest.faction && quest.faction !== "Both" && (
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${FACTION_BADGE_CLASS[quest.faction]}`}>
                            {quest.faction} Only
                          </span>
                        )}
                      </div>
                      <QuestDetail quest={quest} dungeonId={data.id} />
                    </>
                  )}
                </div>
              </>
            )}

            {tab === "quests" && data.quests.length === 0 && (
              <p className="p-3 text-xs text-foreground-muted">No quests discovered for this dungeon yet.</p>
            )}
          </div>

          {data.bosses.length > 0 && (
            <div className="border-t border-border px-3 py-2">
              <Link href={`/reference/dungeons/loot/${data.id}`} className="text-xs text-accent hover:underline">
                Full loot table, {totalItems} item{totalItems === 1 ? "" : "s"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
