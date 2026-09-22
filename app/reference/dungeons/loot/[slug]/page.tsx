import type { Metadata } from "next";
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
    description: `Boss-by-boss loot for ${entry.dungeon.name} (Level ${entry.dungeon.levelMin}-${entry.dungeon.levelMax}), community-sourced from wowtbc.gg.`,
  };
}

export default async function DungeonLootDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = getDungeonWithLoot(slug);
  if (!entry) notFound();

  const { dungeon, loot } = entry;

  return (
    <main className="mx-auto w-full max-w-3xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[
          { label: "Reference", href: "/reference" },
          { label: "Dungeon Loot", href: "/reference/dungeons/loot" },
          { label: dungeon.name, truncate: true },
        ]}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{dungeon.name}</h1>
        <span className="text-sm text-foreground-muted">
          Level {dungeon.levelMin}-{dungeon.levelMax}
        </span>
      </div>
      {dungeon.zone && <p className="mt-0.5 text-xs text-foreground-muted">{dungeon.zone}</p>}

      <div className="mt-4">
        <LootDisclaimer />
      </div>

      {loot.bosses.length === 0 ? (
        <p className="mt-6 text-sm text-foreground-muted">
          Bosses and loot for this dungeon haven&apos;t been discovered by the community yet -- check back
          as the beta continues.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {loot.bosses.map((boss, i) => (
            <LootBossCard key={`${boss.name}-${i}`} boss={boss} />
          ))}
        </div>
      )}

      {loot.questRewards.length > 0 && (
        <div className="mt-3">
          <LootQuestRewardsCard questRewards={loot.questRewards} />
        </div>
      )}
    </main>
  );
}
