// Gear planner share code: `?g=<version>.<side>.<slot>.<slot>...` over the
// frozen GEAR_SLOTS order (lib/gear-slots.ts). Each slot is
// base36(itemId), then `_`base36(suffixId) for a random-suffix roll, then
// `-`base36(enchantId); an empty slot is empty, trailing empties are trimmed.
// Only [0-9a-z._-] appear, so URLSearchParams leaves the code unescaped.
//
// Decoding validates every slot against the class's item pool
// (public/gear/<level>/<class>.json) and lib/gear-classes.ts, drops what's
// illegal and says why, so a stale or hand-edited link still opens with
// whatever is valid. Client-safe and pure.
//
// GEAR_CODE_VERSION: bump it and branch in decodeGear if GEAR_SLOTS ever has
// to change in a way that isn't a pure append, or a slot's meaning changes.

import { GEAR_SLOTS, gearSlotsFor, isTwoHand, type GearSlot } from "./gear-slots.ts";
import { CLASS_GEAR } from "./gear-classes.ts";
import { itemSuffixes, type SuffixData } from "./item-suffixes.ts";
import type { Stats } from "./item-stats.ts";

export const GEAR_CODE_VERSION = 1;

export type Side = "a" | "h";
export type SlotPick = { itemId: number; suffixId?: number; enchantId?: number };
export type GearState = { side: Side; slots: Partial<Record<GearSlot, SlotPick>> };

export type PoolItem = {
  itemId: number;
  name: string;
  icon: string | null;
  quality: number | null;
  itemLevel: number | null;
  slot: string;
  type: string | null;
  stats: Stats;
  armor: number;
  weapon?: { min: number; max: number; speed: number | null; dps: number | null };
  fromLevel: number;
  sides: string;
  requires?: { kind: string; text: string }[];
  unique?: boolean;
  uniqueGroup?: string;
  suffixes?: boolean;
};
export type PoolEnchant = {
  id: number;
  name: string;
  text: string;
  slots: string[];
  types?: string[];
  stats: Stats;
  armor: number;
  weaponDamage: number;
  minIlvl: number;
  profession: string;
  skill: number | null;
  requires?: string[];
  learnedFrom: "trainer" | "recipe";
  recipeSourced: boolean;
};
export type GearPool = {
  version: number;
  classId: string;
  level: number;
  window: [number, number];
  items: PoolItem[];
  suffixes: SuffixData;
  enchants: PoolEnchant[];
};

export const emptyGear = (side: Side = "a"): GearState => ({ side, slots: {} });

const b36 = (n: number) => n.toString(36);

export function encodeGear(state: GearState): string | null {
  const parts = GEAR_SLOTS.map((slot) => {
    const p = state.slots[slot];
    return p ? `${b36(p.itemId)}${p.suffixId ? `_${b36(p.suffixId)}` : ""}${p.enchantId ? `-${b36(p.enchantId)}` : ""}` : "";
  });
  while (parts.length && !parts[parts.length - 1]) parts.pop();
  return parts.length ? `${GEAR_CODE_VERSION}.${state.side}.${parts.join(".")}` : null;
}

// Why a pick can't go in `slot` given the rest of `slots`, or null if it can.
export function pickProblem(pool: GearPool, side: Side, slots: GearState["slots"], slot: GearSlot, pick: SlotPick): string | null {
  const rules = CLASS_GEAR[pool.classId];
  if (!rules) return `no gear rules for ${pool.classId}`;
  const item = pool.items.find((i) => i.itemId === pick.itemId);
  if (!item) return `item ${pick.itemId} isn't in the ${pool.classId} pool`;
  if (!item.sides.includes(side)) return `${item.name} isn't available to ${side === "a" ? "Alliance" : "Horde"}`;
  if (!gearSlotsFor(item.slot).includes(slot)) return `${item.name} doesn't go in ${slot}`;
  if (slot === "off") {
    if ((item.slot === "One-Hand" || item.slot === "Off Hand") && (rules.dualWieldLevel === null || rules.dualWieldLevel > pool.level))
      return `${pool.classId} can't dual wield at ${pool.level}`;
    if (item.slot === "Shield" && !rules.shield) return `${pool.classId} can't use shields`;
    const main = slots.main && pool.items.find((i) => i.itemId === slots.main!.itemId);
    if (main && isTwoHand(main.slot)) return "a two-handed main hand leaves no off hand";
  }
  if (slot === "ranged" && !rules.ranged.includes(item.slot)) return `${item.name} doesn't go in ranged for ${pool.classId}`;
  const rolls = itemSuffixes(item, pool.suffixes);
  if (rolls.length && !rolls.some((r) => r.id === pick.suffixId)) return `${item.name} needs one of its own suffixes`;
  if (!rolls.length && pick.suffixId) return `${item.name} has no random suffix`;
  if (pick.enchantId) {
    const e = pool.enchants.find((x) => x.id === pick.enchantId);
    if (!e) return `enchant ${pick.enchantId} isn't available at ${pool.level}`;
    if (!e.slots.includes(item.slot) || (e.types && !e.types.includes(item.type ?? ""))) return `${e.name} doesn't fit ${item.name}`;
    if (e.minIlvl > (item.itemLevel ?? 0)) return `${e.name} needs item level ${e.minIlvl}`;
  }
  for (const [other, p] of Object.entries(slots) as [GearSlot, SlotPick][]) {
    if (other === slot || !p) continue;
    const o = pool.items.find((i) => i.itemId === p.itemId);
    if (!o) continue;
    if (item.unique && o.itemId === item.itemId) return `${item.name} is unique`;
    if (item.uniqueGroup && o.uniqueGroup === item.uniqueGroup) return `only one ${item.uniqueGroup} item`;
  }
  return null;
}

export type DecodeResult = { state: GearState; skipped: { slot: GearSlot | null; reason: string }[] };

// Unknown version, wrong shape or no code -> an empty state (with a reason when a code was given).
export function decodeGear(code: string | null, pool: GearPool, fallbackSide: Side = "a"): DecodeResult {
  const state = emptyGear(fallbackSide);
  if (!code) return { state, skipped: [] };
  const [version, side, ...parts] = code.split(".");
  if (Number(version) !== GEAR_CODE_VERSION || (side !== "a" && side !== "h") || parts.length > GEAR_SLOTS.length)
    return { state, skipped: [{ slot: null, reason: "this gear link isn't a version this page reads" }] };
  state.side = side;
  const skipped: DecodeResult["skipped"] = [];
  parts.forEach((part, i) => {
    if (!part) return;
    const slot = GEAR_SLOTS[i];
    const m = /^([0-9a-z]+)(?:_([0-9a-z]+))?(?:-([0-9a-z]+))?$/.exec(part);
    if (!m) return skipped.push({ slot, reason: `"${part}" isn't a gear slot code` });
    const pick: SlotPick = { itemId: parseInt(m[1], 36), ...(m[2] && { suffixId: parseInt(m[2], 36) }), ...(m[3] && { enchantId: parseInt(m[3], 36) }) };
    const problem = pickProblem(pool, side, state.slots, slot, pick);
    if (problem) skipped.push({ slot, reason: problem });
    else state.slots[slot] = pick;
  });
  return { state, skipped };
}
