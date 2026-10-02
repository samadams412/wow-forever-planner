import type { QuestMapGroup } from "@/lib/quests";

// A quest's start/turn-in point(s) plotted directly on the in-game stylized
// zone map art (public/images/zone-maps/<areaId>.jpg, from wow.export's own
// zone-map export -- see scripts/build-zone-map-images.js) rather than the
// real tile pyramid the full /reference/map/[continent] page uses. No
// Leaflet, no CRS.Simple, no coordinate-system conversion: Wowhead's x/y are
// already zone-relative percent (0-100), which these images are natively
// addressed in too, so pin placement is a plain CSS `left/top: <pct>%`.
// Considered and rejected a Leaflet/tile-pyramid version of this feature
// (see the session that build this component for the full writeup) -- that
// approach needed a new per-zone tile pyramid (Zephras Isle alone took a
// full continent-style slicing pass) and three layers of coordinate math to
// reach the same pin placement this gets for free. The full world map page
// keeps its real tile pyramid -- it needs actual pan/zoom across a huge
// continent plus zone borders/entrance markers, which this flat art can't
// serve; this component is deliberately a much smaller, simpler sibling.
export default function QuestMapViewer({ group, markerIcon }: { group: QuestMapGroup; markerIcon: Record<"start" | "end", string> }) {
  return (
    <div
      className="relative isolate h-40 w-full overflow-hidden rounded border border-[#8a6d3b]/60"
      style={{ backgroundColor: "#000" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset at a fixed, build-known path; no next/image benefit over a tiny JPEG rendered at a fixed small size */}
      <img src={group.imageUrl} alt={`${group.zoneName} map`} className="h-full w-full object-cover" />
      {group.markers.map((marker, i) => (
        <img
          key={i}
          src={markerIcon[marker.kind]}
          alt={marker.kind === "start" ? "Quest giver" : "Turn-in"}
          title={`${marker.kind === "start" ? "Quest giver" : "Turn-in"}: ${marker.npcName}`}
          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          style={{ left: `${marker.xPct}%`, top: `${marker.yPct}%` }}
        />
      ))}
    </div>
  );
}
