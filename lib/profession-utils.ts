import type { LootItem } from "@/lib/dungeon-loot";
import { getItemById } from "@/lib/items";
import type { LevelingRank, LevelingStep, ProfessionItemRef, Recipe, ResolvedRecipe } from "@/lib/profession-recipes";

export type ResolvedLevelingStep = Omit<LevelingStep, "item" | "mats" | "alternatives"> & {
  item: LootItem;
  mats: { qty: number; item: LootItem }[];
  alternatives?: {
    item: LootItem;
    source: string;
    count: string;
    mats: { qty: number; item: LootItem }[];
  }[];
};
export type ResolvedLevelingRank = Omit<LevelingRank, "steps"> & { steps: ResolvedLevelingStep[] };

function unresolvedItem(ref: ProfessionItemRef): LootItem {
  return {
    name: ref.name,
    slot: null,
    type: null,
    itemClass: null,
    itemId: ref.itemId,
    icon: null,
    quality: null,
    itemLevel: null,
    requiredLevel: null,
    tooltip: null,
    tooltipSynthesized: false,
    classicTooltip: null,
    status: null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: true,
    source: "foreverchanges",
  };
}

/** Resolve normalized profession item references against the master items catalog. */
export function resolveProfessionItem(ref: ProfessionItemRef): LootItem {
  return (ref.itemId === null ? undefined : getItemById(ref.itemId)) ?? unresolvedItem(ref);
}

/** Hydrate recipe outputs and reagents from the shared items catalog. */
export function resolveProfessionRecipes(recipes: Recipe[]): ResolvedRecipe[] {
  return recipes.map((recipe) => ({
    ...recipe,
    item: resolveProfessionItem(recipe.item),
    reagents: recipe.reagents.map((reagent) => ({
      qty: reagent.qty,
      item: resolveProfessionItem(reagent.item),
    })),
  }));
}

/** Hydrate leveling references for components that render LootItemPill. */
export function resolveLeveling(leveling: LevelingRank[]): ResolvedLevelingRank[] {
  return leveling.map((rank) => ({
    ...rank,
    steps: rank.steps.map((step) => ({
      ...step,
      item: resolveProfessionItem(step.item),
      mats: step.mats.map((mat) => ({ ...mat, item: resolveProfessionItem(mat.item) })),
      alternatives: step.alternatives?.map((alt) => ({
        ...alt,
        item: resolveProfessionItem(alt.item),
        mats: alt.mats.map((mat) => ({ ...mat, item: resolveProfessionItem(mat.item) })),
      })),
    })),
  }));
}
