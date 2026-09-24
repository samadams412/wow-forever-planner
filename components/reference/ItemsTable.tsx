import LootItemPill from "@/components/reference/LootItemPill";
import { itemQualityColor, itemQualityName } from "@/lib/wow-data";
import type { LootItem } from "@/lib/dungeon-loot";

const STATUS_BADGE: Record<NonNullable<LootItem["status"]>, string> = {
  new: "bg-green-600/20 text-green-800",
  changed: "bg-sky-500/15 text-sky-300",
  same: "bg-foreground-muted/10 text-foreground-muted",
  missing: "bg-amber-500/15 text-amber-300",
};

const STATUS_LABEL: Record<NonNullable<LootItem["status"]>, string> = {
  new: "New",
  changed: "Changed",
  same: "Unchanged",
  missing: "No Forever Data",
};

// One row per item: the same LootItemPill every other item list on this
// site already uses for the name/icon + full-stat tooltip (item 2's quest
// reward enrichment and item 3's boss loot both hover this same
// component), plus the plain list columns the table itself needs.
export default function ItemsTable({ items }: { items: LootItem[] }) {
  if (items.length === 0) {
    return <p className="mt-6 text-sm text-foreground-muted">No items match this filter.</p>;
  }
  return (
    <>
      {/* Desktop: the full 6-column table, unchanged. Hidden below `sm` in
          favor of the card list -- same reasoning/pattern as the Profession
          Recipes tab's own table-to-card split (ProfessionRecipeTable). */}
      <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border sm:block">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left text-[11px] uppercase tracking-wide text-foreground-muted">
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 font-semibold">Req. Level</th>
              <th className="px-3 py-2 font-semibold">Item Level</th>
              <th className="px-3 py-2 font-semibold">Slot</th>
              <th className="px-3 py-2 font-semibold">Quality</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={`${item.itemId}-${i}`} className="border-b border-border/60 last:border-b-0 even:bg-surface/40">
                <td className="px-3 py-1.5">
                  <LootItemPill item={item} tooltipId={`items-catalog:${item.itemId}:${i}`} context="catalog" />
                </td>
                <td className="px-3 py-1.5 text-foreground-muted">{item.requiredLevel ?? "--"}</td>
                <td className="px-3 py-1.5 text-foreground-muted">{item.itemLevel ?? "--"}</td>
                <td className="px-3 py-1.5 text-foreground-muted">{item.slot ?? "--"}</td>
                <td className="px-3 py-1.5" style={{ color: itemQualityColor(item.quality) }}>
                  {itemQualityName(item.quality)}
                </td>
                <td className="px-3 py-1.5">
                  {item.status && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[item.status]}`}
                    >
                      {STATUS_LABEL[item.status]}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per item, same fields restructured vertically.
          Separate tooltipIds from the desktop table's own pills -- both are
          in the DOM at once (one hidden via CSS, not unmounted), and the
          active-tooltip store keys off tooltipId alone. */}
      <div className="mt-4 flex flex-col gap-3 sm:hidden">
        {items.map((item, i) => (
          <div key={`${item.itemId}-${i}-card`} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <LootItemPill item={item} tooltipId={`items-catalog:${item.itemId}:${i}:m`} context="catalog" />
              {item.status && (
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_BADGE[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>
              )}
            </div>
            <dl className="mt-2.5 flex flex-col gap-1.5 border-t border-border/60 pt-2.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Req. Level</dt>
                <dd>{item.requiredLevel ?? "--"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Item Level</dt>
                <dd>{item.itemLevel ?? "--"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Slot</dt>
                <dd>{item.slot ?? "--"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-foreground-muted">Quality</dt>
                <dd style={{ color: itemQualityColor(item.quality) }}>{itemQualityName(item.quality)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}
