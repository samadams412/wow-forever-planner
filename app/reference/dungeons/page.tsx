import type { Metadata } from "next";
import Link from "next/link";
import DungeonsTimeline from "@/components/reference/DungeonsTimeline";
import { dungeons } from "@/lib/dungeons";

export const metadata: Metadata = {
  title: "Dungeon Level Ranges",
  description:
    "Every World of Warcraft: Forever dungeon on one level-range timeline -- the 9 new launch dungeons alongside all of Classic's, with details on the new ones.",
};

export default function DungeonsPage() {
  const newDungeons = dungeons.filter((d) => d.type === "new");

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4">
      <p className="text-xs text-foreground-muted">
        <Link href="/reference" className="hover:text-foreground hover:underline">
          Reference
        </Link>{" "}
        / Dungeon Level Ranges
      </p>
      <h1 className="mt-1 font-heading text-2xl font-semibold tracking-wide text-accent">
        Dungeon Level Ranges
      </h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Forever launches with {newDungeons.length} new dungeons alongside every dungeon Classic already had --{" "}
        {dungeons.length} in total. The timeline below places all of them on one level-range scale, in the same
        stacked-row layout the community&apos;s own reference charts use. Click any gold &quot;New&quot; dungeon
        for what&apos;s known about it so far; hover any dungeon for its full name and level range.
      </p>

      <div className="mt-6">
        <DungeonsTimeline />
      </div>

      <p className="mt-4 text-[11px] text-foreground-muted/70">
        New-dungeon level ranges and details: Wowhead&apos;s{" "}
        <a
          href="https://www.wowhead.com/forever/guide/dungeons-overview-locations-details"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground-muted hover:underline"
        >
          Dungeons Overview for Forever
        </a>{" "}
        guide. Classic dungeon level ranges cross-referenced against the community&apos;s own
        level-range chart.
      </p>
    </main>
  );
}
