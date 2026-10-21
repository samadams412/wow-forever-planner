import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decodeGear, encodeGear, emptyGear, GEAR_CODE_VERSION, type GearPool, type GearState } from "./gear-code.ts";
import { GEAR_SLOTS, type GearSlot } from "./gear-slots.ts";

const root = path.join(import.meta.dirname, "..");
const pool: GearPool = JSON.parse(fs.readFileSync(path.join(root, "public", "gear-pool", "30", "warrior.json"), "utf8"));
const presets = JSON.parse(fs.readFileSync(path.join(root, "data", "gear", "presets", "warrior.json"), "utf8"));

function presetState(key: string, side: "a" | "h"): GearState {
  const s = presets.variants.find((v: { key: string }) => v.key === key).sides[side];
  const slots: GearState["slots"] = {};
  for (const [slot, itemId] of Object.entries(s.items) as [GearSlot, number][])
    slots[slot] = { itemId, ...(s.suffixes?.[slot] && { suffixId: s.suffixes[slot] }), ...(s.enchants[slot] && { enchantId: s.enchants[slot] }) };
  return { side, slots };
}
const one = (slot: GearSlot, pick: GearState["slots"][GearSlot], side: "a" | "h" = "a") =>
  decodeGear(encodeGear({ side, slots: { [slot]: pick } }), pool);

test("an empty set encodes to no code", () => assert.equal(encodeGear(emptyGear()), null));

test("every Warrior preset round-trips with nothing skipped", () => {
  for (const v of presets.variants)
    for (const side of ["a", "h"] as const) {
      const state = presetState(v.key, side);
      const { state: back, skipped } = decodeGear(encodeGear(state), pool);
      assert.deepEqual(skipped, [], `${v.key}/${side}`);
      assert.deepEqual(back, state, `${v.key}/${side}`);
    }
});

test("codes use only URL-safe characters and stay short", () => {
  const code = encodeGear(presetState("pve", "a"))!;
  assert.match(code, /^[0-9a-z._-]+$/);
  assert.equal(new URLSearchParams({ g: code }).toString(), `g=${code}`);
  assert.ok(code.length < 160, `${code.length}`);
});

test("trailing empty slots are trimmed; a gap in the middle stays", () => {
  assert.equal(encodeGear({ side: "h", slots: { neck: { itemId: 12029, suffixId: 12727 } } }), `${GEAR_CODE_VERSION}.h..9a5_9tj`);
});

test("rejects an item that isn't in the class pool", () => {
  assert.match(one("head", { itemId: 999999 }).skipped[0].reason, /isn't in the warrior pool/);
});

test("rejects an item in a slot it doesn't fit", () => {
  assert.match(one("head", { itemId: 1076 }).skipped[0].reason, /doesn't go in head/);
});

test("rejects the other faction's item (Insignia of the Horde on Alliance)", () => {
  assert.match(one("trinket1", { itemId: 18834 }, "a").skipped[0].reason, /isn't available to Alliance/);
  assert.deepEqual(one("trinket1", { itemId: 18834 }, "h").skipped, []);
});

test("rejects a suffix the item can't roll, a missing roll, and a roll on a plain item", () => {
  assert.match(one("wrist", { itemId: 9428, suffixId: 1 }).skipped[0].reason, /needs one of its own suffixes/);
  assert.match(one("wrist", { itemId: 9428 }).skipped[0].reason, /needs one of its own suffixes/);
  assert.match(one("trinket1", { itemId: 273840, suffixId: 12727 }).skipped[0].reason, /has no random suffix/);
});

test("rejects an enchant for the wrong slot or below its item level", () => {
  assert.match(one("head", { itemId: 7915, enchantId: 273515 }).skipped[0].reason, /doesn't fit/);
  assert.match(one("chest", { itemId: 21154, enchantId: 8173 }).skipped[0].reason, /needs item level 25/);
});

test("rejects an off hand under a two-hander", () => {
  const two = pool.items.find((i) => i.slot === "Two-Hand" && !i.suffixes)!;
  const shield = pool.items.find((i) => i.slot === "Shield" && !i.suffixes)!;
  const { state, skipped } = decodeGear(encodeGear({ side: "a", slots: { main: { itemId: two.itemId }, off: { itemId: shield.itemId } } }), pool);
  assert.equal(state.slots.main?.itemId, two.itemId);
  assert.equal(state.slots.off, undefined);
  assert.match(skipped[0].reason, /two-handed/);
});

test("rejects a second copy of a unique item and a second item of a unique group", () => {
  const { skipped } = decodeGear(encodeGear({ side: "a", slots: { finger1: { itemId: 1076 }, finger2: { itemId: 1076 } } }), pool);
  assert.match(skipped[0].reason, /unique/);
  const runes = decodeGear(encodeGear({ side: "a", slots: { trinket1: { itemId: 21566 }, trinket2: { itemId: 21568 } } }), pool);
  assert.match(runes.skipped[0].reason, /only one Rune of Battle/);
});

test("class rules the pool can't express: no dual wield, no shield", () => {
  const oneHand = pool.items.find((i) => i.slot === "One-Hand" && !i.suffixes)!;
  const mage: GearPool = { ...pool, classId: "mage" };
  assert.match(decodeGear(encodeGear({ side: "a", slots: { off: { itemId: oneHand.itemId } } }), mage).skipped[0].reason, /can't dual wield/);
  const shield = pool.items.find((i) => i.slot === "Shield" && !i.suffixes)!;
  assert.match(decodeGear(encodeGear({ side: "a", slots: { off: { itemId: shield.itemId } } }), mage).skipped[0].reason, /can't use shields/);
});

test("a bad version, side or shape decodes to an empty set with a reason", () => {
  for (const code of ["2.a.1", "1.x.1", "nonsense", `1.a.${".".repeat(GEAR_SLOTS.length + 1)}`]) {
    const { state, skipped } = decodeGear(code, pool);
    assert.deepEqual(state.slots, {}, code);
    assert.equal(skipped.length, 1, code);
  }
  assert.deepEqual(decodeGear(null, pool), { state: emptyGear(), skipped: [] });
});
