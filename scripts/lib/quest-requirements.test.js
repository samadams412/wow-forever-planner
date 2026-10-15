const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  SKILL_IDS,
  decodeClassMask,
  decodeRaceMask,
  decodeSkill,
  parseSideText,
  questRequirements,
} = require("./quest-requirements");

// Real source rows, like lib/build-code.test.ts uses the real warrior file:
// a wrong bit mapping shows up against known quests, not a hand-made fixture.
const ROOT = path.join(__dirname, "..", "..");
const cm = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sources", "cmangos", "quest-text.json"), "utf8")).quests;
const index = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "quests", "index.json"), "utf8")).quests;
const row = (id) => index.find((q) => q.id === id);

test("mask bits follow cMaNGOS convertEnumToFlag (1 << (id - 1))", () => {
  assert.deepEqual(decodeClassMask(256), ["Warlock"]); // CLASS_WARLOCK = 9
  assert.deepEqual(decodeClassMask(1024), ["Druid"]); // CLASS_DRUID = 11
  assert.deepEqual(decodeClassMask(64), ["Shaman"]); // CLASS_SHAMAN = 7
  assert.deepEqual(decodeRaceMask(178), ["Orc", "Undead", "Tauren", "Troll"]); // RACEMASK_HORDE
  assert.deepEqual(decodeRaceMask(77), ["Human", "Dwarf", "Night Elf", "Gnome"]); // RACEMASK_ALLIANCE
  assert.equal(decodeRaceMask(255), null); // RACEMASK_ALL_PLAYABLE = no restriction
  assert.equal(decodeRaceMask(0), null);
  assert.equal(decodeClassMask(0), null);
  // TBC race bits (Blood Elf 512, Draenei 1024) are dropped: 690 = all Horde.
  assert.deepEqual(decodeRaceMask(690), ["Orc", "Undead", "Tauren", "Troll"]);
});

test("Blind Cazul (1508): Warlock-only, Horde races -- not an Orc/Undead race restriction", () => {
  assert.equal(cm["1508"].title, "Blind Cazul");
  assert.equal(cm["1508"].requiredClasses, 256);
  assert.equal(cm["1508"].requiredRaces, 178);
  const q = row(1508);
  assert.deepEqual(q.requiredClasses, ["Warlock"]);
  assert.deepEqual(q.requiredRaces, ["Orc", "Undead", "Tauren", "Troll"]);
  assert.equal(q.requiredProfession, null);
});

test("race-only quest: Tauren-only, any class", () => {
  // 748 "Poison Water" -- Mulgore, RequiredRaces 32 (RACE_TAUREN = 6).
  assert.equal(cm["748"].requiredRaces, 32);
  assert.deepEqual(row(748).requiredRaces, ["Tauren"]);
  assert.equal(row(748).requiredClasses, null);
});

test("profession-gated quest: skill id and minimum value", () => {
  // 2751 "Barbaric Battlements" -- Blacksmithing (SKILL_BLACKSMITHING = 164) at 140.
  assert.equal(cm["2751"].requiredSkill, 164);
  assert.equal(cm["2751"].requiredSkillValue, 140);
  assert.deepEqual(row(2751).requiredProfession, { name: "Blacksmithing", skill: 140 });
  assert.throws(() => decodeSkill(9999, 1));
});

test("skill names match the profession catalog", () => {
  for (const name of Object.values(SKILL_IDS)) {
    if (name === "Fishing") continue; // no catalog file
    const id = name.toLowerCase().replace(/ /g, "-");
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "professions-catalog", `${id}.json`), "utf8"));
    assert.equal(catalog.name, name);
  }
});

test("Forever-changed quests follow the scrape: 4003 opened to both factions", () => {
  assert.deepEqual(decodeRaceMask(cm["4003"].requiredRaces), ["Orc", "Undead", "Tauren", "Troll"]);
  assert.equal(questRequirements(cm["4003"], { side: "Both factions" }, "changed").requiredRaces, null);
  assert.equal(row(4003).requiredRaces, null);
});

test("no source = unknown, not unrestricted", () => {
  assert.equal(questRequirements(null, null, null).source, null);
  assert.equal(row(6843).requirementsSource, null);
  assert.equal(parseSideText("Both factions"), null);
  assert.throws(() => parseSideText("Goblin"));
});
