import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { encodeBuild, decodeBuild } from "./build-code.ts";
import type { ClassTalentData } from "./wow-data.ts";

// build-code.ts and talent-rules.ts only ever import *types* from
// "@/lib/wow-data" (erased at runtime), so this test imports them by
// relative path and never has to resolve the "@/" tsconfig alias. The real
// warrior talent file is read directly off disk for the same reason --
// using the real, current data (rather than a hand-rolled fixture) is what
// actually exercises the frozen historical orderings in build-code.ts,
// since those are keyed to real warrior talent ids.
const warrior = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "..", "data", "talents", "warrior.json"), "utf8")
) as ClassTalentData;

test("encodeBuild -> decodeBuild round-trips a current-version build", () => {
  const ranks = {
    arms_improved_heroic_strike: 3,
    arms_improved_rend: 3,
    arms_deep_wounds: 3,
    fury_bloodthirst: 1,
    protection_shield_specialization: 5,
    protection_concussion_blow: 1,
    protection_shield_slam: 1,
  };
  const code = encodeBuild(warrior, ranks);
  assert.match(code, /^5-/); // CURRENT_VERSION
  assert.deepEqual(decodeBuild(warrior, code), ranks);
});

test("encodeBuild omits zero-rank talents; decode never reports a 0", () => {
  const code = encodeBuild(warrior, { protection_last_stand: 1 });
  const ranks = decodeBuild(warrior, code);
  assert.deepEqual(ranks, { protection_last_stand: 1 });
  assert.equal("arms_improved_heroic_strike" in ranks, false);
});

test("decodeBuild repairs a point left in a talent whose prereq is no longer met", () => {
  // arms_impale requires 3 ranks in arms_deep_wounds. A code with impale
  // spent but deep_wounds at 0 can arrive from a frozen-order migration or
  // a hand-edited link; the decoder should drop it rather than keep an
  // impossible state.
  const code = encodeBuild(warrior, { arms_impale: 2 });
  const ranks = decodeBuild(warrior, code);
  assert.deepEqual(ranks, {});
});

test("decodeBuild clamps a rank above the talent's current maxRank", () => {
  // protection_shield_specialization has maxRank 5; hand-build a current-
  // version code with a "6" digit in its slot.
  const trees = warrior.trees.map((t) => [...t.talents].sort((a, b) => a.tier - b.tier || a.col - b.col));
  const protIndex = warrior.trees.findIndex((t) => t.name === "Protection");
  const body = trees
    .map((talents, i) =>
      talents.map((t) => (i === protIndex && t.id === "protection_shield_specialization" ? "6" : "0")).join("")
    )
    .join("-");
  const ranks = decodeBuild(warrior, `5-${body}`);
  assert.equal(ranks.protection_shield_specialization, 5);
});

test("decodeBuild (unversioned legacy code) drops talents removed from Protection pre-versioning", () => {
  // LEGACY_TREE_ORDER.warrior.Protection is the pre-2026-09-18 shape: 19
  // slots including protection_vitality and protection_toughness, both
  // removed outright since (LEGACY_ID_TRANSLATION maps both to null).
  // protection_shield_slam is the last slot and survives unchanged.
  const legacyOrder = [
    "protection_shield_specialization",
    "protection_anticipation",
    "protection_improved_bloodrage",
    "protection_toughness",
    "protection_improved_thunder_clap",
    "protection_last_stand",
    "protection_master_of_defense",
    "protection_improved_revenge",
    "protection_defiance",
    "protection_improved_sunder_armor",
    "protection_improved_disarm",
    "protection_vanguard",
    "protection_improved_shield_wall",
    "protection_concussion_blow",
    "protection_improved_shield_bash",
    "protection_vitality",
    "protection_focused_rage",
    "protection_bastion",
    "protection_shield_slam",
  ];
  const digits = legacyOrder.map((id) =>
    id === "protection_toughness" || id === "protection_vitality"
      ? "3"
      : id === "protection_shield_slam"
        ? "1"
        : "0"
  );
  // Arms/Fury segments empty (no points), Protection segment is this legacy order.
  const legacyCode = ["", "", digits.join("")].join("-");
  const ranks = decodeBuild(warrior, legacyCode);
  // protection_concussion_blow is a prereq (rank 1) of shield_slam -- the
  // legacy order has it at 0 here, so repairPrereqs should drop shield_slam too.
  assert.deepEqual(ranks, {});
});

test("decodeBuild (unversioned legacy code) keeps unaffected talents and drops only removed ones", () => {
  const legacyOrder = [
    "protection_shield_specialization",
    "protection_anticipation",
    "protection_improved_bloodrage",
    "protection_toughness",
    "protection_improved_thunder_clap",
    "protection_last_stand",
    "protection_master_of_defense",
    "protection_improved_revenge",
    "protection_defiance",
    "protection_improved_sunder_armor",
    "protection_improved_disarm",
    "protection_vanguard",
    "protection_improved_shield_wall",
    "protection_concussion_blow",
    "protection_improved_shield_bash",
    "protection_vitality",
    "protection_focused_rage",
    "protection_bastion",
    "protection_shield_slam",
  ];
  const digits = legacyOrder.map((id) => {
    if (id === "protection_toughness" || id === "protection_vitality") return "2";
    if (id === "protection_concussion_blow") return "1";
    if (id === "protection_shield_slam") return "1";
    return "0";
  });
  const legacyCode = ["", "", digits.join("")].join("-");
  const ranks = decodeBuild(warrior, legacyCode);
  assert.deepEqual(ranks, {
    protection_concussion_blow: 1,
    protection_shield_slam: 1,
  });
});

test("decodeBuild (version 4 code) translates a cross-tree rename and drops outright removals", () => {
  // V4_TREE_ORDER.warrior.Fury is the shape immediately before the
  // 2026-10-03 hotfix: fury_iron_will (index 2) moved to Protection as
  // protection_iron_will; fury_improved_cleave (index 4) was removed
  // outright; fury_bloodthirst (last) is unaffected.
  const v4Fury = [
    "fury_booming_voice",
    "fury_cruelty",
    "fury_iron_will",
    "fury_unbridled_wrath",
    "fury_improved_cleave",
    "fury_piercing_howl",
    "fury_blood_craze",
    "fury_boundless_rage",
    "fury_dual_wield_specialization",
    "fury_raging_blows",
    "fury_enrage",
    "fury_improved_execute",
    "fury_precision",
    "fury_death_wish",
    "fury_improved_intercept",
    "fury_improved_berserker_rage",
    "fury_flurry",
    "fury_bloodthirst",
  ];
  const digits = v4Fury.map((id) => {
    if (id === "fury_iron_will") return "4";
    if (id === "fury_improved_cleave") return "2";
    if (id === "fury_bloodthirst") return "1";
    return "0";
  });
  const code = ["4", "", digits.join(""), ""].join("-");
  const ranks = decodeBuild(warrior, code);
  assert.deepEqual(ranks, {
    protection_iron_will: 4,
    fury_bloodthirst: 1,
  });
});

test("decodeBuild does not itself enforce row-gating (that's talent-rules' job)", () => {
  // A row-gate violation (points in a tier the tree total doesn't unlock)
  // decodes as-is -- repairPrereqs only drops unmet *prereqs*. Row-gating
  // is isValidBuildState's responsibility (see talent-rules.test.ts), which
  // is why canonicalBuildCode in build-tracking-server.ts calls both.
  const ranks = decodeBuild(warrior, encodeBuild(warrior, { protection_bastion: 1 }));
  assert.deepEqual(ranks, { protection_bastion: 1 });
});
