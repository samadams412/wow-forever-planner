import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GEAR_SLOTS, CATALOG_SLOT_TO_GEAR_SLOTS, NON_PLANNER_CATALOG_SLOTS, gearSlotsFor } from "./gear-slots.ts";

test("slot order is frozen", () => {
  assert.deepEqual(GEAR_SLOTS, [
    "head", "neck", "shoulder", "back", "chest", "wrist", "hands", "waist", "legs", "feet",
    "finger1", "finger2", "trinket1", "trinket2", "main", "off", "ranged",
  ]);
});

test("every planner slot is reachable from some catalog slot", () => {
  const reached = new Set(Object.values(CATALOG_SLOT_TO_GEAR_SLOTS).flat());
  assert.deepEqual(GEAR_SLOTS.filter((s) => !reached.has(s)), []);
});

test("every non-null catalog slot in data/items.json is either mapped or explicitly outside the planner", () => {
  const { items } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "data", "items.json"), "utf8"));
  const known = new Set<string>([...Object.keys(CATALOG_SLOT_TO_GEAR_SLOTS), ...NON_PLANNER_CATALOG_SLOTS]);
  const unknown = new Set(items.map((i: { slot: string | null }) => i.slot).filter((s: string | null) => s !== null && !known.has(s)));
  assert.deepEqual([...unknown], []);
  assert.deepEqual(gearSlotsFor("One-Hand"), ["main", "off"]);
  assert.deepEqual(gearSlotsFor(null), []);
});
