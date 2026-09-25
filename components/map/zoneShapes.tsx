// Hand-drawn, deliberately simplified zone outlines for the world map MVP --
// originally-produced art for this site, not a photoreal terrain recreation
// and not traced from any real map (foreverchanges.pro's tiles included).
// Each shape is a loose, stylized abstraction of the zone's real-world
// silhouette, good enough to orient a handful of pins on, nothing more. Add
// one entry per zone as the map feature grows -- see
// data/dungeon-locations.json's own note on what else a new zone needs.
export type ZoneShape = {
  viewBox: string;
  /** Landmass outline, as an SVG path `d` string. */
  land: string;
  /** Landmass gradient stops -- defaults to a green-brown parchment tone in ZoneMap.tsx if omitted. */
  landColors?: { from: string; to: string };
  /** Optional lake/sea cutout drawn on top of the landmass. */
  water?: { cx: number; cy: number; rx: number; ry: number };
};

export const ZONE_SHAPES: Record<string, ZoneShape> = {
  // Quick corrected shape after the Loch Modan/Uldaman mispairing -- a
  // jagged canyon outline instead of Loch Modan's smooth lake-blob, since
  // Badlands has no comparable central lake. Detail pass (terrain-color
  // variation between canyon rim and valley floor) is a follow-up commit,
  // not done here -- this one is scoped to "correct zone, right away".
  badlands: {
    viewBox: "0 0 480 320",
    land: "M60,120 L90,80 L130,95 L150,60 L200,50 L230,75 L270,55 L320,70 L360,50 L400,90 L430,130 L410,180 L440,210 L420,260 L370,280 L330,255 L290,290 L240,270 L190,295 L150,265 L100,275 L70,230 L90,190 L50,170 Z",
    landColors: { from: "#8a4a2c", to: "#4a2416" },
  },
};
