#!/usr/bin/env node
// Merges every quest source into build-time static data for /reference/quests
// and /quests/[questId]. Nothing here runs at request time -- lib/quests.ts
// reads only the generated output below (see CLAUDE.md's standing rule on
// server-side reads of large data files).
//
// Inputs (all build-time):
//   data/sources/foreverchanges/quests/all.json          full detail-page scrape
//                                                        (5,022 quests; primary)
//   data/sources/foreverchanges/quests/list.json         flat listing pull
//                                                        (5,049 quests; fallback,
//                                                        and the only money/zone-id source)
//   data/sources/cmangos/quest-text.json                 Classic narrative text
//   data/sources/cmangos/quest-givers.json               Classic giver names + spawn coords
//   data/sources/wowhead/quest-text.json                 new-to-Forever narrative text
//   data/sources/wowhead/quest-extras.json               structured reputation, start/end NPCs, points
//   data/items.json                                      item catalog, for reward LootItems
//   data/map/<continent>/zones.json                      zone name -> areaId
//   lib/zone-map-images.generated.ts                     which areaIds have a mini-map image
//
// Outputs (generated, committed):
//   data/quests/index.json          listing rows (filter/sort/paginate, no detail text)
//   data/quests/detail/<id>.json    one full record per quest, read by the detail page
//   data/quests/provenance.json     per-field: which source supplied each value, and
//                                   where two sources disagreed -- for review
//
// PRECEDENCE (proposed, pending review -- see PRECEDENCE below). The rule is
// "one source wins per field, the rest only fill gaps". Sources are never
// blended field-by-field, and a conflict is recorded rather than silently
// resolved.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const OUT_DIR = path.join(ROOT, "data", "quests");
const OUT_DETAIL_DIR = path.join(OUT_DIR, "detail");

// ---------------------------------------------------------------------------
// Precedence, as applied. Keep in sync with the provenance report.
// "primary" = the first source consulted; later sources only fill a null.
// ---------------------------------------------------------------------------
const PRECEDENCE = {
  name: ["foreverchanges", "list", "cmangos"],
  level: ["foreverchanges", "list"],
  requiredLevel: ["foreverchanges", "list"],
  side: ["foreverchanges (race list -> faction)", "list"],
  typeTag: ["foreverchanges", "list"],
  location: ["list (zone id)", "foreverchanges (zone name)"],
  xp: ["foreverchanges", "wowhead", "list (unchanged/new quests only)"],
  classicXp: ["list (only when foreverchanges says changed)"],
  money: ["list (copper)"],
  rewards: ["foreverchanges (isChoice + items)", "list (r/k buckets)"],
  reputation: ["wowhead (structured)", "foreverchanges (text)"],
  // unchanged quests: cmangos leads (verbatim Classic text), then foreverchanges, then wowhead.
  // changed/new quests: foreverchanges leads, then cmangos, then wowhead.
  narrative: ["unchanged: cmangos > foreverchanges > wowhead", "changed/new: foreverchanges > cmangos > wowhead"],
  startNpc: ["foreverchanges", "wowhead", "cmangos (giver names)"],
  endNpc: ["foreverchanges", "wowhead"],
  mapPoints: ["foreverchanges (NPC coords)", "wowhead (points)", "cmangos (giver spawn points)"],
  chain: ["foreverchanges", "cmangos (prev/next links)"],
  mentionedItems: ["wowhead (extras.items)"],
};

// Known-bad chain pointers, carried over from lib/quests.ts (see the comment
// there for the identity-match reasoning). Applied only when the scraped
// chain doesn't already settle the link.
// Quest 2's old prevQuestId override (235) is gone: the scraped chain now names
// its previous step directly (approved 2026-10-03).
const CHAIN_LINK_OVERRIDES = {
  1324: { nextQuestInChain: 1266 },
};

const RACE_FACTION = {
  Human: "Alliance", Dwarf: "Alliance", Gnome: "Alliance", "Night Elf": "Alliance",
  Orc: "Horde", Undead: "Horde", Tauren: "Horde", Troll: "Horde",
};
const LIST_SIDE = { a: "Alliance", h: "Horde" };
const TYPE_TAG = {
  dungeon: "dungeon", raid: "raid", pvp: "pvp", elite: "elite", escort: "escort", event: "event",
};

// Same neutral stand-ins lib/quests.ts's sanitizeQuestText used, so text reads
// cleanly without the reading character's name/class/race.
function sanitize(text) {
  if (!text) return null;
  const out = text
    .replace(/\$[Gg]([^:;]*):([^;]*);/g, (_m, male) => male)
    .replace(/\$[Bb]/g, "\n\n")
    .replace(/\$[Nn]/g, "adventurer")
    .replace(/\$C/g, "Champion")
    .replace(/\$c/g, "champion")
    .replace(/\$R/g, "friend")
    .replace(/\$r/g, "friend")
    .replace(/‹name›/g, "adventurer")
    .replace(/‹class›/g, "champion")
    .replace(/‹race›/g, "friend")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out || null;
}

// Comparison-only normalization, so a conflict means a real difference and not
// placeholder syntax or paragraph-join whitespace.
function norm(text) {
  if (!text) return "";
  return text
    .replace(/‹name›|\$N|\$n/g, "<name>")
    .replace(/‹class›|\$C|\$c/g, "<class>")
    .replace(/\$[Bb]/g, " ")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\s([.,!?])/g, "$1")
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Provenance bookkeeping
// ---------------------------------------------------------------------------
const provenance = {};
function track(field, supplier, conflictWith) {
  const entry = (provenance[field] ??= { fromPrimary: 0, fromFallback: 0, fromNone: 0, conflicts: 0, examples: [] });
  if (supplier === "none") entry.fromNone++;
  else if (supplier === "primary") entry.fromPrimary++;
  else entry.fromFallback++;
  if (conflictWith) {
    entry.conflicts++;
    if (entry.examples.length < 5) entry.examples.push(conflictWith);
  }
}

// Picks the first non-null candidate, records which source won and whether a
// later candidate disagreed with it. candidates: [{source, value, key?}]
// Conflicts compare with all whitespace removed: the scrape joins paragraphs
// with no space ("you!Sharptalon"), so a space-only difference is not a conflict.
// Both sides go through sanitize() first, so cMaNGOS markup ($N, $B, $g...;) and
// Forever's own placeholders (‹name›) compare as the same stand-in text.
const canon = (x) => norm(sanitize(String(x)) ?? "").replace(/\s+/g, "");
const sameText = (a, b) => canon(a) === canon(b);

function pick(field, candidates, equal = sameText) {
  const present = candidates.filter((c) => c.value !== null && c.value !== undefined && c.value !== "" && !(Array.isArray(c.value) && c.value.length === 0));
  if (present.length === 0) {
    track(field, "none");
    return null;
  }
  const winner = present[0];
  const supplier = winner.source === candidates[0].source ? "primary" : "fallback";
  const rival = present.slice(1).find((c) => !equal(c.value, winner.value));
  track(
    field,
    supplier,
    rival ? { id: winner.id, winner: { source: winner.source, value: String(winner.value).slice(0, 120) }, rival: { source: rival.source, value: String(rival.value).slice(0, 120) } } : null
  );
  return winner.value;
}

// ---------------------------------------------------------------------------
// Source parsing helpers
// ---------------------------------------------------------------------------
function parseExperience(text) {
  if (!text) return null;
  // Forever's Experience line sometimes arrives with the money line glued in
  // front ("Money: ... copperExperience: 900"), so match the labelled form first.
  const labelled = text.match(/Experience:\s*([\d,]+)/);
  if (labelled) return Number(labelled[1].replace(/,/g, ""));
  const bare = text.match(/^\s*([\d,]+)\s*$/);
  return bare ? Number(bare[1].replace(/,/g, "")) : null;
}

function parseRequiredLevel(text) {
  const m = text && text.match(/requires level (\d+)/);
  return m ? Number(m[1]) : null;
}

// "Tirisfal Glades 30.8, 66.2" -> { zone, x, y }. The zone is the leading text,
// the coordinates the trailing pair.
function parseCoordText(text) {
  if (!text) return null;
  const m = text.match(/^(.*?)\s*([\d.]+),\s*([\d.]+)$/);
  if (!m) return null;
  return { zone: m[1].trim() || null, x: Number(m[2]), y: Number(m[3]) };
}

function parseRepLines(lines) {
  const out = [];
  for (const line of lines || []) {
    const m = line.match(/^([+-][\d,]+) reputation with (.+)$/);
    if (!m) continue;
    const faction = m[2].trim();
    // Unresolved template left by the scrape ("with {faction}") -- no faction to show.
    if (/\{faction\}/.test(faction)) continue;
    const amount = Number(m[1].replace(/[+,]/g, ""));
    out.push({ faction, factionId: null, amount });
  }
  // The detail page repeats the same reputation line once per reward variant
  // (quest 9120 shows "+200 Argent Dawn" four times). Dedupe identical rows.
  const seen = new Set();
  return out.filter((r) => {
    const key = `${r.faction}|${r.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function factionFromRaces(sideText) {
  if (!sideText) return null;
  if (sideText === "Both factions") return "Both";
  if (sideText === "Alliance" || sideText === "Horde") return sideText;
  const factions = new Set(sideText.split(",").map((r) => RACE_FACTION[r.trim()]).filter(Boolean));
  if (factions.size === 1) return [...factions][0];
  if (factions.size > 1) return "Both";
  return null;
}

function iconStem(icon) {
  if (!icon) return "";
  return icon.replace(/^\/?icon\//, "").replace(/\.(jpg|png|webp)$/i, "");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  console.log("Reading sources...");
  const all = read("data/sources/foreverchanges/quests/all.json");
  const list = read("data/sources/foreverchanges/quests/list.json");
  const cmText = read("data/sources/cmangos/quest-text.json").quests;
  const cmGivers = read("data/sources/cmangos/quest-givers.json").givers;
  const whText = read("data/sources/wowhead/quest-text.json").quests;
  const whExtras = read("data/sources/wowhead/quest-extras.json").quests;
  const itemsCatalog = read("data/items.json").items;

  const allById = new Map(all.map((r) => [r.id, r]));
  const listById = new Map(list.map((q) => [q.i, q]));
  const itemById = new Map(itemsCatalog.filter((i) => i.itemId !== null).map((i) => [i.itemId, i]));

  // Zone name -> areaId, and areaId -> continent, from the map's own zone lists.
  const zoneIdByName = new Map();
  const zoneNameById = new Map();
  const continentById = new Map();
  for (const entry of fs.readdirSync(path.join(ROOT, "data", "map"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const zonesFile = path.join(ROOT, "data", "map", entry.name, "zones.json");
    if (!fs.existsSync(zonesFile)) continue;
    for (const z of JSON.parse(fs.readFileSync(zonesFile, "utf8"))) {
      zoneNameById.set(z.areaId, z.name);
      continentById.set(z.areaId, z.continent ?? entry.name);
      const key = z.name.toLowerCase();
      if (!zoneIdByName.has(key)) zoneIdByName.set(key, z.areaId);
    }
  }
  const imageSrc = fs.readFileSync(path.join(ROOT, "lib", "zone-map-images.generated.ts"), "utf8");
  const mapImageIds = new Set(
    imageSrc.match(/new Set<number>\(\[([^\]]*)\]\)/)[1].split(",").map((s) => Number(s.trim())).filter(Number.isFinite)
  );

  // Reward item resolver. The scrape's item icon is a path; the catalog's is a stem.
  function toLootItem(ref) {
    const cat = itemById.get(ref.itemId);
    if (cat) return { ...cat, qty: ref.qty ?? 1 };
    const quality = ref.quality ? Number(String(ref.quality).replace(/^q/, "")) : null;
    return {
      name: ref.name ?? "Unknown Item",
      slot: null, type: null, itemClass: null,
      itemId: ref.itemId,
      icon: iconStem(ref.icon),
      quality: Number.isFinite(quality) ? quality : null,
      itemLevel: null, requiredLevel: null,
      tooltip: null, tooltipSynthesized: false, classicTooltip: null,
      status: null, dropChance: null, dropChanceUnder: false,
      unknown: true, source: "foreverchanges",
      qty: ref.qty ?? 1,
    };
  }

  // Map point grouping: one mini-map group per mappable zone.
  function mapGroupsFrom(markers) {
    const byZone = new Map();
    for (const m of markers) {
      if (!m.zoneId || !mapImageIds.has(m.zoneId)) continue;
      if (!byZone.has(m.zoneId)) byZone.set(m.zoneId, { zoneName: m.zone, markers: [] });
      byZone.get(m.zoneId).markers.push({ kind: m.kind, npcName: m.npcName, xPct: m.x, yPct: m.y });
    }
    return [...byZone.entries()]
      .sort(([, a], [, b]) => (a.markers.some((m) => m.kind === "start") ? 0 : 1) - (b.markers.some((m) => m.kind === "start") ? 0 : 1))
      .map(([zoneId, g]) => ({
        zoneId,
        zoneName: g.zoneName,
        continent: continentById.get(zoneId) ?? null,
        imageUrl: `/images/zone-maps/${zoneId}.jpg`,
        markers: g.markers,
      }));
  }

  // Quest id universe: every quest in the listing, plus any detail-page quest
  // the listing lacks (none today, but the scrape is the more complete set).
  const ids = [...new Set([...list.map((q) => q.i), ...all.map((r) => r.id)])].sort((a, b) => a - b);

  const indexRows = [];
  const details = [];
  let chainLinkResolved = 0;
  // Names are needed before the loop: a chain link can point at a later id.
  const nameById = new Map(
    ids.map((id) => [id, allById.get(id)?.name ?? listById.get(id)?.n ?? cmText[String(id)]?.title ?? null])
  );

  for (const id of ids) {
    const a = allById.get(id) ?? null;
    const l = listById.get(id) ?? null;
    const cmRow = cmText[String(id)] ?? null;
    const givers = cmGivers[String(id)] ?? null;
    const whRow = whText[String(id)] ?? null;
    const wx = whExtras[String(id)] ?? null;
    const P = a?.facts?.parsed ?? {};
    const status = a?.knownStatus?.status ?? null;

    // --- Identity -----------------------------------------------------
    const name = pick("name", [
      // foreverchanges appends an "<NYI>" status tag to names not yet in the build.
      { source: "foreverchanges", value: a?.name ? a.name.replace(/\s*<NYI>\s*$/, "") : null, id },
      { source: "list", value: l?.n ?? null, id },
      { source: "cmangos", value: cmRow?.title ?? null, id },
    ]);

    // --- Levels --------------------------------------------------------
    const level = pick("level", [
      { source: "foreverchanges", value: typeof P.level === "number" ? P.level : null, id },
      { source: "list", value: l?.l || null, id },
    ]);
    const requiredLevel = pick("requiredLevel", [
      { source: "foreverchanges", value: parseRequiredLevel(P.levelRequirementText), id },
      { source: "list", value: l?.m || null, id },
    ]);

    // --- Side (faction) ----------------------------------------------
    const side = pick("side", [
      { source: "foreverchanges", value: factionFromRaces(P.side), id },
      { source: "list", value: LIST_SIDE[l?.s] ?? (l ? "Both" : null), id },
    ]) ?? "Both";

    // --- Type tag -----------------------------------------------------
    const typeTagFromAll = P.type ? (/world event/i.test(P.type) ? "event" : (TYPE_TAG[P.type.split(",")[0].trim().toLowerCase()] ?? null)) : null;
    const typeTag = pick("typeTag", [
      { source: "foreverchanges", value: typeTagFromAll, id },
      { source: "list", value: l?.y || null, id },
    ]);

    // --- Location -----------------------------------------------------
    let locationKind = "unknown";
    let locationZoneId = null;
    if (l?.c && l.c[0] === "zone") {
      locationKind = "zone";
      locationZoneId = l.c[1];
    } else if (l?.c) {
      locationKind = l.c[0];
    } else if (a?.map?.zoneName) {
      const areaId = zoneIdByName.get(a.map.zoneName.toLowerCase());
      if (areaId) {
        locationKind = "zone";
        locationZoneId = areaId;
      }
    }
    const locationName = locationKind === "zone" ? (zoneNameById.get(locationZoneId) ?? null) : null;
    const locationContinent = locationName ? (continentById.get(locationZoneId) ?? null) : null;
    if (locationKind === "zone" && !locationName) locationZoneId = null;

    // --- XP and money ------------------------------------------------
    const scrapedXp = parseExperience(a?.rewards?.experienceText ?? null);
    const xp = pick("xp", [
      { source: "foreverchanges", value: scrapedXp, id },
      { source: "wowhead", value: wx?.xp ?? null, id },
      // list.x is Classic's number. It only stands in when Forever hasn't changed
      // the quest, otherwise it would show the pre-Forever value as current.
      { source: "list", value: status !== "changed" ? (l?.x || null) : null, id },
    ]) ?? 0;
    // The Classic value shown on hover for changed quests (the site's existing convention).
    const classicXp = status === "changed" && l?.x && l.x !== xp ? l.x : null;
    const money = pick("money", [{ source: "list", value: l?.g || null, id }]) ?? 0;

    // --- Rewards ------------------------------------------------------
    const allItems = a?.rewards?.items ?? [];
    let choiceRewards;
    let guaranteedRewards;
    if (allItems.length > 0) {
      const mapped = allItems.map((ref) => toLootItem(ref));
      choiceRewards = a.rewards.isChoice ? mapped : [];
      guaranteedRewards = a.rewards.isChoice ? [] : mapped;
      track("rewards", "primary", null);
    } else if ((l?.r?.length ?? 0) + (l?.k?.length ?? 0) > 0) {
      choiceRewards = (l.r ?? []).map(([itemId, icon, qty]) => toLootItem({ itemId, icon, qty, name: null }));
      guaranteedRewards = (l.k ?? []).map(([itemId, icon, qty]) => toLootItem({ itemId, icon, qty, name: null }));
      track("rewards", "fallback", null);
    } else {
      choiceRewards = [];
      guaranteedRewards = [];
      track("rewards", "none", null);
    }
    // Rewards conflict: the list pull files choice rewards under "k" (guaranteed) for
    // many quests. Record the disagreement, don't resolve it silently.
    if (a && allItems.length > 0 && l) {
      const allIds = allItems.map((r) => r.itemId).sort().join(",");
      const listIds = [...(l.r ?? []), ...(l.k ?? [])].map((t) => t[0]).sort().join(",");
      if (allIds !== listIds && listIds) {
        provenance.rewards.conflicts++;
        if (provenance.rewards.examples.length < 5) provenance.rewards.examples.push({ id, winner: `foreverchanges [${allIds}]`, rival: `list [${listIds}]` });
      }
    }

    // --- Reputation ---------------------------------------------------
    const reputation = wx?.reputation?.length
      ? wx.reputation.map((r) => ({ faction: r.faction, factionId: r.factionId ?? null, amount: r.amount }))
      : parseRepLines(a?.rewards?.reputation);
    track("reputation", wx?.reputation?.length ? "primary" : reputation.length ? "fallback" : "none", null);

    // --- Narrative ----------------------------------------------------
    // Forever's rendering of text it marks "unchanged" is an approximation: it
    // loses the $B paragraph breaks and wraps some paragraphs in <...>. cMaNGOS
    // holds the verbatim Classic text for those quests, so it leads for
    // unchanged quests. For changed/new quests the Forever text leads.
    const narrativeCandidates = (vals) => {
      const order = status === "unchanged" ? ["cmangos", "foreverchanges", "wowhead"] : ["foreverchanges", "cmangos", "wowhead"];
      return order.map((source) => ({ source, value: vals[source] ?? null, id }));
    };
    const allDetails = a?.description?.length ? a.description.join("\n\n") : null;
    const narrativeFields = {
      details: pick("narrative.details", narrativeCandidates({ foreverchanges: allDetails, cmangos: cmRow?.details, wowhead: whRow?.details })),
      objectives: pick("narrative.objectives", narrativeCandidates({ foreverchanges: a?.objectivesText, cmangos: cmRow?.objectives, wowhead: whRow?.objectives })),
      offerRewardText: pick("narrative.offerRewardText", narrativeCandidates({ foreverchanges: a?.turnInDialogue, cmangos: cmRow?.offerRewardText, wowhead: whRow?.offerRewardText })),
      requestItemsText: pick("narrative.requestItemsText", narrativeCandidates({ foreverchanges: a?.partialDialogue, cmangos: cmRow?.requestItemsText, wowhead: whRow?.requestItemsText })),
      endText: pick("narrative.endText", [
        { source: "cmangos", value: cmRow?.endText ?? null, id },
        { source: "wowhead", value: whRow?.endText ?? null, id },
      ]),
      objectiveText: cmRow?.objectiveText?.length ? cmRow.objectiveText : (whRow?.objectiveText ?? []),
    };
    const narrativeSource =
      status === "unchanged" && cmRow?.details ? "cmangos" : allDetails ? "foreverchanges" : cmRow?.details ? "cmangos" : whRow?.details ? "wowhead" : null;
    const narrative = Object.values(narrativeFields).some((v) => (Array.isArray(v) ? v.length : v)) ? {
      details: sanitize(narrativeFields.details),
      objectives: sanitize(narrativeFields.objectives),
      offerRewardText: sanitize(narrativeFields.offerRewardText),
      requestItemsText: sanitize(narrativeFields.requestItemsText),
      endText: sanitize(narrativeFields.endText),
      objectiveText: narrativeFields.objectiveText.map((t) => sanitize(t)),
    } : null;

    // --- Start / end NPCs and map points -----------------------------
    const npcsOf = (side, fallbackList) => {
      const fromAll = (side?.npcs ?? []).map((n) => {
        const c = parseCoordText(n.coordText);
        return { name: n.name, zone: c?.zone ?? null, x: c?.x ?? null, y: c?.y ?? null };
      });
      if (fromAll.length) return { list: fromAll, source: "foreverchanges" };
      const fromWh = (fallbackList ?? []).map((n) => ({ name: n.name, zone: null, x: null, y: null }));
      if (fromWh.length) return { list: fromWh, source: "wowhead" };
      return { list: [], source: null };
    };
    const startNpcs = npcsOf(P.start, wx?.start);
    const endNpcs = npcsOf(P.end, wx?.end);
    // Cmangos giver names are unreliable for object givers (gameobjects show as "2").
    // It only fills a start that nothing else supplies.
    const cmStart = givers && givers.length ? givers.map((g) => ({ name: g.name, zone: g.point?.zone ?? null, x: g.point?.xPct ?? null, y: g.point?.yPct ?? null })) : [];
    const startList = startNpcs.list.length ? startNpcs.list : cmStart;
    pick("startNpc", [
      { source: "foreverchanges", value: startNpcs.list.map((n) => n.name).join(" / ") || null, id },
      { source: "wowhead", value: (wx?.start ?? []).map((n) => n.name).join(" / ") || null, id },
      { source: "cmangos", value: cmStart.map((n) => n.name).join(" / ") || null, id },
    ]);
    pick("endNpc", [
      { source: "foreverchanges", value: endNpcs.list.map((n) => n.name).join(" / ") || null, id },
      { source: "wowhead", value: (wx?.end ?? []).map((n) => n.name).join(" / ") || null, id },
    ]);
    const startItemText = P.start?.isItemStart ? P.start.text : null;

    const withZoneId = (list, kind) =>
      list
        .filter((n) => n.zone && n.x !== null)
        .map((n) => ({ kind, npcName: n.name, zone: n.zone, zoneId: zoneIdByName.get(n.zone.toLowerCase()) ?? null, x: n.x, y: n.y }));
    let mapGroups = mapGroupsFrom([
      ...withZoneId(startNpcs.list, "start"),
      ...withZoneId(endNpcs.list, "end"),
    ]);
    if (!mapGroups.length && wx?.points?.length) {
      mapGroups = mapGroupsFrom(wx.points.map((p) => ({ kind: p.point, zoneId: p.zoneId, zone: p.zone, npcName: p.name, x: p.x, y: p.y })));
    }
    if (!mapGroups.length && givers) {
      mapGroups = mapGroupsFrom(
        givers.filter((g) => g.point).map((g) => ({ kind: "start", zoneId: g.point.zoneId, zone: g.point.zone, npcName: g.name, x: g.point.xPct, y: g.point.yPct }))
      );
    }
    track("mapPoints", mapGroups.length ? (startNpcs.source === "foreverchanges" ? "primary" : "fallback") : "none", null);

    // --- Chain --------------------------------------------------------
    const chain = a?.chain
      ? {
          subtitle: a.chain.subtitle,
          steps: a.chain.steps.map((s) => ({
            stepNumber: s.stepNumber,
            isCurrentStep: !!s.isCurrentStep,
            quests: s.quests.map((q) => ({
              questId: q.isCurrent ? id : q.questId,
              name: q.name,
              isCurrent: !!q.isCurrent,
              level: q.level,
              objectiveText: q.objectiveText,
              giverName: q.giverName,
              giverZone: q.giverZone,
              xpText: q.xpText,
              rewardItem: q.rewardItem ? { ...q.rewardItem, icon: iconStem(q.rewardItem.icon) } : null,
              variants: q.variants ? q.variants.map((v) => ({ questId: v.questId, label: v.label })) : null,
            })),
          })),
        }
      : null;
    track("chain", chain ? "primary" : cmRow?.prevQuestId || cmRow?.nextQuestId ? "fallback" : "none", null);

    // Single prev/next links for the existing "previous / next" row. The chain
    // wins; the cMaNGOS pointers fill in for quests the scrape has no chain for.
    const override = CHAIN_LINK_OVERRIDES[id] ?? {};
    const chainQuestsAt = (stepIndex) => (chain && chain.steps[stepIndex] ? chain.steps[stepIndex].quests.filter((q) => !q.isCurrent) : []);
    const currentStepIndex = chain ? chain.steps.findIndex((s) => s.isCurrentStep) : -1;
    const linkFromChain = (qs) => (qs.length && qs[0].questId ? { id: qs[0].questId, name: qs[0].name } : null);
    const resolveLink = (linkId) => {
      if (linkId === null || linkId === undefined) return null;
      return nameById.has(linkId) ? { id: linkId, name: nameById.get(linkId) } : null;
    };
    const prevQuest =
      (currentStepIndex > 0 ? linkFromChain(chainQuestsAt(currentStepIndex - 1)) : null) ??
      resolveLink(override.prevQuestId ?? cmRow?.prevQuestId ?? null);
    const nextQuest =
      (currentStepIndex >= 0 && currentStepIndex < chain.steps.length - 1 ? linkFromChain(chainQuestsAt(currentStepIndex + 1)) : null) ??
      resolveLink(override.nextQuestId ?? cmRow?.nextQuestId ?? null);
    const nextQuestInChain = resolveLink(override.nextQuestInChain ?? cmRow?.nextQuestInChain ?? null);
    if (prevQuest || nextQuest) chainLinkResolved++;

    // --- Mentioned items (Wowhead only) -------------------------------
    const rewardIds = new Set([...choiceRewards, ...guaranteedRewards].map((i) => i.itemId));
    const mentionedItems = (wx?.items ?? [])
      .filter((itemId) => !rewardIds.has(itemId))
      .map((itemId) => itemById.get(itemId))
      .filter(Boolean);
    track("mentionedItems", mentionedItems.length ? "primary" : "none", null);

    // --- Assemble -------------------------------------------------------
    const giverName = startNpcs.list.length ? startNpcs.list.map((n) => n.name).join(" / ") : (cmStart.length ? cmStart.map((n) => n.name).join(" / ") : startItemText);
    const turnInName = endNpcs.list.length ? endNpcs.list.map((n) => n.name).join(" / ") : null;

    const summary = {
      id,
      name,
      level,
      requiredLevel,
      side,
      typeTag,
      locationKind,
      locationName,
      locationContinent,
      locationZoneId,
      xp,
      money,
      choiceRewards,
      guaranteedRewards,
      textSource: narrativeSource === "cmangos" ? "cmangos" : narrativeSource === "wowhead" ? "wowhead" : narrativeSource,
    };
    indexRows.push(summary);

    details.push({
      ...summary,
      classicXp,
      classRestriction: P.class ?? null,
      difficultyBands: (P.difficultyBands ?? []).map((b) => ({ color: b.color, level: b.level })),
      repeatable: P.repeatable === "Yes",
      timelimit: P.timelimit ?? null,
      profession: P.profession ?? null,
      shareable: P.shareable ?? null,
      status,
      statusNote: a?.knownStatus?.changeNote ?? null,
      footerSourceNote: a?.footerSourceNote ?? null,
      narrative,
      narrativeSource,
      prevQuest,
      nextQuest,
      nextQuestInChain,
      giverName,
      turnInName,
      startItemText,
      startNpcs: startList.map((n) => ({ name: n.name, zone: n.zone ?? null, x: n.x ?? null, y: n.y ?? null })),
      endNpcs: endNpcs.list.map((n) => ({ name: n.name, zone: n.zone ?? null, x: n.x ?? null, y: n.y ?? null })),
      reputation,
      mentionedItems,
      mapGroups,
      chain,
      objectiveItems: (a?.objectiveItems ?? []).map((o) => ({ itemId: o.itemId, name: o.name, icon: iconStem(o.icon), quality: o.quality, qty: o.qty, sources: o.sources ?? [] })),
      providedItems: (a?.providedItems ?? []).map((o) => ({ itemId: o.itemId, name: o.name, icon: iconStem(o.icon), quality: o.quality, qty: o.qty })),
      inScrape: !!a,
    });
  }

  // ---------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------
  fs.mkdirSync(OUT_DETAIL_DIR, { recursive: true });
  // Clear stale shards so a quest removed from the source doesn't linger.
  for (const f of fs.readdirSync(OUT_DETAIL_DIR)) if (f.endsWith(".json")) fs.rmSync(path.join(OUT_DETAIL_DIR, f));

  fs.writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify({ generatedAt: new Date().toISOString(), count: indexRows.length, quests: indexRows }));
  for (const d of details) fs.writeFileSync(path.join(OUT_DETAIL_DIR, `${d.id}.json`), JSON.stringify(d));
  fs.writeFileSync(
    path.join(OUT_DIR, "provenance.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), precedence: PRECEDENCE, fields: provenance }, null, 1)
  );

  console.log(`Wrote ${indexRows.length} index rows and ${details.length} detail shards.`);
  console.log(`Quests with any chain neighbour resolved: ${chainLinkResolved}`);
  for (const [field, p] of Object.entries(provenance)) {
    console.log(`  ${field.padEnd(22)} primary ${String(p.fromPrimary).padStart(5)}  fallback ${String(p.fromFallback).padStart(5)}  none ${String(p.fromNone).padStart(5)}  conflicts ${String(p.conflicts).padStart(5)}`);
  }
}

if (require.main === module) main();
