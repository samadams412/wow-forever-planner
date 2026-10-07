import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import {
  CraftingProfessionExplorer,
  GatheringProfessionExplorer,
} from "@/components/professions/ProfessionExplorer";
import ProfessionCrossLinks from "@/components/professions/ProfessionCrossLinks";
import { ItemLinkSourceProvider } from "@/components/reference/ItemLinkSource";
import { getProfessionCatalog, getProfessionIds } from "@/lib/profession-recipes";
import { resolveLeveling, resolveProfessionRecipes } from "@/lib/profession-utils";
import { getGatheringCatalog, isGatheringProfessionId, GATHERING_PROFESSION_IDS } from "@/lib/gathering-professions";
import { mediumIconUrl } from "@/lib/wow-data";
import { PROFESSION_ICON } from "@/lib/profession-icons";

// Fully static: one prerendered page per profession, no searchParams read
// here. This page resolves ONLY its own profession's recipes/leveling
// against the item catalog at build time and hands them to a client
// explorer, which does the view/category/page/q filtering from the URL
// (useSearchParams). So no function runs per request, and the browser gets
// just this profession's slice -- never the full items catalog.

export function generateStaticParams() {
  return [...getProfessionIds(), ...GATHERING_PROFESSION_IDS].map((profession) => ({ profession }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ profession: string }>;
}): Promise<Metadata> {
  const { profession } = await params;
  // Every ?view=/?category=/?page= combination on this route shares the
  // same title/description below -- canonicalize to the bare profession URL
  // so those don't split ranking signal across near-duplicate permutations
  // (same reasoning as /reference/items' own canonical).
  const canonical = `/reference/professions/${profession}`;
  if (isGatheringProfessionId(profession)) {
    const catalog = getGatheringCatalog(profession);
    if (!catalog) return {};
    return {
      title: catalog.name,
      description: `Every ${catalog.name} node in World of Warcraft: Forever -- the skill it asks, what it yields, and which to work from 1 to 300, sourced from the WoW Forever beta client.`,
      alternates: { canonical },
    };
  }
  const catalog = getProfessionCatalog(profession);
  if (!catalog) return {};
  return {
    title: catalog.name,
    description: `Every ${catalog.name} recipe in World of Warcraft: Forever -- reagents, trainer or recipe source, and skill-up thresholds, sourced from the WoW Forever beta client.`,
    alternates: { canonical },
  };
}

export default async function ProfessionPage({ params }: { params: Promise<{ profession: string }> }) {
  const { profession } = await params;

  const gathering = isGatheringProfessionId(profession) ? getGatheringCatalog(profession) : undefined;
  const crafting = gathering ? undefined : getProfessionCatalog(profession);
  const catalog = gathering ?? crafting;
  if (!catalog) notFound();

  const icon = PROFESSION_ICON[catalog.id];

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4">
      <Breadcrumbs
        items={[
          { label: "Reference", href: "/reference" },
          { label: "Professions", href: "/reference/professions" },
          { label: catalog.name },
        ]}
      />

      <div className="flex items-center gap-3">
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediumIconUrl(icon)} alt="" className="h-10 w-10 rounded border border-border" />
        )}
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{catalog.name}</h1>
      </div>
      {crafting && <p className="mt-2 text-sm text-foreground-muted">{crafting.recipes.length} recipes</p>}

      <ItemLinkSourceProvider from={`/reference/professions/${profession}`} fromLabel={catalog.name}>
        {gathering && <GatheringProfessionExplorer catalog={gathering} />}
        {crafting && (
          <CraftingProfessionExplorer
            data={{
              id: crafting.id,
              name: crafting.name,
              categories: crafting.categories,
              favorSupported: crafting.favorSupported,
              favor: crafting.favor,
              camp: crafting.camp,
              recipes: resolveProfessionRecipes(crafting.recipes),
              leveling: crafting.leveling ? resolveLeveling(crafting.leveling) : null,
            }}
          />
        )}
      </ItemLinkSourceProvider>

      <ProfessionCrossLinks activeId={catalog.id} />
    </main>
  );
}
