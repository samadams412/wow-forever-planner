import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseItemTooltip } from "./item-stats.ts";

test("Forever-format armor piece", () => {
  const p = parseItemTooltip([
    "Binds when picked up", "Hands\tLeather", "53 Armor", "Requires Level 20",
    "Equip: +14 Critical Strike Rating", "Equip: -15 Parry Rating", "Sell Price: 6s 90c",
  ]);
  assert.equal(p.armor, 53);
  assert.deepEqual(p.stats, { critRating: 14, parryRating: -15 });
  assert.deepEqual(p.unparsed, []);
});

test("Classic-format phrasing, set lines, classes", () => {
  const p = parseItemTooltip([
    "Binds when equipped", "Wrist\tPlate", "328 Armor", "+23 Stamina", "+11 Strength", "+20 Armor",
    "Classes: Warrior", "Requires Level 60", "Battlegear of Might (0/8)",
    "(3) Set: Increases the block value of your shield by 30.",
    "Equip: Improves your chance to get a critical strike by 1%.",
    "Equip: Increases damage done by Fire spells and effects by up to 9.",
    "Equip: Restores 4 mana per 5 sec.",
    "Equip: +12 Attack Power, doubled against Undead targets.",
  ]);
  assert.equal(p.armor, 328);
  assert.deepEqual(p.stats, { sta: 23, str: 11, bonusArmor: 20, critPct: 1, fireDmg: 9, mp5: 4 });
  assert.deepEqual(p.classes, ["Warrior"]);
  assert.equal(p.setName, "Battlegear of Might");
  assert.equal(p.setBonuses.length, 1);
  assert.deepEqual(p.effects, ["Equip: +12 Attack Power, doubled against Undead targets."]);
  assert.deepEqual(p.unparsed, []);
});

test("weapon damage, bonus school damage, dps, shield block", () => {
  const w = parseItemTooltip(["Ranged\tWand", "50 - 93 Fire Damage\tSpeed 1.20", "+1 - 5 Frost Damage", "(59.6 damage per second)"]);
  assert.deepEqual(w.weapon, { damage: [{ min: 50, max: 93, school: "Fire" }, { min: 1, max: 5, school: "Frost" }], speed: 1.2, dps: 59.6 });
  const s = parseItemTooltip(["Off Hand\tShield", "738 Armor", "16 Block", "-10 Stamina"]);
  assert.deepEqual(s.stats, { blockValue: 16, sta: -10 });
});

test("unknown lines surface as unparsed, category lines don't", () => {
  const p = parseItemTooltip(["\tPotions", "Requires Level 12", "Something new"]);
  assert.deepEqual(p.unparsed, ["Something new"]);
});

test("equipment in data/items.json parses with no unparsed lines", () => {
  const { items } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "data", "items.json"), "utf8"));
  const bad = items
    .filter((i: { itemClass: number; slot: string | null }) => (i.itemClass === 2 || i.itemClass === 4) && i.slot !== null)
    .filter((i: { tooltip: string[] }) => parseItemTooltip(i.tooltip).unparsed.length > 0);
  assert.deepEqual(bad.map((i: { itemId: number }) => i.itemId), []);
});
