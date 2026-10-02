import fs from "fs";
import path from "path";
import { getItemById } from "@/lib/items";
import { getZoneName, getContinentForZone } from "@/lib/zone-areas";
import { ZONE_MAP_IMAGE_IDS } from "@/lib/zone-map-images.generated";
import type { LootItem } from "@/lib/dungeon-loot";

// data/sources/foreverchanges/quests/list.json -- a flat listing pull from
// foreverchanges.pro, 5,049 quests (vs. Wowhead's reported 5,231 for WoW
// Forever as of 2026-10-02 -- close but not exhaustive). Structured fields
// only: name/level/rewards/location. Short keys match the raw pull as-is
// (not renamed at rest, only at the point this module reads them) -- see
// QUEST_FIELD below for what each one means.
const QUESTS_FILE = path.join(process.cwd(), "data", "sources", "foreverchanges", "quests", "list.json");

// data/sources/cmangos/quest-text.json -- narrative text (title/details/
// objectives/offer-reward/request-items/end text) for 4,245 quest_template
// rows pulled from cmangos/classic-db (GPL-3.0), built by
// scripts/build-cmangos-quest-text.js. 4,204 of list.json's 5,049 quests
// match a cmangos id -- those are "base-game" quests Forever carried over
// from Classic (attribution: cMaNGOS classic-db). The other 845 have no
// cmangos match at all, which lines up exactly with foreverchanges.pro's
// own "845 New in Forever" stat -- these are quests new to Forever with no
// Classic-era precedent, so cmangos never had them; their structured data
// (what we do have, via list.json) traces back to Wowhead's Forever
// database per foreverchanges.pro's own sourcing note, so that's their
// attribution. See the 2026-10-02 quest-pipeline handoff for the full
// cross-reference.
const CMANGOS_FILE = path.join(process.cwd(), "data", "sources", "cmangos", "quest-text.json");

// data/sources/cmangos/quest-givers.json -- creature/gameobject quest-start
// relation rows cross-referenced against creature_template/gameobject_template
// for names, built by scripts/build-cmangos-quest-givers.js (same dump as
// CMANGOS_FILE). Each giver also carries an optional `point` (zone + percent
// coordinates), added by scripts/build-cmangos-quest-coords.js from the same
// dump's `creature`/`gameobject` spawn tables -- ~94% of givers resolve one
// (see that script's own header for the zone-matching tiebreaker and the
// known precision caveat vs. Wowhead's own points). Covers the same
// Classic-carryover quest set CMANGOS_FILE does; new-to-Forever quests have
// no row here either. Start only -- cmangos's turn-in relation tables
// (`*_involvedrelation`) aren't pulled, so these quests never get a
// cross-zone two-marker map the way a Wowhead-sourced quest can.
// data/sources/wowhead/quest-text.json -- narrative text for new-to-Forever
// quests cMaNGOS has no row for, parsed from a local Wowhead Forever scrape by
// scripts/build-wowhead-quest-text.js (same row shape as CMANGOS_FILE; already
// cleaned of placeholders, so it skips sanitizeQuestText). Only consulted when
// cmangos has no row for the quest.
const WOWHEAD_FILE = path.join(process.cwd(), "data", "sources", "wowhead", "quest-text.json");

// data/sources/wowhead/quest-extras.json -- optional per-quest XP/reputation/
// start+end NPC/mentioned-item fields from the same Wowhead scrape, built by
// scripts/build-wowhead-quest-text.js. Every field is present only when the
// page had it. Covers new-to-Forever quests only (the scrape's scope).
const WOWHEAD_EXTRAS_FILE = path.join(process.cwd(), "data", "sources", "wowhead", "quest-extras.json");

const CMANGOS_GIVERS_FILE = path.join(process.cwd(), "data", "sources", "cmangos", "quest-givers.json");

// QUEST_FIELD (raw list.json key -> meaning), confirmed by inspecting the
// file directly:
//   i  quest id
//   n  name
//   l  quest level
//   m  minimum/recommended level to pick up
//   s  side: "a" Alliance, "h" Horde, "" both
//   y  type tag: dungeon | elite | escort | pvp | raid | event (often absent)
//   c  [locationKind, locationId] -- locationKind is one of zone/dungeon/
//      raid/battleground/sort ("sort" = a Blizzard QuestSort grouping used
//      when there's no single real zone, e.g. class-quest-style hubs)
//   x  XP reward
//   g  money reward, in copper
//   r  reward CHOICE tuples (pick one): [itemId, icon, qty][]
//   k  reward GUARANTEED tuples (kept regardless of choice): [itemId, icon, qty][]
//   f  a faction id tied to a reputation reward (no local id->name map, not
//      surfaced here)
//   cl class-requirement bitmask (not surfaced here)
//   ch position within a quest chain (not surfaced here)
//   v  unclear ("u"/"n" seen) -- not surfaced here

export type QuestReputation = { faction: string; factionId: number | null; amount: number };
export type QuestNpc = { type: "npc" | "object"; id: number; name: string };

// A quest giver/turn-in point from Wowhead's embedded zone-map data --
// zoneId is a real AreaTable id, x/y are zone-relative percent (0-100,
// west->east / north->south -- the standard TomTom/Atlas/Wowhead in-game
// coordinate convention), not world or pixel coordinates. See
// lib/map-coords.ts's zonePercentToWorld for the conversion this feeds.
type WowheadPoint = { point: "start" | "end"; zoneId: number; zone: string; npcId: number; name: string; x: number; y: number };

type WowheadExtras = {
  xp?: number;
  reputation?: QuestReputation[];
  start?: QuestNpc[];
  end?: QuestNpc[];
  items?: number[];
  points?: WowheadPoint[];
};

export type QuestSide = "Alliance" | "Horde" | "Both";
export type QuestLocationKind = "zone" | "dungeon" | "raid" | "battleground" | "sort" | "unknown";
export type QuestTextSource = "cmangos" | "wowhead";

export type Quest = {
  id: number;
  name: string;
  // Quest level ("Level" column) -- the level the quest itself is tuned
  // for. May differ from requiredLevel when a quest is a breadcrumb/catch-
  // up quest offered below its own level, or level-restricted above it.
  level: number | null;
  // Minimum character level required to pick the quest up ("Required
  // Level" column) -- was previously rendered combined with `level` as
  // "Level: 30 (from 20)"; now a separate column (2026-10-02).
  requiredLevel: number | null;
  side: QuestSide;
  typeTag: string | null;
  locationKind: QuestLocationKind;
  // Resolved zone name when locationKind is "zone" and the area id matches
  // a zone this site already tracks (lib/zone-areas.ts); null otherwise --
  // dungeon/raid/battleground/sort location ids have no local name lookup
  // yet, so those render by locationKind/typeTag alone, not a stray numeric
  // id.
  locationName: string | null;
  // Which /reference/map/[continent] page locationName lives on, for
  // linking the location text to the map (#sel=zone:<areaId> deep-link, see
  // MapExplorer.tsx's parseHash -- the id, not the name) -- null whenever
  // locationName is (not a zone, or a zone id the map doesn't have geometry
  // for).
  locationContinent: string | null;
  // The raw areaId behind locationName -- needed (not just the name) to
  // build the #sel=zone:<areaId> deep-link. Null under the same conditions
  // as locationContinent.
  locationZoneId: number | null;
  xp: number;
  money: number;
  choiceRewards: LootItem[];
  guaranteedRewards: LootItem[];
  // Which upstream the quest's underlying data (name/text/structure) traces
  // back to -- "cmangos" for quests carried over from Classic (matched
  // against cmangos/classic-db's quest_template), "wowhead" for quests new
  // to Forever with no Classic-era precedent. See CMANGOS_FILE comment
  // above for how this is determined.
  textSource: QuestTextSource;
};

const SIDE_MAP: Record<string, QuestSide> = { a: "Alliance", h: "Horde" };

type RawQuest = {
  i: number;
  n: string;
  l: number;
  m: number;
  s: string;
  y?: string;
  // null for a small number of entries (25/5,049 as of this pull) --
  // foreverchanges has no location data for these at all.
  c: [QuestLocationKind, number] | null;
  x: number;
  g?: number;
  r?: [number, string, number][];
  k?: [number, string, number][];
};

// A reward tuple's itemId resolves against the already-built catalog
// (data/items.json, via lib/items.ts's getItemById) 98.4% of the time
// (3,287/3,341 reward references as of this pull) -- the same id-join
// pattern scripts/build-dungeons.js uses for dungeon quest rewards, just
// done at request time here since list.json isn't run through that
// build step. The rare unmatched id still renders (icon + "Unknown Item")
// rather than being dropped silently.
function resolveRewardItem([itemId, icon, qty]: [number, string, number]): LootItem {
  const fullItem = getItemById(itemId);
  if (fullItem) return fullItem;
  return {
    name: "Unknown Item",
    slot: null,
    type: null,
    itemClass: null,
    itemId,
    icon,
    quality: null,
    itemLevel: null,
    requiredLevel: null,
    tooltip: null,
    tooltipSynthesized: false,
    classicTooltip: null,
    status: null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: true,
    source: "foreverchanges",
  };
}

function toQuest(raw: RawQuest, hasCmangosText: boolean): Quest {
  const [locationKind, locationId] = raw.c ?? ["unknown", 0];
  const locationName = locationKind === "zone" ? getZoneName(locationId) : null;
  return {
    id: raw.i,
    name: raw.n,
    level: raw.l || null,
    requiredLevel: raw.m || null,
    side: SIDE_MAP[raw.s] ?? "Both",
    typeTag: raw.y ?? null,
    locationKind,
    locationName,
    locationContinent: locationName ? getContinentForZone(locationId) : null,
    locationZoneId: locationName ? locationId : null,
    // list.json's XP is 0 for every quest Wowhead has XP for (checked: no
    // quest has both), so Wowhead only ever fills a gap, never overrides.
    xp: raw.x || loadExtras()[String(raw.i)]?.xp || 0,
    money: raw.g || 0,
    choiceRewards: (raw.r ?? []).map(resolveRewardItem),
    guaranteedRewards: (raw.k ?? []).map(resolveRewardItem),
    textSource: hasCmangosText ? "cmangos" : "wowhead",
  };
}

type CmangosQuestRow = {
  title: string | null;
  details: string | null;
  objectives: string | null;
  offerRewardText: string | null;
  requestItemsText: string | null;
  endText: string | null;
  objectiveText: string[];
  // Classic-era (cmangos) chain links -- see build-cmangos-quest-text.js's
  // own comment on why these three are kept separate rather than merged.
  prevQuestId: number | null;
  nextQuestId: number | null;
  nextQuestInChain: number | null;
};

let cache: Quest[] | null = null;
let cmangosCache: Record<string, CmangosQuestRow> | null = null;
let byId: Map<number, Quest> | null = null;
let wowheadCache: Record<string, CmangosQuestRow> | null = null;
let extrasCache: Record<string, WowheadExtras> | null = null;
let giversCache: Record<string, CmangosGiver[]> | null = null;

function loadCmangos(): Record<string, CmangosQuestRow> {
  if (!cmangosCache) {
    const parsed = JSON.parse(fs.readFileSync(CMANGOS_FILE, "utf8")) as { quests: Record<string, CmangosQuestRow> };
    cmangosCache = parsed.quests;
  }
  return cmangosCache;
}

function loadWowhead(): Record<string, CmangosQuestRow> {
  if (!wowheadCache) {
    const parsed = JSON.parse(fs.readFileSync(WOWHEAD_FILE, "utf8")) as { quests: Record<string, CmangosQuestRow> };
    wowheadCache = parsed.quests;
  }
  return wowheadCache;
}

function loadExtras(): Record<string, WowheadExtras> {
  if (!extrasCache) {
    const parsed = JSON.parse(fs.readFileSync(WOWHEAD_EXTRAS_FILE, "utf8")) as { quests: Record<string, WowheadExtras> };
    extrasCache = parsed.quests;
  }
  return extrasCache;
}

// A giver's map point, when build-cmangos-quest-coords.js could resolve one
// of its cmangos `creature`/`gameobject` spawn rows to a mappable zone --
// zoneId/zone/xPct/yPct in the exact same convention as WowheadPoint (see
// that type's own comment); absent for the ~6% of givers with no spawn row,
// no spawn in a mappable zone, or an ambiguous spawn set the quest's own
// known zone couldn't disambiguate.
type CmangosGiver = { name: string; type: "creature" | "gameobject"; id: number; point?: { zoneId: number; zone: string; xPct: number; yPct: number } };

function loadGivers(): Record<string, CmangosGiver[]> {
  if (!giversCache) {
    const parsed = JSON.parse(fs.readFileSync(CMANGOS_GIVERS_FILE, "utf8")) as {
      givers: Record<string, CmangosGiver[]>;
    };
    giversCache = parsed.givers;
  }
  return giversCache;
}

function loadAll(): Quest[] {
  if (cache) return cache;
  const raw = JSON.parse(fs.readFileSync(QUESTS_FILE, "utf8")) as RawQuest[];
  const cmangos = loadCmangos();
  cache = raw.map((q) => toQuest(q, Object.prototype.hasOwnProperty.call(cmangos, String(q.i))));
  byId = new Map(cache.map((q) => [q.id, q]));
  return cache;
}

export type QuestNarrative = {
  details: string | null;
  objectives: string | null;
  offerRewardText: string | null;
  requestItemsText: string | null;
  endText: string | null;
  objectiveText: string[];
};

export type QuestChainLink = { id: number; name: string };

// xPct/yPct are Wowhead's own zone-relative percent coordinates (0-100,
// west->east / north->south), used as-is against the zone map image's own
// pixel dimensions (pixel = pct/100 * imageWidth/Height) -- see
// QuestMapViewer.tsx. No world-coordinate conversion: these images are
// already percent-addressed, unlike the real continent tile pyramid.
export type QuestMapMarker = { kind: "start" | "end"; npcName: string; xPct: number; yPct: number };

// One mini-map's worth of render-ready data -- a quest gets one of these per
// distinct mappable zone its start/turn-in points fall in (so a same-zone
// quest gets one group with both markers, a cross-zone quest gets two). A
// point whose zoneId has no image in ZONE_MAP_IMAGE_IDS is dropped silently
// rather than surfacing a broken map, per-point not per-quest -- a quest
// with one mappable and one unmappable point still gets a one-marker map
// instead of none at all.
export type QuestMapGroup = {
  zoneName: string;
  imageUrl: string;
  markers: QuestMapMarker[];
};

function buildMapGroups(points: WowheadPoint[] | undefined): QuestMapGroup[] {
  if (!points || points.length === 0) return [];
  const byZone = new Map<number, { zoneName: string; markers: QuestMapMarker[] }>();
  for (const p of points) {
    if (!ZONE_MAP_IMAGE_IDS.has(p.zoneId)) continue;
    let entry = byZone.get(p.zoneId);
    if (!entry) {
      entry = { zoneName: p.zone, markers: [] };
      byZone.set(p.zoneId, entry);
    }
    entry.markers.push({ kind: p.point, npcName: p.name, xPct: p.x, yPct: p.y });
  }

  // Start's own zone first, so a two-group (cross-zone) quest always renders
  // "quest giver" on the left and "turn-in" on the right.
  const groups = [...byZone.entries()].sort(([, a], [, b]) => {
    const aStarts = a.markers.some((m) => m.kind === "start") ? 0 : 1;
    const bStarts = b.markers.some((m) => m.kind === "start") ? 0 : 1;
    return aStarts - bStarts;
  });

  return groups.map(([zoneId, entry]) => ({
    zoneName: entry.zoneName,
    imageUrl: `/images/zone-maps/${zoneId}.jpg`,
    markers: entry.markers,
  }));
}

// Same shape/grouping as buildMapGroups, for cmangos-only quests that have
// no Wowhead point data at all but DO have a giver with a resolved cmangos
// spawn point (see build-cmangos-quest-coords.js). Start-only -- cmangos's
// `*_involvedrelation` (turn-in) tables aren't pulled, matching giverName's
// own "no end relation" limitation above -- so this always produces at most
// one single-marker group, never a cross-zone two-group map.
function buildGiverMapGroups(givers: CmangosGiver[] | null): QuestMapGroup[] {
  if (!givers) return [];
  const withPoints = givers.filter((g): g is CmangosGiver & { point: NonNullable<CmangosGiver["point"]> } => !!g.point);
  if (withPoints.length === 0) return [];
  const byZone = new Map<number, { zoneName: string; markers: QuestMapMarker[] }>();
  for (const g of withPoints) {
    let entry = byZone.get(g.point.zoneId);
    if (!entry) {
      entry = { zoneName: g.point.zone, markers: [] };
      byZone.set(g.point.zoneId, entry);
    }
    if (!entry.markers.some((m) => m.npcName === g.name)) {
      entry.markers.push({ kind: "start", npcName: g.name, xPct: g.point.xPct, yPct: g.point.yPct });
    }
  }
  return [...byZone.entries()].map(([zoneId, entry]) => ({
    zoneName: entry.zoneName,
    imageUrl: `/images/zone-maps/${zoneId}.jpg`,
    markers: entry.markers,
  }));
}

export type QuestDetail = Quest & {
  // cmangos row if present, else the Wowhead-scrape row (new-to-Forever
  // quests), else null -- 29 of the 845 new quests have no text in either.
  narrative: QuestNarrative | null;
  // Which source the narrative above came from -- null whenever narrative is.
  narrativeSource: QuestTextSource | null;
  // Each chain link resolves against this site's own quest catalog
  // (list.json) -- a cmangos-side id that isn't one of our 5,049 quests
  // (removed/renamed out of Forever) resolves to null rather than a dead
  // link or a cmangos-only name Forever may not actually use.
  prevQuest: QuestChainLink | null;
  nextQuest: QuestChainLink | null;
  nextQuestInChain: QuestChainLink | null;
  // Quest-start giver name(s) from cmangos's creature/gameobject relation
  // tables (see CMANGOS_GIVERS_FILE above), joined with "/" when more than
  // one npc/object can start the quest. Null when cmangos has no relation
  // row for this quest (new-to-Forever quests, or a Classic-carryover quest
  // that's chain-granted rather than picked up from a physical giver).
  giverName: string | null;
  // Turn-in NPC/object name(s), joined like giverName. Wowhead-sourced quests
  // only (cMaNGOS data here has no end relation) -- null when absent.
  turnInName: string | null;
  // Reputation rewards (may be negative) -- empty when the quest has none.
  reputation: QuestReputation[];
  // Items the Wowhead page mentions that resolve against the item catalog and
  // aren't already shown as a reward -- empty when none. Unresolvable ids are
  // dropped, not rendered as dead links.
  mentionedItems: LootItem[];
  // One mini-map per distinct mappable zone the quest's start/turn-in points
  // fall in (0, 1, or 2 -- see buildMapGroups). Empty for the ~4,520 quests
  // with no Wowhead point data (cMaNGOS-only quests, or a Wowhead quest with
  // no Mapper block) or whose only point(s) are in an untiled zone.
  mapGroups: QuestMapGroup[];
};

// Known-broken chain pointers in the raw cmangos data: a quest_template row's
// PrevQuestId/NextQuestId/NextQuestInChain points at a quest id whose own
// cmangos row has no real text (details === null) -- a duplicate-named
// quest_template entry that's effectively a stub -- while a sibling id with
// the SAME name elsewhere in the dump carries the real narrative text.
// Confirmed case: quest 2 ("Sharptalon's Claw")'s PrevQuestId (6383) is an
// empty "The Ashenvale Hunt" stub (details: null, x: 0 XP in list.json);
// quest 235's "The Ashenvale Hunt" row has the real giver text (confirmed
// via quest-givers.json: 6383's own creature_questrelation giver is
// "Senani Thunderheart," matching 235's narrative text verbatim) and is used
// here instead.
//
// A full scan (2026-10-02 quest-journal-polish session) found several more
// quests pointing at the same 6383 stub (ids 23/24, "Ursangous's Paw"/
// "Shadumbra's Head" -- same Ashenvale-Hunt chain) plus unrelated clusters
// ("The Sparklematic 5200!", "The Tome of Divinity", "The Missing
// Diplomat"). A follow-up pass (2026-10-02 dungeon-quest-sync session)
// re-checked each cluster for a stub-vs-candidate giver IDENTITY match
// (not just a text substring match, which isn't selective enough -- two of
// the three Ashenvale-Hunt candidates have byte-identical narrative text)
// -- only "The Missing Diplomat" resolved: stub 1267's own
// creature_questrelation giver is "Archmage Tervosh," and exactly one of
// its 16 same-titled candidates (1266) has that same giver, with no other
// candidate sharing it. The rest are still genuinely ambiguous (0 or 2+
// candidates share the stub's giver) -- see that session's handoff for the
// full per-cluster candidate list and the giver-identity table.
const CHAIN_LINK_OVERRIDES: Partial<Record<number, { prevQuestId?: number; nextQuestId?: number; nextQuestInChain?: number }>> = {
  2: { prevQuestId: 235 },
  1324: { nextQuestInChain: 1266 },
};

function resolveChainLink(id: number | null): QuestChainLink | null {
  if (id === null) return null;
  loadAll();
  const quest = byId?.get(id);
  return quest ? { id: quest.id, name: quest.name } : null;
}

// cMaNGOS's raw quest_template text carries the WoW client's own in-text
// escape codes ($N player name, $B/$b line break, $C/$c class name cap/
// lowercase, $R/$r race name cap/lowercase, $G.../...; gender-conditional
// text) -- these render client-side in-game against the actual reading
// player's name/class/race/gender, none of which this static, server-
// rendered page has. Substituted with neutral stand-ins (first branch of a
// $G.../...; pair) rather than left as literal "$N"/"$B$B" in the rendered
// text -- an approximation (a female player still reads "he" if a quest's
// $G only offers "he:she;" in that order, etc.) but far more readable than
// the raw placeholder syntax.
function sanitizeQuestText(text: string): string {
  return text
    .replace(/\$[Gg]([^:;]*):([^;]*);/g, (_m, male) => male)
    .replace(/\$[Bb]/g, "\n\n")
    .replace(/\$[Nn]/g, "adventurer")
    .replace(/\$C/g, "Champion")
    .replace(/\$c/g, "champion")
    .replace(/\$R/g, "friend")
    .replace(/\$r/g, "friend")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function getQuestById(id: number): QuestDetail | null {
  loadAll();
  const quest = byId?.get(id);
  if (!quest) return null;
  const cmangosRow = loadCmangos()[String(id)] ?? null;
  const wowheadRow = cmangosRow ? null : (loadWowhead()[String(id)] ?? null);
  const overrides = CHAIN_LINK_OVERRIDES[id];
  const givers = loadGivers()[String(id)] ?? null;
  const extras = loadExtras()[String(id)] ?? null;
  const joinNames = (list: QuestNpc[] | undefined) => (list && list.length > 0 ? [...new Set(list.map((n) => n.name))].join(" / ") : null);
  const rewardIds = new Set([...quest.choiceRewards, ...quest.guaranteedRewards].map((i) => i.itemId));
  const mentionedItems = (extras?.items ?? [])
    .filter((itemId) => !rewardIds.has(itemId))
    .map((itemId) => getItemById(itemId))
    .filter((item): item is LootItem => !!item);
  // Wowhead's own point data first (new-to-Forever quests); cmangos
  // giver-spawn coordinates fill in for Classic-carryover quests Wowhead
  // never scraped a Mapper block for.
  const wowheadMapGroups = buildMapGroups(extras?.points);
  const mapGroups = wowheadMapGroups.length > 0 ? wowheadMapGroups : buildGiverMapGroups(givers);
  return {
    ...quest,
    narrativeSource: cmangosRow ? "cmangos" : wowheadRow ? "wowhead" : null,
    narrative: wowheadRow
      ? {
          details: wowheadRow.details,
          objectives: wowheadRow.objectives,
          offerRewardText: wowheadRow.offerRewardText,
          requestItemsText: wowheadRow.requestItemsText,
          endText: wowheadRow.endText,
          objectiveText: wowheadRow.objectiveText,
        }
      : cmangosRow
      ? {
          details: cmangosRow.details ? sanitizeQuestText(cmangosRow.details) : null,
          objectives: cmangosRow.objectives ? sanitizeQuestText(cmangosRow.objectives) : null,
          offerRewardText: cmangosRow.offerRewardText ? sanitizeQuestText(cmangosRow.offerRewardText) : null,
          requestItemsText: cmangosRow.requestItemsText ? sanitizeQuestText(cmangosRow.requestItemsText) : null,
          endText: cmangosRow.endText ? sanitizeQuestText(cmangosRow.endText) : null,
          objectiveText: cmangosRow.objectiveText.map(sanitizeQuestText),
        }
      : null,
    prevQuest: resolveChainLink(overrides?.prevQuestId ?? cmangosRow?.prevQuestId ?? null),
    nextQuest: resolveChainLink(overrides?.nextQuestId ?? cmangosRow?.nextQuestId ?? null),
    nextQuestInChain: resolveChainLink(overrides?.nextQuestInChain ?? cmangosRow?.nextQuestInChain ?? null),
    // cMaNGOS giver first (Classic carryovers), Wowhead's start NPC otherwise.
    giverName: givers && givers.length > 0 ? givers.map((g) => g.name).join(" / ") : joinNames(extras?.start),
    turnInName: joinNames(extras?.end),
    reputation: extras?.reputation ?? [],
    mentionedItems,
    mapGroups,
  };
}

export const LOCATION_KIND_TABS: { value: QuestLocationKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "zone", label: "Zone" },
  { value: "dungeon", label: "Dungeon" },
  { value: "raid", label: "Raid" },
  { value: "battleground", label: "Battleground" },
  { value: "sort", label: "Other" },
];

export function getQuestLocationKindCounts(): Record<QuestLocationKind | "all", number> {
  const all = loadAll();
  const counts: Record<QuestLocationKind | "all", number> = {
    all: all.length,
    zone: 0,
    dungeon: 0,
    raid: 0,
    battleground: 0,
    sort: 0,
    unknown: 0,
  };
  for (const quest of all) counts[quest.locationKind]++;
  return counts;
}

export function getQuestCount(): number {
  return loadAll().length;
}

// All 5,049 quest ids, for the sitemap -- /quests/[questId] isn't statically
// generated (see that page's own comment), so the sitemap needs its own id
// list rather than reading generateStaticParams.
export function getAllQuestIds(): number[] {
  return loadAll().map((quest) => quest.id);
}

export function getTextSourceCounts(): Record<QuestTextSource, number> {
  // Counts quests whose narrative text actually exists from each source
  // (not just which upstream a quest's structured data traces to) -- a
  // new-to-Forever quest Wowhead has no text for counts toward neither.
  loadAll();
  const wowhead = loadWowhead();
  const counts: Record<QuestTextSource, number> = { cmangos: 0, wowhead: 0 };
  for (const quest of cache ?? []) {
    if (quest.textSource === "cmangos") counts.cmangos++;
    else if (Object.prototype.hasOwnProperty.call(wowhead, String(quest.id))) counts.wowhead++;
  }
  return counts;
}

// Columns worth sorting -- Quest (name), Level, Req. Level, Side, and
// Location are plain scalars with an obvious order; XP sorts the combined
// "XP / Money" column by its first (and more consistently populated) value.
// Rewards (icon list) and the narrative text columns have no single
// orderable value, so they're deliberately left out.
export type QuestSortKey = "name" | "level" | "requiredLevel" | "side" | "location" | "xp";

export type QuestQuery = {
  locationKind?: QuestLocationKind | "all";
  q?: string;
  side?: QuestSide | "all";
  levelMin?: number;
  levelMax?: number;
  sort?: QuestSortKey;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

// A sort key's comparable value for one quest -- string columns compare
// case-insensitively, number columns treat a missing value (null) as
// "sorts after everything else" regardless of direction, matching the
// common spreadsheet convention (a blank cell isn't "lowest").
function sortValue(quest: Quest, key: QuestSortKey): string | number | null {
  switch (key) {
    case "name":
      return quest.name.toLowerCase();
    case "level":
      return quest.level;
    case "requiredLevel":
      return quest.requiredLevel;
    case "side":
      return quest.side;
    case "location":
      return (quest.locationName ?? quest.locationKind).toLowerCase();
    case "xp":
      return quest.xp;
  }
}

function compareQuests(a: Quest, b: Quest, key: QuestSortKey, dir: "asc" | "desc"): number {
  const va = sortValue(a, key);
  const vb = sortValue(b, key);
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const cmp = va < vb ? -1 : va > vb ? 1 : 0;
  return dir === "asc" ? cmp : -cmp;
}

export type QuestQueryResult = {
  quests: Quest[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export function formatMoney(copper: number): string {
  if (copper <= 0) return "--";
  const gold = Math.floor(copper / 10000);
  const silver = Math.floor((copper % 10000) / 100);
  const remainder = copper % 100;
  const parts: string[] = [];
  if (gold > 0) parts.push(`${gold}g`);
  if (silver > 0) parts.push(`${silver}s`);
  if (remainder > 0 || parts.length === 0) parts.push(`${remainder}c`);
  return parts.join(" ");
}

export function queryQuests({
  locationKind = "all",
  q = "",
  side = "all",
  levelMin,
  levelMax,
  sort,
  dir = "asc",
  page = 1,
  pageSize = 40,
}: QuestQuery): QuestQueryResult {
  let quests = loadAll();
  if (locationKind !== "all") quests = quests.filter((quest) => quest.locationKind === locationKind);
  if (side !== "all") quests = quests.filter((quest) => quest.side === side || quest.side === "Both");
  if (levelMin !== undefined) quests = quests.filter((quest) => quest.level !== null && quest.level >= levelMin);
  if (levelMax !== undefined) quests = quests.filter((quest) => quest.level !== null && quest.level <= levelMax);

  const needle = q.trim().toLowerCase();
  if (needle) quests = quests.filter((quest) => quest.name.toLowerCase().includes(needle));

  if (sort) quests = [...quests].sort((a, b) => compareQuests(a, b, sort, dir));

  const total = quests.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;

  return { quests: quests.slice(start, start + pageSize), total, page: safePage, pageSize, pageCount };
}
