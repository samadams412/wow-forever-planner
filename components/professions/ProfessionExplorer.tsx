"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProfessionCategorySidebar from "@/components/professions/ProfessionCategorySidebar";
import ProfessionRecipeSearchInput from "@/components/professions/ProfessionRecipeSearchInput";
import ProfessionRecipeTable from "@/components/professions/ProfessionRecipeTable";
import ProfessionLevelingGuide from "@/components/professions/ProfessionLevelingGuide";
import ProfessionShoppingList from "@/components/professions/ProfessionShoppingList";
import ProfessionMerchantsFavor from "@/components/professions/ProfessionMerchantsFavor";
import ProfessionCamp from "@/components/professions/ProfessionCamp";
import ProfessionNodeList from "@/components/professions/ProfessionNodeList";
import ProfessionGatheringLeveling from "@/components/professions/ProfessionGatheringLeveling";
import ProfessionSmeltingTable from "@/components/professions/ProfessionSmeltingTable";
import { mediumIconUrl } from "@/lib/wow-data";
import type { CampSection, FavorTier, ResolvedRecipe } from "@/lib/profession-recipes";
import type { GatheringCatalog } from "@/lib/gathering-professions";
import type { ResolvedLevelingRank } from "@/lib/profession-utils";

// The profession page itself is fully static (one prerendered page per
// profession, no searchParams read on the server); the view/category/page/q
// URL state is read here, client-side, via useSearchParams. Only THIS
// profession's already-resolved data is passed in -- the server never reads
// the 10MB items catalog at request time. See CLAUDE.md's standing rule.
//
// The Suspense fallback renders the same view with empty params, so the
// prerendered HTML contains the default (Recipes, page 1) content for
// crawlers and no-JS visitors, and a shared ?view=/?category= URL swaps to
// its real state as soon as the client hydrates.

const PAGE_SIZE = 50;

// Small icons next to each tab label -- hotlinked wow.zamimg trade/spell
// icons, same convention as the rest of the site.
const TAB_ICON: Record<string, string> = {
  recipes: "inv_scroll_03",
  leveling: "achievement_level_10",
  favor: "inv_misc_coin_02",
  camp: "spell_fire_fire",
};

export type CraftingProfessionData = {
  id: string;
  categories: string[];
  favorSupported: boolean;
  favor: FavorTier[] | null;
  camp: CampSection | null;
  recipes: ResolvedRecipe[];
  leveling: ResolvedLevelingRank[] | null;
};

function buildRecipesHref(professionId: string, category: string, page: number, query: string): string {
  const usp = new URLSearchParams();
  if (category !== "All") usp.set("category", category);
  if (query) usp.set("q", query);
  if (page > 1) usp.set("page", String(page));
  const qs = usp.toString();
  return qs ? `/reference/professions/${professionId}?${qs}` : `/reference/professions/${professionId}`;
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

function CraftingView({ data, params }: { data: CraftingProfessionData; params: URLSearchParams }) {
  const view = params.get("view");
  const requestedView = view === "leveling" || view === "favor" || view === "camp" ? view : "recipes";
  const activeView = requestedView === "favor" && !data.favorSupported ? "recipes" : requestedView;
  const categoryParam = params.get("category");
  const activeCategory = categoryParam && data.categories.includes(categoryParam) ? categoryParam : "All";
  const query = params.get("q")?.trim() ?? "";
  const searchNeedle = query.toLowerCase();

  const counts: Record<string, number> = {};
  for (const recipe of data.recipes) counts[recipe.category] = (counts[recipe.category] || 0) + 1;

  const categoryRecipes =
    activeCategory === "All" ? data.recipes : data.recipes.filter((r) => r.category === activeCategory);
  const filteredRecipes = searchNeedle
    ? categoryRecipes.filter((recipe) => `${recipe.name} ${recipe.item.name}`.toLowerCase().includes(searchNeedle))
    : categoryRecipes;

  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  const activePage = Math.min(Math.max(1, Number(params.get("page")) || 1), pageCount);
  const pagedRecipes = filteredRecipes.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  const viewLinkClass = (v: string) =>
    `inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
      activeView === v ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
    }`;
  const tabIcon = (v: string) =>
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediumIconUrl(TAB_ICON[v])} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" />;

  return (
    <>
      <div className="mt-4 inline-flex flex-wrap rounded border border-border bg-surface p-0.5 text-xs">
        <Link href={`/reference/professions/${data.id}`} className={viewLinkClass("recipes")}>
          {tabIcon("recipes")}
          Recipes
        </Link>
        <Link href={`/reference/professions/${data.id}?view=leveling`} className={viewLinkClass("leveling")}>
          {tabIcon("leveling")}
          Leveling 1 to 300
        </Link>
        {data.favorSupported && (
          <Link href={`/reference/professions/${data.id}?view=favor`} className={viewLinkClass("favor")}>
            {tabIcon("favor")}
            Merchant&apos;s Favor
          </Link>
        )}
        <Link href={`/reference/professions/${data.id}?view=camp`} className={viewLinkClass("camp")}>
          {tabIcon("camp")}
          Camp, Skill Rewards and Perks
        </Link>
      </div>

      {activeView === "recipes" && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* key: the input keeps its own typing state, so remount it if the URL's q changes underneath it (back/forward) */}
            <ProfessionRecipeSearchInput key={query} initialValue={query} />
            <span className="text-xs text-foreground-muted">
              {query ? `${filteredRecipes.length} recipes found` : `${categoryRecipes.length} recipes`}
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <ProfessionCategorySidebar
              professionId={data.id}
              categories={data.categories}
              counts={counts}
              active={activeCategory}
              query={query}
            />
            <div className="min-w-0 flex-1">
              <ProfessionRecipeTable recipes={pagedRecipes} professionId={data.id} />
              {pageCount > 1 && (
                <nav className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  {activePage > 1 ? (
                    <Link
                      href={buildRecipesHref(data.id, activeCategory, activePage - 1, query)}
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
                      href={buildRecipesHref(data.id, activeCategory, activePage + 1, query)}
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
        </>
      )}

      {activeView === "leveling" &&
        (data.leveling ? (
          <>
            <p className="mt-4 text-xs text-foreground-muted">
              <a href="#items-needed" className="text-accent hover:underline">
                Jump to items needed &darr;
              </a>
            </p>
            <ProfessionLevelingGuide leveling={data.leveling} professionId={data.id} />
            <ProfessionShoppingList leveling={data.leveling} recipes={data.recipes} professionId={data.id} />
          </>
        ) : (
          <ComingSoon label="Leveling 1 to 300" />
        ))}

      {activeView === "favor" &&
        (data.favor ? (
          <ProfessionMerchantsFavor favor={data.favor} professionId={data.id} />
        ) : (
          <ComingSoon label="Merchant's Favor" />
        ))}

      {activeView === "camp" &&
        (data.camp ? (
          <ProfessionCamp camp={data.camp} professionId={data.id} />
        ) : (
          <ComingSoon label="Camp, Skill Rewards and Perks" />
        ))}
    </>
  );
}

function CraftingWithParams({ data }: { data: CraftingProfessionData }) {
  const params = useSearchParams();
  return <CraftingView data={data} params={new URLSearchParams(params.toString())} />;
}

export function CraftingProfessionExplorer({ data }: { data: CraftingProfessionData }) {
  return (
    <Suspense fallback={<CraftingView data={data} params={new URLSearchParams()} />}>
      <CraftingWithParams data={data} />
    </Suspense>
  );
}

// Mining/Herbalism/Skinning: their own shape (see lib/gathering-
// professions.ts's header comment) and only a `view` param.
function GatheringView({ catalog, view }: { catalog: GatheringCatalog; view: string | null }) {
  const tabs: { key: string; label: string }[] = [];
  if (catalog.nodes) tabs.push({ key: "nodes", label: catalog.id === "mining" ? "Ore by Skill" : "Herbs by Skill" });
  if (catalog.leveling) tabs.push({ key: "leveling", label: "Leveling 1 to 300" });
  if (catalog.skin) tabs.push({ key: "skin", label: "What to Skin" });
  if (catalog.smelting) tabs.push({ key: "smelting", label: "Smelting" });
  tabs.push({ key: "camp", label: "Camp, Skill Rewards and Perks" });

  const activeView = tabs.some((t) => t.key === view) ? (view as string) : tabs[0].key;

  const viewLinkClass = (v: string) =>
    `rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
      activeView === v ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
    }`;

  return (
    <>
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
    </>
  );
}

function GatheringWithParams({ catalog }: { catalog: GatheringCatalog }) {
  return <GatheringView catalog={catalog} view={useSearchParams().get("view")} />;
}

export function GatheringProfessionExplorer({ catalog }: { catalog: GatheringCatalog }) {
  return (
    <Suspense fallback={<GatheringView catalog={catalog} view={null} />}>
      <GatheringWithParams catalog={catalog} />
    </Suspense>
  );
}
