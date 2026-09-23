import { TooltipName, TooltipType, TooltipDataNote } from "@/components/planner/TooltipCard";
import { itemQualityColor, iconUrl } from "@/lib/wow-data";
import type { LootItem } from "@/lib/dungeon-loot";

// "missing" means two different things depending on where an item is shown:
// on a dungeon loot page it's a boss/quest drop that isn't confirmed in
// Forever's loot table anymore; in the full item catalog it just means the
// beta client hasn't touched that Classic item's data yet (lib/items.ts's
// own "No Forever Data" tab label is the accurate claim there) -- neither
// wording is right in the other context, so the caller says which one it is.
const STATUS_NOTE: Record<"loot" | "catalog", Record<NonNullable<LootItem["status"]>, string>> = {
  loot: {
    new: "New in Forever -- not in Classic's loot table.",
    changed: "Changed from Classic (see below).",
    same: "Unchanged from Classic.",
    missing: "No longer drops in Forever -- this was Classic's loot table.",
  },
  catalog: {
    new: "New in Forever -- the Classic Era client has no item with this id.",
    changed: "Changed from Classic (see below).",
    same: "Unchanged from Classic.",
    missing: "No Forever data yet -- the beta client hasn't touched this Classic item.",
  },
};

// One tooltip line, colored to loosely match the in-game tooltip's own
// per-line language: the combined "Slot\tType" line as a gold header (same
// treatment as TooltipType elsewhere on the site), "Requires Level" as the
// red requirement color, "Equip:"/"Use:"/"Chance on hit:" effect lines as
// the green spell-effect color, everything else plain gray stat/flavor
// text. Not a full per-line WoW tooltip parser -- close enough to read
// correctly without trying to reproduce every rule.
export function TooltipLine({ line, index }: { line: string; index: number }) {
  if (line.includes("\t")) {
    const [slot, type] = line.split("\t");
    return (
      <div key={index} className="mt-1 text-xs font-medium uppercase tracking-wide text-[#ffd100]">
        {[slot, type].filter(Boolean).join(", ")}
      </div>
    );
  }
  if (/^Requires Level/.test(line)) {
    return (
      <div key={index} className="mt-0.5 text-xs text-[#ff4040]">
        {line}
      </div>
    );
  }
  if (/^(Equip:|Use:|Chance on hit:)/.test(line)) {
    return (
      <div key={index} className="mt-0.5 text-xs text-[#1eff00]">
        {line}
      </div>
    );
  }
  if (/^Sell Price:/.test(line)) {
    return (
      <div key={index} className="mt-1 text-[10px] text-gray-500">
        {line}
      </div>
    );
  }
  return (
    <div key={index} className="mt-0.5 text-xs text-gray-300">
      {line}
    </div>
  );
}

// The full inside of an item tooltip -- name, tooltip lines (or a bare
// slot/type fallback when there's nothing else), the synthesized-tooltip
// disclosure, drop chance, and the Classic-comparison block. Shared between
// LootItemPill's hover popover and the static /items/[itemId] full-page
// tooltip, which is why this doesn't include TooltipCard's own
// fixed-position wrapper -- each caller supplies its own container (a
// floating card for the hover popup, a plain bordered box for the page).
export default function ItemTooltipBody({
  item,
  context = "loot",
}: {
  item: LootItem;
  context?: "loot" | "catalog";
}) {
  const slotLine = item.unknown ? null : [item.slot, item.type].filter(Boolean).join(", ");
  const qualityColor = itemQualityColor(item.quality);

  return (
    <>
      <div className="flex items-center gap-2">
        {item.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl(item.icon)} alt="" className="h-9 w-9 shrink-0 rounded-sm border border-[#c8aa6e]/40" />
        )}
        <TooltipName>
          <span style={item.quality !== null ? { color: qualityColor } : undefined}>{item.name}</span>
        </TooltipName>
      </div>
      {item.tooltip ? (
        item.tooltip.map((line, i) => <TooltipLine key={i} line={line} index={i} />)
      ) : (
        <TooltipType>{slotLine || "Slot/type unknown"}</TooltipType>
      )}
      {item.tooltip && item.tooltipSynthesized && (
        <TooltipDataNote>
          Reconstructed from item data, not the beta client&apos;s own tooltip text -- foreverchanges.pro
          doesn&apos;t store full tooltip text for unchanged items. Armor and stat bonuses aren&apos;t
          available here.
        </TooltipDataNote>
      )}
      {item.dropChance !== null && (
        <TooltipDataNote>
          Drop chance: {item.dropChanceUnder ? "<" : ""}
          {item.dropChance}%
        </TooltipDataNote>
      )}
      {item.unknown && (
        <TooltipDataNote>Not yet discovered by the community -- slot/type unknown.</TooltipDataNote>
      )}
      {item.status && (
        <div className="mt-2 border-t border-[#c8aa6e]/30 pt-1.5">
          <p className="text-[10px] text-gray-500">{STATUS_NOTE[context][item.status]}</p>
          {item.classicTooltip && (
            <div className="mt-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[#c8aa6e]">
                Classic&apos;s version
              </div>
              {item.classicTooltip.map((line, i) => (
                <div key={i} className="mt-0.5 text-[11px] text-gray-500">
                  {line.includes("\t") ? line.split("\t").filter(Boolean).join(", ") : line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
