"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ItemLinkSource as ItemLinkSourceValue } from "@/lib/item-link";

// Supplies the current page's "come back here" info to every LootItemPill
// underneath it, without threading from/fromLabel through each intermediate
// component (DungeonInlinePanel, ProfessionRecipeTable, CraftingCalculator,
// etc.) that sits between a page and the item pill it renders.
const ItemLinkSourceContext = createContext<ItemLinkSourceValue | null>(null);

export function ItemLinkSourceProvider({
  from,
  fromLabel,
  children,
}: ItemLinkSourceValue & { children: ReactNode }) {
  return (
    <ItemLinkSourceContext.Provider value={{ from, fromLabel }}>{children}</ItemLinkSourceContext.Provider>
  );
}

export function useItemLinkSource(): ItemLinkSourceValue | null {
  return useContext(ItemLinkSourceContext);
}
