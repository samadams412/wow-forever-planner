import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import ItemsTable from "@/components/reference/ItemsTable";
import ItemsSearchInput from "@/components/reference/ItemsSearchInput";
import { getItemStatusCounts, queryItems, STATUS_TABS, type ItemStatus } from "@/lib/items";
import { ITEM_QUALITY_NAME, itemQualityColor } from "@/lib/wow-data";

// 0-6, matching this catalog's own real quality values (checked via
// data/items.json rather than assumed -- Artifact/6 is a real, if tiny,
// 10-item bucket here: both Warglaives of Azzinoth, the Twin Blades, etc.)
const RARITY_VALUES = [0, 1, 2, 3, 4, 5, 6];

export const metadata: Metadata = {
  title: "Items",
  description:
    "Every item in the World of Warcraft: Forever beta client, filterable by new/changed/unchanged-since-Classic, sourced from foreverchanges.pro.",
};

function buildHref(params: { status: string; q: string; rarity?: number; page?: number }): string {
  const usp = new URLSearchParams();
  if (params.status !== "all") usp.set("status", params.status);
  if (params.q) usp.set("q", params.q);
  if (params.rarity !== undefined) usp.set("rarity", String(params.rarity));
  if (params.page && params.page > 1) usp.set("page", String(params.page));
  const qs = usp.toString();
  return qs ? `/reference/items?${qs}` : "/reference/items";
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; rarity?: string; page?: string }>;
}) {
  const resolved = await searchParams;
  const status = (STATUS_TABS.some((t) => t.value === resolved.status) ? resolved.status : "all") as
    | ItemStatus
    | "all";
  const q = resolved.q ?? "";
  const rarity = RARITY_VALUES.includes(Number(resolved.rarity)) ? Number(resolved.rarity) : undefined;
  const page = Math.max(1, Number(resolved.page) || 1);

  const counts = getItemStatusCounts();
  const result = queryItems({ status, q, rarity, page });

  return (
    <main className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-4">
      <Breadcrumbs items={[{ label: "Reference", href: "/reference" }, { label: "Items" }]} />

      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Items</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Every item in the WoW Forever beta client -- {counts.all.toLocaleString()} total --  &quot;No Forever Data&quot; means the beta client hasn&apos;t
        touched that Classic item yet -- not that it&apos;s been removed.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded border border-border bg-surface p-0.5 text-xs">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildHref({ status: tab.value, q, rarity })}
              className={`rounded-sm px-2 py-1 transition-colors ${
                status === tab.value ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {tab.label} <span className="text-foreground-muted">{counts[tab.value].toLocaleString()}</span>
            </Link>
          ))}
        </div>
        <ItemsSearchInput initialValue={q} />
      </div>

      <div className="mt-2 inline-flex flex-wrap items-center gap-1 rounded border border-border bg-surface p-0.5 text-xs">
        <Link
          href={buildHref({ status, q })}
          className={`rounded-sm px-2 py-1 font-medium transition-colors ${
            rarity === undefined ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Any rarity
        </Link>
        {RARITY_VALUES.map((value) => (
          <Link
            key={value}
            href={buildHref({ status, q, rarity: value })}
            style={{ color: rarity === value ? itemQualityColor(value) : undefined }}
            className={`rounded-sm px-2 py-1 font-medium transition-colors ${
              rarity === value ? "bg-accent/20" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {ITEM_QUALITY_NAME[value]}
          </Link>
        ))}
      </div>

      <p className="mt-3 text-xs text-foreground-muted">
        {result.total.toLocaleString()} item{result.total === 1 ? "" : "s"}
        {q ? ` matching "${q}"` : ""}
      </p>

      <ItemsTable items={result.items} />

      {result.pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-between border-t border-border pt-4">
          {result.page > 1 ? (
            <Link
              href={buildHref({ status, q, rarity, page: result.page - 1 })}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
            >
              &larr; Previous
            </Link>
          ) : (
            <div />
          )}
          <span className="text-xs text-foreground-muted">
            Page <strong className="text-foreground">{result.page}</strong> of {result.pageCount}
          </span>
          {result.page < result.pageCount ? (
            <Link
              href={buildHref({ status, q, rarity, page: result.page + 1 })}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
            >
              Next &rarr;
            </Link>
          ) : (
            <div />
          )}
        </nav>
      )}
      <div className="mt-6 text-xs text-foreground-muted">
        Sourced from{" "}
        <a
          href="https://foreverchanges.pro/items"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline hover:text-accent-hover"
        >
          foreverchanges.pro
        </a>
        , which reads the beta client directly.
      </div>
     
    </main>
  );
}
