import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { itemSuffixes, type SuffixData } from "./item-suffixes.ts";
import { STAT_KEYS } from "./item-stats.ts";

const dataDir = path.join(import.meta.dirname, "..", "data");
const data: SuffixData = JSON.parse(fs.readFileSync(path.join(dataDir, "gear", "suffixes.json"), "utf8"));
const items = new Map<number, { itemId: number; slot: string | null; quality: number; itemLevel: number | null; name: string }>(
  JSON.parse(fs.readFileSync(path.join(dataDir, "items.json"), "utf8")).items.map((i: { itemId: number }) => [i.itemId, i])
);
const byName = (id: number, name: string) => itemSuffixes(items.get(id)!, data).find((s) => s.name === name);

// Hand-derived from the client tables (RandPropPoints, ItemBonus), not from another site.
test("Stonecutter Claymore of the Eagle: ilvl 35 green two-hand, budget 14 x 66.66%", () => {
  assert.deepEqual(byName(3197, "of the Eagle")?.stats, { int: 9, sta: 9 });
});

test("Unearthed Bands of Power: ilvl 35 blue wrist; the base +8 Attack Power stays off the suffix", () => {
  assert.deepEqual(byName(9428, "of Power")?.stats, { ap: 19 });
});

test("Infiltrator Cap (7413) rolls the 36 suffixes of its client tree", () => {
  const list = itemSuffixes(items.get(7413)!, data);
  assert.equal(list.length, 36);
  assert.ok(list.every((s) => s.name.startsWith("of ") && Object.keys(s.stats).length));
});

test("an item without a bonus tree has no suffixes", () => {
  assert.deepEqual(itemSuffixes(items.get(21566)!, data), []);
});

test("every suffix stat is a known StatKey", () => {
  for (const s of Object.values(data.suffixes)) for (const [key] of s.alloc) assert.ok((STAT_KEYS as readonly string[]).includes(key), `${s.name}: ${key}`);
});
