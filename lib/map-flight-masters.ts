import rawFlightMastersData from "@/data/map-pois/flight-masters.json";

// data/map-pois/flight-masters.json is already map-ready (real world
// position, resolved faction, a continent slug matching this project's own
// eastern-kingdoms/kalimdor convention) -- see scripts/build-flight-
// masters.js's own header comment for how Flags/MountCreatureID were used
// to derive faction and which nodes were excluded and why. No further
// resolution/grouping step is needed here, unlike lib/map-entrances.ts
// (which resolves against dungeons.json/raids.json/battlegrounds.json and
// groups nearby entrances) -- this is a thin, continent-filtering reader.

export type FlightMasterFaction = "Alliance" | "Horde" | "Both";

export type FlightMaster = {
  id: string;
  name: string;
  continent: string;
  worldPosition: { x: number; y: number };
  faction: FlightMasterFaction;
  source: string;
};

const allFlightMasters = rawFlightMastersData.flightMasters as FlightMaster[];

export function getFlightMasters(continentId: string): FlightMaster[] {
  return allFlightMasters.filter((f) => f.continent === continentId);
}
