import Image from "next/image";
import Link from "next/link";
import { FACTION_BADGE_CLASS } from "@/components/reference/QuestCard";
import type { Quest } from "@/lib/dungeon-loot";

// Dungeon quest ids are "quest-<n>"; the site's detail route is /quests/<n>.
function questDetailHref(questId: string, dungeonId: string, dungeonName: string): string | null {
  const match = /^quest-(\d+)$/.exec(questId);
  if (!match) return null;
  const params = new URLSearchParams({
    from: `/reference/dungeons/loot/${dungeonId}`,
    fromLabel: dungeonName,
  });
  return `/quests/${match[1]}?${params.toString()}`;
}

type GiverRow = {
  key: string;
  name: string;
  location: string;
  quests: Quest[];
};

// A quest belongs in the table only when we know both who gives it and where.
// Quests with a missing giver or location are left out rather than shown as
// a row of blanks.
export function hasKnownStart(quest: Quest): boolean {
  return Boolean(quest.giver?.name && quest.giver.location);
}

// Groups the dungeon's quests by who hands them out. Givers are keyed by name
// so one NPC with several quests becomes one row.
function groupByGiver(quests: Quest[]): GiverRow[] {
  const rows = new Map<string, GiverRow>();
  for (const quest of quests) {
    if (!quest.giver?.name) continue;
    const name = quest.giver.name;
    let row = rows.get(name);
    if (!row) {
      row = {
        key: name,
        name,
        location: quest.giver.location,
        quests: [],
      };
      rows.set(name, row);
    }
    row.quests.push(quest);
  }
  return [...rows.values()];
}

// "Where quests start" -- a reference table in the same card language as the
// quest section above it. A giver's name links to their spot on the world map
// when foreverchanges gave us one; each quest name links to its detail page.
export default function QuestGiversTable({
  quests,
  dungeonId,
  dungeonName,
}: {
  quests: Quest[];
  dungeonId: string;
  dungeonName: string;
}) {
  const rows = groupByGiver(quests.filter(hasKnownStart));
  if (rows.length === 0) return null;

  return (
    <section id="quest-givers" className="scroll-mt-20 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-accent">
          <Image src="/images/icons/available.png" alt="" width={18} height={18} />
          Where quests start
        </h2>
        <span className="text-xs text-accent/80">
          {rows.length} quest giver{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1 text-xs text-foreground-muted">
        Quests you can pick up before going in, and who gives them.
      </p>

      <div className="mt-3 overflow-x-auto rounded border border-border/70 bg-background/60">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-semibold uppercase tracking-wide text-accent/80">
              <th className="px-3 py-2">Quests</th>
              <th className="px-3 py-2">Where</th>
              <th className="px-3 py-2">Quest giver</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-border/60 align-top last:border-b-0">
                <td className="px-3 py-2">
                  <div className="flex items-start gap-2">
                    <Image src="/images/icons/available.png" alt="" width={14} height={14} className="mt-1 shrink-0" />
                    <ul className="flex min-w-0 flex-col gap-1">
                      {row.quests.map((quest) => {
                        const href = questDetailHref(quest.id, dungeonId, dungeonName);
                        return (
                          <li key={quest.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {href ? (
                              <Link href={href} className="text-sky-300 hover:text-accent hover:underline">
                                {quest.name}
                              </Link>
                            ) : (
                              <span className="text-foreground">{quest.name}</span>
                            )}
                            {quest.faction && quest.faction !== "Both" && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${FACTION_BADGE_CLASS[quest.faction]}`}
                              >
                                {quest.faction}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </td>
                <td className="px-3 py-2 text-foreground-muted">{row.location}</td>
                <td className="px-3 py-2 font-semibold text-foreground">{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
