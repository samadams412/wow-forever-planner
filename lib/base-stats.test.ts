import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (f: string) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "data", f), "utf8"));
const baseStats = read("base-stats.json");
const races: { id: string; allowedClasses: string[] }[] = read("races.json");

test("every allowed race/class pair has an entry at every level 1-60", () => {
  for (let level = 1; level <= 60; level++)
    for (const race of races)
      for (const cls of race.allowedClasses)
        assert.ok(baseStats.levels[level]?.[cls]?.[race.id], `${level} ${cls} ${race.id}`);
});

test("Classic rows are datamined, derived rows estimated", () => {
  for (const byClass of Object.values(baseStats.levels) as Record<string, Record<string, { confidence: string; basis: string }>>[])
    for (const byRace of Object.values(byClass))
      for (const e of Object.values(byRace))
        assert.equal(e.confidence, e.basis === "classic" ? "datamined" : "estimated");
  assert.equal(baseStats.levels[30].paladin.undead.basis, "race-offset");
  assert.equal(baseStats.levels[30].shaman["skyborne-horde"].basis, "class-average");
});

test("level 30 Human Warrior matches the Classic table", () => {
  const { str, agi, sta, int, spi, health, mana } = baseStats.levels[30].warrior.human;
  assert.deepEqual({ str, agi, sta, int, spi, health, mana }, { str: 62, agi: 44, sta: 57, int: 24, spi: 31, health: 374, mana: 0 });
});
