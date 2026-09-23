import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import ProfessionCategorySidebar from "@/components/professions/ProfessionCategorySidebar";
import ProfessionRecipeTable from "@/components/professions/ProfessionRecipeTable";
import ProfessionLevelingGuide from "@/components/professions/ProfessionLevelingGuide";
import ProfessionMerchantsFavor from "@/components/professions/ProfessionMerchantsFavor";
import ProfessionCamp from "@/components/professions/ProfessionCamp";
import ProfessionNodeList from "@/components/professions/ProfessionNodeList";
import ProfessionGatheringLeveling from "@/components/professions/ProfessionGatheringLeveling";
import ProfessionSmeltingTable from "@/components/professions/ProfessionSmeltingTable";
import { getProfessionCatalog, getProfessionIds } from "@/lib/profession-recipes";
import { getGatheringCatalog, isGatheringProfessionId, GATHERING_PROFESSION_IDS } from "@/lib/gathering-professions";
import { mediumIconUrl } from "@/lib/wow-data";

// Trade-window icon slugs, the same ones the old profession write-up pages
// used in their frontmatter (verified against those before reusing them --
// "trade_engraving" is genuinely Enchanting's real Blizzard icon slug, not
// a typo). Leatherworking never had a write-up to carry one forward, so
// its slug is the standard one every other WoW reference site uses.
const PROFESSION_ICON: Record<string, string> = {
  alchemy: "trade_alchemy",
  blacksmithing: "trade_blacksmithing",
  cooking: "inv_misc_food_15",
  enchanting: "trade_engraving",
  engineering: "trade_engineering",
  "first-aid": "spell_holy_sealofsacrifice",
  leatherworking: "trade_leatherworking",
  tailoring: "trade_tailoring",
  mining: "trade_mining",
  herbalism: "trade_herbalism",
  skinning: "inv_misc_pelt_wolf_01",
};

// Pagination over a fixed-height inner-scroll region, since pagination
// composes better with the category filter already in place (and any
// future search/filter addition) -- same reasoning /reference/items'
// pagination was built on, whose Previous/Page N of M/Next control this
// mirrors exactly rather than inventing new styling.
const PAGE_SIZE = 50;

function buildRecipesHref(professionId: string, category: string, page: number): string {
  const usp = new URLSearchParams();
  if (category !== "All") usp.set("category", category);
  if (page > 1) usp.set("page", String(page));
  const qs = usp.toString();
  return qs ? `/reference/professions/${professionId}?${qs}` : `/reference/professions/${professionId}`;
}

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
  if (isGatheringProfessionId(profession)) {
    const catalog = getGatheringCatalog(profession);
    if (!catalog) return {};
    return {
      title: catalog.name,
      description: `Every ${catalog.name} node in World of Warcraft: Forever -- the skill it asks, what it yields, and which to work from 1 to 300, sourced from the WoW Forever beta client.`,
    };
  }
  const catalog = getProfessionCatalog(profession);
  if (!catalog) return {};
  return {
    title: catalog.name,
    description: `Every ${catalog.name} recipe in World of Warcraft: Forever -- reagents, trainer or recipe source, and skill-up thresholds, sourced from the WoW Forever beta client.`,
  };
}

export default async function ProfessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ profession: string }>;
  searchParams: Promise<{ category?: string; view?: string; page?: string }>;
}) {
  const { profession } = await params;

  if (isGatheringProfessionId(profession)) {
    const catalog = getGatheringCatalog(profession);
    if (!catalog) notFound();
    const { view } = await searchParams;
    return <GatheringProfessionPage catalog={catalog} view={view} />;
  }

  const catalog = getProfessionCatalog(profession);
  if (!catalog) notFound();

  const { category, view, page: pageParam } = await searchParams;
  const activeView = view === "leveling" || view === "favor" || view === "camp" ? view : "recipes";
  const activeCategory = category && catalog.categories.includes(category) ? category : "All";

  const counts: Record<string, number> = {};
  for (const recipe of catalog.recipes) counts[recipe.category] = (counts[recipe.category] || 0) + 1;

  const filteredRecipes =
    activeCategory === "All" ? catalog.recipes : catalog.recipes.filter((r) => r.category === activeCategory);

  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  const activePage = Math.min(Math.max(1, Number(pageParam) || 1), pageCount);
  const pagedRecipes = filteredRecipes.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  const icon = PROFESSION_ICON[catalog.id];

  const viewLinkClass = (v: string) =>
    `rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
      activeView === v ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
    }`;

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
      <p className="mt-2 text-sm text-foreground-muted">{catalog.recipes.length} recipes</p>

      <div className="mt-4 inline-flex rounded border border-border bg-surface p-0.5 text-xs">
        <Link href={`/reference/professions/${catalog.id}`} className={viewLinkClass("recipes")}>
          Recipes
        </Link>
        <Link href={`/reference/professions/${catalog.id}?view=leveling`} className={viewLinkClass("leveling")}>
          Leveling 1 to 300
        </Link>
        <Link href={`/reference/professions/${catalog.id}?view=favor`} className={viewLinkClass("favor")}>
          Merchant&apos;s Favor
        </Link>
        <Link href={`/reference/professions/${catalog.id}?view=camp`} className={viewLinkClass("camp")}>
          Camp, Skill Rewards and Perks
        </Link>
      </div>

      {activeView === "recipes" && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <ProfessionCategorySidebar
            professionId={catalog.id}
            categories={catalog.categories}
            counts={counts}
            active={activeCategory}
          />
          <div className="min-w-0 flex-1">
            <ProfessionRecipeTable recipes={pagedRecipes} professionId={catalog.id} />
            {pageCount > 1 && (
              <nav className="mt-4 flex items-center justify-between border-t border-border pt-4">
                {activePage > 1 ? (
                  <Link
                    href={buildRecipesHref(catalog.id, activeCategory, activePage - 1)}
                    className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
                  >
                    &larr; Previous
                  </Link>
                ) : (
                  <div />
                )}
                <span className="text-xs text-foreground-muted">
                  Page <strong className="text-foreground">{activePage}</strong> of {pageCount}
                </span>
                {activePage < pageCount ? (
                  <Link
                    href={buildRecipesHref(catalog.id, activeCategory, activePage + 1)}
                    className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
                  >
                    Next &rarr;
                  </Link>
                ) : (
                  <div />
                )}
              </nav>
            )}
          </div>
        </div>
      )}

      {activeView === "leveling" &&
        (catalog.leveling ? (
          <ProfessionLevelingGuide leveling={catalog.leveling} professionId={catalog.id} />
        ) : (
          <ComingSoon label="Leveling 1 to 300" />
        ))}

      {activeView === "favor" &&
        (catalog.favor ? (
          <ProfessionMerchantsFavor favor={catalog.favor} professionId={catalog.id} />
        ) : (
          <ComingSoon label="Merchant's Favor" />
        ))}

      {activeView === "camp" &&
        (catalog.camp ? (
          <ProfessionCamp camp={catalog.camp} professionId={catalog.id} />
        ) : (
          <ComingSoon label="Camp, Skill Rewards and Perks" />
        ))}
    </main>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-6 text-center">
      <p className="text-sm text-foreground-muted">
        {label} for this profession is coming soon -- this data hasn&apos;t been put together yet. The recipe
        list and category filter above already work for every profession.
      </p>
    </div>
  );
}

// Mining/Herbalism/Skinning are genuinely a different shape from the 8
// crafting professions above -- no reagent-based recipes, no category
// sidebar, no Merchant's Favor, no Legacy-point milestone track (confirmed
// live against all 3 before assuming otherwise; see lib/gathering-
// professions.ts's header comment) -- so this is its own render path, not
// a branch squeezed into the crafting one above. Skinning has no separate
// "nodes" chapter at all: its single "skin" list doubles as both.
async function GatheringProfessionPage({
  catalog,
  view,
}: {
  catalog: NonNullable<ReturnType<typeof getGatheringCatalog>>;
  view?: string;
}) {
  const tabs: { key: string; label: string }[] = [];
  if (catalog.nodes) tabs.push({ key: "nodes", label: catalog.id === "mining" ? "Ore by Skill" : "Herbs by Skill" });
  if (catalog.leveling) tabs.push({ key: "leveling", label: "Leveling 1 to 300" });
  if (catalog.skin) tabs.push({ key: "skin", label: "What to Skin" });
  if (catalog.smelting) tabs.push({ key: "smelting", label: "Smelting" });
  tabs.push({ key: "camp", label: "Camp, Skill Rewards and Perks" });

  const activeView = tabs.some((t) => t.key === view) ? (view as string) : tabs[0].key;
  const icon = PROFESSION_ICON[catalog.id];

  const viewLinkClass = (v: string) =>
    `rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
      activeView === v ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
    }`;

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

      <div className="mt-4 inline-flex flex-wrap rounded border border-border bg-surface p-0.5 text-xs">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === tabs[0].key ? `/reference/professions/${catalog.id}` : `/reference/professions/${catalog.id}?view=${tab.key}`}
            className={viewLinkClass(tab.key)}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeView === "nodes" && catalog.nodes && <ProfessionNodeList nodes={catalog.nodes} professionId={catalog.id} />}
      {activeView === "leveling" && catalog.leveling && (
        <ProfessionGatheringLeveling steps={catalog.leveling} professionId={catalog.id} />
      )}
      {activeView === "skin" && catalog.skin && <ProfessionGatheringLeveling steps={catalog.skin} professionId={catalog.id} />}
      {activeView === "smelting" && catalog.smelting && (
        <ProfessionSmeltingTable recipes={catalog.smelting} professionId={catalog.id} />
      )}
      {activeView === "camp" &&
        (catalog.camp ? (
          <ProfessionCamp camp={catalog.camp} professionId={catalog.id} />
        ) : (
          <ComingSoon label="Camp, Skill Rewards and Perks" />
        ))}
    </main>
  );
}
