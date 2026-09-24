"use client";

import { useMemo, useState } from "react";
import LootItemPill from "@/components/reference/LootItemPill";
import { aggregateShoppingList, buildCraftableRanks } from "@/lib/profession-shopping-list";
import type { LevelingRank, Recipe } from "@/lib/profession-recipes";

// Studied foreverchanges.pro/professions/<id>#shopping live before building:
// there, "Shopping List" is its own top-level tab (Recipes / Leveling /
// Shopping List / Merchant's Favor / Camp), a single "1 to 225" aggregate
// (the beta's current skill cap) grouped into three source buckets --
// vendor-bought staples, gathered/farmed reagents, and reagents the path
// crafts for itself along the way. We have no acquisition-source data to
// split the first two apart (nothing in this catalog says "buy this" vs.
// "farm this"), so this rebuilds only the one two-way split we can derive
// honestly from data already on this page: a reagent that's itself a
// recipe this profession already knows by the selected range (see
// lib/profession-shopping-list.ts's `buildCraftableRanks`) vs. everything
// else. Kept as a section at the bottom
// of this same Leveling tab, not a separate tab, per this session's task --
// range-bucket filtering (Apprentice/Journeyman/Expert/Artisan/All) is
// tabs, matching this site's existing filter-tab convention
// (SpellbookBook.tsx's FILTERS buttons), rather than foreverchanges' single
// fixed "1 to 225" total.
export default function ProfessionShoppingList({
  leveling,
  recipes,
  professionId,
}: {
  leveling: LevelingRank[];
  recipes: Recipe[];
  professionId: string;
}) {
  const rankNames = leveling.map((r) => r.rank);
  const [filter, setFilter] = useState<string>("all");

  const craftableRanks = useMemo(() => buildCraftableRanks(recipes), [recipes]);
  const selectedRanks = useMemo(
    () => (filter === "all" ? leveling : leveling.filter((r) => r.rank === filter)),
    [leveling, filter]
  );
  const items = useMemo(
    () => aggregateShoppingList(selectedRanks, craftableRanks),
    [selectedRanks, craftableRanks]
  );
  const toBuy = items.filter((entry) => !entry.madeAlongTheWay);
  const madeAlong = items.filter((entry) => entry.madeAlongTheWay);

  return (
    <div id="items-needed" className="mt-6 scroll-mt-20 rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-hover/40 px-4 py-2">
        <div>
          <span className="font-heading text-sm font-semibold uppercase tracking-wide text-accent">Items Needed</span>
          <span className="ml-2 text-xs text-foreground-muted">
            {toBuy.length} to buy{madeAlong.length > 0 ? `, ${madeAlong.length} crafted along the way` : ""}
          </span>
        </div>
        <div className="inline-flex flex-wrap rounded border border-border bg-surface p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-sm px-2 py-1 transition-colors ${
              filter === "all" ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {rankNames.map((rank) => (
            <button
              key={rank}
              type="button"
              onClick={() => setFilter(rank)}
              className={`rounded-sm px-2 py-1 transition-colors ${
                filter === rank ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {rank}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3">
        {items.length === 0 ? (
          <p className="text-sm text-foreground-muted">No reagents in this range.</p>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">
                To buy or gather
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {toBuy.map((entry, i) => (
                  <LootItemPill
                    key={i}
                    item={entry.item}
                    qty={entry.qty}
                    tooltipId={`prof:${professionId}:shop:${filter}:buy:${i}`}
                    context="catalog"
                  />
                ))}
              </div>
            </div>
            {madeAlong.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">
                  Crafted along the way
                </p>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {madeAlong.map((entry, i) => (
                    <LootItemPill
                      key={i}
                      item={entry.item}
                      qty={entry.qty}
                      tooltipId={`prof:${professionId}:shop:${filter}:made:${i}`}
                      context="catalog"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
