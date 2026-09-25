// Hand-drawn, deliberately simplified zone outlines for the world map MVP --
// originally-produced art for this site, not a photoreal terrain recreation
// and not traced from any real map (foreverchanges.pro's tiles included).
// Each shape is a loose, stylized abstraction of the zone's real-world
// silhouette (e.g. Loch Modan's defining central lake), good enough to
// orient a handful of pins on, nothing more. Add one entry per zone as the
// map feature grows -- see data/dungeon-locations.json's own note on what
// else a new zone needs.
export type ZoneShape = {
  viewBox: string;
  /** Landmass outline, as an SVG path `d` string. */
  land: string;
  /** Optional lake/sea cutout drawn on top of the landmass. */
  water?: { cx: number; cy: number; rx: number; ry: number };
};

export const ZONE_SHAPES: Record<string, ZoneShape> = {
  "loch-modan": {
    viewBox: "0 0 480 320",
    land: "M70,50 C30,90 15,170 45,225 C75,280 165,300 245,292 C325,284 405,270 435,220 C462,175 452,105 402,65 C352,25 265,12 185,18 C125,22 100,15 70,50 Z",
    water: { cx: 245, cy: 160, rx: 95, ry: 55 },
  },
};
