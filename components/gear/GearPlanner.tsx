"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_GEAR_LEVEL } from "@/lib/gear-config";
import { decodeGear, encodeGear, pickProblem, type DecodeResult, type GearState, type Side } from "@/lib/gear-code";
import { defaultRace, itemIndex, presetState, type PlannerPool } from "@/lib/gear-planner";
import { isTwoHand, type GearSlot } from "@/lib/gear-slots";
import { LEFT, RIGHT, SlotCard, WEAPONS } from "./SlotGrid";

type Props = { classId: string; className: string; help: ReactNode; initialCode: string | null };

export default function GearPlanner({ classId, className, initialCode }: Props) {
  const [pool, setPool] = useState<PlannerPool | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(`/gear/${DEFAULT_GEAR_LEVEL}/${classId}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((p: PlannerPool) => live && setPool(p))
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [classId]);

  if (loadError) return <p className="mt-6 text-sm text-foreground-muted">The {className} item list didn&apos;t load. Reload the page to try again.</p>;
  if (!pool) return <p className="mt-6 text-sm text-foreground-muted">Loading the {className} item list…</p>;
  return <Planner pool={pool} initialCode={initialCode} />;
}

function initialState(pool: PlannerPool, code: string | null): { gear: GearState; variant: string | null; skipped: DecodeResult["skipped"] } {
  if (code) {
    const { state, skipped } = decodeGear(code, pool);
    if (Object.keys(state.slots).length || skipped.length) return { gear: state, variant: null, skipped };
  }
  const first = pool.presets.variants[0];
  return { gear: presetState(first, "a"), variant: first.key, skipped: [] };
}

function Planner({ pool, initialCode }: { pool: PlannerPool; initialCode: string | null }) {
  const items = useMemo(() => itemIndex(pool), [pool]);
  const [start] = useState(() => initialState(pool, initialCode));
  const [gear, setGear] = useState<GearState>(start.gear);
  // The preset the set still matches; null once anything is changed by hand.
  const [variant, setVariant] = useState<string | null>(start.variant);
  const [skipped, setSkipped] = useState(start.skipped);
  const [, setRace] = useState(() => defaultRace(pool, start.gear.side));

  // replaceState, not router.replace: a pure address-bar sync, no re-render (raid comp does the same).
  useEffect(() => {
    const code = encodeGear(gear);
    window.history.replaceState(null, "", `${window.location.pathname}${code ? `?g=${code}` : ""}`);
  }, [gear]);

  const loadPreset = (key: string, side: Side) => {
    const v = pool.presets.variants.find((x) => x.key === key);
    if (!v) return;
    setGear(presetState(v, side));
    setVariant(key);
    setSkipped([]);
  };

  const switchSide = (side: Side) => {
    if (side === gear.side) return;
    setRace(defaultRace(pool, side));
    // A preset follows the faction; a hand-built set keeps what the other faction can also use.
    if (variant) return loadPreset(variant, side);
    const next: GearState = { side, slots: {} };
    const dropped: DecodeResult["skipped"] = [];
    for (const [slot, pick] of Object.entries(gear.slots) as [GearSlot, NonNullable<GearState["slots"][GearSlot]>][]) {
      const problem = pickProblem(pool, side, next.slots, slot, pick);
      if (problem) dropped.push({ slot, reason: problem });
      else next.slots[slot] = pick;
    }
    setGear(next);
    setSkipped(dropped);
  };

  const twoHanded = (() => {
    const main = gear.slots.main && items.get(gear.slots.main.itemId);
    return Boolean(main && isTwoHand(main.slot));
  })();
  const card = (slot: GearSlot) => (
    <SlotCard
      key={slot}
      slot={slot}
      pool={pool}
      items={items}
      slots={gear.slots}
      onOpen={() => {}}
      disabled={slot === "off" && twoHanded ? "A two-handed weapon leaves no off hand" : undefined}
    />
  );

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-foreground-muted">Preset</span>
          <select
            value={variant ?? ""}
            onChange={(e) => e.target.value && loadPreset(e.target.value, gear.side)}
            className="rounded border border-border bg-surface px-2 py-1 text-sm text-foreground"
          >
            {!variant && <option value="">Custom set</option>}
            {pool.presets.variants.map((v) => (
              <option key={v.key} value={v.key}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <div role="group" aria-label="Faction" className="flex overflow-hidden rounded border border-border text-sm">
          {(["a", "h"] as const).map((side) => (
            <button
              key={side}
              type="button"
              aria-pressed={gear.side === side}
              onClick={() => switchSide(side)}
              className={`px-3 py-1 ${gear.side === side ? "bg-accent/20 font-semibold text-foreground" : "text-foreground-muted hover:text-foreground"}`}
            >
              {side === "a" ? "Alliance" : "Horde"}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-foreground-muted">{pool.presets.disclaimer}</p>

      {skipped.length > 0 && (
        <div className="mt-3 rounded border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs">
          <p className="font-semibold text-amber-300 [html.light-mode_&]:text-amber-700">
            {skipped.length === 1 ? "1 item" : `${skipped.length} items`} from the link couldn&apos;t be used:
          </p>
          <ul className="mt-1 list-disc pl-4 text-foreground-muted">
            {skipped.map((s, i) => (
              <li key={i}>{s.slot ? `${s.slot}: ${s.reason}` : s.reason}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setSkipped([])} className="mt-1 text-foreground-muted underline hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_18rem_minmax(0,1fr)]">
        <div className="space-y-2">{LEFT.map(card)}</div>
        <div className="space-y-2 sm:order-last sm:col-span-2 lg:order-none lg:col-span-1" data-sheet-slot />
        <div className="space-y-2">{RIGHT.map(card)}</div>
        <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3 lg:col-span-3">{WEAPONS.map(card)}</div>
      </div>
    </div>
  );
}
