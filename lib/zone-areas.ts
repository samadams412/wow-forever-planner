import fs from "fs";
import path from "path";

// Reads public/map/<continent>/{zones.json,zone-areas.json} (built by
// scripts/build-zone-areas.js -- data-only, never touched by this render
// work) and merges them into one per-zone shape the map component can
// render directly: polygon geometry plus the label metadata that goes with
// it. Server-only (fs) -- read once per page render, passed to the client
// map component as plain serializable props.

export type ZoneAreaGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export type ZoneFaction = "alliance" | "horde" | "contested";

export type ZoneAreaData = {
  areaId: number;
  name: string;
  // [min, max] -- merged in from data/zone-levels.json by
  // scripts/build-map-zones.js; a zone the source text gives no number for
  // (cities, sanctuaries, etc.) stays null. Rendering branches on this
  // being non-null either way.
  levelRange: [number, number] | null;
  // Real AreaTable.FactionGroupMask (0/2/4), not a guess -- see
  // scripts/build-map-zones.js's own factionFor() and CLAUDE.md's "Zone
  // territory" session note for how this was found and verified.
  faction: ZoneFaction;
  labelAnchor: [number, number] | null; // [worldX, worldY]
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
  geometry: ZoneAreaGeometry;
};

type ZoneMetaRow = {
  areaId: number;
  name: string;
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
  levelRange: [number, number] | null;
  faction: ZoneFaction;
  labelAnchor: [number, number] | null;
};

type ZoneAreaFeature = {
  type: "Feature";
  properties: { areaId: number; name: string };
  geometry: ZoneAreaGeometry;
};

export function getZoneAreaData(continentId: string): ZoneAreaData[] {
  const zonesPath = path.join(process.cwd(), "public", "map", continentId, "zones.json");
  const areasPath = path.join(process.cwd(), "public", "map", continentId, "zone-areas.json");
  const zones = JSON.parse(fs.readFileSync(zonesPath, "utf8")) as ZoneMetaRow[];
  const areas = JSON.parse(fs.readFileSync(areasPath, "utf8")) as Record<string, ZoneAreaFeature>;

  const out: ZoneAreaData[] = [];
  for (const zone of zones) {
    const feature = areas[String(zone.areaId)];
    if (!feature) continue; // a zone with zero chunks in this build (see build-zone-areas.js's own report) has no polygon to draw
    out.push({
      areaId: zone.areaId,
      name: zone.name,
      levelRange: zone.levelRange,
      faction: zone.faction,
      labelAnchor: zone.labelAnchor,
      worldBounds: zone.worldBounds,
      geometry: feature.geometry,
    });
  }
  return out;
}
