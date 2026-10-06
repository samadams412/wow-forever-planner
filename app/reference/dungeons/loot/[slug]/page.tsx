import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import LootDisclaimer from "@/components/reference/LootDisclaimer";
import BossWithCallout from "@/components/reference/BossWithCallout";
import LootQuestRewardsCard from "@/components/reference/LootQuestRewardsCard";
import { ItemLinkSourceProvider } from "@/components/reference/ItemLinkSource";
import DungeonLootSidebar from "@/components/reference/DungeonLootSidebar";
import DungeonStickyNav from "@/components/reference/DungeonStickyNav";
import type { JumpNavEntry } from "@/components/reference/DungeonJumpNav";
import { getDungeonLootIndex, getDungeonWithLoot, getDungeonMapImage, getDungeonMapLegend, getDungeonMapAttribution } from "@/lib/dungeon-loot";
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

  const jumpNavEntries: JumpNavEntry[] = [
    ...data.bosses.map((boss, i) => ({ id: `boss-${i}`, label: boss.name, portraitUrl: boss.portraitUrl })),
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

      {data.backgroundImage && (
        <div className="relative mt-3 h-32 w-full overflow-hidden rounded-lg border border-border sm:h-40">
          <Image src={data.backgroundImage} alt="" fill sizes="768px" style={{ objectFit: "cover" }} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: "linear-gradient(to top, rgba(13,11,7,0.9) 0%, transparent 60%)" }}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
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

      <DungeonStickyNav hasQuests={data.quests.length > 0} />

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
                  {data.bosses.length} boss{data.bosses.length === 1 ? "" : "es"}, {totalItems} item
                  {totalItems === 1 ? "" : "s"}
                </p>
                {data.bosses.map((boss, i) => (
                  <BossWithCallout key={`${boss.name}-${i}`} boss={boss} dungeonId={dungeon.id} anchorId={`boss-${i}`} />
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
          bossCount={data.bosses.length}
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
    </main>
  );
}
