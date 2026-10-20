import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SPECS,
  ROSTER_SIZE,
  swapSlots,
  computeCoverage,
  perCasterShortfalls,
  emptyRoster,
  roleCounts,
  roleHints,
  encodeRoster,
  decodeRoster,
  encodeNames,
  decodeNames,
  rosterQuery,
  type EffectView,
  type EffectSet,
} from "./raid-comp.ts";

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

// --- coverage, driven by the real data/raid-buffs.json --------------------
const raw = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "data", "raid-buffs.json"), "utf8"));
type RawEffect = Omit<EffectView, "sources"> & { sources: { classId: string; specs: "all" | string[] }[] };
const effects: EffectView[] = raw.effects.map((e: RawEffect) => ({
  ...e,
  icon: "",
  text: "",
  sources: e.sources.map((s) => ({
    ...s,
    label: "",
    specIndexes: SPECS.filter((sp) => sp.classId === s.classId && (s.specs === "all" || s.specs.includes(sp.tree))).map((sp) => sp.index),
  })),
}));
const sets: EffectSet[] = raw.perCaster;
const classNames = Object.fromEntries(SPECS.map((s) => [s.classId, s.classId[0].toUpperCase() + s.classId.slice(1)]));
const spec = (classId: string, tree: string) => SPECS.find((s) => s.classId === classId && s.tree === tree)!.index;
const rosterOf = (placements: [number, number][]) => {
  const r = emptyRoster();
  for (const [slot, idx] of placements) r[slot] = idx;
  return r;
};
const covered = (r: number[]) => {
  const c = computeCoverage(r, effects);
  return new Set(Object.keys(c).filter((id) => c[id].covered));
};

test("empty roster covers nothing", () => {
  assert.equal(covered(emptyRoster()).size, 0);
});

test("one Retribution Paladin lights up exactly the Paladin effects it can provide", () => {
  const c = covered(rosterOf([[0, spec("paladin", "Retribution")]]));
  for (const id of ["blessing-of-kings", "blessing-of-might", "blessing-of-wisdom", "blessing-of-light", "salvation", "vindication", "devotion-aura", "judgement-of-the-crusader"]) {
    assert.ok(c.has(id), id);
  }
  assert.ok(!c.has("battle-shout"));
  assert.equal([...c].every((id) => effects.find((e) => e.id === id)!.sources.some((s) => s.classId === "paladin")), true);
});

test("a Holy Paladin doesn't get Vindication (Retribution talent)", () => {
  assert.ok(!covered(rosterOf([[0, spec("paladin", "Holy")]])).has("vindication"));
});

test("group buffs only reach the provider's group", () => {
  const r = rosterOf([[7, spec("paladin", "Holy")]]); // group 2
  assert.deepEqual(computeCoverage(r, effects)["devotion-aura"].groups, [1]);
});

test("caster shortfalls: 1 Paladin for 4 Blessings, 3 Judgements, 3 Auras in its group", () => {
  const r = rosterOf([[0, spec("paladin", "Holy")]]);
  const s = perCasterShortfalls(r, effects, computeCoverage(r, effects), sets, classNames);
  const by = Object.fromEntries(s.map((x) => [x.setId, x]));
  assert.equal(by["paladin-blessings"].effects, 4);
  assert.equal(by["paladin-blessings"].casters, 1);
  assert.equal(by["paladin-judgements"].effects, 3);
  assert.equal(by["paladin-auras"].group, 0);
  assert.equal(by["paladin-auras"].effects, 3);
});

test("four Paladins cover all four Blessings with no shortfall", () => {
  const r = rosterOf([0, 1, 2, 3].map((i) => [i * 5, spec("paladin", "Holy")]));
  const s = perCasterShortfalls(r, effects, computeCoverage(r, effects), sets, classNames);
  assert.ok(!s.some((x) => x.setId === "paladin-blessings"));
});

test("water totem shortfall counts Mana Tide only for Restoration", () => {
  const short = (tree: string) => {
    const r = rosterOf([[0, spec("shaman", tree)]]);
    return perCasterShortfalls(r, effects, computeCoverage(r, effects), sets, classNames).find((x) => x.setId === "shaman-water-totems")!.effects;
  };
  assert.equal(short("Enhancement"), 2);
  assert.equal(short("Restoration"), 3);
});

// --- role summary -----------------------------------------------------------
test("role counts: Feral is flex, Disc counts as a healer", () => {
  const r = rosterOf([
    [0, spec("warrior", "Protection")],
    [1, spec("druid", "Feral Combat")],
    [2, spec("priest", "Discipline")],
    [3, spec("mage", "Frost")],
    [4, spec("paladin", "Retribution")],
  ]);
  assert.deepEqual(roleCounts(r), { tank: 1, healer: 1, dps: 2, flex: 1, players: 5 });
});

test("role hints stay quiet under 10 players and flag thin healing above", () => {
  const dps = spec("rogue", "Combat");
  assert.deepEqual(roleHints(roleCounts(rosterOf([[0, dps]]))), []);
  // 20 players, 2 healers (10%), 1 tank
  const big = rosterOf(Array.from({ length: 20 }, (_, i) => [i, i === 0 ? spec("warrior", "Protection") : i < 3 ? spec("priest", "Holy") : dps]));
  const h = roleHints(roleCounts(big));
  assert.equal(h.length, 1);
  assert.match(h[0], /2 healers for 20 players/);
  // 20 players, 5 healers (25%), no tanks
  const healthy = rosterOf(Array.from({ length: 20 }, (_, i) => [i, i < 5 ? spec("shaman", "Restoration") : dps]));
  assert.deepEqual(roleHints(roleCounts(healthy)), ["No tanks yet."]);
});

// --- share URL ----------------------------------------------------------------

const roundTrip = (roster: number[], names: string[]) => {
  const q = new URLSearchParams(rosterQuery(roster, names));
  return { roster: decodeRoster(q.get("r")), names: decodeNames(q.get("n")) };
};

test("empty roster encodes to no query at all", () => {
  assert.equal(rosterQuery(emptyRoster(), Array(40).fill("")), "");
});

test("trailing empty slots are trimmed", () => {
  const r = rosterOf([[0, 1], [6, 27]]);
  assert.equal(encodeRoster(r), "1-100000r"); // slots 0..6
});

test("a full 40-player raid is 42 chars (wowtbc's equivalent is 90)", () => {
  const r = Array.from({ length: 40 }, (_, i) => (i % 27) + 1);
  assert.equal(encodeRoster(r)!.length, 42);
  assert.deepEqual(roundTrip(r, Array(40).fill("")).roster, r);
});

test("names round-trip, including spaces, accents, & and +", () => {
  const r = rosterOf([[0, 3], [1, 14], [39, 26]]);
  const names = Array(40).fill("");
  names[0] = "Thrall";
  names[1] = "Jaina & co+1";
  names[39] = "Élune";
  assert.deepEqual(roundTrip(r, names), { roster: r, names });
});

test("~ is stripped from names so it can't break the separator", () => {
  const names = Array(40).fill("");
  names[0] = "a~b";
  assert.equal(encodeNames(names), "ab");
});

test("bad codes decode to an empty roster", () => {
  for (const bad of [null, "", "2-111", "1-!!", "garbage"]) assert.deepEqual(decodeRoster(bad), emptyRoster());
  assert.equal(decodeRoster("1-z")[0], 0); // 35 > 27 specs
});
