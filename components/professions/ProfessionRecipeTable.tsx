import LootItemPill from "@/components/reference/LootItemPill";
import ProfessionSkillColors from "@/components/professions/ProfessionSkillColors";
import type { Recipe } from "@/lib/profession-recipes";

// Matches wowtbc.gg's own "Leveling Guide" recipe table layout (Rank / Name
// / Materials / Source / Level Up columns) -- studied live via
// wowtbc.gg/warcraftforever/professions/cooking/ -- rebuilt in this site's
// own theme rather than copied markup. Every item (the crafted result and
// each reagent) renders through the shared LootItemPill, same as every
// other item-rendering surface on the site (see Part A), so hovering any
// icon here gets the exact same full tooltip, and clicking a linked one
// goes to its /items/[itemId] page.
export default function ProfessionRecipeTable({ recipes, professionId }: { recipes: Recipe[]; professionId: string }) {
  if (recipes.length === 0) {
    return <p className="mt-4 text-sm text-foreground-muted">No recipes in this category.</p>;
  }

  return (
    <>
      {/* Desktop: the RANK/NAME/MATERIALS/SOURCE/LEVEL UP table, unchanged.
          Hidden below `sm` in favor of the card list, since the 5-column
          layout doesn't fit a mobile viewport without horizontal scroll. */}
      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-foreground-muted">
              <th className="px-3 py-2 font-semibold">Rank</th>
              <th className="px-3 py-2 font-semibold">Name</th>
              <th className="px-3 py-2 font-semibold">Materials</th>
              <th className="px-3 py-2 font-semibold">Source</th>
              <th className="px-3 py-2 font-semibold">Level Up</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe, i) => (
              <tr key={`${recipe.name}-${i}`} className="border-b border-border/60 last:border-b-0 even:bg-surface/40">
                <td className="px-3 py-1.5 text-foreground-muted">{recipe.rank}</td>
                <td className="px-3 py-1.5">
                  <LootItemPill
                    item={recipe.item}
                    tooltipId={`prof:${professionId}:${i}:item`}
                    context="catalog"
                    qty={recipe.makesQty ?? undefined}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {recipe.reagents.map((reagent, j) => (
                      <LootItemPill
                        key={j}
                        item={reagent.item}
                        tooltipId={`prof:${professionId}:${i}:reagent:${j}`}
                        context="catalog"
                        qty={reagent.qty}
                        iconOnly
                      />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-foreground-muted">{recipe.source}</td>
                <td className="px-3 py-1.5">
                  <ProfessionSkillColors skills={recipe.skills} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per recipe, the same information restructured
          vertically (name+icon prominent, rank/materials/source/level-up as
          stacked labeled rows) instead of squeezed into table columns.
          Separate tooltipIds from the desktop table's own pills above --
          both are in the DOM at once (one hidden via CSS, not unmounted),
          and the active-tooltip store keys off tooltipId alone. */}
      <div className="mt-4 flex flex-col gap-3 sm:hidden">
        {recipes.map((recipe, i) => (
          <div key={`${recipe.name}-${i}-card`} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <LootItemPill
                item={recipe.item}
                tooltipId={`prof:${professionId}:${i}:item-m`}
                context="catalog"
                qty={recipe.makesQty ?? undefined}
              />
              <span className="shrink-0 text-[11px] uppercase tracking-wide text-foreground-muted">
                Rank {recipe.rank}
              </span>
            </div>
            <dl className="mt-2.5 flex flex-col gap-1.5 border-t border-border/60 pt-2.5 text-xs">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 pt-0.5 text-foreground-muted">Materials</dt>
                <dd className="flex flex-wrap justify-end gap-1">
                  {recipe.reagents.map((reagent, j) => (
                    <LootItemPill
                      key={j}
                      item={reagent.item}
                      tooltipId={`prof:${professionId}:${i}:reagent-m:${j}`}
                      context="catalog"
                      qty={reagent.qty}
                      iconOnly
                    />
                  ))}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Source</dt>
                <dd className="text-right">{recipe.source}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Level Up</dt>
                <dd>
                  <ProfessionSkillColors skills={recipe.skills} />
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
