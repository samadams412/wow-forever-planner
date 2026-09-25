import type { Metadata } from "next";
import WorldMapZone from "@/components/map/WorldMapZone";
import { getMapZone, getDungeonPinsForZone } from "@/lib/dungeon-locations";
import { getDungeon } from "@/lib/dungeons";

// World map MVP -- deliberately scoped to one zone (Badlands) while the
// approach gets proven out. Not yet linked from the Reference nav or index
// grid, same "reachable by direct URL but not advertised until it's further
// along" treatment this project already gave /whats-new -- see CLAUDE.md's
// world-map architecture note.
export const metadata: Metadata = {
  title: "World Map (preview)",
  description: "An early, single-zone preview of Forevercraft's own stylized world map.",
  robots: { index: false, follow: false },
};

const ZONE_ID = "badlands";

export default function MapPage() {
  const zone = getMapZone(ZONE_ID)!;
  const pins = getDungeonPinsForZone(ZONE_ID)
    .map((pin) => {
      const dungeon = getDungeon(pin.dungeonId);
      if (!dungeon) return null;
      return {
        dungeonId: pin.dungeonId,
        x: pin.x,
        y: pin.y,
        appearsIn: pin.appearsIn,
        name: dungeon.name,
        levelRange: `${dungeon.levelMin}-${dungeon.levelMax}`,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">World Map</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        An early preview: originally-drawn, simplified zone art (not game tiles) for placing dungeon entrance pins.{" "}
        {zone.name} is the first zone while the approach gets proven out.
      </p>
      <div className="mt-6">
        <WorldMapZone zoneId={zone.id} zoneName={zone.name} levelRange={zone.levelRange} pins={pins} />
      </div>
    </main>
  );
}
