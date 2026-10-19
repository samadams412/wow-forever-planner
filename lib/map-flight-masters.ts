import rawFlightMastersData from "@/data/map-pois/flight-masters.json";
import type { MapPoi, PoiFaction } from "./map-layers";

// data/map-pois/flight-masters.json is already map-ready (real world
// position, resolved faction, a continent slug matching this project's own
// eastern-kingdoms/kalimdor convention) -- see scripts/build-flight-
// masters.js's own header comment for how Flags/MountCreatureID were used
// to derive faction and which nodes were excluded and why. No further
// resolution/grouping step is needed here, unlike lib/map-entrances.ts
// (which resolves against dungeons.json/raids.json/battlegrounds.json and
// groups nearby entrances) -- this is a thin, continent-filtering reader
// onto the generic MapPoi shape (see lib/map-layers.ts).

type RawFlightMaster = {
  id: string;
  name: string;
  continent: string;
  worldPosition: { x: number; y: number };
  faction: PoiFaction;
  source: string;
};

const allFlightMasters = rawFlightMastersData.flightMasters as RawFlightMaster[];

export function getFlightMasterPois(continentId: string): MapPoi[] {
  return allFlightMasters
    .filter((f) => f.continent === continentId)
    .map((f) => ({
      id: f.id,
      layer: "flightMasters",
      name: f.name,
      kindLabel: `${f.faction} flight master`,
      faction: f.faction,
      worldPosition: f.worldPosition,
      source: f.source,
    }));
}
