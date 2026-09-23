import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import ProfessionCategorySidebar from "@/components/professions/ProfessionCategorySidebar";
import ProfessionRecipeTable from "@/components/professions/ProfessionRecipeTable";
import ProfessionLevelingGuide from "@/components/professions/ProfessionLevelingGuide";
import ProfessionMerchantsFavor from "@/components/professions/ProfessionMerchantsFavor";
import { getProfessionCatalog, getProfessionIds } from "@/lib/profession-recipes";
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
};

export function generateStaticParams() {
  return getProfessionIds().map((profession) => ({ profession }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ profession: string }>;
}): Promise<Metadata> {
  const { profession } = await params;
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
  searchParams: Promise<{ category?: string; view?: string }>;
}) {
  const { profession } = await params;
  const catalog = getProfessionCatalog(profession);
  if (!catalog) notFound();

  const { category, view } = await searchParams;
  const activeView = view === "leveling" || view === "favor" ? view : "recipes";
  const activeCategory = category && catalog.categories.includes(category) ? category : "All";

  const counts: Record<string, number> = {};
  for (const recipe of catalog.recipes) counts[recipe.category] = (counts[recipe.category] || 0) + 1;

  const filteredRecipes =
    activeCategory === "All" ? catalog.recipes : catalog.recipes.filter((r) => r.category === activeCategory);

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
            <ProfessionRecipeTable recipes={filteredRecipes} professionId={catalog.id} />
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
