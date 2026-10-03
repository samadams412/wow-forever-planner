import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import QuestJournal from "@/components/reference/QuestJournal";
import QuestMap from "@/components/reference/QuestMap";
import QuestInfo from "@/components/reference/QuestInfo";
import QuestChain from "@/components/reference/QuestChain";
import { getAllQuestIds, type QuestTextSource } from "@/lib/quests";
import { getQuestById } from "@/lib/quest-detail";

// Statically generated: every quest in the build-time index is prerendered, and
// no other id is served (dynamicParams = false). The detail shards are read at
// build time, so no request-time function needs the shard directory.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllQuestIds().map((id) => ({ questId: String(id) }));
}

// Attribution for the narrative text's upstream. Text pulled from the
// foreverchanges detail scrape is credited to the two sources it itself
// draws from (cMaNGOS and Wowhead), never to the aggregator.
const SOURCE_LINKS = {
  cmangos: { href: "https://github.com/cmangos/classic-db", label: "https://github.com/cmangos/classic-db" },
  wowhead: { href: "https://www.wowhead.com/forever", label: "Wowhead's Forever database" },
} as const;

const NARRATIVE_CREDITS: Record<QuestTextSource, (keyof typeof SOURCE_LINKS)[]> = {
  cmangos: ["cmangos"],
  wowhead: ["wowhead"],
  foreverchanges: ["cmangos", "wowhead"],
};

// Start ("!") and turn-in ("?") pins on the zone map -- the same classic quest-log
// icons QuestInfo and the journal already use.
const QUEST_MAP_MARKER_ICON = {
  start: "/images/icons/available.png",
  end: "/images/icons/complete.png",
} as const;

function parseQuestId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ questId: string }>;
}): Promise<Metadata> {
  const { questId } = await params;
  const id = parseQuestId(questId);
  const quest = id !== null ? getQuestById(id) : null;
  if (!quest) return {};
  return {
    title: quest.name,
    description: `${quest.name} -- quest details for World of Warcraft: Forever, including description, objectives, and rewards.`,
  };
}

export default async function QuestDetailPage({
  params,
}: {
  params: Promise<{ questId: string }>;
}) {
  const { questId } = await params;
  const id = parseQuestId(questId);
  // A malformed id (non-numeric) is a true 404. A well-formed id with no index
  // entry shows a friendly "not yet available" state rather than a hard 404.
  if (id === null) notFound();
  const quest = getQuestById(id);

  // The back link reads ?from= on the client (QuestBackLink), keeping this page static.
  const backHref = "/reference/quests";
  const backLabel = "Quests";

  if (!quest) {
    return (
      <main className="mx-auto w-full max-w-2xl px-3 py-8 sm:px-4">
        <Breadcrumbs
          items={[
            { label: "Reference", href: "/reference" },
            { label: "Quests", href: "/reference/quests" },
            { label: "Quest details not yet found" },
          ]}
        />
        <div className="mt-4 rounded-lg border border-border bg-surface p-6 text-center">
          <h1 className="font-heading text-lg font-semibold text-foreground">Quest details not yet found</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            This quest hasn&apos;t been pulled into the reference catalog yet -- check back as the beta continues.
          </p>
          <a href={backHref} className="mt-4 inline-block text-sm text-accent hover:underline">
            Back to {backLabel}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[
          { label: "Reference", href: "/reference" },
          { label: "Quests", href: "/reference/quests" },
          { label: quest.name, truncate: true },
        ]}
      />

      {/* Desktop: journal on the left, map above quest info on the right.
          Mobile: the same order, stacked. */}
      <div className="mt-4 flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_418px] lg:items-start">
        <div className="min-w-0">
          <QuestJournal quest={quest} backHref={backHref} backLabel={backLabel} />
        </div>
        <aside className="flex flex-col gap-4">
          {quest.mapGroups.length > 0 && (
            <QuestMap groups={quest.mapGroups} questName={quest.name} markerIcon={QUEST_MAP_MARKER_ICON} />
          )}
          <QuestInfo quest={quest} />
        </aside>
      </div>

      {quest.chain && (
        <div className="mt-4">
          <QuestChain quest={quest} />
        </div>
      )}

      <p className="mt-4 text-xs text-foreground-muted">
        {quest.narrativeSource && (
          <>
            Quest text sourced from{" "}
            {NARRATIVE_CREDITS[quest.narrativeSource].map((key, i) => (
              <span key={key}>
                {i > 0 && " and "}
                <a
                  href={SOURCE_LINKS[key].href}
                  className="underline hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {SOURCE_LINKS[key].label}
                </a>
              </span>
            ))}
            .{" "}
          </>
        )}
        Quest text &copy; Blizzard Entertainment.
      </p>
    </main>
  );
}
