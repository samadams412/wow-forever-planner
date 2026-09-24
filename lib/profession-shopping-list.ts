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

// LevelingStep.count is always "~Ncrafts"/"~Ncraft" (verified across all 8
// professions' leveling data -- no other shape exists), the same estimate
// rendered as "~N crafts" next to the step's row above this section. Total
// materials needed for a step is its own reagent qty times this estimate,
// not the bare per-craft qty -- a step needing 1 Peacebloom per craft over
// ~15 crafts really does need ~15 Peacebloom, not 1.
function parseCraftCount(count: string): number {
  const match = /(\d+)/.exec(count);
  return match ? Number(match[1]) : 1;
}

// Sums each reagent's total qty (its per-craft LevelingStep.mats[].qty
// times that step's own "~N crafts" estimate) across every step in the
// given ranks -- the real quantity needed to walk this range, not just the
// bare per-craft numbers shown next to each reagent icon above.
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
      const crafts = parseCraftCount(step.count);
      for (const mat of step.mats) {
        const key = mat.item.itemId !== null ? `id:${mat.item.itemId}` : `name:${mat.item.name}`;
        const totalQty = mat.qty * crafts;
        const existing = byKey.get(key);
        if (existing) {
          existing.qty += totalQty;
        } else {
          const craftRank = mat.item.itemId !== null ? craftableRanks.get(mat.item.itemId) : undefined;
          const madeAlongTheWay = craftRank !== undefined && (craftRank === null || craftRank <= maxSkill);
          byKey.set(key, { item: mat.item, qty: totalQty, madeAlongTheWay });
          order.push(key);
        }
      }
    }
  }
  return order.map((key) => byKey.get(key)!);
}
