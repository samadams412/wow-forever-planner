import locationsData from "@/data/dungeon-locations.json";

export type MapZone = {
  id: string;
  name: string;
  continent: string;
  levelRange: string;
};

export type DungeonPin = {
  dungeonId: string;
  zoneId: string;
  x: number;
  y: number;
};

const zones: Record<string, Omit<MapZone, "id">> = locationsData.zones;
const pins: DungeonPin[] = locationsData.dungeonPins;

export function getMapZone(zoneId: string): MapZone | undefined {
  const zone = zones[zoneId];
  return zone ? { id: zoneId, ...zone } : undefined;
}

export function getDungeonPinsForZone(zoneId: string): DungeonPin[] {
  return pins.filter((p) => p.zoneId === zoneId);
}
