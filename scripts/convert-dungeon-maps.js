// Converts raw .blp dungeon map textures (data/map/dungeon-maps/, a wow.export
// dump -- not committed source art, just a local working set) into webp files
// under public/images/dungeon-maps/<dungeonId>.webp for the loot page's
// DungeonMapViewer. BLP decoding via @pinta365/blp (sharp/libvips has no BLP
// support); resize/webp-encode via sharp, same as every other image pipeline
// in this repo.
//
// Manual script, not wired into prebuild -- same as build-dungeons.js -- run
// by hand as `node scripts/convert-dungeon-maps.js` whenever the source dump
// changes. After running, add/confirm entries in DUNGEON_MAP_IMAGES in
// lib/dungeon-loot.ts (a literal lookup map, per the "no runtime-variable
// disk reads" rule in CLAUDE.md -- this script never gets called at request
// time).
//
// Only dungeons that actually reuse a Classic-era zone have source art here;
// the new-in-Forever dungeons (Hall of Thanes, Ruins of Lordaeron, etc.) have
// no entry and keep showing the "Map coming soon" placeholder.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { decodeBlpData, encodeToPNGAuto } = require("@pinta365/blp");

const ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(ROOT, "data", "map", "dungeon-maps");
const OUT_DIR = path.join(ROOT, "public", "images", "dungeon-maps");

// dungeonId -> source filename (without extension; .blp assumed, .jpg used
// where noted). Picked the base/overview texture over "*Ent" entrance-only
// variants where both exist. A couple of these are genuinely ambiguous --
// see the inline notes and the handoff doc; flagged rather than silently
// guessed.
const MAP_SOURCES = {
  "ragefire-chasm": "RagefireChasm",
  "wailing-caverns": "WailingCaverns",
  // TheDeadminesA/B are two halves of one source dump; A is the overview.
  "deadmines": "TheDeadminesA",
  "shadowfang-keep": "ShadowfangKeep",
  "blackfathom-deeps": "BlackfathomDeeps",
  "the-stockade": "TheStockade",
  "razorfen-kraul": "RazorfenKraul",
  "gnomeregan": "Gnomeregan",
  // One shared Scarlet Monastery overview map for all four wings -- there's
  // no per-wing source texture.
  "sm-graveyard": "ScarletMonastery",
  "sm-library": "ScarletMonastery",
  "sm-armory": "ScarletMonastery",
  "sm-cathedral": "ScarletMonastery",
  "razorfen-downs": "RazorfenDowns",
  "uldaman": "Uldaman",
  "zulfarrak": "ZulFarrak",
  "maraudon": "Maraudon",
  "sunken-temple": "TheSunkenTemple",
  "blackrock-depths": "BlackrockDepths",
  "dire-maul-east": "DireMaulEast",
  "dire-maul-west": "DireMaulWest",
  "dire-maul-north": "DireMaulNorth",
  "lbrs": "LowerBlackrockSpire",
  // No plain "UpperBlackrockSpire" source exists -- only the CL_ variant
  // decodes (the non-CL one is presumably missing from this dump). UNVERIFIED
  // against a real UBRS floor plan -- check before trusting this one.
  "ubrs": "CL_BlackrockSpireUpper",
  "scholomance": "Scholomance",
  // RESOLVED (was previously an unverified guess, and backwards): cross-
  // referenced against data/dungeons/Classic-Classic.lua's per-side boss
  // rosters vs. this project's own stratholme-undead/-live loot data --
  // StratholmeCrusader's bosses (Hearthsinger Forresten, Timmy the Cruel,
  // Balnazzar, ...) are the live/Crusader-held side; StratholmeGauntlet's
  // (Baroness Anastari, Nerub'enkan, Maleki the Pallid, Baron Rivendare,
  // ...) are the undead/service side. See scripts/build-dungeon-map-legends.js.
  "stratholme-undead": "StratholmeGauntlet",
  "stratholme-live": "StratholmeCrusader",
};

async function convertOne(dungeonId, baseName) {
  const blpPath = path.join(SRC_DIR, `${baseName}.blp`);
  const jpgPath = path.join(SRC_DIR, `${baseName}.jpg`);
  let pngBuffer;
  if (fs.existsSync(blpPath)) {
    const raw = fs.readFileSync(blpPath);
    const buf = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    const decoded = decodeBlpData(buf);
    pngBuffer = Buffer.from(await encodeToPNGAuto(decoded));
  } else if (fs.existsSync(jpgPath)) {
    pngBuffer = fs.readFileSync(jpgPath);
  } else {
    return { dungeonId, baseName, ok: false, error: "source file not found" };
  }
  const outPath = path.join(OUT_DIR, `${dungeonId}.webp`);
  await sharp(pngBuffer).resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toFile(outPath);
  return { dungeonId, baseName, ok: true };
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`No source directory at ${path.relative(ROOT, SRC_DIR)} -- nothing to convert.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const results = [];
  for (const [dungeonId, baseName] of Object.entries(MAP_SOURCES)) {
    results.push(await convertOne(dungeonId, baseName));
  }

  for (const r of results) {
    console.log(r.ok ? `OK   ${r.dungeonId}  <- ${r.baseName}` : `FAIL ${r.dungeonId}  <- ${r.baseName}  (${r.error})`);
  }
  const ok = results.filter((r) => r.ok);
  console.log(`\n${ok.length}/${results.length} converted to ${path.relative(ROOT, OUT_DIR)}`);

  console.log(`\nAdd/confirm these entries in lib/dungeon-loot.ts's DUNGEON_MAP_IMAGES:`);
  for (const r of ok) {
    console.log(`  "${r.dungeonId}": "/images/dungeon-maps/${r.dungeonId}.webp",`);
  }
}

main();
