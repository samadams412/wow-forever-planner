import { STAT_KEYS, STAT_LABEL, type StatKey } from "@/lib/item-stats";
import type { ItemSuffix } from "@/lib/item-suffixes";
import { itemQualityColor } from "@/lib/wow-data";

// Same card language as ItemSourceCard. Server-rendered, no client JS: the
// list is computed from data/gear/suffixes.json (client bonus tables) at the
// item's own level and quality, see lib/item-suffixes.ts.
export default function ItemSuffixList({ itemName, suffixes, build }: { itemName: string; suffixes: ItemSuffix[]; build: string }) {
  const sorted = [...suffixes].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="font-heading text-sm font-semibold text-foreground-muted">Random suffixes ({suffixes.length})</h2>
      <p className="mt-1 text-xs text-foreground-muted">
        Each {itemName} rolls one of these when it drops. Values come from the client&apos;s item-level budget for this
        item (build {build}), added to its own stats above.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        {sorted.map((s) => (
          <li key={s.id} className="min-w-0 rounded border border-border/60 px-2.5 py-1.5">
            {/* Suffix names in the Uncommon item color (fixed, like every quality color); values in plain text. */}
            <p className="truncate text-sm font-medium" style={{ color: itemQualityColor(2) }}>
              {s.name}
            </p>
            <p className="text-xs text-foreground">
              {(Object.keys(s.stats) as StatKey[])
                .sort((a, b) => STAT_KEYS.indexOf(a) - STAT_KEYS.indexOf(b))
                .map((k) => `+${s.stats[k]} ${STAT_LABEL[k]?.name ?? k}`)
                .join(", ")}
              {s.effects.length > 0 && <span className="text-foreground-muted">, plus an equip effect (not decoded yet)</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
