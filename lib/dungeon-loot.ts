import fs from "fs";
import path from "path";
import { dungeons, getDungeon, type Dungeon } from "@/lib/dungeons";

// Normalized dungeon data -- bosses/loot/quests -- built by
// scripts/build-dungeons.js from two sources: foreverchanges.pro (item
// ids/icons/quality/real tooltip text, full quest chains with giver/
// location/objectives) and, as a fallback only where foreverchanges has
// nothing, the existing wowtbc.gg-sourced community loot tables. See that
// script's header comment for the reconciliation policy. Every item comes
// through in one shape regardless of which source it came from -- fields
// only one source ever fills in (icon, quality, tooltip, dropChance, ...)
// are simply null from the other.
export type MapRef = { name: string; href: string };

export type LootItem = {
  name: string;
  slot: string | null;
  type: string | null;
  // foreverchanges-only fields (null when source === "wowtbc")
  itemId: number | null;
  icon: string | null;
  quality: number | null;
  itemLevel: number | null;
  requiredLevel: number | null;
  tooltip: string[] | null;
  // true when `tooltip` was reconstructed from structured fields (slot,
  // class restriction, weapon speed/dps, required level) rather than being
  // the beta client's own rendered tooltip text -- foreverchanges has no
  // full tooltip text for "same"-status items (see fc-item.js). Armor
  // value and stat bonuses are never derivable this way, so a synthesized
  // tooltip's absence of those lines means "not available", not "none".
  tooltipSynthesized: boolean;
  classicTooltip: string[] | null;
  status: "new" | "changed" | "same" | "missing" | null;
  // wowtbc-only fields (null/false when source === "foreverchanges")
  dropChance: number | null;
  // The source showed "<N%" rather than an exact value (e.g. "<1%") --
  // render dropChance with a leading "<" rather than as an exact number.
  dropChanceUnder: boolean;
  // wowtbc.gg itself shows "Not Yet Discovered" for this item's slot/type --
  // genuinely unknown at the source, not a gap in our own scraping.
  unknown: boolean;
  source: "foreverchanges" | "wowtbc";
};

export type LootBoss = {
  name: string;
  kind: "boss" | "trash" | "rare" | "object" | "quest";
  level: number | null;
  // foreverchanges.pro's own NPC portrait render, hotlinked -- null for
  // "Trash mobs" groupings, lootable objects, and any boss sourced from
  // wowtbc.gg (which has no equivalent asset).
  portraitUrl: string | null;
  items: LootItem[];
};

export type QuestObjective = {
  label: string;
  value: string;
  mapRef: MapRef | null;
  needItems: { itemHref: string | null; name: string | null; qty: string | null; source: string | null }[] | null;
};

export type QuestGiver = { name: string | null; location: string; mapRef: MapRef | null };

export type Quest = {
  id: string;
  faction: "Alliance" | "Horde" | "Both" | null;
  name: string;
  level: number | null;
  minLevel: number | null;
  text: string | null;
  giver: QuestGiver | null;
  prereq: string | null;
  objectives: QuestObjective[];
  experience: string | null;
  money: string | null;
  rewardHeading: string | null;
  rewardNotes: string[];
  rewards: LootItem[];
  source: "foreverchanges" | "wowtbc";
};

export type DungeonData = Dungeon & {
  backgroundImage: string;
  bossLootSource: "foreverchanges" | "wowtbc" | null;
  bosses: LootBoss[];
  questSource: "foreverchanges" | "wowtbc" | null;
  quests: Quest[];
};

const DATA_DIR = path.join(process.cwd(), "data", "dungeons");
let cache: Map<string, DungeonData> | null = null;

function loadAll(): Map<string, DungeonData> {
  if (cache) return cache;
  const map = new Map<string, DungeonData>();
  if (fs.existsSync(DATA_DIR)) {
    for (const file of fs.readdirSync(DATA_DIR)) {
      if (!file.endsWith(".json")) continue;
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as DungeonData;
      map.set(data.id, data);
    }
  }
  cache = map;
  return map;
}

export function getDungeonData(dungeonId: string): DungeonData | undefined {
  return loadAll().get(dungeonId);
}

export function hasDungeonLoot(dungeonId: string): boolean {
  const d = getDungeonData(dungeonId);
  return !!d && (d.bosses.length > 0 || d.quests.length > 0);
}

export type DungeonLootSummary = Dungeon & {
  backgroundImage: string;
  bossCount: number;
  questCount: number;
};

// Every dungeon that has loot or quest data, sorted by level ascending
// (levelMin then levelMax) -- same ordering the Level Ranges chart's own
// row-packing is built from, so the loot index table reads consistently
// with it rather than introducing its own sort.
export function getDungeonLootIndex(): DungeonLootSummary[] {
  return dungeons
    .filter((d) => hasDungeonLoot(d.id))
    .map((d) => {
      const data = getDungeonData(d.id)!;
      return { ...d, backgroundImage: data.backgroundImage, bossCount: data.bosses.length, questCount: data.quests.length };
    })
    .sort((a, b) => a.levelMin - b.levelMin || a.levelMax - b.levelMax);
}

export function getDungeonWithLoot(dungeonId: string): { dungeon: Dungeon; data: DungeonData } | undefined {
  const dungeon = getDungeon(dungeonId);
  const data = getDungeonData(dungeonId);
  if (!dungeon || !data) return undefined;
  return { dungeon, data };
}

// Every dungeon's backgroundImage, keyed by id -- used by the Level Ranges
// timeline, which needs this for all 35 dungeons up front (not lazily per
// click the way the detail data is), including the 7 that have no bosses/
// quests yet (their art still exists on foreverchanges even before any
// loot has been discovered).
export function getAllBackgroundImages(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, data] of loadAll()) out[id] = data.backgroundImage;
  return out;
}
