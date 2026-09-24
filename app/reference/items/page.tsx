import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import ItemsTable from "@/components/reference/ItemsTable";
import ItemsSearchInput from "@/components/reference/ItemsSearchInput";
import {
  CATEGORY_VALUES,
  getDungeonFilterOptions,
  getItemCategoryCounts,
  getItemStatusCounts,
  queryItems,
  STATUS_TABS,
  type ItemStatus,
} from "@/lib/items";
import { ITEM_CLASS_NAME, ITEM_QUALITY_NAME, itemQualityColor } from "@/lib/wow-data";

// 0-6, matching this catalog's own real quality values (checked via
// data/items.json rather than assumed -- Artifact/6 is a real, if tiny,
// 10-item bucket here: both Warglaives of Azzinoth, the Twin Blades, etc.)
const RARITY_VALUES = [0, 1, 2, 3, 4, 5, 6];

export const metadata: Metadata = {
  title: "Items",
  description:
    "Every item in the World of Warcraft: Forever beta client, filterable by new/changed/unchanged-since-Classic, sourced from foreverchanges.pro.",
};

type FilterParams = {
  status: string;
  q: string;
  rarity?: number;
  category?: number;
  dungeon?: string;
  itemLevelMin?: number;
  itemLevelMax?: number;
  requiredLevelMin?: number;
  requiredLevelMax?: number;
  page?: number;
};

function buildHref(params: FilterParams): string {
  const usp = new URLSearchParams();
  if (params.status !== "all") usp.set("status", params.status);
  if (params.q) usp.set("q", params.q);
  if (params.rarity !== undefined) usp.set("rarity", String(params.rarity));
  if (params.category !== undefined) usp.set("category", String(params.category));
  if (params.dungeon !== undefined) usp.set("dungeon", params.dungeon);
  if (params.itemLevelMin !== undefined) usp.set("ilvlMin", String(params.itemLevelMin));
  if (params.itemLevelMax !== undefined) usp.set("ilvlMax", String(params.itemLevelMax));
  if (params.requiredLevelMin !== undefined) usp.set("reqMin", String(params.requiredLevelMin));
  if (params.requiredLevelMax !== undefined) usp.set("reqMax", String(params.requiredLevelMax));
  if (params.page && params.page > 1) usp.set("page", String(params.page));
  const qs = usp.toString();
  return qs ? `/reference/items?${qs}` : "/reference/items";
}

function parseIntParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    rarity?: string;
    category?: string;
    dungeon?: string;
    ilvlMin?: string;
    ilvlMax?: string;
    reqMin?: string;
    reqMax?: string;
    page?: string;
  }>;
}) {
  const resolved = await searchParams;
  const status = (STATUS_TABS.some((t) => t.value === resolved.status) ? resolved.status : "all") as
    | ItemStatus
    | "all";
  const q = resolved.q ?? "";
  const rarity = RARITY_VALUES.includes(Number(resolved.rarity)) ? Number(resolved.rarity) : undefined;
  const category = CATEGORY_VALUES.includes(Number(resolved.category)) ? Number(resolved.category) : undefined;
  const dungeonOptions = getDungeonFilterOptions();
  const dungeon = dungeonOptions.some((d) => d.id === resolved.dungeon) ? resolved.dungeon : undefined;
  const itemLevelMin = parseIntParam(resolved.ilvlMin);
  const itemLevelMax = parseIntParam(resolved.ilvlMax);
  const requiredLevelMin = parseIntParam(resolved.reqMin);
  const requiredLevelMax = parseIntParam(resolved.reqMax);
  const page = Math.max(1, Number(resolved.page) || 1);

  const counts = getItemStatusCounts();
  const categoryCounts = getItemCategoryCounts();
  const result = queryItems({
    status,
    q,
    rarity,
    category,
    dungeon,
    itemLevelMin,
    itemLevelMax,
    requiredLevelMin,
    requiredLevelMax,
    page,
  });
  const baseFilters: FilterParams = {
    status,
    q,
    rarity,
    dungeon,
    category,
    itemLevelMin,
    itemLevelMax,
    requiredLevelMin,
    requiredLevelMax,
  };
  const hasRangeFilter =
    dungeon !== undefined ||
    itemLevelMin !== undefined ||
    itemLevelMax !== undefined ||
    requiredLevelMin !== undefined ||
    requiredLevelMax !== undefined;

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
              href={buildHref({ ...baseFilters, status: tab.value })}
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
          href={buildHref({ ...baseFilters, rarity: undefined })}
          className={`rounded-sm px-2 py-1 font-medium transition-colors ${
            rarity === undefined ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          Any rarity
        </Link>
        {RARITY_VALUES.map((value) => (
          <Link
            key={value}
            href={buildHref({ ...baseFilters, rarity: value })}
            style={{ color: rarity === value ? itemQualityColor(value) : undefined }}
            className={`rounded-sm px-2 py-1 font-medium transition-colors ${
              rarity === value ? "bg-accent/20" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {ITEM_QUALITY_NAME[value]}
          </Link>
        ))}
      </div>

      <div className="mt-2 inline-flex flex-wrap items-center gap-1 rounded border border-border bg-surface p-0.5 text-xs">
        <Link
          href={buildHref({ ...baseFilters, category: undefined })}
          className={`rounded-sm px-2 py-1 transition-colors ${
            category === undefined ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
          }`}
        >
          All categories
        </Link>
        {CATEGORY_VALUES.map((value) => (
          <Link
            key={value}
            href={buildHref({ ...baseFilters, category: value })}
            className={`rounded-sm px-2 py-1 transition-colors ${
              category === value ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {ITEM_CLASS_NAME[value]} <span className="text-foreground-muted">{categoryCounts[value].toLocaleString()}</span>
          </Link>
        ))}
      </div>

      {/* Plain GET form -- no client JS needed, matching this page's other
          filters. Typing a range and hitting Enter/"Apply" navigates to the
          same ?ilvlMin=&ilvlMax=&reqMin=&reqMax= params buildHref already
          knows how to read back out, so pagination/tab/rarity links above
          keep the range active via baseFilters the same way they already
          preserve q/rarity. */}
      <form action="/reference/items" className="mt-2 flex flex-wrap items-end gap-3 text-xs">
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="q" value={q} />
        {rarity !== undefined && <input type="hidden" name="rarity" value={rarity} />}
        {category !== undefined && <input type="hidden" name="category" value={category} />}
        <label className="flex flex-col gap-1 text-foreground-muted">
          Drops in
          <select
            name="dungeon"
            defaultValue={dungeon ?? ""}
            className="w-40 rounded border border-border bg-surface px-2 py-1 text-foreground"
          >
            <option value="">Any dungeon</option>
            {dungeonOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-foreground-muted">
          Required level
          <span className="flex items-center gap-1">
            <input
              type="number"
              name="reqMin"
              min={0}
              max={60}
              defaultValue={requiredLevelMin}
              placeholder="min"
              className="w-16 rounded border border-border bg-surface px-2 py-1 text-foreground"
            />
            <span>&ndash;</span>
            <input
              type="number"
              name="reqMax"
              min={0}
              max={60}
              defaultValue={requiredLevelMax}
              placeholder="max"
              className="w-16 rounded border border-border bg-surface px-2 py-1 text-foreground"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-foreground-muted">
          Item level
          <span className="flex items-center gap-1">
            <input
              type="number"
              name="ilvlMin"
              min={0}
              defaultValue={itemLevelMin}
              placeholder="min"
              className="w-16 rounded border border-border bg-surface px-2 py-1 text-foreground"
            />
            <span>&ndash;</span>
            <input
              type="number"
              name="ilvlMax"
              min={0}
              defaultValue={itemLevelMax}
              placeholder="max"
              className="w-16 rounded border border-border bg-surface px-2 py-1 text-foreground"
            />
          </span>
        </label>
        <button
          type="submit"
          className="rounded border border-accent/60 px-3 py-1.5 font-medium text-accent transition-colors hover:bg-surface-hover"
        >
          Apply
        </button>
        {hasRangeFilter && (
          <Link
            href={buildHref({
              ...baseFilters,
              dungeon: undefined,
              itemLevelMin: undefined,
              itemLevelMax: undefined,
              requiredLevelMin: undefined,
              requiredLevelMax: undefined,
            })}
            className="text-foreground-muted underline hover:text-foreground"
          >
            Clear advanced filters
          </Link>
        )}
      </form>

      <p className="mt-3 text-xs text-foreground-muted">
        {result.total.toLocaleString()} item{result.total === 1 ? "" : "s"}
        {q ? ` matching "${q}"` : ""}
      </p>

      <ItemsTable items={result.items} />

      {result.pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-between border-t border-border pt-4">
          {result.page > 1 ? (
            <Link
              href={buildHref({ ...baseFilters, page: result.page - 1 })}
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
              href={buildHref({ ...baseFilters, page: result.page + 1 })}
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
