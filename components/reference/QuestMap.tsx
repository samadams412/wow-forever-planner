"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Maximize2, X } from "lucide-react";
import PanZoomViewport from "@/components/reference/PanZoomViewport";
import type { QuestMapGroup } from "@/lib/quests";

// The quest's start/turn-in points on its zone map art, with the shared
// pan/zoom viewport (zoom, reset, drag-to-pan) and a fullscreen overlay. The
// zone images are all exactly 3:2, so the viewport's aspect ratio matches the
// image and the percentage pins land exactly. A quest that crosses zones gets
// one tab per zone.
//
// Pins are sized against the current zoom (1/scale), so they stay the same
// on-screen size however far the map is zoomed.
export default function QuestMap({
  groups,
  questName,
  markerIcon,
}: {
  groups: QuestMapGroup[];
  questName: string;
  markerIcon: Record<"start" | "end", string>;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const group = groups[activeIndex] ?? groups[0];

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  const renderMap = (scale: number) => (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static asset at a fixed, build-known path; a 3:2 JPEG needs no next/image optimization */}
      <img src={group.imageUrl} alt={`${group.zoneName} map`} className="h-full w-full object-cover" draggable={false} />
      {group.markers.map((marker, i) => {
        const label = marker.kind === "start" ? "Quest giver" : "Turn-in";
        return (
          // eslint-disable-next-line @next/next/no-img-element -- same as above: a small fixed-size icon, not a responsive image
          <img
            key={i}
            src={markerIcon[marker.kind]}
            alt={label}
            title={`${label}: ${marker.npcName}`}
            className="absolute h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
            style={{
              left: `${marker.xPct}%`,
              top: `${marker.yPct}%`,
              transform: `translate(-50%, -50%) scale(${1 / scale})`,
            }}
          />
        );
      })}
    </>
  );

  return (
    <section aria-label={`${questName} map`} className="w-full max-w-[418px]">
      {groups.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {groups.map((g, i) => (
            <button
              key={g.zoneId}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-pressed={i === activeIndex}
              className={`rounded border px-2 py-0.5 text-xs ${
                i === activeIndex ? "border-[#c9a961] bg-[#21190f] text-[#f0c040]" : "border-[#8a6d3b]/60 text-[#e8dcc0] hover:bg-[#21190f]/60"
              }`}
            >
              {g.zoneName}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <PanZoomViewport heightClassName="aspect-[3/2]">{renderMap}</PanZoomViewport>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="View map full screen"
          className="absolute right-1.5 top-1.5 z-10 rounded border border-border bg-surface/90 p-1 text-foreground-muted hover:bg-surface-hover"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <p className="mt-1.5 text-center text-xs text-[#e8dcc0]/80">
        {group.continent ? (
          <Link
            href={`/reference/map/${group.continent}#sel=zone:${group.zoneId}`}
            className="underline decoration-dotted hover:opacity-80"
          >
            Open {group.zoneName} on the world map
          </Link>
        ) : (
          group.zoneName
        )}
      </p>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setFullscreen(false)}
          role="presentation"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-2 rounded-lg border border-accent/40 bg-surface p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${questName} map`}
          >
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded text-foreground-muted hover:text-foreground"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <p className="pr-8 text-sm font-semibold text-foreground">{group.zoneName}</p>
            <PanZoomViewport heightClassName="aspect-[3/2]">{renderMap}</PanZoomViewport>
          </div>
        </div>
      )}
    </section>
  );
}
