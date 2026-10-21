// Client-side helpers for the gear planner UI: the pool file's extra parts
// (presets, base stats) and turning a preset into planner state. Pure.

import type { GearSlot } from "./gear-slots.ts";
import type { GearPool, GearState, PoolEnchant, PoolItem, Side } from "./gear-code.ts";
import type { BaseStats } from "./gear-sheet.ts";
import { itemSuffixes, type ItemSuffix } from "./item-suffixes.ts";

export type Requirement = { kind: string; text: string };
export type RankedEntry = { itemId: number; suffixId?: number; tag?: "pin" | "alternate"; requires?: Requirement[] };
export type PresetSide = {
  items: Partial<Record<GearSlot, number>>;
  suffixes?: Partial<Record<GearSlot, number>>;
  enchants: Partial<Record<GearSlot, number>>;
  requires?: Partial<Record<GearSlot, Requirement[]>>;
};
export type PresetVariant = {
  key: string;
  name: string;
  role: string;
  groups?: string[];
  sides: Record<Side, PresetSide>;
  // Keyed by slot, with finger/trinket shared as "finger" / "trinket".
  ranked: Record<string, Record<Side, RankedEntry[]>>;
};
export type PlannerPool = GearPool & {
  presets: { disclaimer: string; variants: PresetVariant[] };
  baseStats: Record<string, BaseStats & { name: string; side: Side; basis: "classic" | "race-offset" | "class-average"; confidence: string }>;
};

export function presetState(variant: PresetVariant, side: Side): GearState {
  const s = variant.sides[side];
  const slots: GearState["slots"] = {};
  for (const [slot, itemId] of Object.entries(s.items) as [GearSlot, number][])
    slots[slot] = { itemId, ...(s.suffixes?.[slot] && { suffixId: s.suffixes[slot] }), ...(s.enchants[slot] && { enchantId: s.enchants[slot] }) };
  return { side, slots };
}

export const rankKey = (slot: GearSlot) => slot.replace(/[12]$/, "");

export function itemIndex(pool: GearPool): Map<number, PoolItem> {
  return new Map(pool.items.map((i) => [i.itemId, i]));
}

export const suffixesOf = (pool: GearPool, item: PoolItem): ItemSuffix[] => (item.suffixes ? itemSuffixes(item, pool.suffixes) : []);

export function enchantsFor(pool: GearPool, item: PoolItem): PoolEnchant[] {
  return pool.enchants
    .filter((e) => e.slots.includes(item.slot) && (!e.types || e.types.includes(item.type ?? "")) && e.minIlvl <= (item.itemLevel ?? 0))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Default race per faction: the Classic representative (Human / Orc) when the class allows it.
export function defaultRace(pool: PlannerPool, side: Side): string {
  const races = Object.entries(pool.baseStats).filter(([, r]) => r.side === side).map(([id]) => id);
  return races.find((r) => r === (side === "a" ? "human" : "orc")) ?? races[0];
}
