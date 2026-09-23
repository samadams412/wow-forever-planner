import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import LootDisclaimer from "@/components/reference/LootDisclaimer";
import LootBossCard from "@/components/reference/LootBossCard";
import LootQuestRewardsCard from "@/components/reference/LootQuestRewardsCard";
import { getDungeonLootIndex, getDungeonWithLoot } from "@/lib/dungeon-loot";

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

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
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
        <span className="text-sm text-foreground-muted">
          Level {dungeon.levelMin}-{dungeon.levelMax}
        </span>
      </div>
      {dungeon.zone && <p className="mt-0.5 text-xs text-foreground-muted">{dungeon.zone}</p>}
      {dungeon.description && (
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">{dungeon.description}</p>
      )}

    

      {data.bosses.length === 0 ? (
        <p className="mt-6 text-sm text-foreground-muted">
          Bosses and loot for this dungeon haven&apos;t been discovered yet -- check back as the beta
          continues.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-xs text-foreground-muted">
            {data.bosses.length} boss{data.bosses.length === 1 ? "" : "es"}, {totalItems} item
            {totalItems === 1 ? "" : "s"}
          </p>
          {data.bosses.map((boss, i) => (
            <LootBossCard key={`${boss.name}-${i}`} boss={boss} dungeonId={dungeon.id} />
          ))}
        </div>
      )}

      {data.quests.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {data.questSource && data.questSource !== data.bossLootSource && (
            <LootDisclaimer source={data.questSource} dungeonType={dungeon.type} />
          )}
          <LootQuestRewardsCard quests={data.quests} dungeonId={dungeon.id} />
        </div>
      )}

        {data.bosses.length > 0 && (
        <div className="mt-4">
          <LootDisclaimer source={data.bossLootSource} dungeonType={dungeon.type} />
        </div>
      )}
    </main>
  );
}
