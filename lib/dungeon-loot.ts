import fs from "fs";
import path from "path";
import { dungeons, getDungeon, type Dungeon } from "@/lib/dungeons";
import { DUNGEON_MAP_LEGENDS, type DungeonMapMarker } from "@/lib/dungeon-map-legends.generated";
import questIndex from "@/data/quests/index.json";

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
  // Blizzard's stable item-class id (Weapon/Armor/Container/etc -- see
  // lib/wow-data.ts's ITEM_CLASS_NAME), not the finer subclass `type`
  // above. null for wowtbc-sourced items (no equivalent field at that
  // source) and for the couple of retail-only "WoW Token" items that carry
  // a class id (18) with no real Classic-era category.
  itemClass: number | null;
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

// One "what to watch for" fight note, parsed from foreverchanges.pro's own
// per-boss ability list (scripts/extract-foreverchanges-dungeon-maps.js) --
// e.g. {name: "Fear", flags: ["Tank", "Important"], description: "The tank
// is feared several times in this fight. A shaman's Tremor Totem helps."}.
// `flags` are foreverchanges' own role/severity tags (Tank/Healer/Damage
// dealers/Important/Bleed/Fear/...), rendered as small icon badges, not a
// closed enum here -- new ones appear as foreverchanges adds them.
export type BossAbility = { name: string | null; icon: string; flags: string[]; description: string };

// An optional single callout shown above a boss's ability list for fights
// with a pull/phase trigger worth calling out before the per-ability list
// (e.g. Shadetooth: "Kill the raptor matriarch in the tall grass...").
export type BossTrigger = { flag: string | null; text: string };

export type LootBoss = {
  name: string;
  kind: "boss" | "trash" | "rare" | "object" | "quest";
  level: number | null;
  // foreverchanges.pro's own NPC portrait render, hotlinked -- null for
  // "Trash mobs" groupings, lootable objects, and any boss sourced from
  // wowtbc.gg (which has no equivalent asset).
  portraitUrl: string | null;
  items: LootItem[];
  // Matched onto this boss by name against foreverchanges' own map/ability
  // pull (see build-dungeons.js's buildMapData) -- empty for any dungeon
  // foreverchanges hasn't written fight-mechanics prose for yet (most of
  // them, as of 2026-10-02; only 11 dungeons have this content at all).
  trigger: BossTrigger | null;
  abilities: BossAbility[];
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

// A single marker on `pinMap.src`, CSS left/top percent over the image's
// native pixel box -- same encoding QuestMap.tsx already renders zone-
// map quest pins with (foreverchanges' own x/y are already percent, not
// pixels, so no coordinate conversion is needed, same as that component's
// Wowhead-sourced pins).
export type DungeonMapPin = {
  label: string | null;
  xPct: number;
  yPct: number;
  kind: "boss" | "trash" | "rare" | "entrance";
  portraitUrl: string | null;
};

export type DungeonPinMapAttribution = { artistName: string; artistUrl: string };

// One map image for one floor/wing of a dungeon -- most pin-map dungeons
// have exactly one (`name: null`), but a few have several, switched via a
// tab control on foreverchanges.pro itself (Shadowfang Keep: 4, Gnomeregan:
// 4, Blackfathom Deeps: 3, the Deadmines: 2) -- see
// scripts/extract-foreverchanges-dungeon-maps.js's parseMapFromFlight for
// why this can only be read from the page's React Flight stream, not its
// initial server-rendered HTML (which only ever contains the first floor).
export type DungeonMapFloor = {
  name: string | null;
  src: string;
  width: number;
  height: number;
  pins: DungeonMapPin[];
};

// foreverchanges.pro's own per-dungeon map image(s) with boss/trash/rare/
// entrance pins baked in as percent coordinates -- present for only 11
// dungeons as of 2026-10-02 (see build-dungeons.js's buildPinMap). Hotlinked
// (foreverchanges.pro is an allowed remotePatterns host), never downloaded/
// rehosted -- 3 of these 11 (excavation-site, hall-of-thanes, ruins-of-
// lordaeron) are a commissioned fan map by artist Santiago Reyes, used here
// with his permission specifically (see `attribution`); the credit + link to
// the artist's own site must stay visible wherever this map renders.
export type DungeonPinMap = {
  alt: string;
  attribution: DungeonPinMapAttribution | null;
  floors: DungeonMapFloor[];
};

export type DungeonData = Dungeon & {
  backgroundImage: string;
  bossLootSource: "foreverchanges" | "wowtbc" | null;
  bosses: LootBoss[];
  questSource: "foreverchanges" | "wowtbc" | null;
  quests: Quest[];
  // null for every dungeon except the 11 foreverchanges has map/pin data
  // for -- the loot page falls back to the existing Atlas/wow.export map
  // (getDungeonMapImage et al below) unchanged when this is null.
  pinMap: DungeonPinMap | null;
};

// Static map image for a dungeon, converted from its raw .blp source via
// `node scripts/convert-dungeon-maps.js` (see that script for the
// dungeonId -> source-texture mapping, including a couple of flagged
// unverified guesses for UBRS/Stratholme) into public/images/dungeon-maps/.
// A literal lookup, not a filesystem scan, per the "no runtime-variable
// disk reads" rule in CLAUDE.md. Only dungeons that reuse Classic-era zones
// have an entry -- new-in-Forever dungeons show the "Map coming soon"
// placeholder instead, EXCEPT the three below, whose maps were extracted
// directly from wow.export (not a Classic-era BLP) and cropped via
// `node scripts/crop-dungeon-maps.js` into public/maps/dungeons/<slug>/map.png
// -- a separate pipeline/location from the BLP-sourced webp maps above. See
// 03-Handoffs/maps/2026-10-01-dungeon-maps-extraction.md for how each was cropped.
const DUNGEON_MAP_IMAGES: Partial<Record<string, string>> = {
  "ragefire-chasm": "/images/dungeon-maps/ragefire-chasm.webp",
  "wailing-caverns": "/images/dungeon-maps/wailing-caverns.webp",
  deadmines: "/images/dungeon-maps/deadmines.webp",
  "shadowfang-keep": "/images/dungeon-maps/shadowfang-keep.webp",
  "blackfathom-deeps": "/images/dungeon-maps/blackfathom-deeps.webp",
  "the-stockade": "/images/dungeon-maps/the-stockade.webp",
  "razorfen-kraul": "/images/dungeon-maps/razorfen-kraul.webp",
  gnomeregan: "/images/dungeon-maps/gnomeregan.webp",
  "sm-graveyard": "/images/dungeon-maps/sm-graveyard.webp",
  "sm-library": "/images/dungeon-maps/sm-library.webp",
  "sm-armory": "/images/dungeon-maps/sm-armory.webp",
  "sm-cathedral": "/images/dungeon-maps/sm-cathedral.webp",
  "razorfen-downs": "/images/dungeon-maps/razorfen-downs.webp",
  uldaman: "/images/dungeon-maps/uldaman.webp",
  zulfarrak: "/images/dungeon-maps/zulfarrak.webp",
  maraudon: "/images/dungeon-maps/maraudon.webp",
  "sunken-temple": "/images/dungeon-maps/sunken-temple.webp",
  "blackrock-depths": "/images/dungeon-maps/blackrock-depths.webp",
  "dire-maul-east": "/images/dungeon-maps/dire-maul-east.webp",
  "dire-maul-west": "/images/dungeon-maps/dire-maul-west.webp",
  "dire-maul-north": "/images/dungeon-maps/dire-maul-north.webp",
  lbrs: "/images/dungeon-maps/lbrs.webp",
  // Originally flagged unverified; confirmed by the Atlas legend data
  // (lib/dungeon-map-legends.generated.ts) itself naming this key
  // "BlackrockSpireUpper" -- unambiguously UBRS.
  ubrs: "/images/dungeon-maps/ubrs.webp",
  scholomance: "/images/dungeon-maps/scholomance.webp",
  // Originally an unverified guess, and backwards -- resolved by cross-
  // referencing the two sides' real boss rosters against
  // data/dungeons/Classic-Classic.lua. See scripts/convert-dungeon-maps.js.
  "stratholme-undead": "/images/dungeon-maps/stratholme-undead.webp",
  "stratholme-live": "/images/dungeon-maps/stratholme-live.webp",
  "city-of-dalaran": "/maps/dungeons/city-of-dalaran/map.png",
  "hall-of-thanes": "/maps/dungeons/hall-of-thanes/map.png",
  "ruins-of-lordaeron": "/maps/dungeons/ruins-of-lordaeron/map.png",
};

export function getDungeonMapImage(dungeonId: string): string | null {
  return DUNGEON_MAP_IMAGES[dungeonId] ?? null;
}

// Dungeons whose map came from a wow.export tile extraction (see
// scripts/crop-dungeon-maps.js) rather than the Atlas addon's BLP dump --
// the map panel's attribution caption needs to say something true for these.
const WOWEXPORT_SOURCED_MAPS = new Set(["city-of-dalaran", "hall-of-thanes", "ruins-of-lordaeron"]);

export function getDungeonMapAttribution(dungeonId: string): string {
  return WOWEXPORT_SOURCED_MAPS.has(dungeonId) ? "Map extracted via wow.export" : "Map courtesy of Atlas Addon";
}

// Marker legend for a dungeon's map image (the numbers/letters already baked
// into the image itself) -- parsed from the Atlas addon's own data by
// scripts/build-dungeon-map-legends.js into dungeon-map-legends.generated.ts.
// stratholme-undead/-live and any new-in-Forever dungeon have no entry (see
// that script's notes on why Stratholme specifically can't be split), which
// is fine -- the map viewer and sidebar simply don't render a legend list.
export function getDungeonMapLegend(dungeonId: string): DungeonMapMarker[] | null {
  return DUNGEON_MAP_LEGENDS[dungeonId] ?? null;
}

const DATA_DIR = path.join(process.cwd(), "data", "dungeons");
let cache: Map<string, DungeonData> | null = null;

// Quest XP comes from the same index /quests/<id> renders (data/quests/
// index.json, built by scripts/build-quests.js), so the dungeon view can't
// drift from it. Dungeon quest ids are "quest-<n>" where <n> is the index id.
const QUEST_XP_BY_ID = new Map<number, number>(questIndex.quests.map((q) => [q.id, q.xp]));

// Overwrites a dungeon quest's stored XP string with the index value when the
// quest exists there. Quests missing from the index keep their stored string
// unchanged. As of 2026-10-03 that's six Excavation Site quests (quest-95xxx),
// which have no /quests page and no XP value at all (experience is null), so
// there is no stale number left behind for them.
function applyIndexXp(quest: Quest): void {
  const id = Number(quest.id.replace(/^quest-/, ""));
  const xp = QUEST_XP_BY_ID.get(id);
  if (xp === undefined) return;
  quest.experience = xp > 0 ? `${xp.toLocaleString("en-US")} XP` : null;
}

function loadAll(): Map<string, DungeonData> {
  if (cache) return cache;
  const map = new Map<string, DungeonData>();
  if (fs.existsSync(DATA_DIR)) {
    for (const file of fs.readdirSync(DATA_DIR)) {
      if (!file.endsWith(".json")) continue;
      const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as DungeonData;
      for (const quest of data.quests) applyIndexXp(quest);
      map.set(data.id, data);
    }
  }
  cache = map;
  return map;
}

export function getDungeonData(dungeonId: string): DungeonData | undefined {
  return loadAll().get(dungeonId);
}

// Every dungeon's full boss/quest data at once -- for building a reverse
// item -> dungeon index (lib/items.ts's dungeon-drop filter) without
// exposing the module-private loadAll()/cache directly.
export function getAllDungeonData(): DungeonData[] {
  return [...loadAll().values()];
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
