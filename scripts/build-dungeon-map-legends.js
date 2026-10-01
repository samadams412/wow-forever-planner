// Parses Atlas addon map data into per-dungeon marker legends for the loot
// page's dungeon map viewer. Two source files, both local-only (not
// committed, same as the .blp sources) -- a small targeted parser, not a
// Lua interpreter, pattern-matching the addon's specific
// `{ COLORVAR.." N) "..SomeKey["Name"]..more },` row shape:
//
//  - data/map/dungeon-maps/Classic-ClassicEra.lua ("old") -- bundled with
//    the _classic_era_ client, reflects pure vanilla/Classic-Era dungeon
//    layouts (CL_-prefixed keys).
//  - data/dungeons/Classic-Classic.lua ("new") -- bundled with the modern
//    retail client's Atlas copy. For zones Blizzard never redesigned this
//    is a more complete legend (more rows, same bosses); for zones that
//    got a later expansion facelift (Deadmines, Scarlet Monastery,
//    Shadowfang Keep, Ragefire Chasm, Scholomance, The Stockade) it
//    reflects THAT redesign instead -- e.g. its "Deadmines" entries are
//    the Cataclysm remake (Glubtok, Vanessa VanCleef) and its single
//    merged "ScarletMonastery"/"ScarletHalls" is the 2-wing Cata version,
//    neither of which matches this project's loot data (sourced from the
//    original vanilla layouts: Rhahk'Zor/Gilnid/Edwin VanCleef Deadmines,
//    4-wing Graveyard/Library/Armory/Cathedral Scarlet Monastery).
//
// LEGEND_SOURCES below picks whichever file's content actually matches
// this project's real data/dungeons/<id>.json boss roster, per dungeon --
// verified by scoring each candidate's parsed labels against the real
// boss list before deciding (see the 2026-10-01 handoff for the full
// comparison table), not assumed from "newer must be better".
//
// Manual script, not wired into prebuild (neither source .lua file is
// committed) -- run by hand as `node scripts/build-dungeon-map-legends.js`
// whenever a source dump changes, and commit the generated output.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OLD_LUA_PATH = path.join(ROOT, "data", "map", "dungeon-maps", "Classic-ClassicEra.lua");
const NEW_LUA_PATH = path.join(ROOT, "data", "dungeons", "Classic-Classic.lua");
const OUT_PATH = path.join(ROOT, "lib", "dungeon-map-legends.generated.ts");

// AceLocale/Babble keys used as structural punctuation rather than literal
// English words -- translated to symbols. Every other XXX["Key"] reference
// (BZ, L, ALC, BF) is treated as literal display text equal to its key,
// which holds for the base (English) locale these files are written against.
const PUNCTUATION = {
  "L-Parenthesis": "(",
  "R-Parenthesis": ")",
  Comma: ", ",
  Colon: ": ",
  Slash: "/",
  Hyphen: " - ",
};

// Atlas's own color-coding convention (consistent across both files): BLUE
// for entrances/zone transitions, WHIT for main bosses, ORNG for rares/
// optional objectives, GREN for quest givers/flavor extras. Hex values are
// the addon's own (alpha byte of the |cAARRGGBB code dropped -- only the
// RGB matters for display). GREY/_RED/PINK/PURP/YLOW don't appear on any
// marker row in our dungeon set (verified -- see handoff) but are mapped
// for completeness in case a future source file uses them on a real row.
const COLOR_HEX = {
  BLUE: "#8a99ff",
  GREN: "#8fd467",
  GREY: "#999999",
  LBLU: "#33cccc",
  _RED: "#e05c5c",
  ORNG: "#e0ad5c",
  PINK: "#e05ce0",
  PURP: "#b35cff",
  WHIT: "#e8e8e8",
  YLOW: "#e0d85c",
};

// dungeonId -> { file: "old" | "new", key: <Atlas map key> }.
const LEGEND_SOURCES = {
  // New file's version is a later redesign that doesn't match this
  // project's (vanilla) loot data -- old file is the real vanilla legend.
  "ragefire-chasm": { file: "old", key: "CL_RagefireChasm" },
  "shadowfang-keep": { file: "old", key: "CL_ShadowfangKeep" },
  "the-stockade": { file: "old", key: "CL_TheStockade" },
  scholomance: { file: "old", key: "CL_Scholomance" },
  deadmines: { file: "old", key: "CL_TheDeadmines" },
  // Uldaman: new file groups Eric/Baelog/Olaf under one "Lost Dwarves"
  // marker; old file numbers them individually, matching both the image's
  // own baked-in numbering and this project's 3-separate-boss loot data.
  uldaman: { file: "old", key: "CL_Uldaman" },
  // Not redesigns -- just happened to score lower on raw label-match count
  // against our real roster than the old file's version of the same zone.
  maraudon: { file: "old", key: "CL_Maraudon" },
  "sunken-temple": { file: "old", key: "CL_TheSunkenTemple" },

  // Scarlet Monastery: new file only has the merged 2-wing Cata version
  // (no per-wing data at all) -- old file is the only source with the
  // correct 4-wing vanilla split this project's loot data uses.
  "sm-graveyard": { file: "old", key: "CL_SMGraveyard" },
  "sm-library": { file: "old", key: "CL_SMLibrary" },
  "sm-armory": { file: "old", key: "CL_SMArmory" },
  "sm-cathedral": { file: "old", key: "CL_SMCathedral" },

  // New file's version matches (not a later redesign) and is more complete.
  "wailing-caverns": { file: "new", key: "WailingCaverns" },
  gnomeregan: { file: "new", key: "Gnomeregan" },
  "blackrock-depths": { file: "new", key: "BlackrockDepths" },
  "dire-maul-east": { file: "new", key: "DireMaulEast" },
  "dire-maul-west": { file: "new", key: "DireMaulWest" },
  "dire-maul-north": { file: "new", key: "DireMaulNorth" },
  lbrs: { file: "new", key: "LowerBlackrockSpire" },
  zulfarrak: { file: "new", key: "ZulFarrak" },

  // Identical content in both files (same CL_-prefixed key, neither file
  // has a redesigned/alternate version) -- new file picked arbitrarily.
  "blackfathom-deeps": { file: "new", key: "CL_BlackfathomDeepsA" },
  "razorfen-kraul": { file: "new", key: "CL_RazorfenKraul" },
  "razorfen-downs": { file: "new", key: "CL_RazorfenDowns" },
  ubrs: { file: "new", key: "CL_BlackrockSpireUpper" },

  // Only in the new file, which is also the only source that splits
  // Stratholme by side at all -- verified against this project's own
  // stratholme-undead/-live boss rosters (see scripts/convert-dungeon-maps.js).
  "stratholme-live": { file: "new", key: "StratholmeCrusader" },
  "stratholme-undead": { file: "new", key: "StratholmeGauntlet" },
};

function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '"') inString = !inString;
    if (!inString) {
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
    }
    if (depth === 0 && !inString && str.startsWith(sep, i)) {
      parts.push(current);
      current = "";
      i += sep.length - 1;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

const KEY_REF = /^(?:BZ|L|ALC|BF)\["([^"]+)"\]$/;
const BOSS_NAME = /^Atlas_GetBossName\(\s*"([^"]+)"/;
const STRING_LITERAL = /^"([^"]*)"$/;
const COLOR_VARS = new Set(Object.keys(COLOR_HEX));

function resolveFragment(fragment) {
  const trimmed = fragment.trim();
  if (COLOR_VARS.has(trimmed) || trimmed === "INDENT") return null;
  let m = trimmed.match(STRING_LITERAL);
  if (m) return m[1];
  m = trimmed.match(KEY_REF);
  if (m) return PUNCTUATION[m[1]] ?? m[1];
  m = trimmed.match(BOSS_NAME);
  if (m) return m[1];
  return null; // unresolved fragment (rare addon-locale helper, or a bare global like FACTION_ALLIANCE) -- dropped
}

function parseRow(rowContent) {
  const [exprPart] = splitTopLevel(rowContent, ",");
  const fragments = splitTopLevel(exprPart, "..").map((f) => f.trim());
  if (fragments.length < 2) return null;
  const colorVar = fragments[0].trim();
  if (!COLOR_VARS.has(colorVar)) return null;
  const markerMatch = resolveFragment(fragments[1])?.match(/^\s*([A-Za-z0-9](?:-[A-Za-z0-9])?)'?\)\s*$/);
  if (!markerMatch) return null;
  const marker = markerMatch[1];
  const labelParts = fragments
    .slice(2)
    .map(resolveFragment)
    .filter((x) => x !== null);
  const label = labelParts
    .join("")
    .trim()
    // Drop empty "()" left behind by fragments this parser can't resolve
    // (e.g. the bare Lua globals FACTION_ALLIANCE/FACTION_HORDE, not a
    // BZ/L/ALC/BF table reference) -- better to lose the annotation than
    // show a meaningless empty parenthetical.
    .replace(/\s*\(\s*\)/g, "")
    .replace(/([^\s(])\(/g, "$1 (")
    .trim();
  if (!label) return null;
  return { marker, label, color: COLOR_HEX[colorVar] };
}

function parseLua(text, endMarker) {
  text = text.replace(/\r\n/g, "\n");
  if (endMarker) text = text.slice(0, text.indexOf(endMarker));
  const maps = {};
  const blockRe = /\n\t(\w+) = \{\n([\s\S]*?)\n\t\},/g;
  let match;
  while ((match = blockRe.exec(text))) {
    const [, key, body] = match;
    if (maps[key]) continue; // keep first occurrence only (some keys repeat)
    const rows = [];
    const rowRe = /\n\t\t\{ (.*) \},?$/gm;
    let rowMatch;
    while ((rowMatch = rowRe.exec(body))) {
      const parsed = parseRow(rowMatch[1]);
      if (parsed) rows.push(parsed);
    }
    maps[key] = rows;
  }
  return maps;
}

function main() {
  if (!fs.existsSync(OLD_LUA_PATH) || !fs.existsSync(NEW_LUA_PATH)) {
    console.error(`Missing source file(s) -- expected both:\n  ${path.relative(ROOT, OLD_LUA_PATH)}\n  ${path.relative(ROOT, NEW_LUA_PATH)}`);
    process.exit(1);
  }
  const oldMaps = parseLua(fs.readFileSync(OLD_LUA_PATH, "utf8"));
  // The new file has a second table (db.AtlasMaps_NPC_DB, x/y pixel
  // coordinates, a different row shape) immediately after db.AtlasMaps --
  // stop before it so its rows never get fed through the parser above.
  const newMaps = parseLua(fs.readFileSync(NEW_LUA_PATH, "utf8"), "db.AtlasMaps_NPC_DB");

  const legends = {};
  for (const [dungeonId, source] of Object.entries(LEGEND_SOURCES)) {
    const maps = source.file === "old" ? oldMaps : newMaps;
    const rows = maps[source.key];
    if (!rows || rows.length === 0) {
      console.log(`SKIP ${dungeonId}  <- ${source.file}:${source.key}  (no rows parsed)`);
      continue;
    }
    legends[dungeonId] = rows;
    console.log(`OK   ${dungeonId}  <- ${source.file}:${source.key}  (${rows.length} markers)`);
  }

  const header = [
    "// GENERATED by scripts/build-dungeon-map-legends.js -- do not edit.",
    "// Sources: data/map/dungeon-maps/Classic-ClassicEra.lua and",
    "// data/dungeons/Classic-Classic.lua (Atlas addon data, local-only, not committed).",
    "// Re-run that script by hand if either source dump changes.",
    "",
    "export type DungeonMapMarker = { marker: string; label: string; color: string };",
    "",
    "export const DUNGEON_MAP_LEGENDS: Partial<Record<string, DungeonMapMarker[]>> = ",
  ];
  fs.writeFileSync(OUT_PATH, header.join("\n") + JSON.stringify(legends, null, 2) + ";\n");
  console.log(`\nWrote ${Object.keys(legends).length} legends to ${path.relative(ROOT, OUT_PATH)}`);
}

main();
