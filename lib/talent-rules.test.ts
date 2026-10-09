import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  pointsAtLevel,
  tierUnlocked,
  canAddPoint,
  canRemovePoint,
  isValidBuildState,
  leadingTreeIndex,
  totalPointsSpent,
  MAX_TALENT_POINTS,
} from "./talent-rules.ts";
import type { ClassTalentData, TalentTree } from "./wow-data.ts";

// Real warrior data, read directly off disk (see build-code.test.ts for why:
// talent-rules.ts only imports *types* from "@/lib/wow-data", so this never
// has to resolve the "@/" tsconfig alias). Protection has a real prereq
// chain (shield_slam <- concussion_blow, master_of_defense <- shield_spec)
// and real tier gaps, which is what these rules actually need to exercise.
const warrior = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "..", "data", "talents", "warrior.json"), "utf8")
) as ClassTalentData;

function tree(name: string): TalentTree {
  const t = warrior.trees.find((t) => t.name === name);
  if (!t) throw new Error(`fixture tree not found: ${name}`);
  return t;
}

function talent(treeName: string, id: string) {
  const t = tree(treeName).talents.find((t) => t.id === id);
  if (!t) throw new Error(`fixture talent not found: ${id}`);
  return t;
}

test("pointsAtLevel: no points below 10, 1/level 10-60, capped at 51", () => {
  assert.equal(pointsAtLevel(1), 0);
  assert.equal(pointsAtLevel(9), 0);
  assert.equal(pointsAtLevel(10), 1);
  assert.equal(pointsAtLevel(11), 2);
  assert.equal(pointsAtLevel(60), 51);
  assert.equal(pointsAtLevel(65), 51); // clamped past the level cap
  assert.equal(pointsAtLevel(0), 0);
});

test("tierUnlocked: each tier needs 5 points per prior row", () => {
  assert.equal(tierUnlocked(1, 0), true);
  assert.equal(tierUnlocked(3, 9), false);
  assert.equal(tierUnlocked(3, 10), true);
  assert.equal(tierUnlocked(7, 29), false);
  assert.equal(tierUnlocked(7, 30), true);
});

test("canAddPoint: blocked by maxRank, the global point cap, the row gate, and an unmet prereq", () => {
  const protection = tree("Protection");
  const shieldSpec = talent("Protection", "protection_shield_specialization"); // tier1, maxRank 5
  const masterOfDefense = talent("Protection", "protection_master_of_defense"); // tier3, prereq shield_spec 5

  // maxRank cap.
  assert.equal(canAddPoint(protection, shieldSpec, { protection_shield_specialization: 5 }, 5), false);

  // Global point cap, independent of tree state.
  assert.equal(canAddPoint(protection, shieldSpec, {}, MAX_TALENT_POINTS), false);

  // Row gate: tier 3 needs 10 points already spent in Protection.
  const nineInTree = { protection_improved_bloodrage: 2, protection_anticipation: 5, protection_improved_revenge: 2 };
  assert.equal(totalPointsSpent([protection], nineInTree), 9);
  assert.equal(canAddPoint(protection, masterOfDefense, nineInTree, 9), false);

  // Same tier total, but prereq (shield_spec 5) unmet even once the row opens.
  const tenPointsNoPrereq = { ...nineInTree, protection_improved_revenge: 3 };
  assert.equal(totalPointsSpent([protection], tenPointsNoPrereq), 10);
  assert.equal(canAddPoint(protection, masterOfDefense, tenPointsNoPrereq, 10), false);

  // Row open AND prereq met -> allowed.
  const tenPointsWithPrereq = { protection_shield_specialization: 5, protection_improved_revenge: 3, protection_improved_bloodrage: 2 };
  assert.equal(totalPointsSpent([protection], tenPointsWithPrereq), 10);
  assert.equal(canAddPoint(protection, masterOfDefense, tenPointsWithPrereq, 10), true);
});

test("canRemovePoint: blocked by a dependent talent's rank, and by the row gate it would break", () => {
  const protection = tree("Protection");
  const concussionBlow = talent("Protection", "protection_concussion_blow"); // tier5

  // protection_shield_slam (tier7, prereq concussion_blow 1) already has a
  // point depending on concussion_blow's rank.
  const ranksWithDependent = { protection_concussion_blow: 1, protection_shield_slam: 1 };
  assert.equal(canRemovePoint(protection, concussionBlow, ranksWithDependent), false);

  // Same talent, nothing depending on it -> removable.
  const ranksNoDependent = { protection_concussion_blow: 1 };
  assert.equal(canRemovePoint(protection, concussionBlow, ranksNoDependent), true);

  // Removing the only point in a tier-5 talent while tier-6 still has an
  // invested talent (bastion, needs 25) would drop the tree below that
  // row's gate -- blocked even though nothing's prereq chain is broken.
  const breaksRowGate: Record<string, number> = {
    protection_improved_bloodrage: 2,
    protection_shield_specialization: 5,
    protection_iron_will: 5,
    protection_anticipation: 5,
    protection_improved_revenge: 3,
    protection_improved_thunder_clap: 3,
    protection_concussion_blow: 1,
    protection_bastion: 1,
  };
  assert.equal(totalPointsSpent([protection], breaksRowGate), 25);
  assert.equal(canRemovePoint(protection, concussionBlow, breaksRowGate), false);
});

test("isValidBuildState: accepts a legitimate build, rejects the cap/prereq/row-gate violations", () => {
  const trees = [tree("Arms"), tree("Fury"), tree("Protection")];

  const valid = {
    protection_shield_specialization: 5,
    protection_improved_revenge: 3,
    protection_improved_bloodrage: 2,
    protection_master_of_defense: 2,
  };
  assert.equal(isValidBuildState(trees, valid), true);

  // Over the global cap. isValidBuildState checks the cap before anything
  // else, so an otherwise-nonsensical single-talent rank is enough.
  const overCap = { protection_shield_specialization: MAX_TALENT_POINTS + 1 };
  assert.ok(totalPointsSpent(trees, overCap) > MAX_TALENT_POINTS, "fixture should exceed the cap");
  assert.equal(isValidBuildState(trees, overCap), false);

  // Unmet prereq: a point in master_of_defense without shield_spec 5.
  const unmetPrereq = { protection_master_of_defense: 1, protection_improved_bloodrage: 2 };
  assert.equal(isValidBuildState(trees, unmetPrereq), false);

  // Row-gate violation: a point in a tier-3 talent with under 10 points in the tree.
  const rowGateViolation = { protection_improved_disarm: 1 };
  assert.equal(isValidBuildState(trees, rowGateViolation), false);
});

test("leadingTreeIndex: null at 0/0/0, null on a tie, the max otherwise", () => {
  const trees = [tree("Arms"), tree("Fury"), tree("Protection")];
  assert.equal(leadingTreeIndex(trees, {}), null);

  const tie = { arms_improved_heroic_strike: 3, fury_cruelty: 3 };
  assert.equal(leadingTreeIndex(trees, tie), null);

  const furyLeads = { arms_improved_heroic_strike: 1, fury_cruelty: 5 };
  assert.equal(leadingTreeIndex(trees, furyLeads), 1);
});
