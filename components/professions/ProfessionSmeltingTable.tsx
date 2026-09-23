import LootItemPill from "@/components/reference/LootItemPill";
import ProfessionSkillColors from "@/components/professions/ProfessionSkillColors";
import type { SmeltingRecipe } from "@/lib/gathering-professions";

// Mining-only. Structurally the same list a crafting profession's Recipes
// tab shows (confirmed live: foreverchanges.pro's #smelting chapter reuses
// the identical cr-row/cr-mats/en3-skill markup the Recipes chapter does),
// just without ProfessionRecipeTable's rank/category columns -- Smelting
// has neither concept, so this is its own smaller table rather than
// stretching that component to fit a shape it doesn't have.
export default function ProfessionSmeltingTable({ recipes, professionId }: { recipes: SmeltingRecipe[]; professionId: string }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-foreground-muted">
            <th className="px-3 py-2 font-semibold">Bar</th>
            <th className="px-3 py-2 font-semibold">Materials</th>
            <th className="px-3 py-2 font-semibold">Source</th>
            <th className="px-3 py-2 font-semibold">Level Up</th>
          </tr>
        </thead>
        <tbody>
          {recipes.map((recipe, i) => (
            <tr key={i} className="border-b border-border/60 last:border-b-0 even:bg-surface/40">
              <td className="px-3 py-1.5">
                <LootItemPill item={recipe.item} tooltipId={`prof:${professionId}:smelt:${i}:item`} context="catalog" />
                {recipe.makesQty && <span className="ml-1.5 text-xs text-foreground-muted">&times;{recipe.makesQty}</span>}
              </td>
              <td className="px-3 py-1.5">
                <div className="flex flex-wrap gap-1">
                  {recipe.mats.map((mat, j) => (
                    <LootItemPill key={j} item={mat} tooltipId={`prof:${professionId}:smelt:${i}:mat:${j}`} context="catalog" />
                  ))}
                </div>
              </td>
              <td className="px-3 py-1.5 text-foreground-muted">{recipe.source}</td>
              <td className="px-3 py-1.5">
                {recipe.skills ? <ProfessionSkillColors skills={recipe.skills} /> : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
