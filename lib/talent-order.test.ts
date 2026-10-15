import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { encodeOrder, decodeOrder, removeFromOrder } from "./talent-order.ts";
import type { ClassTalentData } from "./wow-data.ts";

const warrior = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "..", "data", "talents", "warrior.json"), "utf8")
) as ClassTalentData;

function ranksOf(order: string[]) {
  const ranks: Record<string, number> = {};
  for (const id of order) ranks[id] = (ranks[id] ?? 0) + 1;
  return ranks;
}

const deflection = "arms_deflection";
const rend = "arms_improved_rend";
const charge = "arms_improved_charge";
const ironWill = "protection_iron_will";

test("encodeOrder/decodeOrder round-trip, including a cross-tree interleave", () => {
  const order = [deflection, ironWill, deflection, deflection, deflection, deflection, charge, rend];
  const param = encodeOrder(warrior, order);
  assert.match(param, /^\d+\.[0-9A-Za-z_-]{8}$/);
  assert.deepEqual(decodeOrder(warrior, param, ranksOf(order)), order);
});

test("decodeOrder rejects anything that doesn't replay to exactly the given ranks", () => {
  const order = [deflection, deflection, deflection, deflection, deflection, charge];
  const param = encodeOrder(warrior, order);
  assert.equal(decodeOrder(warrior, null, ranksOf(order)), null);
  assert.equal(decodeOrder(warrior, param, { ...ranksOf(order), [rend]: 1 }), null);
  // Wrong build-code version: indices may point at different talents.
  assert.equal(decodeOrder(warrior, `0${param}`, ranksOf(order)), null);
  // Tier-2 point before its row unlocks.
  const illegal = encodeOrder(warrior, [charge, deflection, deflection, deflection, deflection, deflection]);
  assert.equal(decodeOrder(warrior, illegal, ranksOf(order)), null);
  assert.equal(decodeOrder(warrior, `${param.split(".")[0]}.!`, {}), null);
});

test("removeFromOrder takes the talent's most recent point and re-legalizes later points", () => {
  // Refunding a non-last point: the last rend goes, everything else keeps its place.
  const a = [rend, deflection, rend, deflection, deflection];
  assert.deepEqual(removeFromOrder(warrior.trees, a, rend), [rend, deflection, deflection, deflection]);

  // 4 deflection + 1 rend unlock tier 2, charge, then a 5th deflection.
  // Refunding the rend leaves charge illegal at its spot; it moves after the 5th deflection.
  const b = [deflection, deflection, deflection, deflection, rend, charge, deflection];
  assert.deepEqual(removeFromOrder(warrior.trees, b, rend), [
    deflection, deflection, deflection, deflection, deflection, charge,
  ]);
});
