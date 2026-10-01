"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Minus, Plus, RotateCcw } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

// Small CSS-transform pan/zoom for a single static map image -- not a full
// Leaflet CRS.Simple map (that's the pattern used for the world map, see
// LeafletZoneMap.tsx), since a single already-rasterized dungeon map image
// doesn't need tiling, geo bounds, or markers. Keeps this slot cheap on
// loot pages that otherwise ship no client JS beyond the jump-nav observer.
// Reused at two sizes (the sidebar's inline thumbnail and the full-screen
// DungeonMapModal) via heightClassName/sizes rather than being two components.
export default function DungeonMapViewer({
  src,
  alt,
  heightClassName = "h-40",
  sizes = "288px",
}: {
  src: string;
  alt: string;
  heightClassName?: string;
  sizes?: string;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  function clampScale(next: number) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
  }

  function zoomBy(delta: number) {
    setScale((s) => {
      const next = clampScale(s + delta);
      if (next === MIN_SCALE) setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (scale <= MIN_SCALE) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div>
      <div
        className={`relative w-full touch-none overflow-hidden rounded border border-border bg-surface ${heightClassName}`}
        style={{ cursor: scale > MIN_SCALE ? "grab" : "default" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragRef.current ? "none" : "transform 100ms ease-out",
          }}
        >
          <Image src={src} alt={alt} fill sizes={sizes} style={{ objectFit: "contain" }} draggable={false} />
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => zoomBy(-1)}
          disabled={scale <= MIN_SCALE}
          aria-label="Zoom out"
          className="rounded border border-border p-1 text-foreground-muted hover:bg-surface-hover disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1)}
          disabled={scale >= MAX_SCALE}
          aria-label="Zoom in"
          className="rounded border border-border p-1 text-foreground-muted hover:bg-surface-hover disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={scale === MIN_SCALE && offset.x === 0 && offset.y === 0}
          aria-label="Reset map view"
          className="rounded border border-border p-1 text-foreground-muted hover:bg-surface-hover disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
