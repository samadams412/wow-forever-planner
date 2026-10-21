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
