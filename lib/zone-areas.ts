import { MAP_DATA } from "./map-data.generated";

// Reads data/map/<continent>/{zones.json,zone-areas.json} (static imports via lib/map-data.generated.ts) (built by
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

// Flat areaId -> zone name across every registered continent's zones.json,
// for callers that just need a human name for a zone id (e.g. quest
// listings) and don't care which continent it's on or about its geometry.
// Built once; MAP_DATA is a small static import (not a per-request file
// read), so this is cheap to rebuild per cold start.
let zoneNameById: Map<number, string> | null = null;
export function getZoneName(areaId: number): string | null {
  if (!zoneNameById) {
    zoneNameById = new Map();
    for (const entry of Object.values(MAP_DATA)) {
      for (const zone of entry.zones as { areaId: number; name: string }[]) {
        zoneNameById.set(zone.areaId, zone.name);
      }
    }
  }
  return zoneNameById.get(areaId) ?? null;
}

// areaId -> which continent key (MAP_DATA's own keys, same as the
// /reference/map/[continent] route param) a zone lives on -- for building a
// "view this zone on the map" link (e.g. from the quest detail page) without
// the caller needing to know the continent itself. Same lazy-build-once
// pattern as getZoneName above.
let continentByZoneId: Map<number, string> | null = null;
export function getContinentForZone(areaId: number): string | null {
  if (!continentByZoneId) {
    continentByZoneId = new Map();
    for (const [continentId, entry] of Object.entries(MAP_DATA)) {
      for (const zone of entry.zones as { areaId: number }[]) {
        continentByZoneId.set(zone.areaId, continentId);
      }
    }
  }
  return continentByZoneId.get(areaId) ?? null;
}

export function getZoneAreaData(continentId: string): ZoneAreaData[] {
  const entry = MAP_DATA[continentId];
  if (!entry) throw new Error(`No map data for continent ${continentId}`);
  const zones = entry.zones as unknown as ZoneMetaRow[];
  const areas = entry.areas as unknown as Record<string, ZoneAreaFeature>;

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
