import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseItemTooltip, parseEnchantText } from "./item-stats.ts";

test("enchant text: targets, stats, armor kits, procs", () => {
  const bracer = parseEnchantText("Use: Permanently enchant a bracer so it increases the wearer's Intellect by 5.");
  assert.deepEqual([bracer.slots, bracer.stats, bracer.effect], [["Wrist"], { int: 5 }, null]);
  const kit = parseEnchantText("Use: Permanently increase the Attack Power value by 6 and armor value by 24 of an item worn on the chest, legs, hands, or feet. Only usable on items level 15 and above.");
  assert.deepEqual([kit.slots, kit.stats, kit.armor, kit.minIlvl], [["Chest", "Legs", "Hands", "Feet"], { ap: 6 }, 24, 15]);
  const heal = parseEnchantText("Use: Permanently enchant a Melee Weapon to add up to 55 points of healing to healing spells and up to 19 points of damage to damage spells.");
  assert.deepEqual(heal.stats, { heal: 55, spellDmg: 19 });
  const stats = parseEnchantText("Use: Permanently enchant a piece of chest armor to grant +2 to all stats.");
  assert.deepEqual(stats.stats, { str: 2, agi: 2, sta: 2, int: 2, spi: 2 });
  const two = parseEnchantText("Use: Permanently enchant a 2H Weapon to add 65 Spell Power.");
  assert.deepEqual([two.slots, two.stats, two.leftover], [["Two-Hand"], { sp: 65 }, null]);
  const scope = parseEnchantText("Use: Attaches a permanent scope to a bow or gun that increases its damage by 5.");
  assert.deepEqual([scope.slots, scope.types, scope.weaponDamage], [["Ranged"], ["Bow", "Gun"], 5]);
  const crusader = parseEnchantText("Use: Permanently enchant a melee weapon so that often when attacking in melee it heals for 75 to 125 and increases Strength by 100 for 15 sec.");
  assert.deepEqual(crusader.stats, {});
  assert.ok(crusader.effect);
  const winter = parseEnchantText("Use: Permanently enchant a weapon to grant up to 15 additional frost damage when casting frost spells.");
  assert.deepEqual(winter.stats, { frostDmg: 15 });
});

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
