import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { itemSuffixes, type SuffixData } from "./item-suffixes.ts";
import { DEFAULT_GEAR_LEVEL } from "./gear-config.ts";

const root = path.join(import.meta.dirname, "..");
const poolDir = path.join(root, "public", "gear-pool", String(DEFAULT_GEAR_LEVEL));
const read = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const catalog = new Map<number, { requiredLevel: number | null }>(read(path.join(root, "data", "items.json")).items.map((i: { itemId: number }) => [i.itemId, i]));
const suffixData: SuffixData = read(path.join(root, "data", "gear", "suffixes.json"));
const poolFiles = fs.existsSync(poolDir) ? fs.readdirSync(poolDir).filter((f) => f.endsWith(".json")) : [];

test("there is at least one pool file", () => assert.ok(poolFiles.length > 0));

for (const file of poolFiles) {
  const pool = read(path.join(poolDir, file));
  const preset = read(path.join(root, "data", "gear", "presets", file));
  const byId = new Map<number, { itemId: number; sides: string; fromLevel: number; suffixes?: boolean; [k: string]: unknown }>(pool.items.map((r: { itemId: number }) => [r.itemId, r]));

  test(`${file}: every preset item is in the pool for its side`, () => {
    for (const v of preset.variants)
      for (const side of ["a", "h"]) {
        const ids = [...Object.values(v.sides[side].items), ...Object.values(v.ranked).flatMap((l) => (l as Record<string, { itemId: number }[]>)[side].map((e) => e.itemId))] as number[];
        for (const id of ids) assert.ok(byId.get(id)?.sides.includes(side), `${v.key}/${side}: ${id}`);
      }
  });

  test(`${file}: rows carry parsed stats, no tooltip text`, () => {
    for (const r of byId.values()) {
      assert.equal("tooltip" in r, false, `${r.itemId}`);
      assert.equal(typeof r.stats, "object", `${r.itemId}`);
    }
  });

  test(`${file}: the level window uses the source-derived level, not the Requires Level line`, () => {
    const presetIds = new Set(preset.variants.flatMap((v: { sides: Record<string, { items: Record<string, number> }> }) => ["a", "h"].flatMap((s) => Object.values(v.sides[s].items))));
    for (const r of byId.values()) {
      assert.ok(r.fromLevel <= pool.window[1], `${r.itemId} above the window`);
      assert.ok(r.fromLevel >= pool.window[0] || presetIds.has(r.itemId) || preset.variants.some((v: { ranked: Record<string, Record<string, { itemId: number }[]>> }) => Object.values(v.ranked).some((l) => l.a.concat(l.h).some((e) => e.itemId === r.itemId))), `${r.itemId} below the window`);
    }
    // Items with no "Requires Level" line are in, on their derived level.
    assert.ok([...byId.values()].some((r) => (catalog.get(r.itemId)?.requiredLevel ?? 0) === 0 && r.fromLevel >= pool.window[0]));
  });

  test(`${file}: the suffix slice reproduces the full suffix data for every flagged item`, () => {
    for (const r of byId.values()) {
      const full = itemSuffixes(r as never, suffixData);
      assert.equal(Boolean(r.suffixes), full.length > 0, `${r.itemId} flag`);
      if (r.suffixes) assert.deepEqual(itemSuffixes(r as never, pool.suffixes), full, `${r.itemId} rolls`);
    }
  });
}
