import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "leaflet/dist/leaflet.css";
import MapExplorer from "@/components/map/MapExplorer";
import {
  getContinentMapConfig,
  getRegisteredContinentIds,
  getRegisteredContinents,
  isRegisteredContinent,
} from "@/lib/map-continents";
import { getZoneAreaData } from "@/lib/zone-areas";
import { getEntranceMarkers } from "@/lib/map-entrances";
import { getFlightMasters } from "@/lib/map-flight-masters";

// Real tiled continent map (wow.export-extracted client art, sliced by
// scripts/slice-map-tiles.js), not the earlier proof-of-concept crop.
// Deliberately per-continent config driven (lib/map-continents.ts) rather
// than hardcoded constants. Not linked from nav/index, same "reachable but
// not advertised" treatment prior map-feature previews got.
export function generateStaticParams() {
  return getRegisteredContinentIds().map((continent) => ({ continent }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ continent: string }>;
}): Promise<Metadata> {
  const { continent } = await params;
  if (!isRegisteredContinent(continent)) return {};
  const config = getContinentMapConfig(continent);
  return {
    title: `${config.name} Map (proof of concept)`,
    description: `A tiled map of ${config.name}, extracted from the WoW Forever beta client via wow.export.`,
    robots: { index: false, follow: false },
  };
}

export default async function ContinentMapPage({ params }: { params: Promise<{ continent: string }> }) {
  const { continent } = await params;
  if (!isRegisteredContinent(continent)) notFound();

  const config = getContinentMapConfig(continent);
  const zoneAreas = getZoneAreaData(continent);
  const entrances = getEntranceMarkers(continent);
  const flightMasters = getFlightMasters(continent);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{config.name}</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        A tiled map of {config.name}, extracted from the WoW Forever beta client via wow.export -- pan and zoom over
        real client art.
      </p>
      <MapExplorer
        continentId={continent}
        registeredContinents={getRegisteredContinents()}
        mapConfig={{
          mapName: config.id,
          bounds: config.bounds,
          minZoom: config.minZoom,
          maxNativeZoom: config.maxZoom,
          tileSize: config.tileSize,
          gridSize: config.gridSize,
          fullGridCorners: config.fullGridCorners,
        }}
        zoneAreas={zoneAreas}
        entrances={entrances}
        flightMasters={flightMasters}
      />
    </main>
  );
}
