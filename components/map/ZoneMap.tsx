import { ZONE_SHAPES } from "./zoneShapes";

// Renders one zone's simplified, hand-drawn shape (see zoneShapes.tsx) inside
// a card matching the site's other reference cards. Deliberately not a
// Leaflet map: there's no real tile pyramid here, just one small stylized
// SVG per zone, so a tiling/zoom library would add a dependency and client
// JS for a problem plain SVG + CSS already solves. See the world-map
// architecture note in CLAUDE.md for the full reasoning.
export default function ZoneMap({
  zoneId,
  zoneName,
  levelRange,
  children,
}: {
  zoneId: string;
  zoneName: string;
  levelRange: string;
  children?: React.ReactNode;
}) {
  const shape = ZONE_SHAPES[zoneId];
  if (!shape) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-wide text-accent">{zoneName}</h2>
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground-muted">
          Level {levelRange}
        </span>
      </div>
      <div className="relative w-full overflow-hidden rounded-md border border-border/60 bg-background">
        <svg viewBox={shape.viewBox} className="h-auto w-full" role="img" aria-label={`${zoneName} map`}>
          <defs>
            <radialGradient id={`land-${zoneId}`} cx="35%" cy="30%" r="80%">
              <stop offset="0%" stopColor={shape.landColors?.from ?? "#5a4a2c"} />
              <stop offset="100%" stopColor={shape.landColors?.to ?? "#382d1c"} />
            </radialGradient>
            {shape.innerLand && (
              <radialGradient id={`inner-${zoneId}`} cx="40%" cy="35%" r="75%">
                <stop offset="0%" stopColor={shape.innerLand.colors.from} />
                <stop offset="100%" stopColor={shape.innerLand.colors.to} />
              </radialGradient>
            )}
          </defs>
          <path d={shape.land} fill={`url(#land-${zoneId})`} stroke="#c9a961" strokeWidth={2} strokeOpacity={0.7} />
          {shape.innerLand && (
            <path
              d={shape.innerLand.d}
              fill={`url(#inner-${zoneId})`}
              stroke="#c9a961"
              strokeWidth={1}
              strokeOpacity={0.35}
            />
          )}
          {shape.wash && (
            <path
              d={shape.wash.d}
              fill="none"
              stroke={shape.wash.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeOpacity={0.55}
            />
          )}
          {shape.water && (
            <ellipse
              cx={shape.water.cx}
              cy={shape.water.cy}
              rx={shape.water.rx}
              ry={shape.water.ry}
              fill="#233b3d"
              stroke="#c9a961"
              strokeWidth={1}
              strokeOpacity={0.4}
            />
          )}
        </svg>
        {children}
      </div>
    </div>
  );
}
