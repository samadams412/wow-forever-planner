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

  // Tiles are gitignored (public/map/<continent>/tiles/) -- generated
  // locally via wow.export + scripts/slice-map-tiles.js, never committed
  // or deployed. `process.env.VERCEL` is set on every Vercel build
  // (Preview and Production alike), which is the right check here: both
  // kinds of deployment lack the tiles equally, not just a "production"
  // deploy specifically.
  if (process.env.VERCEL) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">World Map</h1>
        <p className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-foreground-muted">
          This map&apos;s tiles are generated locally from the beta client via wow.export and aren&apos;t part of the
          deployed site yet. Run it on localhost after generating tiles with{" "}
          <code className="rounded bg-background px-1 py-0.5 text-xs">node scripts/slice-map-tiles.js {continent}</code>.
        </p>
      </main>
    );
  }

  const config = getContinentMapConfig(continent);
  const zoneAreas = getZoneAreaData(continent);
  const entrances = getEntranceMarkers(continent);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">{config.name}</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        A tiled map of {config.name}, extracted from the WoW Forever beta client via wow.export -- pan and zoom over
        real client art. Local-only for now (tiles aren&apos;t deployed yet).
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
      />
    </main>
  );
}
