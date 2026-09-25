import Link from "next/link";
import { DoorOpen } from "lucide-react";

// Plain hover tooltip via group-hover CSS -- no client JS needed for this
// alone. Positioned by percent so it stays put regardless of the SVG's
// rendered size (the parent in ZoneMap.tsx is position:relative around the
// same box the SVG fills). The whole marker is a Link to that dungeon's
// existing loot page -- there's no separate "dungeon entrance" page of its
// own to send it to.
export default function DungeonPinMarker({
  x,
  y,
  dungeonId,
  name,
  levelRange,
}: {
  x: number;
  y: number;
  dungeonId: string;
  name: string;
  levelRange: string;
}) {
  return (
    <Link
      href={`/reference/dungeons/loot/${dungeonId}`}
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`${name} loot and quests`}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-background text-accent shadow-[0_0_6px_rgba(0,0,0,0.6)] transition-transform group-hover:scale-110">
        <DoorOpen className="h-3.5 w-3.5" />
      </div>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-[11px] shadow-lg group-hover:block">
        <div className="font-medium text-accent">{name}</div>
        <div className="text-foreground-muted">Level {levelRange}</div>
      </div>
    </Link>
  );
}
