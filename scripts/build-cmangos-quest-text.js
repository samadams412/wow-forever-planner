#!/usr/bin/env node
// Pulls quest_template from cmangos/classic-db (GPL-3.0, github.com/cmangos/
// classic-db) and extracts ONLY the narrative text fields (title/details/
// objectives/offer-reward/request-items/end text) into
// data/sources/cmangos/quest-text.json, keyed by quest id.
//
// The full ~73MB decompressed SQL dump is fetched into a temp dir and
// discarded after parsing -- never committed to this repo (see the
// standing rule in CLAUDE.md against committing large external pulls).
// locales_quest (non-English locale text) is empty upstream as of this
// pull -- enUS text lives directly in quest_template's own Title/Details/
// etc. columns, so that's all this script reads.
//
// Usage: node scripts/build-cmangos-quest-text.js

const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const https = require("https");

const DUMP_URL = "https://raw.githubusercontent.com/cmangos/classic-db/master/Full_DB/ClassicDB_1_12_1_z2815.sql.gz";
const OUT_FILE = path.join(__dirname, "..", "data", "sources", "cmangos", "quest-text.json");

const KEEP_COLUMNS = [
  "title",
  "details",
  "objectives",
  "offerRewardText",
  "requestItemsText",
  "endText",
  "objectiveText1",
  "objectiveText2",
  "objectiveText3",
  "objectiveText4",
  "prevQuestId",
  "nextQuestId",
  "nextQuestInChain",
];

// quest_template's column order, as declared in its CREATE TABLE statement.
// Only used to map positional INSERT values back to field names -- kept
// inline (rather than re-parsing CREATE TABLE) since this is a one-shot
// extraction script, not a general SQL-dump tool.
const QUEST_TEMPLATE_COLUMNS = [
  "entry","Method","ZoneOrSort","MinLevel","MaxLevel","QuestLevel","Type","RequiredClasses","RequiredRaces",
  "RequiredSkill","RequiredSkillValue","RequiredCondition","RepObjectiveFaction","RepObjectiveValue",
  "RequiredMinRepFaction","RequiredMinRepValue","RequiredMaxRepFaction","RequiredMaxRepValue","SuggestedPlayers",
  "LimitTime","QuestFlags","SpecialFlags","PrevQuestId","NextQuestId","ExclusiveGroup","BreadcrumbForQuestId",
  "NextQuestInChain","SrcItemId","SrcItemCount","SrcSpell",
  "Title","Details","Objectives","OfferRewardText","RequestItemsText","EndText",
  "ObjectiveText1","ObjectiveText2","ObjectiveText3","ObjectiveText4",
  "ReqItemId1","ReqItemId2","ReqItemId3","ReqItemId4","ReqItemCount1","ReqItemCount2","ReqItemCount3","ReqItemCount4",
  "ReqSourceId1","ReqSourceId2","ReqSourceId3","ReqSourceId4","ReqSourceCount1","ReqSourceCount2","ReqSourceCount3","ReqSourceCount4",
  "ReqCreatureOrGOId1","ReqCreatureOrGOId2","ReqCreatureOrGOId3","ReqCreatureOrGOId4",
  "ReqCreatureOrGOCount1","ReqCreatureOrGOCount2","ReqCreatureOrGOCount3","ReqCreatureOrGOCount4",
  "ReqSpellCast1","ReqSpellCast2","ReqSpellCast3","ReqSpellCast4",
  "RewChoiceItemId1","RewChoiceItemId2","RewChoiceItemId3","RewChoiceItemId4","RewChoiceItemId5","RewChoiceItemId6",
  "RewChoiceItemCount1","RewChoiceItemCount2","RewChoiceItemCount3","RewChoiceItemCount4","RewChoiceItemCount5","RewChoiceItemCount6",
  "RewItemId1","RewItemId2","RewItemId3","RewItemId4","RewItemCount1","RewItemCount2","RewItemCount3","RewItemCount4",
  "RewRepFaction1","RewRepFaction2","RewRepFaction3","RewRepFaction4","RewRepFaction5",
  "RewRepValue1","RewRepValue2","RewRepValue3","RewRepValue4","RewRepValue5",
  "RewOrReqMoney","RewMoneyMaxLevel","RewSpell","RewSpellCast","RewMailTemplateId","RewMailDelaySecs",
  "PointMapId","PointX","PointY","PointOpt",
  "DetailsEmote1","DetailsEmote2","DetailsEmote3","DetailsEmote4",
  "DetailsEmoteDelay1","DetailsEmoteDelay2","DetailsEmoteDelay3","DetailsEmoteDelay4",
  "IncompleteEmote","IncompleteEmoteDelay","CompleteEmote","CompleteEmoteDelay",
  "OfferRewardEmote1","OfferRewardEmote2","OfferRewardEmote3","OfferRewardEmote4",
  "OfferRewardEmoteDelay1","OfferRewardEmoteDelay2","OfferRewardEmoteDelay3","OfferRewardEmoteDelay4",
  "StartScript","CompleteScript",
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

// Parses one or more `INSERT INTO ... VALUES (...),(...),...;` statements
// (concatenated) into row-tuples of JS values (string | number-as-string |
// null). Handles MySQL backslash-escaped string literals.
function parseInsertValues(text) {
  const rows = [];
  let pos = text.indexOf("VALUES");
  if (pos === -1) return rows;
  pos += "VALUES".length;
  const n = text.length;
  while (pos < n) {
    while (pos < n && /[\s;]/.test(text[pos])) pos++;
    if (pos >= n) break;
    if (text[pos] !== "(") {
      const nextInsert = text.indexOf("VALUES", pos);
      if (nextInsert === -1) break;
      pos = nextInsert + "VALUES".length;
      continue;
    }
    pos++; // consume '('
    const row = [];
    for (;;) {
      while (pos < n && /\s/.test(text[pos])) pos++;
      if (text[pos] === "'") {
        pos++;
        let s = "";
        while (pos < n) {
          const ch = text[pos];
          if (ch === "\\") {
            const next = text[pos + 1];
            const map = { "'": "'", "\\": "\\", n: "\n", r: "\r", t: "\t", "0": "\0", '"': '"' };
            s += next in map ? map[next] : next;
            pos += 2;
            continue;
          }
          if (ch === "'") {
            if (text[pos + 1] === "'") {
              s += "'";
              pos += 2;
              continue;
            }
            pos++;
            break;
          }
          s += ch;
          pos++;
        }
        row.push(s);
      } else if (text.slice(pos, pos + 4) === "NULL") {
        row.push(null);
        pos += 4;
      } else {
        let s = "";
        while (pos < n && text[pos] !== "," && text[pos] !== ")") {
          s += text[pos];
          pos++;
        }
        row.push(s.trim());
      }
      while (pos < n && /\s/.test(text[pos])) pos++;
      if (text[pos] === ",") {
        pos++;
        continue;
      }
      if (text[pos] === ")") {
        pos++;
        break;
      }
      throw new Error(`Unexpected char at ${pos}: ${JSON.stringify(text.slice(pos, pos + 20))}`);
    }
    rows.push(row);
    while (pos < n && /\s/.test(text[pos])) pos++;
    if (text[pos] === ",") {
      pos++;
      continue;
    }
    if (text[pos] === ";") {
      const nextInsert = text.indexOf("VALUES", pos);
      if (nextInsert === -1) break;
      pos = nextInsert + "VALUES".length;
      continue;
    }
  }
  return rows;
}

function toNullableInt(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

async function main() {
  console.log("Fetching cmangos/classic-db Full_DB dump (~13MB gzipped)...");
  const gz = await fetchBuffer(DUMP_URL);
  console.log(`Downloaded ${(gz.length / 1024 / 1024).toFixed(1)} MB, decompressing...`);
  const sql = zlib.gunzipSync(gz).toString("utf8");
  console.log(`Decompressed to ${(sql.length / 1024 / 1024).toFixed(1)} MB.`);

  // Isolate the quest_template INSERT statement(s) only -- no need to parse
  // the other ~70MB of unrelated tables.
  const createIdx = sql.indexOf("CREATE TABLE `quest_template`");
  if (createIdx === -1) throw new Error("quest_template table not found in dump");
  const insertStart = sql.indexOf("INSERT INTO `quest_template`", createIdx);
  if (insertStart === -1) throw new Error("No INSERT INTO `quest_template` found");
  const nextCreateIdx = sql.indexOf("\nCREATE TABLE", insertStart);
  const insertBlock = sql.slice(insertStart, nextCreateIdx === -1 ? sql.length : nextCreateIdx);

  const rows = parseInsertValues(insertBlock);
  console.log(`Parsed ${rows.length} quest_template rows.`);

  const keepIndexes = {};
  for (const col of KEEP_COLUMNS) {
    const sourceCol = col.charAt(0).toUpperCase() + col.slice(1);
    keepIndexes[col] = QUEST_TEMPLATE_COLUMNS.indexOf(sourceCol);
  }
  const entryIdx = QUEST_TEMPLATE_COLUMNS.indexOf("entry");

  const quests = {};
  for (const row of rows) {
    const id = row[entryIdx];
    quests[id] = {
      title: row[keepIndexes.title] || null,
      details: row[keepIndexes.details] || null,
      objectives: row[keepIndexes.objectives] || null,
      offerRewardText: row[keepIndexes.offerRewardText] || null,
      requestItemsText: row[keepIndexes.requestItemsText] || null,
      endText: row[keepIndexes.endText] || null,
      objectiveText: [
        row[keepIndexes.objectiveText1],
        row[keepIndexes.objectiveText2],
        row[keepIndexes.objectiveText3],
        row[keepIndexes.objectiveText4],
      ].filter(Boolean),
      // Chain links, Classic-era (cmangos) values -- may not reflect
      // Forever-specific chain changes for quests whose chain membership
      // Forever altered. prevQuestId/nextQuestId: 0 = none. nextQuestInChain
      // is a separate "exclusive branch" successor distinct from
      // nextQuestId (both can be present); kept as a third field rather than
      // merged into nextQuestId so a consumer can decide how to treat it.
      prevQuestId: toNullableInt(row[keepIndexes.prevQuestId]),
      nextQuestId: toNullableInt(row[keepIndexes.nextQuestId]),
      nextQuestInChain: toNullableInt(row[keepIndexes.nextQuestInChain]),
    };
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUT_FILE,
    JSON.stringify(
      {
        source: "https://github.com/cmangos/classic-db",
        license: "GPL-3.0",
        table: "quest_template",
        pulledDate: new Date().toISOString().slice(0, 10),
        questCount: Object.keys(quests).length,
        quests,
      },
      null,
      0,
    ),
  );
  console.log(`Wrote ${Object.keys(quests).length} quests to ${path.relative(process.cwd(), OUT_FILE)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
