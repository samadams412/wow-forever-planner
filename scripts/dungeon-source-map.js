// Maps our own dungeon ids (data/dungeons.json) to the id schemes used by
// the two outside sources this feature pulls from:
//   - fc:  foreverchanges.pro's own dungeon slug (used for both
//          data/sources/foreverchanges/dungeon_data/<fc>.json loot pulls
//          and <fc>.quests.json quest pulls)
//   - art: the art slug in foreverchanges' own CDN path
//          (https://foreverchanges.pro/wow-ui/dungeons/art-<art>.webp) --
//          several dungeons that split into wings on our site/wowtbc.gg
//          share ONE art file on foreverchanges (all three Dire Maul wings
//          use "diremaul", both Blackrock Spire wings use "blackrockspire",
//          both Stratholme sides use "stratholme", and the four Scarlet
//          Monastery wings split 2-and-2 across "scarletmonastery" (SM
//          Graveyard + SM Cathedral) and "scarlethalls" (SM Library + SM
//          Armory) -- confirmed by reading the --art:url(...) CSS variable
//          foreverchanges renders directly on each dungeon's own timeline
//          bar, not guessed from name similarity.
// wowtbc-derived loot (data/dungeon-loot.json) already uses our own
// dungeon.json ids directly (see lib/dungeon-loot.ts's lootKeyFor, which
// only overrides the two Stratholme sides down to one combined "stratholme"
// key) so no separate wowtbc column is needed here.
module.exports = {
  "hall-of-thanes": { fc: "hall-of-thanes", art: "hall-of-thanes" },
  "ruins-of-lordaeron": { fc: "ruins-of-lordaeron", art: "ruins-of-lordaeron" },
  "excavation-site": { fc: "excavation-site", art: "excavation-site" },
  "city-of-dalaran": { fc: "city-of-dalaran", art: "city-of-dalaran" },
  "drowned-city": { fc: "the-drowned-city", art: "the-drowned-city" },
  "kroldok-stronghold": { fc: "kroldok-stronghold", art: "kroldok-stronghold" },
  "alcaz-prison": { fc: "alcaz-prison", art: "alcaz-prison" },
  "blackmaw-hold": { fc: "blackmaw-hold", art: "blackmaw-hold" },
  "shapers-terrace": { fc: "shapers-terrace", art: "shapers-terrace" },
  "ragefire-chasm": { fc: "ragefire-chasm", art: "ragefirechasm" },
  "wailing-caverns": { fc: "wailing-caverns", art: "wailingcaverns" },
  "deadmines": { fc: "the-deadmines", art: "deadmines" },
  "shadowfang-keep": { fc: "shadowfang-keep", art: "shadowfangkeep" },
  "blackfathom-deeps": { fc: "blackfathom-deeps", art: "blackfathomdeeps" },
  "the-stockade": { fc: "the-stockade", art: "stockade" },
  "razorfen-kraul": { fc: "razorfen-kraul", art: "razorfenkraul" },
  "gnomeregan": { fc: "gnomeregan", art: "gnomeregan" },
  "sm-graveyard": { fc: "scarlet-monastery-graveyard", art: "scarletmonastery" },
  "sm-library": { fc: "scarlet-monastery-library", art: "scarlethalls" },
  "sm-armory": { fc: "scarlet-monastery-armory", art: "scarlethalls" },
  "sm-cathedral": { fc: "scarlet-monastery-cathedral", art: "scarletmonastery" },
  "razorfen-downs": { fc: "razorfen-downs", art: "razorfendowns" },
  "uldaman": { fc: "uldaman", art: "uldaman" },
  "zulfarrak": { fc: "zulfarrak", art: "zulfarrak" },
  "maraudon": { fc: "maraudon", art: "maraudon" },
  "sunken-temple": { fc: "sunken-temple", art: "sunkentemple" },
  "blackrock-depths": { fc: "blackrock-depths", art: "blackrockdepths" },
  "dire-maul-east": { fc: "dire-maul-east", art: "diremaul" },
  "dire-maul-west": { fc: "dire-maul-west", art: "diremaul" },
  "dire-maul-north": { fc: "dire-maul-north", art: "diremaul" },
  "lbrs": { fc: "lower-blackrock-spire", art: "blackrockspire" },
  "ubrs": { fc: "upper-blackrock-spire", art: "blackrockspire" },
  "scholomance": { fc: "scholomance", art: "scholomance" },
  // Confirmed by boss roster, not name similarity: stratholme-main-gate's
  // bosses (Hearthsinger Forresten, Timmy the Cruel, Cannon Master Willey,
  // Archivist Galford, Balnazzar) are the Live/Crusade side; stratholme-
  // service-gate's (Baroness Anastari, Nerub'enkan, Maleki the Pallid,
  // Ramstein the Gorger, Baron Rivendare) are the Undead side.
  "stratholme-live": { fc: "stratholme-main-gate", art: "stratholme" },
  "stratholme-undead": { fc: "stratholme-service-gate", art: "stratholme" },
};
