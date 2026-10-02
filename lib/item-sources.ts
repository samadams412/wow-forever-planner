import fs from "fs";
import path from "path";
import { getItemById } from "@/lib/items";
import type { LootItem } from "@/lib/dungeon-loot";

// data/sources/foreverchanges/items/sources.json -- a single-source-per-item
// map (not wired into build-items.js, not shipped into data/items.json).
// Shape: { forever_build, items: { "<itemId>": [code, label, location] } }.
// Every entry is exactly one source, never a list -- an item sourced from
// more than one place in-game only ever shows the one foreverchanges.pro
// picked. Covers 11,625 of 21,561 catalog ids (~54%) as of build 1.60.1.70170.
const SOURCES_FILE = path.join(process.cwd(), "data", "sources", "foreverchanges", "items", "sources.json");

export type ItemSourceCode = "q" | "Q" | "v" | "C" | "m" | "w" | "B" | "R";

export type ItemSource = {
  code: ItemSourceCode;
  label: string;
  location: string;
};

// Human labels for the source type code -- `label`/`location` from the raw
// tuple are the specific name/place (e.g. "Garrick Padfoot" / "Elwynn
// Forest, in Classic"); this is the general category shown alongside them.
const SOURCE_TYPE_LABEL: Record<ItemSourceCode, string> = {
  q: "Quest Reward",
  Q: "Quest Reward",
  v: "Vendor",
  C: "Crafted",
  m: "Creature Drop",
  w: "World Drop",
  B: "Dungeon Trash Drop",
  R: "Rare Spawn Drop",
};

export function sourceTypeLabel(code: ItemSourceCode): string {
  return SOURCE_TYPE_LABEL[code] ?? code;
}

// "World drop" and "Vendor" groups aren't a real place to look -- e.g. the
// single "w" group covers 3,434 unrelated items, and "v" locations are
// generic zone counts with no vendor name. Grouping by those would produce
// a useless "3,434 other items" list, so sibling lookups only form for
// source types that name one real, specific place (a mob, a quest, a
// dungeon's trash table, a rare spawn).
//
// "C" (crafted) is deliberately excluded too, for a different reason: its
// `label` is a profession+skill-tier ("Cooking (50)"), not one specific
// recipe target, so grouping by it would list every item craftable at that
// tier -- "every other item from this profession," which is far too long
// to be useful here (2026-10-02). The profession name alone (already shown
// as the source line) is the useful signal for a crafted item.
const SIBLING_ELIGIBLE_CODES = new Set<ItemSourceCode>(["q", "Q", "m", "B", "R"]);

// A source that drops/offers this many items or more gets its sibling list
// truncated in the UI rather than dumped in full (2026-10-02) -- e.g. some
// boss/creature drop tables run 50-150+ items long.
export const SIBLING_TRUNCATE_THRESHOLD = 10;
export const SIBLING_TRUNCATE_SHOW = 9;

type RawSources = { forever_build: string; items: Record<string, [ItemSourceCode, string, string]> };

let cache: RawSources | null = null;
function load(): RawSources {
  if (cache) return cache;
  cache = JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8")) as RawSources;
  return cache;
}

let siblingIndex: Map<string, number[]> | null = null;
function groupKey(code: string, label: string, location: string): string {
  return `${code}|${label}|${location}`;
}
function loadSiblingIndex(): Map<string, number[]> {
  if (siblingIndex) return siblingIndex;
  siblingIndex = new Map();
  for (const [idStr, [code, label, location]] of Object.entries(load().items)) {
    if (!SIBLING_ELIGIBLE_CODES.has(code)) continue;
    const key = groupKey(code, label, location);
    if (!siblingIndex.has(key)) siblingIndex.set(key, []);
    siblingIndex.get(key)!.push(Number(idStr));
  }
  return siblingIndex;
}

export function getItemSource(itemId: number): ItemSource | undefined {
  const raw = load().items[String(itemId)];
  if (!raw) return undefined;
  const [code, label, location] = raw;
  return { code, label, location };
}

// Every other item that shares this exact (type, name, location) source --
// e.g. every other item "Garrick Padfoot" drops, or every other reward
// "Bounty on Garrick Padfoot" offers. Excludes the item itself. Returns
// resolved LootItems (skipping any id no longer in the current catalog)
// rather than raw ids, since every consumer wants to render them with
// LootItemPill the same way dungeon loot does.
export function getSourceSiblings(itemId: number): LootItem[] {
  const source = getItemSource(itemId);
  if (!source || !SIBLING_ELIGIBLE_CODES.has(source.code)) return [];
  const key = groupKey(source.code, source.label, source.location);
  const ids = loadSiblingIndex().get(key) ?? [];
  const siblings: LootItem[] = [];
  for (const id of ids) {
    if (id === itemId) continue;
    const item = getItemById(id);
    if (item) siblings.push(item);
  }
  return siblings;
}
