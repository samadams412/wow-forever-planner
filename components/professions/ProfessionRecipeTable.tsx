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
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
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
                <LootItemPill item={recipe.item} tooltipId={`prof:${professionId}:${i}:item`} context="catalog" />
                {recipe.makesQty && <span className="ml-1.5 text-xs text-foreground-muted">&times;{recipe.makesQty}</span>}
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
  );
}
