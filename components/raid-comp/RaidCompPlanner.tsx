"use client";

import { useCallback, useState } from "react";
import Dialog from "@/components/site/Dialog";
import {
  GROUP_COUNT,
  GROUP_SIZE,
  MAX_NAME_LENGTH,
  emptyNames,
  emptyRoster,
  swapSlots,
  type Roster,
  type SpecView,
} from "@/lib/raid-comp";

// Interaction model (tap first, drag on top):
// - Tap a spec in the palette to "arm" it, then every slot tap places it.
//   Tap it again (or Done) to disarm.
// - With nothing armed, tapping an empty slot opens a spec picker for that
//   slot (the palette is off-screen on a phone once you scroll down).
// - With nothing armed, tapping a filled slot selects it; tapping another
//   slot then moves/swaps the two.
// - Desktop: drag a palette spec onto a slot, or drag a slot onto another
//   slot to swap. HTML5 drag events don't fire from touch, so phones only
//   ever see the tap flow.
type DragPayload = { kind: "spec"; index: number } | { kind: "slot"; index: number };
const DRAG_MIME = "text/plain";

export default function RaidCompPlanner({ specs }: { specs: SpecView[] }) {
  const [roster, setRoster] = useState<Roster>(emptyRoster);
  const [names, setNames] = useState<string[]>(emptyNames);
  const [armed, setArmed] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const specAt = (i: number) => (roster[i] ? specs[roster[i] - 1] : undefined);

  const assign = useCallback((slot: number, specIndex: number) => {
    setRoster((r) => r.map((v, i) => (i === slot ? specIndex : v)));
  }, []);

  const swap = useCallback((a: number, b: number) => {
    if (a === b) return;
    setRoster((r) => swapSlots(r, a, b));
    setNames((n) => swapSlots(n, a, b));
  }, []);

  const clearSlot = (slot: number) => {
    assign(slot, 0);
    setNames((n) => n.map((v, i) => (i === slot ? "" : v)));
    if (selectedSlot === slot) setSelectedSlot(null);
  };

  const onSlotTap = (slot: number) => {
    if (armed) return assign(slot, armed);
    if (selectedSlot !== null) {
      swap(selectedSlot, slot);
      return setSelectedSlot(null);
    }
    if (roster[slot]) setSelectedSlot(slot);
    else setPickerSlot(slot);
  };

  const onDrop = (slot: number, raw: string) => {
    setDropTarget(null);
    let payload: DragPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (payload.kind === "spec" && specs[payload.index - 1]) assign(slot, payload.index);
    else if (payload.kind === "slot" && payload.index >= 0 && payload.index < roster.length) swap(payload.index, slot);
  };

  const reset = () => {
    setRoster(emptyRoster());
    setNames(emptyNames());
    setArmed(0);
    setSelectedSlot(null);
  };

  const armedSpec = armed ? specs[armed - 1] : undefined;
  const filled = roster.filter(Boolean).length;

  return (
    <div className="mt-4 flex flex-col gap-4 pb-16">
      <section aria-label="Specs">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Specs</h2>
          <div className="flex items-center gap-3 text-xs text-foreground-muted">
            <span>{filled} / {roster.length} players</span>
            <button
              type="button"
              onClick={reset}
              disabled={filled === 0}
              className="rounded border border-border px-2 py-1 hover:border-accent/60 hover:text-foreground disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>
        <SpecGrid
          specs={specs}
          activeIndex={armed}
          onPick={(i) => {
            setSelectedSlot(null);
            setArmed((a) => (a === i ? 0 : i));
          }}
          draggable
          columns="grid-cols-3 sm:grid-cols-5 lg:grid-cols-9"
        />
      </section>

      {(armedSpec || selectedSlot !== null) && (
        <div
          role="status"
          className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-xl items-center justify-between gap-2 rounded border border-accent/50 bg-surface px-3 py-2 text-sm shadow-lg"
        >
          {armedSpec ? (
            <>
              <span className="flex min-w-0 items-center gap-2">
                <SpecIcon spec={armedSpec} size="h-6 w-6" />
                <span className="truncate">Placing {armedSpec.label}. Tap slots to add.</span>
              </span>
              <button type="button" onClick={() => setArmed(0)} className="shrink-0 rounded bg-accent px-2 py-1 text-xs font-medium text-background">
                Done
              </button>
            </>
          ) : (
            <>
              <span className="truncate">Tap another slot to move or swap.</span>
              <span className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPickerSlot(selectedSlot);
                    setSelectedSlot(null);
                  }}
                  className="rounded border border-border px-2 py-1 text-xs hover:border-accent/60"
                >
                  Change spec
                </button>
                <button type="button" onClick={() => setSelectedSlot(null)} className="rounded border border-border px-2 py-1 text-xs hover:border-accent/60">
                  Cancel
                </button>
              </span>
            </>
          )}
        </div>
      )}

      <section aria-label="Raid groups" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: GROUP_COUNT }, (_, g) => (
          <div key={g} className="rounded-lg border border-border bg-surface/50 p-2">
            <h3 className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-foreground-muted">Group {g + 1}</h3>
            <ol className="flex flex-col gap-1">
              {Array.from({ length: GROUP_SIZE }, (_, m) => {
                const slot = g * GROUP_SIZE + m;
                const spec = specAt(slot);
                const selected = selectedSlot === slot;
                return (
                  <li
                    key={slot}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dropTarget !== slot) setDropTarget(slot);
                    }}
                    onDragLeave={() => setDropTarget((t) => (t === slot ? null : t))}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDrop(slot, e.dataTransfer.getData(DRAG_MIME));
                    }}
                    className={`flex h-10 items-center gap-1 rounded border bg-surface pr-1 ${
                      selected ? "border-accent" : dropTarget === slot ? "border-accent/70" : "border-border"
                    }`}
                    style={spec ? { borderLeft: `3px solid ${spec.color}` } : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => onSlotTap(slot)}
                      draggable={!!spec}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: "slot", index: slot } satisfies DragPayload));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      aria-label={spec ? `Group ${g + 1} slot ${m + 1}: ${spec.label}` : `Group ${g + 1} slot ${m + 1}: empty`}
                      aria-pressed={selected}
                      className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-l px-1.5 text-left hover:bg-surface-hover"
                    >
                      {spec ? (
                        <SpecIcon spec={spec} size="h-7 w-7" />
                      ) : (
                        <span className="h-7 w-7 shrink-0 rounded-sm border border-dashed border-border" />
                      )}
                      <span className={`truncate text-xs ${spec ? "text-foreground" : "text-foreground-muted"}`}>
                        {spec ? spec.label : "Empty"}
                      </span>
                    </button>
                    <input
                      value={names[slot]}
                      onChange={(e) => {
                        const v = e.target.value.slice(0, MAX_NAME_LENGTH);
                        setNames((n) => n.map((x, i) => (i === slot ? v : x)));
                      }}
                      maxLength={MAX_NAME_LENGTH}
                      placeholder="Name"
                      aria-label={`Group ${g + 1} slot ${m + 1} player name`}
                      className="h-7 w-20 shrink-0 rounded border border-border bg-background px-1.5 text-xs text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => clearSlot(slot)}
                      disabled={!spec && !names[slot]}
                      aria-label={`Clear group ${g + 1} slot ${m + 1}`}
                      className="flex h-8 w-7 shrink-0 items-center justify-center rounded text-foreground-muted hover:text-foreground disabled:invisible"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>

      <Dialog open={pickerSlot !== null} onClose={() => setPickerSlot(null)} title="Pick a spec">
        <SpecGrid
          specs={specs}
          activeIndex={pickerSlot !== null ? roster[pickerSlot] : 0}
          columns="grid-cols-3"
          onPick={(i) => {
            if (pickerSlot !== null) assign(pickerSlot, i);
            setPickerSlot(null);
          }}
        />
      </Dialog>
    </div>
  );
}

function SpecIcon({ spec, size }: { spec: SpecView; size: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={spec.icon} alt="" className={`${size} shrink-0 rounded-sm`} draggable={false} />
  );
}

function SpecGrid({
  specs,
  activeIndex,
  onPick,
  draggable = false,
  columns,
}: {
  specs: SpecView[];
  activeIndex: number;
  onPick: (index: number) => void;
  draggable?: boolean;
  /** Tailwind grid-cols classes; the dialog is narrow at every viewport. */
  columns: string;
}) {
  const byClass = specs.reduce<SpecView[][]>((acc, s) => {
    const last = acc[acc.length - 1];
    if (last && last[0].classId === s.classId) last.push(s);
    else acc.push([s]);
    return acc;
  }, []);

  return (
    <div className={`grid gap-1.5 ${columns}`}>
      {byClass.map((group) => (
        <div key={group[0].classId} className="rounded border border-border bg-surface/50 p-1" style={{ borderTop: `2px solid ${group[0].color}` }}>
          <div className="mb-1 truncate px-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">{group[0].className}</div>
          <div className="flex justify-between gap-1">
            {group.map((s) => (
              <button
                key={s.index}
                type="button"
                title={s.label}
                aria-label={s.label}
                aria-pressed={activeIndex === s.index}
                onClick={() => onPick(s.index)}
                draggable={draggable}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind: "spec", index: s.index } satisfies DragPayload));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className={`rounded p-0.5 ${activeIndex === s.index ? "bg-accent/30 ring-2 ring-accent" : "hover:bg-surface-hover"}`}
              >
                <SpecIcon spec={s} size="h-8 w-8" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
