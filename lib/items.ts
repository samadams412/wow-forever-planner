import fs from "fs";
import path from "path";
import type { LootItem } from "@/lib/dungeon-loot";

// The full item catalog (data/items.json, built by scripts/build-items.js
// from data/sources/foreverchanges/items/*.json) -- every item in the
// Forever beta client, new/changed/unchanged/not-yet-touched vs Classic.
// Read and filtered entirely server-side (this file has no "use client"
// dependents) so /reference/items never ships the full ~21k-item catalog
// to the browser -- only the current page's worth of rows.
export type ItemStatus = "new" | "changed" | "same" | "missing";

const DATA_FILE = path.join(process.cwd(), "data", "items.json");
let cache: LootItem[] | null = null;
let byId: Map<number, LootItem> | null = null;

function loadAll(): LootItem[] {
  if (cache) return cache;
  const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as { items: LootItem[] };
  cache = parsed.items;
  return cache;
}

export function getItemById(itemId: number): LootItem | undefined {
  if (!byId) {
    byId = new Map();
    for (const item of loadAll()) {
      if (item.itemId !== null) byId.set(item.itemId, item);
    }
  }
  return byId.get(itemId);
}

// Labels match foreverchanges.pro's own tab wording for these statuses
// (its "No Forever data yet" tab, not "missing"/"removed") since that's
// the accurate claim -- these are Classic items the beta client hasn't
// touched yet, not confirmed cut from the game.
export const STATUS_TABS: { value: ItemStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "changed", label: "Changed" },
  { value: "same", label: "Unchanged" },
  { value: "missing", label: "No Forever Data" },
];

export function getItemStatusCounts(): Record<ItemStatus | "all", number> {
  const all = loadAll();
  const counts: Record<ItemStatus | "all", number> = { all: all.length, new: 0, changed: 0, same: 0, missing: 0 };
  for (const item of all) if (item.status) counts[item.status]++;
  return counts;
}

export type ItemQuery = {
  status?: ItemStatus | "all";
  q?: string;
  rarity?: number;
  itemLevelMin?: number;
  itemLevelMax?: number;
  requiredLevelMin?: number;
  requiredLevelMax?: number;
  page?: number;
  pageSize?: number;
};

export type ItemQueryResult = {
  items: LootItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function queryItems({
  status = "all",
  q = "",
  rarity,
  itemLevelMin,
  itemLevelMax,
  requiredLevelMin,
  requiredLevelMax,
  page = 1,
  pageSize = 60,
}: ItemQuery): ItemQueryResult {
  let items = loadAll();
  if (status !== "all") items = items.filter((item) => item.status === status);
  if (rarity !== undefined) items = items.filter((item) => item.quality === rarity);
  // A range bound excludes an item with a null level rather than treating
  // null as 0 or "no opinion" -- foreverchanges' own item level column
  // shows "--" for these (mostly quest/consumable/misc items with no real
  // item level), and silently including them in e.g. an "80-100" range
  // would misrepresent them as meeting a bound they don't actually carry.
  if (itemLevelMin !== undefined) items = items.filter((item) => item.itemLevel !== null && item.itemLevel >= itemLevelMin);
  if (itemLevelMax !== undefined) items = items.filter((item) => item.itemLevel !== null && item.itemLevel <= itemLevelMax);
  if (requiredLevelMin !== undefined)
    items = items.filter((item) => item.requiredLevel !== null && item.requiredLevel >= requiredLevelMin);
  if (requiredLevelMax !== undefined)
    items = items.filter((item) => item.requiredLevel !== null && item.requiredLevel <= requiredLevelMax);

  const needle = q.trim().toLowerCase();
  if (needle) items = items.filter((item) => item.name.toLowerCase().includes(needle));

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;

  return { items: items.slice(start, start + pageSize), total, page: safePage, pageSize, pageCount };
}
