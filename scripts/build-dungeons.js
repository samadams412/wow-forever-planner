#!/usr/bin/env node
// Normalizes dungeon data from two independently-sourced places into one
// consistent per-dungeon file our own pages read from:
//   - data/dungeons.json                          (our own base metadata)
//   - data/sources/foreverchanges_dungeon_data/*.json / *.quests.json
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

const ROOT = path.join(__dirname, "..");
const FC_DIR = path.join(ROOT, "data", "sources", "foreverchanges_dungeon_data");
const ITEMS_DIR = path.join(ROOT, "data", "sources", "foreverchanges_items");
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

// Dungeons where foreverchanges has no boss-loot pull at all (yet) -- fall
// back to the existing wowtbc.gg-sourced loot for these specific two rather
// than shipping an empty bosses list. Not "known-empty" dungeons (those
// have real reasons to be empty on both sources -- see below); this is
// purely "that pull hasn't been done."
const BOSS_LOOT_FALLBACK = new Set(["gnomeregan", "sm-library"]);

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function parseItemId(href) {
  if (!href) return null;
  const m = href.match(/\/item\/(\d+)/);
  return m ? Number(m[1]) : null;
}

// foreverchanges' item tooltip lines (x/y) hold slot+type combined as one
// tab-separated line (e.g. "Wrist\tCloth", "Main Hand\tDagger") -- pull the
// "type" half out of it (armor material / weapon subclass) to match
// wowtbc.gg's separate slot+type fields, so both sources feed the exact
// same UI shape.
function deriveTypeFromTooltip(lines) {
  if (!Array.isArray(lines)) return null;
  for (const line of lines) {
    if (typeof line === "string" && line.includes("\t")) {
      const parts = line.split("\t");
      return parts[1]?.trim() || null;
    }
  }
  return null;
}

function fcItemToUnified(raw) {
  return {
    name: raw.n,
    slot: raw.s ?? null,
    type: deriveTypeFromTooltip(raw.x),
    itemId: raw.i ?? null,
    icon: raw.k ?? null,
    quality: raw.q ?? null,
    itemLevel: raw.l ?? null,
    requiredLevel: raw.r ?? null,
    tooltip: raw.x ?? null,
    classicTooltip: raw.y ?? null,
    status: raw.t ?? null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: false,
    source: "foreverchanges",
  };
}

function wowtbcItemToUnified(raw) {
  return {
    name: raw.name,
    slot: raw.slot ?? null,
    type: raw.type ?? null,
    itemId: null,
    icon: null,
    quality: null,
    itemLevel: null,
    requiredLevel: null,
    tooltip: null,
    classicTooltip: null,
    status: null,
    dropChance: raw.dropChance ?? null,
    dropChanceUnder: !!raw.dropChanceUnder,
    unknown: !!raw.unknown,
    source: "wowtbc",
  };
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
    itemId,
    icon: null,
    quality: null,
    itemLevel: null,
    requiredLevel: null,
    tooltip: null,
    classicTooltip: null,
    status: null,
    dropChance: null,
    dropChanceUnder: false,
    unknown: false,
    source: "foreverchanges",
  };
}

function buildBosses(ourId, fcSlug) {
  if (!BOSS_LOOT_FALLBACK.has(ourId)) {
    const fc = readJsonIfExists(path.join(FC_DIR, `${fcSlug}.json`));
    if (fc && Array.isArray(fc.bosses) && fc.bosses.length > 0) {
      return {
        source: "foreverchanges",
        bosses: fc.bosses.map((b) => ({
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
          items: (b.items || []).map(fcItemToUnified),
        })),
      };
    }
  }
  const wowtbc = wowtbcLoot.dungeons[ourId === "deadmines" ? "deadmines" : ourId];
  if (wowtbc && Array.isArray(wowtbc.bosses) && wowtbc.bosses.length > 0) {
    return {
      source: "wowtbc",
      bosses: wowtbc.bosses.map((b) => ({
        name: b.name,
        kind: "boss",
        level: null,
        portraitUrl: null,
        items: (b.items || []).map(wowtbcItemToUnified),
      })),
    };
  }
  return { source: null, bosses: [] };
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
    const { source: bossLootSource, bosses } = buildBosses(dungeon.id, map.fc);
    const { source: questSource, quests } = buildQuests(dungeon.id, map.fc);

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
      backgroundImage: `https://foreverchanges.pro/wow-ui/dungeons/art-${map.art}.webp`,
      bossLootSource,
      bosses,
      questSource,
      quests,
    };

    fs.writeFileSync(path.join(OUT_DIR, `${dungeon.id}.json`), JSON.stringify(out, null, 1));

    report.push({
      id: dungeon.id,
      bossLootSource,
      bossCount: bosses.length,
      itemCount: bosses.reduce((n, b) => n + b.items.length, 0),
      questSource,
      questCount: quests.length,
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
