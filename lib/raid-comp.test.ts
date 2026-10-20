import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SPECS, ROSTER_SIZE, swapSlots } from "./raid-comp.ts";

const talentTrees = (classId: string): string[] =>
  JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "data", "talents", `${classId}.json`), "utf8")).trees.map(
    (t: { name: string }) => t.name,
  );

test("every frozen spec points at a real talent tree", () => {
  assert.equal(SPECS.length, 27);
  for (const s of SPECS) assert.ok(talentTrees(s.classId).includes(s.tree), `${s.classId}/${s.tree}`);
});

test("spec indexes are 1-based and contiguous (0 is reserved for empty)", () => {
  SPECS.forEach((s, i) => assert.equal(s.index, i + 1));
});

test("roster is 8 groups of 5", () => {
  assert.equal(ROSTER_SIZE, 40);
});

test("swapSlots swaps without mutating", () => {
  const a = [1, 2, 3];
  assert.deepEqual(swapSlots(a, 0, 2), [3, 2, 1]);
  assert.deepEqual(a, [1, 2, 3]);
});
