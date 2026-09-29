import type { Metadata } from "next";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import CraftingCalculator, { type CalculatorItem, type CalculatorProfession } from "@/components/professions/CraftingCalculator";
import { getProfessionCatalog, getProfessionIds } from "@/lib/profession-recipes";
import type { ProfessionItemRef } from "@/lib/profession-recipes";
import { resolveProfessionItem } from "@/lib/profession-utils";
import type { LootItem } from "@/lib/dungeon-loot";

export const metadata: Metadata = {
  title: "Crafting Calculator | Forevercraft",
  description: "Plan a WoW Forever craft and recursively calculate the raw materials and intermediate components you need.",
  alternates: { canonical: "/reference/crafting-calculator" },
};

function itemKey(item: ProfessionItemRef) {
  return item.itemId !== null ? `id:${item.itemId}` : `name:${item.name.trim().toLowerCase()}`;
}

export default function CraftingCalculatorPage() {
  const items: Record<string, CalculatorItem> = {};
  const professions: CalculatorProfession[] = [];

  for (const id of getProfessionIds()) {
    const catalog = getProfessionCatalog(id);
    if (!catalog) continue;
    const recipes = catalog.recipes.flatMap((recipe, index) => {
      if (!recipe.item?.name) return [];
      const outputKey = itemKey(recipe.item);
      items[outputKey] ??= resolveProfessionItem(recipe.item);
      const reagents = recipe.reagents.flatMap((reagent) => {
        if (!reagent.item?.name || !Number.isFinite(reagent.qty) || reagent.qty <= 0) return [];
        const key = itemKey(reagent.item);
        items[key] ??= resolveProfessionItem(reagent.item);
        return [{ key, qty: reagent.qty }];
      });
      return [{ id: `${id}:${index}`, name: recipe.name, category: recipe.category, outputKey, makesQty: recipe.makesQty, reagents }];
    });
    if (recipes.length) professions.push({ id: catalog.id, name: catalog.name, recipes });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-8 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Crafting Calculator" }]} />
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Crafting Calculator</h1>
        <p className="mt-2 max-w-[72ch] text-sm leading-relaxed text-foreground-muted">
          Choose a recipe and quantity to see the ingredients to gather. Craftable components are broken down recursively across professions.
        </p>
      </div>
      <CraftingCalculator professions={professions} items={items} />
    </main>
  );
}
