import Link from "next/link";

// Left-side category filter, matching foreverchanges.pro/professions/<id>'s
// own sidebar (studied live before building) -- a vertical list of
// categories with a recipe count next to each, the active one highlighted.
// Pure server-rendered Links driving a `?category=` search param, same
// pattern /reference/items' status tabs already use on this site, so no
// client JS is needed just to filter a list.
export default function ProfessionCategorySidebar({
  professionId,
  categories,
  counts,
  active,
}: {
  professionId: string;
  categories: string[];
  counts: Record<string, number>;
  active: string;
}) {
  return (
    <nav className="flex shrink-0 flex-row flex-wrap gap-1 sm:w-56 sm:flex-col sm:flex-nowrap sm:gap-0.5">
      <Link
        href={`/reference/professions/${professionId}`}
        className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm transition-colors ${
          active === "All" ? "bg-accent/20 text-accent" : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
        }`}
      >
        <span>All</span>
        <span className="text-xs text-foreground-muted">
          {Object.values(counts).reduce((n, c) => n + c, 0)}
        </span>
      </Link>
      {categories.map((category) => (
        <Link
          key={category}
          href={`/reference/professions/${professionId}?category=${encodeURIComponent(category)}`}
          className={`flex items-center justify-between rounded px-2.5 py-1.5 text-sm transition-colors ${
            active === category
              ? "bg-accent/20 text-accent"
              : "text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          }`}
        >
          <span>{category}</span>
          <span className="text-xs text-foreground-muted">{counts[category] ?? 0}</span>
        </Link>
      ))}
    </nav>
  );
}
