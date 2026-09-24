import fs from "fs";
import path from "path";
import type { LootItem } from "@/lib/dungeon-loot";
import { getAllDungeonData, getDungeonLootIndex } from "@/lib/dungeon-loot";

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

// "new" and "changed" items are the ones with genuinely distinct content
// from Classic (real informational value -- what a visitor would actually
// search for); "same" and "missing" are thin/duplicate-ish pages (a "same
// as Classic" synthesized tooltip, or a Classic item the beta hasn't
// touched at all) that exist for completeness but aren't worth indexing at
// 20k+ pages. Used by both app/sitemap.ts (which of the 21,458 /items/<id>
// pages to list) and the item page's own generateMetadata (robots.index) --
// kept as one shared predicate so the two never drift apart.
export function isIndexableItemStatus(status: ItemStatus | null): boolean {
  return status === "new" || status === "changed";
}

export function getIndexableItemIds(): number[] {
  return loadAll()
    .filter((item) => item.itemId !== null && isIndexableItemStatus(item.status))
    .map((item) => item.itemId as number);
}

// Ordered to match foreverchanges.pro/items' own category sidebar (largest
// buckets first isn't the point -- matching a familiar reading order is).
// Every value here is a real Blizzard item-class id present in this
// catalog (see lib/wow-data.ts's ITEM_CLASS_NAME for why 3/8/10/14 and the
// stray 18 "WoW Token" items aren't included).
export const CATEGORY_VALUES = [2, 4, 1, 0, 7, 6, 11, 9, 5, 15, 12, 13];

export function getItemCategoryCounts(): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const value of CATEGORY_VALUES) counts[value] = 0;
  for (const item of loadAll()) {
    if (item.itemClass !== null && item.itemClass in counts) counts[item.itemClass]++;
  }
  return counts;
}

// Every dungeon that has loot data, for the dungeon-drop filter dropdown --
// same list/order the Dungeon Loot index page already uses.
export function getDungeonFilterOptions(): { id: string; name: string }[] {
  return getDungeonLootIndex().map((d) => ({ id: d.id, name: d.name }));
}

// itemId -> every dungeon id that drops it, built once from the already-
// normalized per-dungeon data (boss/trash/rare loot and quest rewards --
// the exact same two drop sources the per-dungeon loot page itself shows).
// Not every drop has a real itemId (wowtbc-sourced or unresolved items are
// null) -- those simply can't participate in this filter, same as they
// already can't link to /items/[itemId] anywhere else on the site.
let dungeonsByItemId: Map<number, Set<string>> | null = null;
function loadDungeonsByItemId(): Map<number, Set<string>> {
  if (dungeonsByItemId) return dungeonsByItemId;
  const index = new Map<number, Set<string>>();
  const add = (itemId: number | null, dungeonId: string) => {
    if (itemId === null) return;
    if (!index.has(itemId)) index.set(itemId, new Set());
    index.get(itemId)!.add(dungeonId);
  };
  for (const dungeon of getAllDungeonData()) {
    for (const boss of dungeon.bosses) for (const item of boss.items) add(item.itemId, dungeon.id);
    for (const quest of dungeon.quests) for (const item of quest.rewards) add(item.itemId, dungeon.id);
  }
  dungeonsByItemId = index;
  return index;
}

export type ItemQuery = {
  status?: ItemStatus | "all";
  q?: string;
  rarity?: number;
  category?: number;
  dungeon?: string;
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
  category,
  dungeon,
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
  if (category !== undefined) items = items.filter((item) => item.itemClass === category);
  if (dungeon !== undefined) {
    const byItemId = loadDungeonsByItemId();
    items = items.filter((item) => item.itemId !== null && byItemId.get(item.itemId)?.has(dungeon));
  }
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
