export type DungeonMapMarker = { marker: string; label: string; color: string };

// Shared between the sidebar's inline map and the full-screen DungeonMapModal.
// Markers/labels/colors come from lib/dungeon-map-legends.generated.ts
// (parsed from the Atlas addon's own numbering and color-coding) -- the
// same numbers/letters baked into the map image itself, not an overlay
// this component draws. Color matches Atlas's own convention (blue =
// entrance/transition, white = boss, orange = rare/optional, green =
// quest giver/flavor) so a marker here reads the same way it does in-game.
export default function DungeonMapLegend({ markers, className = "" }: { markers: DungeonMapMarker[]; className?: string }) {
  return (
    <ul className={`grid grid-cols-1 gap-x-3 gap-y-0.5 text-xs text-foreground-muted ${className}`}>
      {markers.map((m, i) => (
        <li key={`${m.marker}-${i}`} className="flex gap-1.5">
          <span className="w-5 shrink-0 text-right font-semibold" style={{ color: m.color }}>
            {m.marker}
          </span>
          <span>{m.label}</span>
        </li>
      ))}
    </ul>
  );
}
