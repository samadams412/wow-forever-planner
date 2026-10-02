import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import QuestJournal from "@/components/reference/QuestJournal";
import { getQuestById } from "@/lib/quests";

// Not statically generated -- same reasoning as app/items/[itemId]/page.tsx:
// 5,049 quests built up front for a page most visitors reach one at a time
// (from the quest listing). getQuestById reads through lib/quests.ts's own
// module-level cache, so each render after the first is a Map lookup.

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
  searchParams,
}: {
  params: Promise<{ questId: string }>;
  searchParams: Promise<{ from?: string; fromLabel?: string }>;
}) {
  const { questId } = await params;
  const id = parseQuestId(questId);
  const quest = id !== null ? getQuestById(id) : null;
  if (!quest) notFound();

  const { from, fromLabel } = await searchParams;
  // Only trust an internal path -- `from` is attacker-controlled query input,
  // same guard as app/items/[itemId]/page.tsx.
  const backHref = from && from.startsWith("/") && !from.startsWith("//") ? from : "/reference/quests";
  const backLabel = from && fromLabel ? fromLabel : "Quests";

  return (
    <main className="mx-auto w-full max-w-2xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[
          { label: "Reference", href: "/reference" },
          { label: "Quests", href: "/reference/quests" },
          { label: quest.name, truncate: true },
        ]}
      />

      <QuestJournal quest={quest} backHref={backHref} backLabel={backLabel} />

      <p className="mt-4 text-xs text-foreground-muted">
        {quest.narrativeSource && (
          <>
            Quest text sourced from{" "}
            <a
              href={quest.narrativeSource === "cmangos" ? "https://github.com/cmangos/classic-db" : "https://www.wowhead.com/forever"}
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              {quest.narrativeSource === "cmangos" ? "https://github.com/cmangos/classic-db" : "Wowhead's Forever database"}
            </a>
            .{" "}
          </>
        )}
        Quest text &copy; Blizzard Entertainment.
      </p>
    </main>
  );
}
