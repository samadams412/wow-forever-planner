"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Dialog from "@/components/site/Dialog";
import CoveragePanel from "@/components/raid-comp/CoveragePanel";
import StackingRules from "@/components/raid-comp/StackingRules";
import HowToUse from "@/components/raid-comp/HowToUse";
import { deleteSavedRoster, getSavedRosters, saveRoster, type SavedRoster } from "@/lib/saved-rosters";
import {
  GROUP_SIZE,
  RAID_SIZES,
  MAX_NAME_LENGTH,
  cleanName,
  decodeNames,
  decodeRoster,
  decodeSize,
  rosterQuery,
  computeCoverage,
  perCasterShortfalls,
  roleCounts,
  roleHints,
  emptyNames,
  emptyRoster,
  swapSlots,
  type EffectSet,
  type EffectView,
  type RaidSize,
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
const RULES_OPEN_KEY = "forevercraft:raid-comp-rules-open";

export default function RaidCompPlanner({
  specs,
  effects,
  onlyOneCounts,
  perCaster,
  build,
  initialRoster,
  initialNames,
  help,
  initialSize = 40,
}: {
  specs: SpecView[];
  effects: EffectView[];
  onlyOneCounts: EffectSet[];
  perCaster: EffectSet[];
  build: string;
  initialRoster?: Roster;
  initialNames?: string[];
  initialSize?: RaidSize;
  /** Server-rendered how-to copy, shown behind the "?" (kept in the static HTML for SEO). */
  help: ReactNode;
}) {
  // Initial values only: later URL changes come from this component itself.
  const [roster, setRoster] = useState<Roster>(() => initialRoster ?? emptyRoster());
  const [names, setNames] = useState<string[]>(() => initialNames ?? emptyNames());
  // Smaller sizes hide groups, they don't clear them: roster/names always
  // hold all 40 slots, and everything below works on the visible `active` slice.
  const [size, setSize] = useState<RaidSize>(initialSize);
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [rosterName, setRosterName] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [myRostersOpen, setMyRostersOpen] = useState(false);
  const [savedRosters, setSavedRosters] = useState<SavedRoster[]>([]);
  // Stacking rules start collapsed; the viewer's choice is remembered per browser.
  const [rulesOpen, setRulesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const specsRef = useRef<HTMLElement>(null);

  // Publish the sticky specs bar's height (it wraps differently per width) as --specs-h.
  useEffect(() => {
    const bar = specsRef.current;
    if (!bar) return;
    const ro = new ResizeObserver(() => {
      rootRef.current?.style.setProperty("--specs-h", `${bar.offsetHeight}px`);
    });
    ro.observe(bar);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // localStorage isn't available during prerender: start empty/collapsed, sync once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedRosters(getSavedRosters());
    try {
      setRulesOpen(window.localStorage.getItem(RULES_OPEN_KEY) === "1");
    } catch {
      // storage blocked: stays collapsed
    }
  }, []);

  const toggleRules = (open: boolean) => {
    setRulesOpen(open);
    try {
      window.localStorage.setItem(RULES_OPEN_KEY, open ? "1" : "0");
    } catch {
      // not persisted this time; the in-memory state still applies
    }
  };

  useEffect(() => {
    // replaceState, not router.replace: a pure address-bar sync, no re-render
    // or refetch of the (static) page. See PlannerClient for the same call.
    window.history.replaceState(null, "", `${window.location.pathname}${rosterQuery(roster, names, size)}`);
  }, [roster, names, size]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; the address bar already holds the link
    }
  };

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

  const confirmSave = () => {
    const name = rosterName.trim();
    if (!name) return;
    if (!saveRoster({ name, query: rosterQuery(roster, names, size).slice(1) })) return setSaveError(true);
    setSavedRosters(getSavedRosters());
    setSaveDialogOpen(false);
  };

  const loadRoster = (saved: SavedRoster) => {
    const q = new URLSearchParams(saved.query);
    setRoster(decodeRoster(q.get("r")));
    setNames(decodeNames(q.get("n")));
    setSize(decodeSize(q.get("s")));
    setArmed(0);
    setSelectedSlot(null);
    setMyRostersOpen(false);
  };

  const reset = () => {
    setRoster(emptyRoster());
    setNames(emptyNames());
    setArmed(0);
    setSelectedSlot(null);
  };

  const changeSize = (next: RaidSize) => {
    setSize(next);
    setSelectedSlot((s) => (s !== null && s >= next ? null : s));
  };

  const active = useMemo(() => roster.slice(0, size), [roster, size]);
  const coverage = useMemo(() => computeCoverage(active, effects), [active, effects]);
  const classes = useMemo(() => Object.fromEntries(specs.map((s) => [s.classId, { name: s.className, color: s.color }])), [specs]);
  const shortfalls = useMemo(
    () => perCasterShortfalls(active, effects, coverage, perCaster, Object.fromEntries(specs.map((s) => [s.classId, s.className]))),
    [active, effects, coverage, perCaster, specs],
  );
  const groupBuffs = effects.filter((e) => e.scope === "group");
  // Caster-limit notes plus "only one counts" sets the roster doubles up on.
  const activeRules =
    shortfalls.length +
    onlyOneCounts.filter((set) => effects.filter((e) => e.onlyOneCounts === set.id && coverage[e.id].covered).length > 1).length;
  const roles = roleCounts(active);
  const hints = roleHints(roles);

  // Generic role icons borrowed from spec icons: Protection Warrior, Restoration Druid, Fury Warrior.
  const roleIcon = (classId: string, tree: string) => specs.find((s) => s.classId === classId && s.tree === tree);
  const armedSpec = armed ? specs[armed - 1] : undefined;
  const filled = active.filter(Boolean).length;
  const hidden = roster.slice(size).filter(Boolean).length;

  return (
    <div ref={rootRef} className="mt-4 flex flex-col gap-4 pb-16">
      {/* Sticky so specs stay reachable while placing into the bottom groups. Below sm it's
          trimmed (no visible heading, smaller icons) since its 3 rows take a big share of a phone
          screen. Its height is published as --specs-h so sticky columns and scroll targets sit below it. */}
      <section
        ref={specsRef}
        aria-label="Specs"
        className="sticky top-0 z-20 -mx-3 border-b border-border bg-background/95 px-3 py-1.5 backdrop-blur sm:-mx-4 sm:px-4 sm:py-2"
      >
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 sm:mb-2">
          <h2 className="sr-only text-sm font-medium text-foreground sm:not-sr-only">Specs</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Raid size</span>
              <select
                value={size}
                onChange={(e) => changeSize(decodeSize(e.target.value))}
                className="rounded border border-border bg-surface px-1.5 py-1 text-xs text-foreground focus:border-accent focus:outline-none"
              >
                {RAID_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}-man
                  </option>
                ))}
              </select>
            </label>
            <span>
              {filled} / {size} players
              {hidden > 0 && <span title="Kept for when you switch back to a bigger size"> (+{hidden} hidden)</span>}
            </span>
            <button
              type="button"
              onClick={copyLink}
              disabled={filled === 0}
              className="rounded border border-accent/60 px-2 py-1 text-foreground hover:bg-surface-hover disabled:opacity-40"
            >
              {copied ? "Link copied" : "Share"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRosterName("");
                setSaveError(false);
                setSaveDialogOpen(true);
              }}
              disabled={filled === 0}
              title={filled === 0 ? "Place at least one spec to save a roster" : undefined}
              className="rounded border border-border px-2 py-1 hover:border-accent/60 hover:text-foreground disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setMyRostersOpen(true)}
              className="rounded border border-border px-2 py-1 hover:border-accent/60 hover:text-foreground"
            >
              My Rosters{savedRosters.length > 0 ? ` (${savedRosters.length})` : ""}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={filled === 0}
              className="rounded border border-border px-2 py-1 hover:border-accent/60 hover:text-foreground disabled:opacity-40"
            >
              Reset
            </button>
            <HowToUse>{help}</HowToUse>
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
          compact
          columns="grid-cols-3 sm:grid-cols-5 lg:grid-cols-9"
        />
      </section>

      <section aria-label="Role summary" className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5 text-xs">
          <RoleChip label="Tanks" count={roles.tank} flex={roles.flex} spec={roleIcon("warrior", "Protection")} />
          <RoleChip label="Healers" count={roles.healer} spec={roleIcon("druid", "Restoration")} />
          <RoleChip label="DPS" count={roles.dps} flex={roles.flex} spec={roleIcon("warrior", "Fury")} />
          {/* Up here so it's findable at every width; the section itself sits beside or below the groups. */}
          <button
            type="button"
            onClick={() => {
              toggleRules(!rulesOpen);
              // Below xl the section opens far down the page (under the groups / coverage): bring it into view.
              if (!rulesOpen && !window.matchMedia("(min-width: 80rem)").matches) {
                requestAnimationFrame(() => document.getElementById("stacking-rules")?.scrollIntoView({ behavior: "smooth", block: "start" }));
              }
            }}
            aria-expanded={rulesOpen}
            aria-controls="stacking-rules"
            className="ml-auto rounded border border-accent/40 px-2 py-1 text-accent hover:border-accent hover:bg-surface-hover"
          >
            Stacking rules{activeRules > 0 ? ` · ${activeRules} active` : ""} {rulesOpen ? "▴" : "▾"}
          </button>
        </div>
        {hints.map((h) => (
          <p key={h} className="text-xs text-foreground-muted">
            <span className="text-accent">Heads up:</span> {h}
          </p>
        ))}
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

      <div className={`flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start ${rulesOpen ? "xl:grid-cols-[minmax(0,1fr)_20rem_17rem]" : ""}`}>
      <section aria-label="Raid groups" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: size / GROUP_SIZE }, (_, g) => (
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
                        const v = cleanName(e.target.value);
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
            <GroupBuffIcons effects={groupBuffs.filter((e) => coverage[e.id].groups.includes(g))} />
          </div>
        ))}
      </section>
      <div className="scrollbar-gold lg:sticky lg:top-[calc(var(--specs-h,0px)+1rem)] lg:max-h-[calc(100vh-var(--specs-h,0px)-2rem)] lg:overflow-y-auto">
        <CoveragePanel effects={effects} coverage={coverage} build={build} />
      </div>
      {/* Its own column on xl; below the groups on lg; last on phones, so it never pushes coverage down.
          Collapsed = not rendered, so xl drops back to two columns. */}
      {rulesOpen && (
        <div className="scrollbar-gold xl:sticky xl:top-[calc(var(--specs-h,0px)+1rem)] xl:max-h-[calc(100vh-var(--specs-h,0px)-2rem)] xl:overflow-y-auto">
          <StackingRules
            effects={effects}
            coverage={coverage}
            shortfalls={shortfalls}
            onlyOneCounts={onlyOneCounts}
            classes={classes}
            onHide={() => toggleRules(false)}
          />
        </div>
      )}
      </div>

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

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} title="Save roster">
        <p className="text-xs text-foreground-muted">
          Saved to this browser only -- not synced across devices, and cleared if you clear site data.
        </p>
        <input
          type="text"
          value={rosterName}
          onChange={(e) => setRosterName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirmSave()}
          placeholder="e.g. Molten Core week 1"
          autoFocus
          className="mt-3 w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        />
        {saveError && (
          <p className="mt-2 text-xs text-red-400">Couldn&apos;t save -- your browser&apos;s storage may be full or unavailable.</p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSaveDialogOpen(false)}
            className="rounded border border-border px-3 py-1 text-xs text-foreground-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmSave}
            disabled={!rosterName.trim()}
            className="rounded border border-accent/60 px-3 py-1 text-xs text-accent hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </Dialog>

      <Dialog open={myRostersOpen} onClose={() => setMyRostersOpen(false)} title="My Rosters">
        <p className="text-xs text-foreground-muted">Saved to this browser only -- not synced across devices.</p>
        {savedRosters.length === 0 ? (
          <p className="mt-3 text-sm text-foreground-muted">No saved rosters yet.</p>
        ) : (
          <ul className="scrollbar-gold mt-3 max-h-80 cursor-default space-y-2 overflow-y-auto">
            {savedRosters.map((saved) => (
              <li key={saved.id} className="flex items-center gap-2 rounded border border-border bg-background/40 p-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{saved.name}</div>
                  <div className="truncate text-xs text-foreground-muted">
                    {decodeSize(new URLSearchParams(saved.query).get("s"))}-man ·{" "}
                    {decodeRoster(new URLSearchParams(saved.query).get("r")).filter(Boolean).length} players ·{" "}
                    {new Date(saved.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => loadRoster(saved)}
                  className="shrink-0 rounded border border-accent/60 px-2 py-1 text-xs text-accent hover:bg-surface-hover"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteSavedRoster(saved.id);
                    setSavedRosters(getSavedRosters());
                  }}
                  aria-label={`Delete ${saved.name}`}
                  className="shrink-0 rounded border border-border px-2 py-1 text-xs text-foreground-muted hover:border-red-400/60 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

// Feral Druids can tank or DPS, so they show as "+N Feral" on both chips
// rather than being forced into one count.
function RoleChip({ label, count, flex = 0, spec }: { label: string; count: number; flex?: number; spec?: SpecView }) {
  return (
    <span className="flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1 text-foreground">
      {spec && <SpecIcon spec={spec} size="h-4 w-4" />}
      {label} <span className="font-semibold">{count}</span>
      {flex > 0 && <span className="text-foreground-muted"> +{flex} Feral</span>}
    </span>
  );
}

function GroupBuffIcons({ effects }: { effects: EffectView[] }) {
  return (
    <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-1 px-1" aria-label="Group buffs in this group">
      {effects.length === 0 ? (
        <span className="text-[10px] text-foreground-muted/70">No group buffs</span>
      ) : (
        effects.map((e) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={e.id} src={e.icon} alt={e.name} title={e.name} className="h-5 w-5 rounded-sm" />
        ))
      )}
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
  compact = false,
  columns,
}: {
  specs: SpecView[];
  activeIndex: number;
  onPick: (index: number) => void;
  draggable?: boolean;
  /** Palette in the sticky bar: tighter below sm so the bar takes less of a phone screen. */
  compact?: boolean;
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
    <div className={`grid ${compact ? "gap-1 sm:gap-1.5" : "gap-1.5"} ${columns}`}>
      {byClass.map((group) => (
        <div key={group[0].classId} className="rounded border border-border bg-surface/50 p-1" style={{ borderTop: `2px solid ${group[0].color}` }}>
          <div className={`${compact ? "mb-0.5 sm:mb-1" : "mb-1"} truncate px-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted`}>{group[0].className}</div>
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
                <SpecIcon spec={s} size={compact ? "h-7 w-7 sm:h-8 sm:w-8" : "h-8 w-8"} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
