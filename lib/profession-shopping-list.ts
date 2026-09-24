import type { LootItem } from "@/lib/dungeon-loot";
import type { LevelingRank, Recipe } from "@/lib/profession-recipes";

export type ShoppingListItem = {
  item: LootItem;
  qty: number;
  // True when this reagent is itself a recipe this profession already
  // knows how to make within the selected range -- e.g. Alchemy's Fire Oil
  // (its own Trainer recipe, rank 130) shows up as a *reagent* in the
  // optimal leveling path but is never one of that path's own step
  // outputs, so it's not "made" in the literal sense foreverchanges' own
  // wording implies; what actually makes it "along the way" is that
  // leveling this profession teaches you the recipe for it too, cheaper
  // than buying it outright. See buildCraftableRanks below.
  madeAlongTheWay: boolean;
};

// itemId -> the lowest skill rank (parsed from Recipe.rank) that crafts it,
// or null when that rank couldn't be parsed as a plain number (rare -- one
// Enchanting recipe carries "–"). Built once from a profession's FULL
// recipe list (catalog.recipes, not just the optimal leveling path's own
// steps) so "made along the way" means "this profession can craft it",
// matching foreverchanges.pro's own framing, not the much narrower "this
// exact leveling step produced it" (which returns zero matches for e.g.
// Alchemy -- checked directly: neither Fire Oil nor Blackmouth Oil is ever
// a leveling step's own named output, only a reagent one of those steps
// needs, even though both are perfectly ordinary Alchemy recipes).
export function buildCraftableRanks(recipes: Recipe[]): Map<number, number | null> {
  const map = new Map<number, number | null>();
  for (const recipe of recipes) {
    if (recipe.item.itemId === null) continue;
    const parsed = /^\d+$/.test(recipe.rank) ? Number(recipe.rank) : null;
    map.set(recipe.item.itemId, parsed);
  }
  return map;
}

// Sums each reagent's per-step qty (lib/profession-recipes.ts's
// LevelingStep.mats[].qty, the same number already rendered next to that
// reagent's icon on the Leveling 1-300 tab) across every step in the given
// ranks -- deliberately a plain sum of the visible per-step counts, not
// multiplied by the step's own "~N crafts" estimate. Cross-checked against
// foreverchanges.pro's own shopping list feature, whose larger totals do
// apply that multiplier -- not replicated here since this list's totals
// need to stay directly traceable back to the numbers already shown above
// it on this same tab.
export function aggregateShoppingList(
  ranks: LevelingRank[],
  craftableRanks: Map<number, number | null>
): ShoppingListItem[] {
  // The highest skill reachable within the ranks actually selected -- a
  // reagent only counts as "made along the way" if its own recipe is
  // learnable by then (Fire Oil's rank-130 recipe doesn't help an
  // Apprentice-only view topping out at skill 75).
  const maxSkill = Math.max(
    0,
    ...ranks.flatMap((rank) => rank.steps.map((step) => step.range[1] ?? step.range[0]))
  );

  const order: string[] = [];
  const byKey = new Map<string, ShoppingListItem>();
  for (const rank of ranks) {
    for (const step of rank.steps) {
      for (const mat of step.mats) {
        const key = mat.item.itemId !== null ? `id:${mat.item.itemId}` : `name:${mat.item.name}`;
        const existing = byKey.get(key);
        if (existing) {
          existing.qty += mat.qty;
        } else {
          const craftRank = mat.item.itemId !== null ? craftableRanks.get(mat.item.itemId) : undefined;
          const madeAlongTheWay = craftRank !== undefined && (craftRank === null || craftRank <= maxSkill);
          byKey.set(key, { item: mat.item, qty: mat.qty, madeAlongTheWay });
          order.push(key);
        }
      }
    }
  }
  return order.map((key) => byKey.get(key)!);
}
