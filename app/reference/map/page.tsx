import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import LeafletZoneMap from "@/components/map/LeafletZoneMapLoader";
import { worldToZone0LatLng, getZone0Bounds, getMapTileConfig } from "@/lib/map-tiles";
import { getDungeon } from "@/lib/dungeons";

// World map proof of concept -- a small cropped region (Loch Modan/Badlands
// border) sliced from a real wow.export continent extraction, not
// hand-drawn art or hotlinked third-party tiles. Deliberately scoped small
// (see scripts/slice-map-tiles.js) before any decision on full-continent
// tiling and storage. Not yet linked from nav/index, same "reachable but
// not advertised" treatment prior map-feature previews got.
export const metadata: Metadata = {
  title: "World Map (proof of concept)",
  description: "A small proof-of-concept tiled map slice, extracted from the WoW Forever beta client.",
  robots: { index: false, follow: false },
};

const MAP_NAME = "proof-badlands";
const ULDAMAN_WORLD = { x: -6060, y: -2955 };

export default function MapPage() {
  const dungeon = getDungeon("uldaman")!;
  const latlng = worldToZone0LatLng(MAP_NAME, ULDAMAN_WORLD.x, ULDAMAN_WORLD.y);
  const bounds = getZone0Bounds(MAP_NAME);
  const { maxNativeZoom, tileSize } = getMapTileConfig(MAP_NAME);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">World Map (proof of concept)</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        A small tiled crop around the Loch Modan/Badlands border, sliced from a real wow.export extraction of the
        beta client -- Leaflet pan/zoom over real client art instead of hand-drawn shapes or hotlinked tiles.
      </p>
      <div className="mt-6">
        <LeafletZoneMap
          mapName={MAP_NAME}
          bounds={bounds}
          maxNativeZoom={maxNativeZoom}
          tileSize={tileSize}
          markers={[
            {
              latlng,
              name: dungeon.name,
              levelRange: `${dungeon.levelMin}-${dungeon.levelMax}`,
              href: `/reference/dungeons/loot/${dungeon.id}`,
            },
          ]}
        />
      </div>
    </main>
  );
}
