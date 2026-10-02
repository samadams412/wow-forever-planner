#!/usr/bin/env node
// Parses the locally-scraped Wowhead Forever quest pages
// (data/sources/wowhead/quests/scraped_quests_output.json, gitignored -- 5.4MB
// raw page scrape) into data/sources/wowhead/quest-text.json, in the same row
// shape as cmangos/quest-text.json, for the quests cMaNGOS has no row for
// (the "new to Forever" set, see data/sources/foreverchanges/quests/
// missing-cmangos-text.json). Only the narrative fields are kept.
//
// Field mapping (Wowhead -> cmangos shape):
//   description_text -> details
//   progress_text    -> requestItemsText
//   completion_text  -> offerRewardText
// Wowhead has no separate objectives field (its "subtitle" is a noisy
// objective summary mixed with page JS), so objectives/endText stay null.
//
// The scrape includes page-script/boilerplate junk after the real text (item
// icon JS, "See if you've already completed this...", Wowhead CTA code) --
// cut at the first marker. <name>/<class>/<race> placeholders get the same
// neutral stand-ins lib/quests.ts's sanitizeQuestText uses for cMaNGOS's
// $N/$C/$R codes. No $-escape codes occur in this data.
//
// Also writes data/sources/wowhead/quest-extras.json -- optional structured
// per-quest fields from the same scrape, each present only when the page had it:
//   xp          from `gains` ("90 experience", comma-grouped). The setupScalingRewards
//               script in the same block only ever has ONE level (min==max==quest
//               level) and no per-difficulty-color values, so there is no scaling
//               model to derive -- this is the displayed base value, not a model.
//   reputation  from `gains` ("25 reputation with Orgrimmar", may be negative);
//               factionId joined from the page's mentioned faction entities.
//   start/end   npc/object name+id from `quick_fact_entities` (field start|end).
//   items       distinct item ids from `mentioned_entities` (resolved against
//               data/items.json at request time, not here).
//   points      start/end NPC map points from the page's embedded Mapper JSON
//               (zone id + zone-relative percent coords) -- stored for a future
//               start/end quest map; not rendered yet.
//
// Usage: node scripts/build-wowhead-quest-text.js

const fs = require("fs");
const path = require("path");

const IN_FILE = path.join(__dirname, "..", "data", "sources", "wowhead", "quests", "scraped_quests_output.json");
const MISSING_FILE = path.join(__dirname, "..", "data", "sources", "foreverchanges", "quests", "missing-cmangos-text.json");
const CMANGOS_FILE = path.join(__dirname, "..", "data", "sources", "cmangos", "quest-text.json");
const OUT_FILE = path.join(__dirname, "..", "data", "sources", "wowhead", "quest-text.json");
const EXTRAS_FILE = path.join(__dirname, "..", "data", "sources", "wowhead", "quest-extras.json");

const num = (str) => Number(str.replace(/,/g, ""));

function parseMapper(subtitle) {
  const m = /new Mapper\((\{.*?\})\);\s*\n/s.exec(subtitle || "");
  if (!m) return [];
  let j;
  try { j = JSON.parse(m[1]); } catch { return []; }
  const points = [];
  for (const [zoneId, zone] of Object.entries(j.objectives || {})) {
    for (const level of zone.levels || []) {
      for (const p of level) {
        if ((p.point !== "start" && p.point !== "end") || !Array.isArray(p.coord)) continue;
        points.push({ point: p.point, zoneId: Number(zoneId), zone: zone.zone || null, npcId: p.id ?? null, name: p.name || null, x: p.coord[0], y: p.coord[1] });
      }
    }
  }
  return points;
}

function extractExtras(e) {
  const out = {};
  const gains = e.gains || [];
  const xpLine = gains.map((g) => /^([\d,]+) experience$/.exec(g)).find(Boolean);
  if (xpLine && num(xpLine[1]) > 0) out.xp = num(xpLine[1]);

  const factions = new Map((e.mentioned_entities || []).filter((m) => m.type === "faction").map((m) => [m.name, m.id]));
  const reputation = [];
  for (const g of gains) {
    const r = /^(-?[\d,]+) reputation with (.+)$/.exec(g);
    if (r && num(r[1]) !== 0) reputation.push({ faction: r[2], factionId: factions.get(r[2]) ?? null, amount: num(r[1]) });
  }
  if (reputation.length) out.reputation = reputation;

  const pointNames = new Map(parseMapper(e.subtitle).map((p) => [p.npcId, p.name]));
  for (const field of ["start", "end"]) {
    const list = [];
    for (const q of e.quick_fact_entities || []) {
      if (q.field !== field || (q.type !== "npc" && q.type !== "object")) continue;
      const name = (q.name || pointNames.get(q.id) || "").trim();
      if (name) list.push({ type: q.type, id: q.id, name });
    }
    if (list.length) out[field] = list;
  }

  const items = [...new Set((e.mentioned_entities || []).filter((m) => m.type === "item").map((m) => m.id))];
  if (items.length) out.items = items;

  const points = parseMapper(e.subtitle);
  if (points.length) out.points = points;
  return out;
}

const JUNK_START = /\n\s*(?:WH\.|See if you've already|\{"ox")|\s*Gather info with the Wowhead/;

function clean(raw) {
  let t = (raw || "").replace(/ /g, " ");
  const m = JUNK_START.exec(t);
  if (m) {
    const tail = t.slice(m.index);
    t = t.slice(0, m.index);
    // A cut right at the item-icon script leaves the item list line
    // ("Some Item (1)") that preceded it -- drop that trailing line.
    if (/^\s*WH\.ge\(/.test(tail)) t = t.replace(/\n[^\n]*\(\d+\)\s*$/, "");
  }
  return t
    .replace(/<name>/gi, "adventurer")
    .replace(/<class>/gi, "champion")
    .replace(/<race>/gi, "friend")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    // Wowhead splits text around inline links onto their own lines -- a lone
    // newline is mid-sentence; real paragraph breaks are blank lines.
    .replace(/(?<!\n)\n(?!\n)/g, " ")
    .replace(/ ([.,;:!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const scraped = JSON.parse(fs.readFileSync(IN_FILE, "utf8"));
const missing = JSON.parse(fs.readFileSync(MISSING_FILE, "utf8")).quests;
const cmangos = JSON.parse(fs.readFileSync(CMANGOS_FILE, "utf8")).quests;
const missingIds = new Set(missing.map((q) => q.id));

const quests = {};
const extras = {};
let dup = 0, empty = 0, skippedHasCmangos = 0, outsideMissing = 0;
for (const e of scraped) {
  if (quests[e.id] || extras[e.id]) { dup++; continue; }
  if (Object.prototype.hasOwnProperty.call(cmangos, String(e.id))) { skippedHasCmangos++; continue; }
  if (!missingIds.has(e.id)) outsideMissing++;
  // Extras are independent of narrative text -- a quest with no text can still
  // have XP/reputation/giver data.
  const ex = extractExtras(e);
  if (Object.keys(ex).length) extras[e.id] = ex;
  const details = clean(e.description_text) || null;
  const requestItemsText = clean(e.progress_text) || null;
  const offerRewardText = clean(e.completion_text) || null;
  if (!details && !requestItemsText && !offerRewardText) { empty++; continue; }
  quests[e.id] = {
    title: (e.title || "").trim() || null,
    details,
    objectives: null,
    offerRewardText,
    requestItemsText,
    endText: null,
    objectiveText: [],
    prevQuestId: null,
    nextQuestId: null,
    nextQuestInChain: null,
  };
}

fs.writeFileSync(
  OUT_FILE,
  JSON.stringify({
    source: "https://www.wowhead.com/forever",
    scrapedFile: "data/sources/wowhead/quests/scraped_quests_output.json (gitignored)",
    pulledDate: new Date().toISOString().slice(0, 10),
    questCount: Object.keys(quests).length,
    quests,
  }),
);
fs.writeFileSync(
  EXTRAS_FILE,
  JSON.stringify({
    source: "https://www.wowhead.com/forever",
    scrapedFile: "data/sources/wowhead/quests/scraped_quests_output.json (gitignored)",
    pulledDate: new Date().toISOString().slice(0, 10),
    questCount: Object.keys(extras).length,
    quests: extras,
  }),
);
const filled = missing.filter((q) => quests[q.id]).length;
console.log(`scraped=${scraped.length} dupSkipped=${dup} hasCmangosSkipped=${skippedHasCmangos} outsideMissingList=${outsideMissing} noUsableText=${empty}`);
console.log(`wrote ${Object.keys(quests).length} quests; ${filled}/${missing.length} of the missing list filled, ${missing.length - filled} still without text`);
const cnt = (k) => Object.values(extras).filter((x) => x[k]).length;
console.log(`extras: ${Object.keys(extras).length} quests; xp=${cnt("xp")} reputation=${cnt("reputation")} start=${cnt("start")} end=${cnt("end")} items=${cnt("items")} points=${cnt("points")}`);
