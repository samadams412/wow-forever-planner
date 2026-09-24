import Link from "next/link";

// Left-side category filter for /reference/items, matching the profession
// pages' own ProfessionCategorySidebar layout/styling (a vertical list,
// active item highlighted, a count next to each) for visual consistency
// across the site's two big filterable-catalog pages. No per-category icons
// here, unlike the profession sidebar -- these are Blizzard item-class
// buckets (Weapon/Armor/Container/...), not the profession-specific slot
// names ProfessionCategorySidebar's CATEGORY_ICON map was built for, and
// inventing a new icon set for a filter this page didn't ask for icons on
// would be scope beyond what was asked.
export default function ItemCategorySidebar({
  buildHref,
  categoryValues,
  categoryNames,
  counts,
  totalCount,
  active,
}: {
  buildHref: (category: number | undefined) => string;
  categoryValues: number[];
  categoryNames: Record<number, string>;
  counts: Record<number, number>;
  totalCount: number;
  active: number | undefined;
}) {
  return (
    <nav className="flex shrink-0 flex-row flex-wrap gap-1 sm:w-56 sm:flex-col sm:flex-nowrap sm:gap-0.5">
      <Link
        href={buildHref(undefined)}
        className={`grid grid-cols-[1fr_auto] items-baseline gap-x-2 rounded px-2.5 py-1.5 text-sm transition-colors ${
          active === undefined ? "bg-accent/20 text-accent" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <span>All categories</span>
        <span className="text-xs text-foreground-muted">{totalCount.toLocaleString()}</span>
      </Link>
      {categoryValues.map((value) => (
        <Link
          key={value}
          href={buildHref(value)}
          // Grid, not a flex row, so a name long enough to wrap keeps the
          // count top-aligned with its first line instead of vertically
          // centered against the full wrapped height -- see
          // ProfessionCategorySidebar's identical fix for the reasoning
          // (no current item category is this long, but this mirrors that
          // component deliberately, per this file's own header comment).
          className={`grid grid-cols-[1fr_auto] items-baseline gap-x-2 rounded px-2.5 py-1.5 text-sm transition-colors ${
            active === value ? "bg-accent/20 text-accent" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <span>{categoryNames[value]}</span>
          <span className="shrink-0 text-xs text-foreground-muted">{(counts[value] ?? 0).toLocaleString()}</span>
        </Link>
      ))}
    </nav>
  );
}
