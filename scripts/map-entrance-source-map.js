// Hand-verified mapping from this project's own dungeon/raid/battleground
// ids to the client's own Map.csv `Directory` column, the same
// "confirmed per-entry against real client data, not guessed from name
// similarity" discipline as scripts/dungeon-source-map.js's own foreverchanges
// slug map. Every mapping here was checked against Map.csv's own
// MapName_lang for that Directory before being trusted (see
// scripts/build-map-entrances.js's own report output for the cross-check).
//
// `shared` marks entries that resolve to the SAME Map.csv row as one or more
// siblings -- Scarlet Monastery's 4 wings, Dire Maul's 3 wings, Blackrock
// Spire's 2 wings, and Stratholme's 2 sides all share one real-world entrance
// building in Classic (this project's own dungeon-loot art-slug map already
// documents the same sharing for background art -- see CLAUDE.md's "Slug
// mapping is non-trivial" note), so they get the same world position, not a
// fabricated per-wing offset.
//
// Dungeon/raid ids not listed here (the 9 new Forever dungeons minus the 4
// with a Map.csv row, plus the 5 new Forever raids/1 new BG) have no
// Map.csv Directory at all in this export -- confirmed by grepping the raw
// export for their names, not just absent from this table by oversight. See
// build-map-entrances.js's report for the full "no client position" list.

const DUNGEONS = {
  "hall-of-thanes": "3065",
  "ruins-of-lordaeron": "2999",
  "excavation-site": "2998",
  "city-of-dalaran": "2959",
  "ragefire-chasm": "389",
  "wailing-caverns": "43",
  deadmines: "36",
  "shadowfang-keep": "33",
  "blackfathom-deeps": "48",
  "the-stockade": "34",
  "razorfen-kraul": "47",
  gnomeregan: "90",
  "sm-graveyard": "189",
  "sm-library": "189",
  "sm-armory": "189",
  "sm-cathedral": "189",
  "razorfen-downs": "129",
  uldaman: "70",
  zulfarrak: "209",
  maraudon: "349",
  "sunken-temple": "109",
  "blackrock-depths": "230",
  "dire-maul-east": "429",
  "dire-maul-west": "429",
  "dire-maul-north": "429",
  lbrs: "229",
  ubrs: "229",
  scholomance: "289",
  "stratholme-undead": "329",
  "stratholme-live": "329",
};

// New ids -- no existing id convention for raids/battlegrounds in this
// project (data/dungeons.json only ever covered 5-man dungeons). Kebab-case,
// matching this project's own dungeon-id style.
const RAIDS = {
  "onyxias-lair": "249",
  zulgurub: "309",
  "molten-core": "409",
  "blackwing-lair": "469",
  "ahn-qiraj-ruins": "509",
  "ahn-qiraj-temple": "531",
  naxxramas: "533",
  "the-tainted-scar": "2789",
  "storm-cliffs": "2791",
  "the-crystal-vale": "2804",
  "nightmare-grove": "2832",
  "scarlet-enclave": "2856",
  // Present in the export but not a recognized Classic or Forever raid this
  // project tracks anywhere else -- included for completeness, flagged in
  // the build report rather than silently dropped or silently trusted.
  "emerald-dream": "169",
};

const BATTLEGROUNDS = {
  "alterac-valley": "30",
  "warsong-gulch": "489",
  "arathi-basin": "529",
  "battle-for-gilneas": "3005",
};

module.exports = { DUNGEONS, RAIDS, BATTLEGROUNDS };
