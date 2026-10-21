// Character sheet for the gear planner: race base stats (data/base-stats.json
// slice in the pool file) plus each worn item's stats, its suffix roll and
// its enchant. Classic formulas only where Forever is known to keep them:
// health = base + first 20 Stamina x1 + the rest x10, mana likewise with
// Intellect x15, armor = item armor + bonus armor + 2 x Agility. No crit %,
// hit % or attack power is derived (Forever's rating conversions at 30 are
// unknown); the rest are gear totals. No buffs, no talents. Client-safe, pure.

import { GEAR_SLOTS, type GearSlot } from "./gear-slots.ts";
import { itemSuffixes } from "./item-suffixes.ts";
import type { Stats, StatKey } from "./item-stats.ts";
import type { GearPool, GearState, PoolItem, SlotPick } from "./gear-code.ts";

export type BaseStats = { str: number; agi: number; sta: number; int: number; spi: number; health: number; mana: number };
export type Sheet = { stats: Stats; armor: number; health: number; mana: number; weaponDps: Partial<Record<"main" | "off" | "ranged", number>> };

const ATTRS = ["str", "agi", "sta", "int", "spi"] as const;

const add = (into: Stats, from: Stats) => {
  for (const [k, v] of Object.entries(from) as [StatKey, number][]) into[k] = (into[k] ?? 0) + v;
};

// What one pick contributes: item stats + its suffix roll + its enchant.
export function pickContribution(pool: GearPool, item: PoolItem, pick: SlotPick): { stats: Stats; armor: number; weaponDamage: number } {
  const stats: Stats = { ...item.stats };
  if (pick.suffixId) {
    const roll = itemSuffixes(item, pool.suffixes).find((r) => r.id === pick.suffixId);
    if (roll) add(stats, roll.stats);
  }
  const e = pick.enchantId ? pool.enchants.find((x) => x.id === pick.enchantId) : undefined;
  if (e) add(stats, e.stats);
  return { stats, armor: item.armor + (e?.armor ?? 0), weaponDamage: e?.weaponDamage ?? 0 };
}

const fromAttr = (value: number, perPoint: number) => Math.min(value, 20) + Math.max(value - 20, 0) * perPoint;

export function computeSheet(pool: GearPool, base: BaseStats, slots: GearState["slots"]): Sheet {
  const stats: Stats = Object.fromEntries(ATTRS.map((a) => [a, base[a]]));
  let armor = 0;
  const weaponDps: Sheet["weaponDps"] = {};
  for (const slot of GEAR_SLOTS) {
    const pick = slots[slot];
    const item = pick && pool.items.find((i) => i.itemId === pick.itemId);
    if (!pick || !item) continue;
    const c = pickContribution(pool, item, pick);
    add(stats, c.stats);
    armor += c.armor;
    if (item.weapon?.dps && (slot === "main" || slot === "off" || slot === "ranged"))
      weaponDps[slot] = Math.round((item.weapon.dps + (item.weapon.speed ? c.weaponDamage / item.weapon.speed : 0)) * 10) / 10;
  }
  armor += (stats.bonusArmor ?? 0) + 2 * (stats.agi ?? 0);
  return {
    stats,
    armor,
    health: base.health + fromAttr(stats.sta ?? 0, 10),
    mana: base.mana > 0 ? base.mana + fromAttr(stats.int ?? 0, 15) : 0,
    weaponDps,
  };
}

// Sheet lines that changed between two sheets, for the hover preview.
export type SheetLine = "health" | "mana" | "armor" | StatKey;
export function sheetValue(sheet: Sheet, line: SheetLine): number {
  if (line === "health" || line === "mana" || line === "armor") return sheet[line];
  return sheet.stats[line] ?? 0;
}
export function sheetDelta(before: Sheet, after: Sheet, lines: SheetLine[]): Partial<Record<SheetLine, number>> {
  const out: Partial<Record<SheetLine, number>> = {};
  for (const l of lines) {
    const d = sheetValue(after, l) - sheetValue(before, l);
    if (d) out[l] = d;
  }
  return out;
}

export const withPick = (slots: GearState["slots"], slot: GearSlot, pick: SlotPick | null): GearState["slots"] => {
  const next = { ...slots };
  if (pick) next[slot] = pick;
  else delete next[slot];
  return next;
};
