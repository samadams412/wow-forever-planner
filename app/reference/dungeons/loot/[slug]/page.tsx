import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import LootDisclaimer from "@/components/reference/LootDisclaimer";
import BossCard from "@/components/reference/BossCard";
import LootQuestRewardsCard from "@/components/reference/LootQuestRewardsCard";
import { ItemLinkSourceProvider } from "@/components/reference/ItemLinkSource";
import DungeonLootSidebar from "@/components/reference/DungeonLootSidebar";
import DungeonStickyNav from "@/components/reference/DungeonStickyNav";
import QuestGiversTable, { hasKnownStart } from "@/components/reference/QuestGiversTable";
import type { JumpNavEntry } from "@/components/reference/DungeonJumpNav";
import { getDungeonLootIndex, getDungeonWithLoot, getDungeonMapImage, getDungeonMapLegend, getDungeonMapAttribution } from "@/lib/dungeon-loot";
import { formatRosterCounts, isNamedBoss, rosterCounts } from "@/lib/dungeon-roster";
import { getEntranceMapHref } from "@/lib/map-entrances";

export function generateStaticParams() {
  return getDungeonLootIndex().map((d) => ({ slug: d.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getDungeonWithLoot(slug);
  if (!entry) return {};
  return {
    title: `${entry.dungeon.name} Loot Table`,
    description: `Bosses, loot and quests for ${entry.dungeon.name} (Level ${entry.dungeon.levelMin}-${entry.dungeon.levelMax}).`,
  };
}

export default async function DungeonLootDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDungeonWithLoot(slug);
  if (!entry) notFound();

  const { dungeon, data } = entry;
  const totalItems = data.bosses.reduce((n, b) => n + b.items.length, 0);
  // Null for dungeons with no client-placed entrance yet (most new-in-Forever
  // ones) -- the link is simply omitted rather than pointing at nothing.
  const mapHref = getEntranceMapHref(dungeon.id);
  const mapImage = getDungeonMapImage(dungeon.id);
  const mapLegend = getDungeonMapLegend(dungeon.id);
  const mapAttribution = getDungeonMapAttribution(dungeon.id);

  // Roster = regular bosses + rare spawns only. Trash groups and lootable
  // objects still render their drops below the roster, but not in the count
  // or the "On this page" nav. Anchors keep their original data.bosses index.
  const counts = rosterCounts(data.bosses);
  const otherLootGroups = data.bosses.map((boss, i) => ({ boss, i })).filter(({ boss }) => !isNamedBoss(boss));
  const jumpNavEntries: JumpNavEntry[] = [
    ...data.bosses.flatMap((boss, i) =>
      isNamedBoss(boss) ? [{ id: `boss-${i}`, label: boss.name, portraitUrl: boss.portraitUrl, rare: boss.kind === "rare" }] : [],
    ),
    ...(data.quests.length > 0
      ? [{ id: "quests", label: "Quests", iconSrc: "/images/icons/available.png" }]
      : []),
  ];
  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[
          { label: "Reference", href: "/reference" },
          { label: "Dungeon Loot", href: "/reference/dungeons/loot" },
          { label: dungeon.name, truncate: true },
        ]}
      />

      {/* Header art beside the title, borderless. The image sets its own height from
          its natural ratio (width/height attrs are the source's 960px class, h-auto
          wins once loaded), so nothing is cropped whatever the source's 1.77-1.83:1
          ratio. On wide screens it fades into the page on its trailing (right) edge
          using the page background token itself, so the blend is exact in both
          themes; on narrow screens it's full-width and the fade is off. */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {data.backgroundImage && (
          <div className="relative w-full shrink-0 sm:w-[560px]">
            <Image
              src={data.backgroundImage}
              alt=""
              width={960}
              height={540}
              sizes="(min-width: 640px) 560px, 100vw"
              className="block h-auto w-full"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 hidden sm:block"
              style={{ backgroundImage: "linear-gradient(to right, transparent 60%, var(--background) 100%)" }}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{dungeon.name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground-muted">
                Level {dungeon.levelMin}-{dungeon.levelMax}
              </span>
              {mapHref && (
                <Link
                  href={mapHref}
                  className="inline-flex items-center gap-1.5 rounded border border-accent/60 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  View entrance on map
                </Link>
              )}
            </div>
          </div>
          {dungeon.zone && <p className="mt-0.5 text-xs text-foreground-muted">{dungeon.zone}</p>}
          {dungeon.description && (
            <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">{dungeon.description}</p>
          )}
        </div>
      </div>

      <DungeonStickyNav hasQuests={data.quests.length > 0} hasQuestGivers={data.quests.some(hasKnownStart)} />

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <ItemLinkSourceProvider from={`/reference/dungeons/loot/${dungeon.id}`} fromLabel={dungeon.name}>
            {data.bosses.length === 0 ? (
              <p id="bosses" className="scroll-mt-20 text-sm text-foreground-muted">
                Bosses and loot for this dungeon haven&apos;t been discovered yet -- check back as the beta
                continues.
              </p>
            ) : (
              <div id="bosses" className="scroll-mt-20 flex flex-col gap-3">
                <p className="text-xs text-foreground-muted">
                  {formatRosterCounts(counts)}, {totalItems} item
                  {totalItems === 1 ? "" : "s"}
                </p>
                {data.bosses.map((boss, i) =>
                  isNamedBoss(boss) ? (
                    <BossCard key={`${boss.name}-${i}`} boss={boss} dungeonId={dungeon.id} anchorId={`boss-${i}`} />
                  ) : null,
                )}
                {otherLootGroups.map(({ boss, i }) => (
                  <BossCard key={`${boss.name}-${i}`} boss={boss} dungeonId={dungeon.id} anchorId={`boss-${i}`} />
                ))}
              </div>
            )}

            {data.quests.length > 0 && (
              <div id="quests" className="mt-3 scroll-mt-20 flex flex-col gap-3">
                {data.questSource && data.questSource !== data.bossLootSource && (
                  <LootDisclaimer source={data.questSource} dungeonType={dungeon.type} />
                )}
                <LootQuestRewardsCard quests={data.quests} dungeonId={dungeon.id} dungeonName={dungeon.name} />
              </div>
            )}

            {totalItems > 0 && (
              <div className="mt-4">
                <LootDisclaimer source={data.bossLootSource} dungeonType={dungeon.type} />
              </div>
            )}
          </ItemLinkSourceProvider>
        </div>

        <DungeonLootSidebar
          levelMin={dungeon.levelMin}
          levelMax={dungeon.levelMax}
          zone={dungeon.zone}
          bossCount={counts.bosses}
          rareCount={counts.rares}
          itemCount={totalItems}
          jumpNavEntries={jumpNavEntries}
          mapImage={mapImage}
          mapAttribution={mapAttribution}
          mapLegend={mapLegend}
          pinMap={data.pinMap}
          dungeonName={dungeon.name}
          authorNotes={data.authorNotes}
        />
      </div>

      <div className="mt-8">
        <QuestGiversTable quests={data.quests} dungeonId={dungeon.id} dungeonName={dungeon.name} />
      </div>
    </main>
  );
}
