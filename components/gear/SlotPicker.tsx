"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GEAR_SLOT_LABEL, gearSlotsFor, isTwoHand, type GearSlot } from "@/lib/gear-slots";
import { pickProblem, type GearState, type PoolEnchant, type PoolItem, type SlotPick } from "@/lib/gear-code";
import { enchantsFor, rankKey, suffixesOf, type PlannerPool, type RankedEntry } from "@/lib/gear-planner";
import { computeSheet, enchantEffect, sheetDelta, withPick, type BaseStats, type Sheet, type SheetLine } from "@/lib/gear-sheet";
import { STAT_LABEL, type StatKey } from "@/lib/item-stats";
import { itemQualityColor, mediumIconUrl } from "@/lib/item-display";
import RequirementChips from "./RequirementChips";
import { ItemDetail } from "./SlotTooltip";

const DELTA_LINES: SheetLine[] = [
  "str", "agi", "sta", "int", "spi", "health", "mana", "armor", "ap", "rap", "critRating", "hitRating", "hasteRating", "expertiseRating",
  "critPct", "hitPct", "sp", "spellDmg", "heal", "holyDmg", "fireDmg", "frostDmg", "shadowDmg", "natureDmg", "arcaneDmg", "spellCritPct",
  "spellHitPct", "mp5", "hp5", "defRating", "defSkill", "dodgeRating", "parryRating", "blockRating", "blockValue",
];
const SHORT: Partial<Record<SheetLine, string>> = {
  str: "Str", agi: "Agi", sta: "Sta", int: "Int", spi: "Spi", health: "HP", mana: "Mana", armor: "Armor", ap: "AP", rap: "RAP",
  critRating: "Crit", hitRating: "Hit", sp: "SP", heal: "Heal", mp5: "MP5", defRating: "Def", dodgeRating: "Dodge", parryRating: "Parry",
  blockRating: "Block", blockValue: "Block value",
};
// Enchant select label: short name and its stats ("Lesser Stats: +2 all stats",
// "Forceful Heavy Armor Kit: +6 Attack Power, +24 armor"); effect-only enchants get just the name.
const enchantLabel = (e: PoolEnchant) => {
  const name = e.name.replace(/^Enchant [\w\s-]+? - /, "");
  return Object.keys(e.stats).length || e.armor || e.weaponDamage ? `${name}: ${enchantEffect(e)}` : name;
};
const short = (l: SheetLine) => SHORT[l] ?? STAT_LABEL[l as StatKey]?.name ?? l;
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Row = { item: PoolItem; pick: SlotPick; tag?: RankedEntry["tag"]; problem: string | null };

export default function SlotPicker({
  pool,
  items,
  slot,
  gear,
  base,
  sheet,
  variantKey,
  onEquip,
  onPreview,
  onClose,
}: {
  pool: PlannerPool;
  items: Map<number, PoolItem>;
  slot: GearSlot;
  gear: GearState;
  base: BaseStats;
  sheet: Sheet;
  variantKey: string | null;
  onEquip: (slots: GearState["slots"]) => void;
  onPreview: (sheet: Sheet | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // The one expanded row (click/tap to expand, Equip to wear it), like the one-open-tooltip rule.
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    if (window.matchMedia("(hover: hover)").matches) searchRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => () => onPreview(null), [onPreview]);

  const current = gear.slots[slot];
  const currentItem = current && items.get(current.itemId);
  const others = withPick(gear.slots, slot, null);

  // Equipping keeps the current enchant if it still fits, and a two-hander empties the off hand.
  const slotsWith = (pick: SlotPick | null): GearState["slots"] => {
    if (!pick) return others;
    const item = items.get(pick.itemId)!;
    const keepEnchant = current?.enchantId && enchantsFor(pool, item).some((e) => e.id === current.enchantId) ? current.enchantId : undefined;
    let next = withPick(others, slot, { ...pick, ...(pick.enchantId === undefined && keepEnchant && { enchantId: keepEnchant }) });
    if (slot === "main" && isTwoHand(item.slot)) next = withPick(next, "off", null);
    return next;
  };
  const rowFor = (item: PoolItem, suffixId?: number, tag?: RankedEntry["tag"]): Row => {
    const rolls = suffixesOf(pool, item);
    const roll = suffixId ?? (current?.itemId === item.itemId ? current.suffixId : undefined) ?? [...rolls].sort((a, b) => a.name.localeCompare(b.name))[0]?.id;
    const pick: SlotPick = { itemId: item.itemId, ...(roll && { suffixId: roll }) };
    return { item, pick, tag, problem: pickProblem(pool, gear.side, others, slot, pick) };
  };

  const suggested = useMemo<Row[]>(() => {
    const variants = variantKey ? pool.presets.variants.filter((v) => v.key === variantKey) : pool.presets.variants;
    const seen = new Set<string>();
    const rows: Row[] = [];
    for (const v of variants)
      for (const e of v.ranked[rankKey(slot)]?.[gear.side] ?? []) {
        const item = items.get(e.itemId);
        const key = `${e.itemId}:${e.suffixId ?? ""}`;
        if (!item || seen.has(key) || !gearSlotsFor(item.slot).includes(slot)) continue;
        seen.add(key);
        rows.push(rowFor(item, e.suffixId, e.tag));
      }
    return rows;
    // rowFor reads the same inputs listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, items, slot, gear, variantKey]);

  const results = useMemo<Row[] | null>(() => {
    const q = fold(query.trim());
    if (!q) return null;
    return pool.items
      .filter((i) => i.sides.includes(gear.side) && gearSlotsFor(i.slot).includes(slot) && fold(i.name).includes(q))
      .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0) || (b.itemLevel ?? 0) - (a.itemLevel ?? 0) || a.name.localeCompare(b.name))
      .slice(0, 60)
      .map((i) => rowFor(i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, pool, slot, gear]);

  const deltaOf = (pick: SlotPick | null) => sheetDelta(sheet, computeSheet(pool, base, slotsWith(pick)), DELTA_LINES);
  const previewRow = (pick: SlotPick | null) => onPreview(computeSheet(pool, base, slotsWith(pick)));

  const list = results ?? suggested;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 lg:bg-black/20" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Choose ${GEAR_SLOT_LABEL[slot]}`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col border-l border-accent/40 bg-surface shadow-xl sm:w-[26rem]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-semibold text-accent">{GEAR_SLOT_LABEL[slot]}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded text-foreground-muted hover:text-foreground">
            ✕
          </button>
        </div>

        {current && currentItem && (
          <div className="space-y-2 border-b border-border px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium" style={{ color: itemQualityColor(currentItem.quality) }}>
                {currentItem.name}
              </span>
              <span className="flex shrink-0 gap-3 text-xs">
                <a href={`/items/${currentItem.itemId}`} target="_blank" rel="noopener" className="text-foreground-muted underline hover:text-foreground">
                  Item page
                </a>
                <button type="button" onClick={() => onEquip(others)} className="text-foreground-muted underline hover:text-foreground">
                  Remove
                </button>
              </span>
            </div>
            {currentItem.suffixes && (
              <label className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-foreground-muted">Roll</span>
                <select
                  value={current.suffixId ?? ""}
                  onChange={(e) => onEquip(withPick(gear.slots, slot, { ...current, suffixId: Number(e.target.value) }))}
                  className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
                >
                  {[...suffixesOf(pool, currentItem)].sort((a, b) => a.name.localeCompare(b.name)).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}: {Object.entries(r.stats).map(([k, v]) => `+${v} ${STAT_LABEL[k as StatKey]?.name ?? k}`).join(", ")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-xs text-foreground-muted">Enchant</span>
              <select
                value={current.enchantId ?? ""}
                onChange={(e) => {
                  const enchantId = Number(e.target.value) || undefined;
                  const { enchantId: _drop, ...rest } = current;
                  void _drop;
                  onEquip(withPick(gear.slots, slot, enchantId ? { ...rest, enchantId } : rest));
                }}
                className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground"
              >
                <option value="">No enchant</option>
                {enchantsFor(pool, currentItem).map((e) => (
                  <option key={e.id} value={e.id}>
                    {enchantLabel(e)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="border-b border-border px-4 py-3">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${GEAR_SLOT_LABEL[slot].toLowerCase()} items, level 20 to ${pool.level}`}
            aria-label="Search items"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-foreground-muted"
          />
          <p className="mt-1.5 text-[11px] text-foreground-muted">
            {results
              ? `${results.length === 60 ? "First 60" : results.length} match${results.length === 1 ? "" : "es"}, best quality first.`
              : variantKey
                ? "Suggested by the preset. Type to search every item your class can use."
                : "Suggested by the presets. Type to search every item your class can use."}
          </p>
        </div>

        <ul className="flex-1 overflow-y-auto px-2 py-2" onMouseLeave={() => onPreview(null)}>
          {list.length === 0 && <li className="px-2 py-3 text-sm text-foreground-muted">No items match.</li>}
          {list.map((r) => {
            const suffix = r.pick.suffixId ? suffixesOf(pool, r.item).find((s) => s.id === r.pick.suffixId) : undefined;
            const deltas = Object.entries(deltaOf(r.pick)) as [SheetLine, number][];
            const top = deltas.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4);
            const worn = current?.itemId === r.item.itemId && current.suffixId === r.pick.suffixId;
            const key = `${r.item.itemId}:${r.pick.suffixId ?? ""}`;
            const open = expanded === key;
            // What equipping would wear: the kept enchant shows in the detail too.
            const wearing = slotsWith(r.pick)[slot] ?? r.pick;
            return (
              <li key={key} className={open ? "rounded bg-background" : ""}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => {
                    setExpanded(open ? null : key);
                    if (!open) previewRow(r.pick);
                  }}
                  onMouseEnter={() => previewRow(r.pick)}
                  onFocus={() => previewRow(r.pick)}
                  className={`flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-background focus:bg-background ${r.problem ? "opacity-50" : ""} ${worn ? "ring-1 ring-accent/50" : ""}`}
                >
                  {r.item.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediumIconUrl(r.item.icon)} alt="" width={28} height={28} className="mt-0.5 h-7 w-7 shrink-0 rounded border border-border" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-medium" style={{ color: itemQualityColor(r.item.quality) }}>
                        {r.item.name}
                        {suffix ? ` ${suffix.name}` : ""}
                      </span>
                      <span className="shrink-0 text-[10px] text-foreground-muted">ilvl {r.item.itemLevel}</span>
                    </span>
                    {r.tag && (
                      <span className="mr-1 rounded bg-accent/15 px-1 text-[10px] font-medium text-foreground-muted">
                        {r.tag === "pin" ? "Preset pick" : "Alternative"}
                      </span>
                    )}
                    <RequirementChips requires={r.item.requires} />
                    <span className="mt-0.5 block text-[11px] tabular-nums">
                      {r.problem ? (
                        <span className="text-foreground-muted">{r.problem}</span>
                      ) : worn ? (
                        <span className="text-foreground-muted">Equipped</span>
                      ) : top.length ? (
                        top.map(([l, d]) => (
                          <span key={l} className={`mr-2 ${d > 0 ? "text-green-400 [html.light-mode_&]:text-green-700" : "text-red-400 [html.light-mode_&]:text-red-700"}`}>
                            {d > 0 ? "+" : ""}
                            {d} {short(l)}
                          </span>
                        ))
                      ) : (
                        <span className="text-foreground-muted">No stat change</span>
                      )}
                    </span>
                  </span>
                </button>
                {open && (
                  <div className="px-2 pb-2">
                    <div className="rounded border border-[#c8aa6e]/80 bg-[#0a0f1a] p-3 text-xs leading-snug text-white">
                      <ItemDetail pool={pool} item={r.item} pick={wearing} />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        disabled={Boolean(r.problem) || worn}
                        onClick={() => {
                          onEquip(slotsWith(r.pick));
                          setExpanded(null);
                        }}
                        className="rounded border border-accent/60 bg-accent/15 px-3 py-1 text-sm font-semibold text-foreground hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {worn ? "Equipped" : "Equip"}
                      </button>
                      {r.problem && <span className="text-[11px] text-foreground-muted">{r.problem}</span>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
