import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseItemTooltip } from "./item-stats.ts";
import { GEAR_SLOTS, gearSlotsFor, type GearSlot } from "./gear-slots.ts";
import { DEFAULT_GEAR_LEVEL } from "./gear-config.ts";
import { CLASS_GEAR, canEquip } from "./gear-classes.ts";
import { itemSuffixes, type SuffixData } from "./item-suffixes.ts";

type Item = { itemId: number; slot: string | null; type: string | null; itemClass: number; quality: number | null; requiredLevel: number | null; itemLevel: number | null; tooltip: string[] };
const dataDir = path.join(import.meta.dirname, "..", "data");
const read = (...p: string[]) => JSON.parse(fs.readFileSync(path.join(dataDir, ...p), "utf8"));
const items = new Map<number, Item>(read("items.json").items.map((i: Item) => [i.itemId, i]));
const enchants = new Map<number, { slots: string[]; types: string[] | null }>(read("gear", "enchants.json").enchants.map((e: { id: number }) => [e.id, e]));
const suffixData: SuffixData = read("gear", "suffixes.json");
const presetFiles = fs.readdirSync(path.join(dataDir, "gear", "presets")).filter((f) => f.endsWith(".json"));

test("there is at least one generated preset file", () => assert.ok(presetFiles.length > 0));

for (const file of presetFiles) {
  const preset = read("gear", "presets", file);
  test(`${file}: every pick is a legal item in a legal slot`, () => {
    const rules = CLASS_GEAR[preset.classId]!;
    assert.equal(preset.level, DEFAULT_GEAR_LEVEL);
    for (const v of preset.variants) {
      assert.equal(v.confidence, "estimated");
      for (const side of ["a", "h"]) {
        const { items: picks, enchants: ench } = v.sides[side];
        const groups = new Map<string, number>();
        for (const [slot, id] of Object.entries(picks) as [GearSlot, number][]) {
          const item = items.get(id)!;
          const where = `${v.key}/${side}/${slot} ${id}`;
          assert.ok(GEAR_SLOTS.includes(slot), where);
          assert.ok(gearSlotsFor(item.slot).includes(slot), `${where} slot ${item.slot}`);
          assert.ok((item.requiredLevel ?? 0) <= preset.level, `${where} requiredLevel`);
          assert.ok(canEquip(rules, preset.level, item.slot!, item.type, item.itemClass), `${where} can't equip`);
          // A random-suffix item is always picked with one of its own rolls; a plain item never has one.
          const rolls = itemSuffixes(item, suffixData).map((r) => r.id);
          const suffixId = v.sides[side].suffixes?.[slot];
          assert.ok(rolls.length ? rolls.includes(suffixId) : suffixId === undefined, `${where} suffix ${suffixId}`);
          const { uniqueGroup: group, requires } = parseItemTooltip(item.tooltip);
          const shown = (v.sides[side].requires?.[slot] ?? []) as { kind: string; text: string }[];
          // Tooltip lines first, then gates from elsewhere: ItemSparse PvP rank, or an override note.
          assert.deepEqual(shown.slice(0, requires.length).map((r) => r.text), requires, `${where} requires lines`);
          assert.ok(shown.slice(requires.length).every((r) => r.kind === "pvpRank" || r.kind === "override"), `${where} extra gates`);
          if (group) groups.set(group, (groups.get(group) ?? 0) + 1);
        }
        for (const [group, n] of groups) assert.equal(n, 1, `${v.key}/${side}: ${n} items of unique group ${group}`);
        if (picks.main && items.get(picks.main)!.slot === "Two-Hand") assert.equal(picks.off, undefined, `${v.key}/${side}: two-hander plus off hand`);
        for (const [slot, id] of Object.entries(ench) as [string, number][]) {
          const e = enchants.get(id);
          const item = items.get(picks[slot])!;
          assert.ok(e && e.slots.includes(item.slot!) && (!e.types || e.types.includes(item.type!)), `${v.key}/${side}/${slot}: enchant ${id} doesn't fit`);
        }
      }
    }
  });
}

test("a PvP variant's trinket list offers the shared Engineering alternates next to its pins", () => {
  const overrides = read("gear", "preset-overrides.json");
  const alternates: number[] = overrides._groups.pvp.alternates.trinket.map((a: { itemId: number }) => a.itemId);
  for (const file of presetFiles)
    for (const v of read("gear", "presets", file).variants.filter((x: { groups?: string[] }) => x.groups?.includes("pvp")))
      for (const side of ["a", "h"]) {
        const list = v.ranked.trinket[side] as { itemId: number; tag?: string }[];
        for (const id of alternates) assert.ok(list.some((e) => e.itemId === id && e.tag === "alternate"), `${file} ${v.key}/${side}: alternate ${id}`);
      }
});
