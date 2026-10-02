import LootItemPill from "@/components/reference/LootItemPill";
import { sourceTypeLabel, SIBLING_TRUNCATE_THRESHOLD, SIBLING_TRUNCATE_SHOW, type ItemSource } from "@/lib/item-sources";
import type { LootItem } from "@/lib/dungeon-loot";

// Same card language as LootBossCard/LootQuestRewardsCard -- rounded-lg,
// border-border, bg-surface. Renders even when there are no siblings (just
// the source line); callers only mount this when a source exists at all.
export default function ItemSourceCard({
  source,
  siblings,
}: {
  source: ItemSource;
  siblings: LootItem[];
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h2 className="font-heading text-sm font-semibold text-foreground-muted">Source</h2>
      <p className="mt-1.5 text-sm text-foreground">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted bg-foreground-muted/10">
          {sourceTypeLabel(source.code)}
        </span>{" "}
        <span className="font-medium">{source.label}</span>
        <span className="text-foreground-muted"> -- {source.location}</span>
      </p>

      {siblings.length > 0 && (
        <>
          <p className="mt-3 text-xs text-foreground-muted">Also from this source:</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {(siblings.length >= SIBLING_TRUNCATE_THRESHOLD ? siblings.slice(0, SIBLING_TRUNCATE_SHOW) : siblings).map(
              (item, i) => (
                <LootItemPill key={`${item.itemId ?? item.name}-${i}`} item={item} tooltipId={`item-source-sibling:${i}`} showSlotType />
              ),
            )}
            {siblings.length >= SIBLING_TRUNCATE_THRESHOLD && (
              <span className="text-xs text-foreground-muted">+{siblings.length - SIBLING_TRUNCATE_SHOW} more</span>
            )}
          </div>
        </>
      )}

      {/* <p className="mt-3 text-[11px] text-foreground-muted/70">
        Sourced from foreverchanges.pro; not every item has source data yet.
      </p> */}
    </div>
  );
}
