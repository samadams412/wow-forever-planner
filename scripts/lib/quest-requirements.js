// Decodes quest class/race/profession requirements from the two sources that
// carry them: cMaNGOS quest_template's raw columns (bitmasks + skill id) and
// foreverchanges' scraped Class/Side/Profession facts (display text).
//
// Bit values come from cMaNGOS core, not memory:
//   src/game/Globals/SharedDefines.h  enum Classes, enum Races, enum SkillType
//   src/game/Globals/FlagConvertibleEnum.h  convertEnumToFlag(x) = 1 << (x - 1)
// and quest checks use `RequiredClasses & player.getClassMask()`, so a mask
// bit is 1 << (enum id - 1). Class id 6 (Death Knight) and 10 are unused in 1.12.

const CLASS_IDS = { 1: "Warrior", 2: "Paladin", 3: "Hunter", 4: "Rogue", 5: "Priest", 7: "Shaman", 8: "Mage", 9: "Warlock", 11: "Druid" };
const RACE_IDS = { 1: "Human", 2: "Orc", 3: "Dwarf", 4: "Night Elf", 5: "Undead", 6: "Tauren", 7: "Gnome", 8: "Troll" };
const ALLIANCE_RACES = ["Human", "Dwarf", "Night Elf", "Gnome"];
const HORDE_RACES = ["Orc", "Undead", "Tauren", "Troll"];

// SkillType ids (SharedDefines.h) for the skills quest_template uses. Names
// match data/professions-catalog/<id>.json `name` (the test checks this);
// Fishing has no catalog file, so its name is the enum's.
const SKILL_IDS = {
  129: "First Aid", 164: "Blacksmithing", 165: "Leatherworking", 171: "Alchemy", 182: "Herbalism", 185: "Cooking",
  186: "Mining", 197: "Tailoring", 202: "Engineering", 333: "Enchanting", 356: "Fishing", 393: "Skinning",
};

function namesFromMask(mask, ids) {
  return Object.entries(ids)
    .filter(([id]) => mask & (1 << (Number(id) - 1)))
    .map(([, name]) => name);
}

// null = no class restriction (mask 0, or every playable class).
function decodeClassMask(mask) {
  const names = namesFromMask(mask ?? 0, CLASS_IDS);
  return names.length === 0 || names.length === Object.keys(CLASS_IDS).length ? null : names;
}

// null = no race restriction. Bits past Troll (TBC's Blood Elf 512, Draenei
// 1024) aren't playable in 1.12 and are dropped -- cMaNGOS uses 690/1101 as
// "all Horde"/"all Alliance" with them set.
function decodeRaceMask(mask) {
  const names = namesFromMask(mask ?? 0, RACE_IDS);
  return names.length === 0 || names.length === Object.keys(RACE_IDS).length ? null : names;
}

function decodeSkill(skillId, skillValue) {
  if (!skillId) return null;
  const name = SKILL_IDS[skillId];
  if (!name) throw new Error(`Unknown RequiredSkill id ${skillId} -- add it from SharedDefines.h enum SkillType`);
  return { name, skill: skillValue || null };
}

// foreverchanges "Class" fact: "Warlock" or "Mage, Warlock". Absent = none.
function parseClassText(text) {
  if (!text) return null;
  const names = text.split(",").map((s) => s.trim());
  const known = Object.values(CLASS_IDS);
  for (const n of names) if (!known.includes(n)) throw new Error(`Unknown class "${n}" in "${text}"`);
  return names.length === known.length ? null : known.filter((n) => names.includes(n));
}

// foreverchanges "Side" fact: "Horde", "Alliance", "Both factions", or a race list.
function parseSideText(text) {
  if (!text || text === "Both factions") return null;
  if (text === "Horde") return HORDE_RACES.slice();
  if (text === "Alliance") return ALLIANCE_RACES.slice();
  const names = text.split(",").map((s) => s.trim());
  const known = Object.values(RACE_IDS);
  for (const n of names) if (!known.includes(n)) throw new Error(`Unknown race "${n}" in "${text}"`);
  return names.length === known.length ? null : known.filter((n) => names.includes(n));
}

// foreverchanges "Profession" fact: "Blacksmithing 210".
function parseProfessionText(text) {
  if (!text) return null;
  const m = text.match(/^(.+?)\s+(\d+)$/);
  const name = m ? m[1] : text.trim();
  if (!Object.values(SKILL_IDS).includes(name)) throw new Error(`Unknown profession "${text}"`);
  return { name, skill: m && Number(m[2]) ? Number(m[2]) : null };
}

// Requirements for one quest. cMaNGOS leads for quests Forever left unchanged
// (structured columns); the scrape leads for changed/new quests, since Forever
// can lift a restriction (4003/4004 went from Horde-only to both factions).
// `source` null = neither source has the quest, so null fields mean unknown,
// not unrestricted.
function questRequirements(cmRow, facts, status) {
  const fromCm = cmRow
    ? {
        source: "cmangos",
        requiredClasses: decodeClassMask(cmRow.requiredClasses),
        requiredRaces: decodeRaceMask(cmRow.requiredRaces),
        requiredProfession: decodeSkill(cmRow.requiredSkill, cmRow.requiredSkillValue),
      }
    : null;
  const fromFc = facts
    ? {
        source: "foreverchanges",
        requiredClasses: parseClassText(facts.class),
        requiredRaces: parseSideText(facts.side),
        requiredProfession: parseProfessionText(facts.profession),
      }
    : null;
  const ordered = status === "unchanged" ? [fromCm, fromFc] : [fromFc, fromCm];
  return ordered.find(Boolean) ?? { source: null, requiredClasses: null, requiredRaces: null, requiredProfession: null };
}

module.exports = {
  CLASS_IDS,
  RACE_IDS,
  SKILL_IDS,
  decodeClassMask,
  decodeRaceMask,
  decodeSkill,
  parseClassText,
  parseSideText,
  parseProfessionText,
  questRequirements,
};
