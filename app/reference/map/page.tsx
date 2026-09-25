import type { Metadata } from "next";
import ZoneMap from "@/components/map/ZoneMap";

// World map MVP -- deliberately scoped to one zone (Loch Modan) while the
// approach gets proven out. Not yet linked from the Reference nav or index
// grid, same "reachable by direct URL but not advertised until it's further
// along" treatment this project already gave /whats-new -- see CLAUDE.md's
// world-map architecture note.
export const metadata: Metadata = {
  title: "World Map (preview)",
  description: "An early, single-zone preview of Forevercraft's own stylized world map.",
  robots: { index: false, follow: false },
};

export default function MapPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">World Map</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        An early preview: originally-drawn, simplified zone art (not game tiles) for placing dungeon entrance pins.
        Loch Modan is the first zone while the approach gets proven out.
      </p>
      <div className="mt-6">
        <ZoneMap zoneId="loch-modan" zoneName="Loch Modan" levelRange="10-20" />
      </div>
    </main>
  );
}
