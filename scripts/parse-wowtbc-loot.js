#!/usr/bin/env node
// Parses raw get_page_text dumps of wowtbc.gg's WoW Forever dungeon loot
// pages (https://wowtbc.gg/warcraftforever/loot-tables/dungeons/<slug>/)
// into the data/sources/wowtbc-loot-YYYY-MM-DD.json snapshot shape (see
// lib/dungeon-loot.ts's DungeonLoot/LootBoss/QuestReward/LootItem types).
//
// This does NOT fetch the pages itself -- wowtbc.gg has no API, so each
// dungeon's raw text has to be collected by hand (browser + get_page_text,
// one <main> element's text per dungeon, saved verbatim to
// <rawDir>/<wowtbc-slug>.txt). This script is just the text -> JSON half.
//
// Usage: node scripts/parse-wowtbc-loot.js <rawDir> <outSnapshotPath> [pulledDate]

const fs = require("fs");
const path = require("path");

const SLOT_WORDS = new Set([
  "Head", "Neck", "Shoulder", "Back", "Chest", "Shirt", "Tabard", "Wrist",
  "Hands", "Waist", "Legs", "Feet", "Ring", "Finger", "Trinket",
  "One-Hand", "Off Hand", "Off-Hand", "Main Hand", "Two-Hand", "Ranged",
  "Thrown", "Relic", "Wand", "Held In Off-Hand",
]);

// wowtbc slug -> our data/dungeons.json id. Stratholme's two dungeons.json
// entries (stratholme-undead/stratholme-live) both point at this one
// combined loot entry -- wowtbc.gg doesn't split Stratholme's loot by side
// at all (confirmed: one page, ~16 bosses, no side markers) -- per explicit
// user decision when this feature was scoped.
const SLUG_TO_ID = {
  "hall-of-thanes": "hall-of-thanes",
  "ruins-of-lordaeron": "ruins-of-lordaeron",
  "ragefire-chasm": "ragefire-chasm",
  "the-deadmines": "deadmines",
  "wailing-caverns": "wailing-caverns",
  "shadowfang-keep": "shadowfang-keep",
  "blackfathom-deeps": "blackfathom-deeps",
  "the-stockade": "the-stockade",
  "excavation-site-wetlands": "excavation-site",
  "gnomeregan": "gnomeregan",
  "scarlet-monastery-graveyard": "sm-graveyard",
  "city-of-dalaran": "city-of-dalaran",
  "scarlet-monastery-library": "sm-library",
  "scarlet-monastery-armory": "sm-armory",
  "razorfen-kraul": "razorfen-kraul",
  "the-drowned-city": "drowned-city",
  "scarlet-monastery-cathedral": "sm-cathedral",
  "razorfen-downs": "razorfen-downs",
  "krol-dok-stronghold": "kroldok-stronghold",
  "uldaman": "uldaman",
  "maraudon": "maraudon",
  "zul-farrak": "zulfarrak",
  "alcaz-prison": "alcaz-prison",
  "stratholme": "stratholme",
  "the-temple-of-atal-hakkar": "sunken-temple",
  "blackrock-depths": "blackrock-depths",
  "blackmaw-hold": "blackmaw-hold",
  "dire-maul-east": "dire-maul-east",
  "blackrock-spire-lower": "lbrs",
  "scholomance": "scholomance",
  "dire-maul-west": "dire-maul-west",
  "dire-maul-north": "dire-maul-north",
  "shaper-s-terrace": "shapers-terrace",
  "blackrock-spire-upper": "ubrs",
};

function isSlotLine(line) {
  if (line === "Not Yet Discovered") return true;
  const [slot] = line.split(", ");
  return SLOT_WORDS.has(slot);
}

function parseSlotLine(line) {
  if (line === "Not Yet Discovered") return { slot: null, type: null, unknown: true };
  const [slot, type] = line.split(", ");
  return { slot, type: type ?? null, unknown: false };
}

function parseDropChanceLine(line) {
  const m = /^\((<)?(\d+)%\)$/.exec(line);
  if (!m) return null;
  return { dropChance: Number(m[2]), dropChanceUnder: Boolean(m[1]) };
}

function stripNewSuffix(name) {
  if (name.endsWith("NEW") && name.length > 3) {
    return { name: name.slice(0, -3), isNew: true };
  }
  return { name, isNew: false };
}

// Consumes one item starting at lines[i] (the item's name line); lines[i+1]
// must already be confirmed as a slot line by the caller. Returns the item
// and the next unconsumed index.
function parseItem(lines, i) {
  const { name, isNew } = stripNewSuffix(lines[i]);
  const { slot, type, unknown } = parseSlotLine(lines[i + 1]);
  let next = i + 2;
  let dropChance = null;
  let dropChanceUnder = false;
  if (next < lines.length) {
    const pct = parseDropChanceLine(lines[next]);
    if (pct) {
      dropChance = pct.dropChance;
      dropChanceUnder = pct.dropChanceUnder;
      next += 1;
    }
  }
  return { item: { name, slot, type, dropChance, dropChanceUnder, isNew, unknown }, next };
}

// Consumes a run of items starting at lines[i] (a name line) for as long as
// each name is followed by a recognizable slot line. Returns the items and
// the index of the first line that ISN'T part of this run (either a new
// boss/quest header, a section keyword, or end of array).
function parseItemRun(lines, i) {
  const items = [];
  let cur = i;
  while (cur < lines.length && cur + 1 < lines.length && isSlotLine(lines[cur + 1])) {
    const { item, next } = parseItem(lines, cur);
    items.push(item);
    cur = next;
  }
  return { items, next: cur };
}

// Known cases where wowtbc.gg's own page structure breaks the "everything
// after Quest Rewards is a quest" assumption -- a boss entry placed AFTER
// the Quest Rewards heading, with no Level suffix and no faction-quest
// shape, that the grammar can't distinguish from a real quest by text
// alone. Found by inspection, not automatically detected (the parser
// produces no warning for these -- they parse "successfully" as quests).
// Moves each named entry from questRewards back into bosses post-parse.
const MISCLASSIFIED_BOSS_FIXUPS = {
  // Blackfathom Deeps: "Baron Aquanis" (a real, if optional/rare,
  // Blackfathom Deeps boss) appears after the last Quest Rewards entry
  // ("Allegiance to the Old Gods", Horde Only) with no Level suffix.
  "blackfathom-deeps": ["Baron Aquanis"],
};

function applyMisclassifiedBossFixups(slug, bosses, questRewards, warnings) {
  const names = MISCLASSIFIED_BOSS_FIXUPS[slug];
  if (!names) return;
  for (const name of names) {
    const idx = questRewards.findIndex((q) => q.questName === name);
    if (idx === -1) {
      warnings.push(`${slug}: expected misclassified boss "${name}" in questRewards but didn't find it -- check if the source page changed`);
      continue;
    }
    const [moved] = questRewards.splice(idx, 1);
    bosses.push({ name: moved.questName, items: moved.items });
  }
}

function parseDungeonText(rawText, slug, warnings) {
  // Drop everything through the DISCLAIMER paragraph -- the real content
  // starts at the dungeon name repeated as its own line right after it.
  const disclaimerIdx = rawText.indexOf("Submit it here");
  const body = disclaimerIdx === -1 ? rawText : rawText.slice(disclaimerIdx + "Submit it here".length);
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    warnings.push(`${slug}: no content lines after disclaimer -- check the raw dump`);
    return { bosses: [], questRewards: [] };
  }

  // First line is the dungeon name repeated -- skip it (we already know the
  // dungeon from the mapping table / file name).
  let i = 1;

  if (lines[i] === "Bosses and loot for this dungeon have not been discovered yet.") {
    return { bosses: [], questRewards: [] };
  }

  const bosses = [];
  const questRewards = [];
  let inQuests = false;
  let faction = null;

  while (i < lines.length) {
    const line = lines[i];

    if (line === "Quest Rewards") {
      inQuests = true;
      faction = null;
      i += 1;
      continue;
    }
    if (line === "Alliance Only" || line === "Horde Only") {
      faction = line.split(" ")[0];
      i += 1;
      continue;
    }

    // A boss/quest header: its own next line is NOT a slot line (an item
    // name's next line always IS one -- see parseItemRun).
    const headerName = line;
    i += 1;

    if (!inQuests && lines[i] === "No Drops Discovered Yet") {
      bosses.push({ name: headerName, items: [] });
      i += 1;
      continue;
    }

    const { items, next } = parseItemRun(lines, i);
    i = next;

    if (!inQuests) {
      bosses.push({ name: headerName, items });
    } else {
      const levelMatch = /^(.*?)Level (\d+)$/.exec(headerName);
      const questName = levelMatch ? levelMatch[1] : headerName;
      const level = levelMatch ? Number(levelMatch[2]) : null;
      questRewards.push({ faction, questName, level, items });
    }

    if (items.length === 0 && i < lines.length && !["Quest Rewards", "Alliance Only", "Horde Only"].includes(lines[i])) {
      // Headers should always be followed by at least one item (or "No
      // Drops Discovered Yet", handled above) -- an empty run here means
      // the lookahead grammar didn't recognize something. Flag it instead
      // of silently producing a boss/quest with zero items.
      warnings.push(`${slug}: "${headerName}" had no recognizable items (next line: "${lines[i]}")`);
    }
  }

  applyMisclassifiedBossFixups(slug, bosses, questRewards, warnings);

  return { bosses, questRewards };
}

function main() {
  const [, , rawDirArg, outPathArg, pulledDateArg] = process.argv;
  if (!rawDirArg || !outPathArg) {
    console.error("Usage: node scripts/parse-wowtbc-loot.js <rawDir> <outSnapshotPath> [pulledDate]");
    process.exit(1);
  }
  const rawDir = path.resolve(rawDirArg);
  const outPath = path.resolve(outPathArg);
  const pulledDate = pulledDateArg || new Date().toISOString().slice(0, 10);

  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith(".txt"));
  const warnings = [];
  const dungeons = {};

  for (const file of files) {
    const slug = file.replace(/\.txt$/, "");
    const id = SLUG_TO_ID[slug];
    if (!id) {
      warnings.push(`${slug}: no entry in SLUG_TO_ID -- skipped entirely`);
      continue;
    }
    const raw = fs.readFileSync(path.join(rawDir, file), "utf8");
    const firstLine = raw.split("\n")[0].trim();
    const wowtbcName = firstLine.replace(/ Loot Table - WoW Forever$/, "");
    const { bosses, questRewards } = parseDungeonText(raw, slug, warnings);
    dungeons[id] = { wowtbcSlug: slug, wowtbcName, bosses, questRewards };
  }

  const missing = Object.values(SLUG_TO_ID).filter((id, idx, arr) => arr.indexOf(id) === idx && !(id in dungeons));
  if (missing.length > 0) {
    warnings.push(`Missing output for ids: ${missing.join(", ")}`);
  }

  const out = {
    _readme:
      "Dungeon loot tables for World of Warcraft: Forever, pulled from wowtbc.gg's community-crowdsourced loot tables (https://wowtbc.gg/warcraftforever/loot-tables/dungeons/). wowtbc.gg's own disclaimer: 'Loot is still being discovered. Drops for the original dungeons come from the Classic Era loot tables and may have moved.' This is NOT beta-client-confirmed data the way talentsforever's talent/spellbook data is -- see components/reference/LootDisclaimer.tsx, rendered on every loot page. Dungeon keys match data/dungeons.json's own ids; 'stratholme' is a combined entry referenced by both dungeons.json's 'stratholme-undead' and 'stratholme-live' rows, since wowtbc.gg doesn't split Stratholme's loot by side. Item 'unknown: true' means wowtbc.gg itself shows 'Not Yet Discovered' for that item's slot/type. 'dropChance' is a percent (may exceed 100 in rare cases -- a source data glitch, kept verbatim, e.g. one Stratholme item shows 127%); 'dropChanceUnder: true' means the source showed \"<N%\" rather than an exact value. 'isNew: true' on an item means wowtbc.gg tags that specific item (not just the dungeon) as new to Forever. A dungeon with empty bosses/questRewards arrays means wowtbc.gg's own page says 'Bosses and loot for this dungeon have not been discovered yet.' -- not a scraping gap.",
    source: "https://wowtbc.gg/warcraftforever/loot-tables/dungeons/",
    pulledDate,
    dungeons,
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`Wrote ${outPath}`);
  console.log(`Dungeons parsed: ${Object.keys(dungeons).length}`);
  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
}

main();
