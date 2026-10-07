#!/usr/bin/env node
// Normalizes dungeon data from two independently-sourced places into one
// consistent per-dungeon file our own pages read from:
//   - data/dungeons.json                          (our own base metadata)
//   - data/sources/foreverchanges/dungeon_data/*.json / *.quests.json
//                                                   (item ids/icons/quality/
//                                                    tooltips + full quest
//                                                    chains, pulled from
//                                                    foreverchanges.pro)
//   - data/dungeon-loot.json                       (wowtbc.gg-sourced loot +
//                                                    coarse quest rewards,
//                                                    built by
//                                                    build-dungeon-loot.js)
//
// Reconciliation policy (deliberate, not a merge): per dungeon, per data
// type (loot vs. quests), ONE source wins outright rather than blending
// field-by-field. foreverchanges' boss loot is item-id/icon/quality/real-
// tooltip-confirmed and wins wherever it exists; wowtbc.gg's community-
// reported loot (with per-item drop-chance %, which foreverchanges doesn't
// have at all) is the fallback ONLY for the 2 dungeons foreverchanges has no
// boss-loot pull for (gnomeregan, sm-library) -- see BOSS_LOOT_FALLBACK
// below. Same policy for quests: foreverchanges' real quest-giver/location/
// objective data wins wherever present; wowtbc's flatter "quest name + which
// items it can reward" data is the fallback only where foreverchanges came
// back with zero quests for a dungeon that does have wowtbc quest-reward
// data. Blending the two sources boss-by-boss or quest-by-quest was
// considered and rejected: they're independent data-collection efforts
// (client/beta-log reads vs. player-submitted drop reports) that can
// disagree on who drops what, and asserting a merged attribution neither
// source actually made would be worse than just picking one.
//
// Output: one data/dungeons/<id>.json per dungeon (35 total), read by
// lib/dungeon-data.ts.

const fs = require("fs");
const path = require("path");
const SLUG_MAP = require("./dungeon-source-map");
const { fcItemToUnified } = require("./lib/fc-item");

const ROOT = path.join(__dirname, "..");
const FC_DIR = path.join(ROOT, "data", "sources", "foreverchanges", "dungeon_data");
const ITEMS_DIR = path.join(ROOT, "data", "sources", "foreverchanges", "items");
const OUT_DIR = path.join(ROOT, "data", "dungeons");

const dungeonsJson = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "dungeons.json"), "utf8"));
const wowtbcLoot = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "dungeon-loot.json"), "utf8"));

// Full item catalog (new/changed/same/missing-vs-Classic), pulled from
// foreverchanges.pro/items -- keyed by real item id ("i"). Quest reward
// items only ever carry a bare {itemHref, name, type} from the quest-chain
// scrape, missing icon/quality/tooltip entirely; this index lets us upgrade
// them to the same full shape boss loot already gets. Verified against
// every dungeon's quest rewards before relying on it: 422/422 reward items
// and 325/325 "bring back" items resolve by id with zero misses, so id is
// the reliable join key here -- no name-matching fallback needed.
const ITEMS_BY_ID = new Map();
for (const file of ["new.json", "changed.json", "same.json", "missing.json"]) {
  const p = path.join(ITEMS_DIR, file);
  if (!fs.existsSync(p)) continue;
  const parsed = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const item of parsed.items) ITEMS_BY_ID.set(item.i, item);
}

// foreverchanges' item-source file: { items: { "<itemId>": [code, label, location] } },
// one entry per item. For boss-drop codes (m creature, B dungeon, R rare) the
// label is the boss that drops it and the location is the dungeon. Used only to
// ADD items a boss's scraped loot list is missing; it never removes or reorders
// anything. Generic labels ("Several bosses", "Any enemy", chest names) match no
// boss and are skipped, so they never attach an item to the wrong boss.
const SOURCES_FILE = path.join(ITEMS_DIR, "sources.json");
const DROP_SOURCE_CODES = new Set(["m", "B", "R"]);
const ITEM_SOURCES = fs.existsSync(SOURCES_FILE)
  ? JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8")).items
  : {};
function normName(s) {
  return String(s || "").toLowerCase().replace(/^the /, "").replace(/[^a-z0-9]/g, "");
}

// Dungeons where foreverchanges has no boss-loot pull at all (yet) -- fall
// back to the existing wowtbc.gg-sourced loot for these rather than shipping
// an empty bosses list. Not "known-empty" dungeons (those have real reasons
// to be empty on both sources -- see below); this is purely "that pull
// hasn't been done." Empty as of 2026-09-24: foreverchanges.pro's own
// /dungeons/<slug>.json endpoint (see scripts/fetch-foreverchanges-dungeon-
// loot.js) now has data for the 2 dungeons that used to need this
// (gnomeregan, sm-library) -- pulled and merged in, so this set is empty
// until/unless a future dungeon needs the same fallback again.
const BOSS_LOOT_FALLBACK = new Set([]);

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseItemId(href) {
  if (!href) return null;
  const m = href.match(/\/item\/(\d+)/);
  return m ? Number(m[1]) : null;
}

function wowtbcItemToUnified(raw) {
  return {
    name: raw.name,
    slot: raw.slot ?? null,
    type: raw.type ?? null,
    itemClass: null,
    itemId: null,
    icon: null,
    quality: null,
    itemLevel: null,
    requiredLevel: null,
    tooltip: null,
    tooltipSynthesized: false,
    classicTooltip: null,
    status: null,
    dropChance: raw.dropChance ?? null,
    dropChanceUnder: !!raw.dropChanceUnder,
    unknown: !!raw.unknown,
    source: "wowtbc",
  };
}

// Boss loot items carry their own snapshot of the item record from the dungeon
// scrape, which goes stale when a beta patch changes an item (the Oct 1 nerfs
// left 12 boss items on pre-patch values). The current item catalog wins
// whenever it has the item, same as quest rewards; the scrape's record is only
// the fallback for an id the catalog lacks. (This used to swap only when
// name/quality/level disagreed, which kept stale tooltips, item-class shapes
// and statuses: 164 records in 14 dungeons as of 2026-10-06.) The scrape-only
// fields (w, z) aren't read by fcItemToUnified, so nothing rendered is lost.
// The dungeon scrape still decides which items each boss drops.
function bossLootItemToUnified(raw) {
  const current = raw.i !== undefined ? ITEMS_BY_ID.get(raw.i) : null;
  return fcItemToUnified(current ?? raw);
}

function questRewardItemToUnified(raw) {
  const itemId = parseItemId(raw.itemHref);
  const fullItem = itemId !== null ? ITEMS_BY_ID.get(itemId) : null;
  if (fullItem) return fcItemToUnified(fullItem);

  // Fallback for the rare case an item id doesn't resolve in the catalog --
  // keeps the reward visible with whatever the quest scrape itself had,
  // same bare shape this function always returned before the catalog
  // lookup was added. foreverchanges quest reward item: {itemHref, name,
  // type} -- "type" here is already the combined "Slot, Kind" display
  // string (e.g. "Ranged, Gun"), unlike boss-loot items where slot/type are
  // separate fields, since the quest scrape reads it straight off the
  // rendered reward-list markup rather than a raw tooltip. Split on the
  // first comma to fill slot/type the same way wowtbc's shape does,
  // best-effort.
  let slot = null, type = null;
  if (raw.type) {
    const parts = raw.type.split(",").map((s) => s.trim());
    slot = parts[0] || null;
    type = parts.slice(1).join(", ") || null;
  }
  return {
    name: raw.name,
    slot,
    type,
    itemClass: null,
    itemId,
    icon: null,
    quality: null,
    itemLevel: null,
    requiredLevel: null,
    tooltip: null,
    tooltipSynthesized: false,
    classicTooltip: null,
    status: null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: false,
    source: "foreverchanges",
  };
}

// foreverchanges' map/boss-ability pull (scripts/extract-foreverchanges-
// dungeon-maps.js) is keyed by fc slug, separate from the loot-endpoint pull
// above -- matched onto a boss here by name (case-insensitive), not id/slug,
// since the two pulls don't share a join key and name is stable across both.
function abilityDataByName(fcSlug) {
  const data = readJsonIfExists(path.join(FC_DIR, `${fcSlug}.mapdata.json`));
  if (!data) return null;
  const byName = new Map(data.bosses.map((b) => [b.name.toLowerCase(), b]));
  return { byName };
}

// Adds items that foreverchanges' item-source file attributes to a boss in this
// dungeon but that the boss's scraped loot list doesn't have. Returns nothing;
// mutates `bosses` in place. Items already on a boss are left alone.
function addSourcedBossDrops(bosses, dungeonName) {
  const dungeonKey = normName(dungeonName);
  const bossByName = new Map();
  for (const boss of bosses) {
    if (boss.kind !== "boss") continue;
    const key = normName(boss.name);
    if (!bossByName.has(key)) bossByName.set(key, boss);
  }
  for (const [idStr, entry] of Object.entries(ITEM_SOURCES)) {
    const [code, label, location] = entry;
    if (!DROP_SOURCE_CODES.has(code) || normName(location) !== dungeonKey) continue;
    const boss = bossByName.get(normName(label));
    if (!boss) continue;
    const itemId = Number(idStr);
    if (boss.items.some((it) => it.itemId === itemId)) continue;
    const raw = ITEMS_BY_ID.get(itemId);
    if (!raw) continue;
    boss.items.push(fcItemToUnified(raw));
  }
}

function buildBosses(ourId, fcSlug, dungeonName) {
  const abilityData = abilityDataByName(fcSlug);
  function withAbilities(boss) {
    const match = abilityData?.byName.get(boss.name.toLowerCase());
    return { ...boss, trigger: match?.trigger ?? null, abilities: match?.abilities ?? [] };
  }

  if (!BOSS_LOOT_FALLBACK.has(ourId)) {
    const fc = readJsonIfExists(path.join(FC_DIR, `${fcSlug}.json`));
    if (fc && Array.isArray(fc.bosses) && fc.bosses.length > 0) {
      const bosses = fc.bosses.map((b) =>
          withAbilities({
            name: b.name,
            kind: b.kind,
            level: b.level ?? null,
            // foreverchanges' own NPC portrait render, keyed by the beta
            // client's creature display id -- verified to resolve for all
            // 223 distinct display ids across every dungeon before relying
            // on it (see build-dungeons.js history/commit for the check).
            // Absent for "Trash mobs" groupings and lootable objects, which
            // have no single NPC to portray.
            portraitUrl: b.display ? `https://foreverchanges.pro/wow-ui/bosses/${b.display}.webp` : null,
            items: (b.items || []).map(bossLootItemToUnified),
          })
        );
      addSourcedBossDrops(bosses, dungeonName);
      return { source: "foreverchanges", bosses };
    }
  }
  const wowtbc = wowtbcLoot.dungeons[ourId === "deadmines" ? "deadmines" : ourId];
  if (wowtbc && Array.isArray(wowtbc.bosses) && wowtbc.bosses.length > 0) {
    return {
      source: "wowtbc",
      bosses: wowtbc.bosses.map((b) =>
        withAbilities({
          name: b.name,
          kind: "boss",
          level: null,
          portraitUrl: null,
          items: (b.items || []).map(wowtbcItemToUnified),
        })
      ),
    };
  }
  // Neither loot source has this dungeon (as of 2026-10-02: excavation-site
  // only) -- rather than shipping an empty page, build the boss roster
  // straight from the map/ability pull itself (name/level/portrait/trigger/
  // abilities, just no items) so the new map+ability content isn't silently
  // discarded for the one dungeon that has it but no loot pull yet.
  if (abilityData && abilityData.byName.size > 0) {
    return {
      source: null,
      bosses: [...abilityData.byName.values()].map((b) => ({
        name: b.name,
        kind: b.kind,
        level: b.level,
        portraitUrl: b.display ? `https://foreverchanges.pro/wow-ui/bosses/${b.display}.webp` : null,
        items: [],
        trigger: b.trigger,
        abilities: b.abilities,
      })),
    };
  }
  return { source: null, bosses: [] };
}

// null for any dungeon foreverchanges has no map image for (most of them --
// see scripts/extract-foreverchanges-dungeon-maps.js's coverage report). The
// 3 dungeons whose map is a commissioned fan piece (excavation-site, hall-
// of-thanes, ruins-of-lordaeron) carry `attribution`; the other 8 pin
// dungeons use official client-derived art and have none.
function buildPinMap(fcSlug) {
  const data = readJsonIfExists(path.join(FC_DIR, `${fcSlug}.mapdata.json`));
  if (!data || !data.map) return null;
  return {
    alt: data.map.alt,
    attribution: data.map.attribution,
    floors: data.map.floors.map((f) => ({
      name: f.name,
      src: `https://foreverchanges.pro${f.src}`,
      width: f.width,
      height: f.height,
      pins: f.pins.map((p) => ({
        label: p.label,
        xPct: p.xPct,
        yPct: p.yPct,
        kind: p.kind,
        portraitUrl: p.display ? `https://foreverchanges.pro/wow-ui/bosses/${p.display}.webp` : null,
      })),
    })),
  };
}

// A foreverchanges quest-group header is rendered as one text blob, e.g.
// "Alliance2 quests" or "Both factions9 quests" -- pull the faction word(s)
// back out of it rather than trying to re-derive faction from quest content.
function factionFromGroupName(groupNameFull) {
  if (!groupNameFull) return null;
  if (groupNameFull.startsWith("Both factions")) return "Both";
  if (groupNameFull.startsWith("Alliance")) return "Alliance";
  if (groupNameFull.startsWith("Horde")) return "Horde";
  return null;
}

// The "Starts" dd is usually "NPC Name, Location" as plain text (e.g.
// "Thom Filch, Ironforge") -- only a minority of givers are linked to
// /map, and only those carry a mapRef with the name already split out. For
// the rest, split the giver's name back out of the combined text on the
// first comma rather than leaving it null just because there's no link.
function parseGiver(starts) {
  if (starts.mapRef) return { name: starts.mapRef.name, location: starts.value, mapRef: starts.mapRef };
  const commaIdx = starts.value.indexOf(",");
  if (commaIdx === -1) return { name: starts.value, location: starts.value, mapRef: null };
  return { name: starts.value.slice(0, commaIdx).trim(), location: starts.value, mapRef: null };
}

function fcQuestToUnified(q, faction) {
  const fieldsByLabel = new Map(q.fields.map((f) => [f.label, f]));
  const starts = fieldsByLabel.get("Starts");
  const comesAfter = fieldsByLabel.get("Comes after");
  const experience = fieldsByLabel.get("Experience");
  const money = fieldsByLabel.get("Money");
  const skipLabels = new Set(["Starts", "Comes after", "Experience", "Money"]);
  const objectives = q.fields
    .filter((f) => !skipLabels.has(f.label))
    .map((f) => ({ label: f.label, value: f.value, mapRef: f.mapRef, needItems: f.needItems }));

  const levelMatch = q.levelText?.match(/Level (\d+)/);
  const minLevelMatch = q.levelText?.match(/from level (\d+)/);

  return {
    id: q.id,
    faction,
    name: q.name,
    level: levelMatch ? Number(levelMatch[1]) : null,
    minLevel: minLevelMatch ? Number(minLevelMatch[1]) : null,
    text: q.questText,
    giver: starts ? parseGiver(starts) : null,
    prereq: comesAfter ? comesAfter.value : null,
    objectives,
    experience: experience ? experience.value : null,
    money: money ? money.value : null,
    rewardHeading: q.rewardHeading,
    rewardNotes: q.rewardNotes,
    rewards: (q.rewards || []).map(questRewardItemToUnified),
    source: "foreverchanges",
  };
}

function wowtbcQuestRewardToUnified(qr, i) {
  return {
    id: `wowtbc-${i}`,
    faction: qr.faction,
    name: qr.questName,
    level: qr.level,
    minLevel: null,
    text: null,
    giver: null,
    prereq: null,
    objectives: [],
    experience: null,
    money: null,
    rewardHeading: null,
    rewardNotes: [],
    rewards: (qr.items || []).map(wowtbcItemToUnified),
    source: "wowtbc",
  };
}

function buildQuests(ourId, fcSlug) {
  const fc = readJsonIfExists(path.join(FC_DIR, `${fcSlug}.quests.json`));
  if (fc && Array.isArray(fc.groups) && fc.groups.some((g) => g.quests.length > 0)) {
    const quests = [];
    for (const g of fc.groups) {
      const faction = factionFromGroupName(g.groupNameFull);
      for (const q of g.quests) quests.push(fcQuestToUnified(q, faction));
    }
    return { source: "foreverchanges", quests };
  }
  const wowtbc = wowtbcLoot.dungeons[ourId === "deadmines" ? "deadmines" : ourId];
  if (wowtbc && Array.isArray(wowtbc.questRewards) && wowtbc.questRewards.length > 0) {
    return { source: "wowtbc", quests: wowtbc.questRewards.map(wowtbcQuestRewardToUnified) };
  }
  return { source: null, quests: [] };
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = [];

  for (const dungeon of dungeonsJson.dungeons) {
    const map = SLUG_MAP[dungeon.id];
    if (!map) {
      report.push({ id: dungeon.id, error: "no entry in dungeon-source-map.js" });
      continue;
    }
    const { source: bossLootSource, bosses } = buildBosses(dungeon.id, map.fc, dungeon.name);
    const { source: questSource, quests } = buildQuests(dungeon.id, map.fc);
    const pinMap = buildPinMap(map.fc);

    const out = {
      id: dungeon.id,
      name: dungeon.name,
      type: dungeon.type,
      levelMin: dungeon.levelMin,
      levelMax: dungeon.levelMax,
      abbr: dungeon.abbr ?? null,
      faction: dungeon.faction ?? null,
      zone: dungeon.zone ?? null,
      description: dungeon.description ?? null,
      image: dungeon.image ?? null,
      confidence: dungeon.confidence ?? null,
      authorNotes: dungeon.authorNotes ?? null,
      backgroundImage: `https://foreverchanges.pro/wow-ui/dungeons/art-${map.art}.webp`,
      bossLootSource,
      bosses,
      questSource,
      quests,
      pinMap,
    };

    fs.writeFileSync(path.join(OUT_DIR, `${dungeon.id}.json`), JSON.stringify(out, null, 1));

    report.push({
      id: dungeon.id,
      bossLootSource,
      bossCount: bosses.length,
      itemCount: bosses.reduce((n, b) => n + b.items.length, 0),
      questSource,
      questCount: quests.length,
      hasPinMap: !!pinMap,
    });
  }

  console.log(JSON.stringify(report, null, 1));
  const missingLoot = report.filter((r) => !r.bossLootSource && !r.error);
  const missingQuests = report.filter((r) => !r.questSource && !r.error);
  console.log(`\n${report.length} dungeons written to ${path.relative(ROOT, OUT_DIR)}`);
  console.log(`${missingLoot.length} with no boss loot at all: ${missingLoot.map((r) => r.id).join(", ")}`);
  console.log(`${missingQuests.length} with no quests at all: ${missingQuests.map((r) => r.id).join(", ")}`);
}

main();
