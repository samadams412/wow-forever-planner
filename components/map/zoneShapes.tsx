// Hand-drawn, deliberately simplified zone outlines for the world map MVP --
// originally-produced art for this site, not a photoreal terrain recreation
// and not traced from any real map (foreverchanges.pro's tiles included, or
// Wowhead's zone map viewer, which was only consulted for real-world
// proportions/layout while drawing these, never as something to copy).
// Each shape is a loose, stylized abstraction of the zone's real-world
// silhouette, good enough to orient a handful of pins on, nothing more. Add
// one entry per zone as the map feature grows -- see
// data/dungeon-locations.json's own note on what else a new zone needs.
export type ZoneShape = {
  viewBox: string;
  /** Outer canyon-rim / landmass outline, as an SVG path `d` string. */
  land: string;
  /** Landmass gradient stops -- defaults to a green-brown parchment tone in ZoneMap.tsx if omitted. */
  landColors?: { from: string; to: string };
  /** Optional inset valley-floor shape layered on top of `land`, for a rim-vs-floor color break instead of one flat fill. */
  innerLand?: { d: string; colors: { from: string; to: string } };
  /** Optional thin stroked path (a dry wash, river, or similar) drawn over everything else for texture. */
  wash?: { d: string; color: string };
  /** Optional lake/sea cutout drawn on top of the landmass. */
  water?: { cx: number; cy: number; rx: number; ry: number };
};

export const ZONE_SHAPES: Record<string, ZoneShape> = {
  // Real Badlands is a sunken red-rock canyon ringed by higher, darker
  // cliffs -- referenced only for that general layout (a rim around a
  // lower basin, no central lake) via real screenshots and Wowhead's zone
  // map, not traced. `land` is the outer cliff rim (irregular, mixed
  // curves/straight edges rather than a smooth blob); `innerLand` is a
  // paler inset basin for a rim-vs-floor color break; `wash` is a thin dry
  // riverbed line for texture, matching the zone's canyon-floor washes.
  badlands: {
    viewBox: "0 0 480 320",
    // Angular, irregular canyon rim -- varying protrusion depth on purpose
    // (a first pass with uniform rounded bumps read as a scalloped
    // cloud/flower shape, not rock; sharp uneven vertices read as eroded
    // mesa edges instead).
    land: "M60,120 L90,80 L130,95 L150,60 L200,50 L230,75 L270,55 L320,70 L360,50 L400,90 L430,130 L410,180 L440,210 L420,260 L370,280 L330,255 L290,290 L240,270 L190,295 L150,265 L100,275 L70,230 L90,190 L50,170 Z",
    landColors: { from: "#8a4a2c", to: "#3c1f10" },
    innerLand: {
      d: "M130,145 L155,115 L185,125 L205,100 L240,95 L260,115 L295,100 L325,115 L350,100 L375,130 L390,155 L375,190 L395,210 L380,235 L345,250 L320,235 L290,255 L255,240 L220,258 L190,240 L160,245 L140,215 L155,195 L125,180 Z",
      colors: { from: "#c07a45", to: "#8a4a2c" },
    },
    wash: { d: "M110,205 C150,195 180,215 210,200 C240,185 270,205 300,190 C330,178 360,195 385,182", color: "#3c1f10" },
  },
};
