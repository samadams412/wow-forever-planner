"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BossCard from "@/components/reference/BossCard";
import BossPortrait from "@/components/reference/BossPortrait";
import QuestCard from "@/components/reference/QuestCard";
import { ItemLinkSourceProvider } from "@/components/reference/ItemLinkSource";
import type { DungeonData } from "@/lib/dungeon-loot";
import { isNamedBoss, rosterCounts } from "@/lib/dungeon-roster";

const FACTION_BADGE_CLASS: Record<"Alliance" | "Horde", string> = {
  Alliance: "bg-sky-500/15 text-sky-300",
  Horde: "bg-red-500/15 text-red-400",
};

export default function DungeonInlinePanel({ data, onClose }: { data: DungeonData; onClose: () => void }) {
  const [tab, setTab] = useState<"bosses" | "quests">("bosses");
  const [selectedBoss, setSelectedBoss] = useState(0);
  const [selectedQuest, setSelectedQuest] = useState(0);

  // Containers and items (chests, Defias Gunpowder, etc.) clutter this compact
  // popup's boss roster -- they stay in the full loot table page, just not here.
  // Named NPCs (incl. portrait-bearing "object"/"quest" kinds) and the trash group stay.
  const listedBosses = data.bosses.filter((b) => isNamedBoss(b) || b.kind === "trash");
  // Header counts match the loot page: regular bosses and rare spawns as two figures.
  const counts = rosterCounts(data.bosses);
  const boss = listedBosses[selectedBoss];
  const quest = data.quests[selectedQuest];
  const totalItems = data.bosses.reduce((n, b) => n + b.items.length, 0);

  return (
    <ItemLinkSourceProvider from="/reference/dungeons" fromLabel={data.name}>
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
                Bosses and Loot{" "}
                {counts.bosses > 0 && <span className="text-foreground-muted">{counts.bosses} boss{counts.bosses === 1 ? "" : "es"}</span>}
                {counts.rares > 0 && (
                  <span className="text-foreground-muted"> · {counts.rares} rare</span>
                )}
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

          {/* No flex-1 here -- it's a flex-column child of the surface panel below,
              and flex-grow would stretch this past its explicit height to fill
              whatever space the (content-driven) boss/quest list wants, recreating
              the original unbounded-growth bug this fixed height exists to prevent. */}
          <div className="flex h-[320px]">
            {tab === "bosses" && listedBosses.length > 0 && (
              <>
                <ul className="scrollbar-gold w-32 shrink-0 cursor-default overflow-y-auto border-r border-border py-1 sm:w-40">
                  {listedBosses.map((b, i) => (
                    <li key={`${b.name}-${i}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedBoss(i)}
                        className={`block w-full truncate px-2.5 py-1.5 text-left text-xs ${
                          i === selectedBoss ? "bg-accent/15 text-accent" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <BossPortrait src={b.portraitUrl} alt="" size={20} />
                          <span className="truncate">{b.name}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="scrollbar-gold min-w-0 flex-1 cursor-default overflow-y-auto p-3">
                  {boss && <BossCard boss={boss} dungeonId={data.id} compact bare />}
                </div>
              </>
            )}

            {tab === "bosses" && listedBosses.length === 0 && (
              <p className="p-3 text-xs text-foreground-muted">No loot discovered for this dungeon yet.</p>
            )}

            {tab === "quests" && data.quests.length > 0 && (
              <>
                <ul className="scrollbar-gold w-32 shrink-0 cursor-default overflow-y-auto border-r border-border py-1 sm:w-40">
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
                <div className="scrollbar-gold min-w-0 flex-1 cursor-default overflow-y-auto p-3">
                  {quest && <QuestCard quest={quest} dungeonId={data.id} dungeonName={data.name} compact />}
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
    </ItemLinkSourceProvider>
  );
}
