"use client";

import { useEffect, useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { DungeonPinMap as DungeonPinMapData, DungeonMapFloor } from "@/lib/dungeon-loot";

const KIND_RING: Record<DungeonPinMapData["floors"][number]["pins"][number]["kind"], string> = {
  boss: "border-accent",
  rare: "border-[#ff8000]",
  trash: "border-foreground-muted/60",
  entrance: "border-[#8a99ff]",
};

// Which floor (if any) has a pin whose label matches the currently-active
// boss -- used both to auto-select a floor tab and to know which pin to
// highlight on it. Case-insensitive, same matching discipline as the page's
// own anchorForLabel (the pin data and the loot-endpoint boss list are two
// independently-sourced pulls with no shared id).
function floorIndexForLabel(floors: DungeonMapFloor[], label: string | null | undefined): number | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  const idx = floors.findIndex((f) => f.pins.some((p) => p.label?.toLowerCase() === lower));
  return idx === -1 ? null : idx;
}

// foreverchanges.pro's own per-dungeon map with boss/trash/rare/entrance pins
// -- same CSS left/top percent-over-a-flat-image encoding QuestMap.tsx
// already renders Wowhead zone-map quest pins with. A fixed-aspect-ratio box
// (from the image's own native width/height) rather than DungeonMapViewer's
// pan/zoom `object-fit: contain`, deliberately -- contain can letterbox a box
// whose aspect ratio doesn't match the image's, which would throw off these
// percent-positioned pins; matching the box ratio to the image makes the math
// exact with no pan/zoom complexity.
function MapCanvas({
  floor,
  alt,
  activeBossLabel,
  anchorForLabel,
  large,
}: {
  floor: DungeonMapFloor;
  alt: string;
  activeBossLabel?: string | null;
  anchorForLabel?: (label: string) => string | null;
  large?: boolean;
}) {
  const activeLower = activeBossLabel?.toLowerCase();
  return (
    <div
      className={`relative w-full overflow-hidden rounded border border-border bg-black ${large ? "max-h-[70vh]" : ""}`}
      style={{ aspectRatio: `${floor.width} / ${floor.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked remote map art at a fixed native size; see lib/dungeon-loot.ts's DungeonPinMap comment */}
      <img src={floor.src} alt={alt} className="h-full w-full object-contain" />
      {floor.pins.map((pin, i) => {
        const isActive = !!pin.label && pin.label.toLowerCase() === activeLower;
        const anchor = pin.label && pin.kind === "boss" ? anchorForLabel?.(pin.label) ?? null : null;
        const content = (
          <>
            {pin.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- small hotlinked portrait thumbnail, same discipline as BossPortrait.tsx
              <img
                src={pin.portraitUrl}
                alt=""
                className={`h-5 w-5 rounded-full border-2 ${KIND_RING[pin.kind]} bg-surface object-cover sm:h-6 sm:w-6 ${
                  isActive ? "ring-2 ring-accent ring-offset-1 ring-offset-black scale-125" : ""
                }`}
              />
            ) : (
              <span
                className={`block h-3 w-3 rounded-full border-2 ${KIND_RING[pin.kind]} bg-surface sm:h-3.5 sm:w-3.5 ${
                  isActive ? "ring-2 ring-accent ring-offset-1 ring-offset-black scale-125" : ""
                }`}
              />
            )}
            {isActive && pin.label && (
              <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-accent shadow">
                {pin.label}
              </span>
            )}
          </>
        );
        const className = "absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]";
        const style = { left: `${pin.xPct}%`, top: `${pin.yPct}%`, zIndex: isActive ? 10 : undefined };
        return anchor ? (
          <a key={i} href={anchor} title={pin.label ?? undefined} className={className} style={style}>
            {content}
          </a>
        ) : (
          <span key={i} title={pin.label ?? undefined} className={className} style={style}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

function FloorTabs({
  floors,
  activeIndex,
  onSelect,
}: {
  floors: DungeonMapFloor[];
  activeIndex: number;
  onSelect: (i: number) => void;
}) {
  if (floors.length <= 1) return null;
  return (
    <div className="mb-1.5 flex flex-wrap gap-1" role="tablist" aria-label="Dungeon floor">
      {floors.map((f, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={i === activeIndex}
          onClick={() => onSelect(i)}
          className={`rounded border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            i === activeIndex
              ? "border-accent bg-accent/15 text-accent"
              : "border-border text-foreground-muted hover:bg-surface-hover"
          }`}
        >
          {f.name ?? `Floor ${i + 1}`}
        </button>
      ))}
    </div>
  );
}

function Attribution({ attribution }: { attribution: DungeonPinMapData["attribution"] }) {
  return (
    <p className="mt-1 text-center text-[10px] text-foreground-muted/50">
      {attribution ? (
        <>
          Map by{" "}
          <a href={attribution.artistUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground-muted">
            {attribution.artistName}
          </a>
          , used with permission
        </>
      ) : (
        "Map data via the Atlas addon"
      )}
    </p>
  );
}

export default function DungeonPinMap({
  pinMap,
  anchorForLabel,
  activeBossLabel,
}: {
  pinMap: DungeonPinMapData;
  anchorForLabel?: (label: string) => string | null;
  // The currently scroll-active boss (from DungeonJumpNav) -- when it has a
  // pin, that pin is highlighted + labeled and its floor is auto-selected.
  activeBossLabel?: string | null;
}) {
  const [manualFloor, setManualFloor] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const autoFloor = useMemo(() => floorIndexForLabel(pinMap.floors, activeBossLabel), [pinMap.floors, activeBossLabel]);

  // A manual tab click wins until the active boss changes again (e.g. the
  // user keeps scrolling), at which point auto-selection resumes -- adjusted
  // during render (React's documented pattern for resetting state in
  // response to a prop change) rather than in an effect, which would cause
  // an extra commit on every active-boss change.
  const [lastActiveBossLabel, setLastActiveBossLabel] = useState(activeBossLabel);
  if (activeBossLabel !== lastActiveBossLabel) {
    setLastActiveBossLabel(activeBossLabel);
    setManualFloor(null);
  }

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const floorIdx = manualFloor ?? autoFloor ?? 0;
  const floor = pinMap.floors[floorIdx];

  return (
    <div>
      <FloorTabs floors={pinMap.floors} activeIndex={floorIdx} onSelect={setManualFloor} />
      <div className="relative">
        <MapCanvas floor={floor} alt={pinMap.alt} activeBossLabel={activeBossLabel} anchorForLabel={anchorForLabel} />
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="View full screen"
          className="absolute right-1.5 top-1.5 z-10 rounded border border-border bg-surface/90 p-1 text-foreground-muted hover:bg-surface-hover"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <Attribution attribution={pinMap.attribution} />

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setFullscreen(false)}
          role="presentation"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-2 rounded-lg border border-accent/40 bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={pinMap.alt}
          >
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded text-foreground-muted hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <FloorTabs floors={pinMap.floors} activeIndex={floorIdx} onSelect={setManualFloor} />
            <MapCanvas floor={floor} alt={pinMap.alt} activeBossLabel={activeBossLabel} anchorForLabel={anchorForLabel} large />
            <Attribution attribution={pinMap.attribution} />
          </div>
        </div>
      )}
    </div>
  );
}
