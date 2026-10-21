"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GearPool, PoolItem, SlotPick } from "@/lib/gear-code";
import { enchantEffect } from "@/lib/gear-sheet";
import { suffixesOf } from "@/lib/gear-planner";
import { STAT_KEYS, STAT_LABEL, type StatKey, type Stats } from "@/lib/item-stats";
import { itemQualityColor } from "@/lib/item-display";

const WIDTH = 288;

// Classic-style tooltip for an equipped slot (desktop hover only; see SlotCard).
export default function SlotTooltip({ pool, item, pick, anchor }: { pool: GearPool; item: PoolItem; pick: SlotPick; anchor: DOMRect }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    const right = anchor.right + 8;
    const left = right + WIDTH <= window.innerWidth - 8 ? right : Math.max(8, anchor.left - 8 - WIDTH);
    const top = Math.max(8, Math.min(anchor.top, window.innerHeight - h - 8));
    // Measured after render: the tooltip's height decides where it fits.
    setPos({ left, top });
  }, [anchor]);

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? 0, width: WIDTH }}
      className="pointer-events-none fixed z-50 rounded border border-[#c8aa6e]/80 bg-[#0a0f1a]/95 p-3 text-left text-xs leading-snug text-white shadow-lg"
    >
      <ItemDetail pool={pool} item={item} pick={pick} />
      <div className="mt-1.5 text-[10px] text-[#9ca3af]">Click to change</div>
    </div>,
    document.body,
  );
}

// The tooltip's lines, also shown in the picker drawer's expanded row. Built from
// the pool's parsed stats, not tooltip text: name, slot and type, armor / weapon
// damage, stat lines (item + suffix roll), the enchant's effect and requirements.
// Always dark text colors: callers render it on the dark tooltip surface.
export function ItemDetail({ pool, item, pick }: { pool: GearPool; item: PoolItem; pick: SlotPick }) {
  const suffix = pick.suffixId ? suffixesOf(pool, item).find((s) => s.id === pick.suffixId) : undefined;
  const stats: Stats = { ...item.stats };
  for (const [k, v] of Object.entries(suffix?.stats ?? {}) as [StatKey, number][]) stats[k] = (stats[k] ?? 0) + v;
  const keys = (Object.keys(stats) as StatKey[]).sort((a, b) => STAT_KEYS.indexOf(a) - STAT_KEYS.indexOf(b));
  const plain = keys.filter((k) => !STAT_LABEL[k]?.equip);
  const equip = keys.filter((k) => STAT_LABEL[k]?.equip);
  const enchant = pick.enchantId ? pool.enchants.find((e) => e.id === pick.enchantId) : undefined;
  const signed = (v: number) => (v < 0 ? `${v}` : `+${v}`);
  const w = item.weapon;

  return (
    <>
      <div className="text-sm font-semibold" style={{ color: itemQualityColor(item.quality) === "var(--quality-common)" ? "#ffffff" : itemQualityColor(item.quality) }}>
        {item.name}
        {suffix ? ` ${suffix.name}` : ""}
      </div>
      <div className="flex justify-between">
        <span>{item.slot}</span>
        <span>{item.type && item.type !== "Trinket" && item.type !== "Miscellaneous" ? item.type : ""}</span>
      </div>
      {w && (
        <>
          <div className="flex justify-between">
            <span>
              {w.min} - {w.max} Damage
            </span>
            {w.speed && <span>Speed {w.speed.toFixed(2)}</span>}
          </div>
          {w.dps && <div>({w.dps.toFixed(1)} damage per second)</div>}
        </>
      )}
      {item.armor > 0 && <div>{item.armor} Armor</div>}
      {plain.map((k) => (
        <div key={k}>
          {signed(stats[k]!)} {STAT_LABEL[k]?.name ?? k}
        </div>
      ))}
      {enchant && <div className="text-[#1eff00]">{enchantEffect(enchant)}</div>}
      <div className={item.requiredLevel ? "" : "text-[#9ca3af]"}>
        {item.requiredLevel ? `Requires Level ${item.requiredLevel}` : `No level requirement (obtainable from level ${item.fromLevel})`}
      </div>
      {item.requires?.map((r) => (
        <div key={r.text}>{r.text}</div>
      ))}
      {equip.map((k) => (
        <div key={k} className="text-[#1eff00]">
          Equip: {signed(stats[k]!)} {STAT_LABEL[k]?.name ?? k}
        </div>
      ))}
    </>
  );
}
