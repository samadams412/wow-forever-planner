import locationsData from "@/data/dungeon-locations.json";

export type MapZone = {
  id: string;
  name: string;
  continent: string;
  levelRange: string;
};

// Which version of the game a pin should show up under -- "both" for
// content unchanged since Classic (the common case so far: every dungeon
// currently in this file is a "classic"-type dungeon per data/dungeons.json,
// so every pin is "both" today). Feeds the Classic/Forever map toggle in
// components/map/WorldMapZone.tsx.
export type MapVariant = "classic" | "forever";

export type DungeonPin = {
  dungeonId: string;
  zoneId: string;
  x: number;
  y: number;
  appearsIn: MapVariant | "both";
};

const zones: Record<string, Omit<MapZone, "id">> = locationsData.zones;
// JSON.parse's inferred type widens "appearsIn" to plain string -- cast
// once here rather than losing the union everywhere this is consumed.
const pins: DungeonPin[] = locationsData.dungeonPins as DungeonPin[];

export function getMapZone(zoneId: string): MapZone | undefined {
  const zone = zones[zoneId];
  return zone ? { id: zoneId, ...zone } : undefined;
}

export function getDungeonPinsForZone(zoneId: string): DungeonPin[] {
  return pins.filter((p) => p.zoneId === zoneId);
}
