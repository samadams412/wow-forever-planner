import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { computeSheet, sheetDelta, withPick } from "./gear-sheet.ts";
import type { GearPool } from "./gear-code.ts";

const pool: GearPool & { baseStats: Record<string, { str: number; agi: number; sta: number; int: number; spi: number; health: number; mana: number }> } =
  JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "public", "gear-pool", "30", "warrior.json"), "utf8"));
const human = pool.baseStats.human;

test("naked Human Warrior 30 matches the Classic sheet (62/44/57/24/31, 374 + Stamina health)", () => {
  const s = computeSheet(pool, human, {});
  assert.deepEqual([s.stats.str, s.stats.agi, s.stats.sta, s.stats.int, s.stats.spi], [62, 44, 57, 24, 31]);
  assert.equal(s.health, 374 + 20 + (57 - 20) * 10);
  assert.equal(s.mana, 0);
  assert.equal(s.armor, 2 * 44);
});

test("a suffix roll and an enchant both count; the base item's own stats too", () => {
  // Unearthed Bands of Power: +8 AP base, +19 AP roll; Bracer - Strength +5.
  const s = computeSheet(pool, human, { wrist: { itemId: 9428, suffixId: 13022, enchantId: 273510 } });
  const d = sheetDelta(computeSheet(pool, human, {}), s, ["str", "ap", "armor"]);
  assert.deepEqual(d, { str: 5, ap: 8 + 19, armor: 49 });
});

test("withPick adds and clears a slot without mutating", () => {
  const a = { head: { itemId: 1 } };
  const b = withPick(a, "neck", { itemId: 2 });
  assert.deepEqual(a, { head: { itemId: 1 } });
  assert.deepEqual(withPick(b, "head", null), { neck: { itemId: 2 } });
});

test("every enchant's displayed effect lists exactly what the sheet applies", async () => {
  const { enchantEffect } = await import("./gear-sheet.ts");
  const { STAT_LABEL } = await import("./item-stats.ts");
  const chest = pool.items.find((i) => i.itemId === 1488)!; // the PvE preset's chest
  for (const e of pool.enchants) {
    const text = enchantEffect(e);
    const item = pool.items.find((i) => e.slots.includes(i.slot) && (!e.types || e.types.includes(i.type ?? "")) && e.minIlvl <= (i.itemLevel ?? 0) && i.weapon?.speed !== null) ?? chest;
    const slot = ({ Head: "head", Neck: "neck", Shoulder: "shoulder", Back: "back", Chest: "chest", Wrist: "wrist", Hands: "hands", Waist: "waist", Legs: "legs", Feet: "feet", Shield: "off", "Two-Hand": "main", "One-Hand": "main", "Main Hand": "main", Ranged: "ranged" } as const)[item.slot as "Head"];
    if (!slot) continue;
    const without = computeSheet(pool, human, { [slot]: { itemId: item.itemId } });
    const withE = computeSheet(pool, human, { [slot]: { itemId: item.itemId, enchantId: e.id } });
    const applied = sheetDelta(without, withE, Object.keys(e.stats) as never[]);
    if (!Object.keys(e.stats).length && !e.armor && !e.weaponDamage) {
      assert.match(text, /not counted in stats/, e.name);
      assert.deepEqual(applied, {}, e.name);
      continue;
    }
    for (const [k, v] of Object.entries(applied)) {
      const all = /^\+(\d+) all stats/.exec(text);
      assert.ok(text.includes(`+${v} ${STAT_LABEL[k as "str"]?.name ?? k}`) || (all && Number(all[1]) === v), `${e.name}: ${text} vs ${k} ${v}`);
    }
    if (e.armor) assert.equal(withE.armor - without.armor, e.armor, e.name);
    if (e.armor) assert.ok(text.includes(`+${e.armor} armor`), e.name);
    if (e.weaponDamage) assert.ok(text.includes(`+${e.weaponDamage} weapon damage`), e.name);
  }
});
