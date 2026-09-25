"use client";

import { useState } from "react";
import ZoneMap from "./ZoneMap";
import DungeonPinMarker from "./DungeonPinMarker";
import type { MapVariant } from "@/lib/dungeon-locations";

export type ZonePinInfo = {
  dungeonId: string;
  x: number;
  y: number;
  appearsIn: MapVariant | "both";
  name: string;
  levelRange: string;
};

const VARIANTS: { value: MapVariant; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "forever", label: "Forever" },
];

// Classic/Forever toggle for a zone's pin set, same segmented-control
// convention as SpellbookBook.tsx's view/filter buttons (inline-flex rounded
// border, bg-accent/20 active state) rather than inventing a new toggle
// style. Defaults to "forever" -- this is a WoW Forever site first.
//
// Badlands/Uldaman has nothing to actually toggle yet (Uldaman is an
// unchanged classic dungeon, appearsIn: "both"), so right now this always
// shows the same pin either way -- the mechanism is built and wired up for
// whenever a zone gets a pin that genuinely differs between the two, not
// deferred until then.
export default function WorldMapZone({
  zoneId,
  zoneName,
  levelRange,
  pins,
}: {
  zoneId: string;
  zoneName: string;
  levelRange: string;
  pins: ZonePinInfo[];
}) {
  const [variant, setVariant] = useState<MapVariant>("forever");
  const visiblePins = pins.filter((p) => p.appearsIn === "both" || p.appearsIn === variant);
  const isNoop = pins.length > 0 && visiblePins.length === pins.length;

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded border border-border bg-surface p-0.5 text-xs">
          {VARIANTS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setVariant(value)}
              aria-pressed={variant === value}
              className={`rounded-sm px-2 py-1 transition-colors ${
                variant === value ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ZoneMap zoneId={zoneId} zoneName={zoneName} levelRange={levelRange}>
        {visiblePins.map((pin) => (
          <DungeonPinMarker
            key={pin.dungeonId}
            x={pin.x}
            y={pin.y}
            dungeonId={pin.dungeonId}
            name={pin.name}
            levelRange={pin.levelRange}
          />
        ))}
      </ZoneMap>
      {isNoop && (
        <p className="mt-2 text-[11px] text-foreground-muted">
          Nothing in {zoneName} currently differs between Classic and Forever, so this toggle has no visible effect
          here yet -- it&apos;s wired up for zones that do.
        </p>
      )}
    </div>
  );
}
