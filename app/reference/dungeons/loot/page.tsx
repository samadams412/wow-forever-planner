import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { getDungeonLootIndex } from "@/lib/dungeon-loot";

export const metadata: Metadata = {
  title: "Dungeon Loot Tables",
  description: "Boss-by-boss loot, item stats, and quests for every World of Warcraft: Forever dungeon.",
};

const FACTION_BADGE_CLASS: Record<"Alliance" | "Horde", string> = {
  Alliance: "bg-sky-500/15 text-sky-300",
  Horde: "bg-red-500/15 text-red-400",
};

export default function DungeonLootIndexPage() {
  const rows = getDungeonLootIndex();

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Dungeon Loot" }]} />

      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Dungeon Loot Tables</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Boss-by-boss loot for every dungeon, sorted by level. Click a dungeon for its full breakdown,
        including item stats and quests. Most item data is read from the beta client; each dungeon page
        says exactly which source its data comes from.
      </p>

      <div className="scrollbar-gold mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-xs uppercase tracking-wide text-foreground-muted">
              <th className="px-3 py-2 font-medium">Dungeon</th>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Bosses</th>
              <th className="px-3 py-2 font-medium">Quests</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.id}
                className="border-b border-border/60 last:border-b-0 hover:bg-surface-hover"
                style={
                  d.backgroundImage
                    ? {
                        backgroundImage: `linear-gradient(to right, rgba(13,11,7,0.94) 0%, rgba(13,11,7,0.8) 55%, rgba(13,11,7,0.55) 100%), url(${d.backgroundImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/reference/dungeons/loot/${d.id}`}
                    className="hero-text-accent font-medium [text-shadow:0_1px_2px_rgba(0,0,0,0.8)] hover:underline"
                  >
                    {d.name}
                  </Link>
                  {d.faction && (
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${FACTION_BADGE_CLASS[d.faction as "Alliance" | "Horde"]}`}
                    >
                      {d.faction}
                    </span>
                  )}
                </td>
                <td className="hero-text-muted whitespace-nowrap px-3 py-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                  {d.levelMin}-{d.levelMax}
                </td>
                <td className="hero-text-muted px-3 py-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">{d.bossCount}</td>
                <td className="hero-text-muted px-3 py-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                  {d.questCount || "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
