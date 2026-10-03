"use client";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

// Small CSS-transform pan/zoom for one static map image: zoom buttons, reset,
// and drag-to-pan while zoomed. Extracted from DungeonMapViewer so the quest
// map shares the same behaviour (not a second copy). The viewport owns only the
// transform; the caller supplies what sits inside it.
//
// `children` may be a function of the current scale, so overlays (pins) can
// hold a constant on-screen size while the map zooms underneath them.
export default function PanZoomViewport({
  heightClassName = "h-40",
  children,
  showControls = true,
  className = "",
}: {
  heightClassName?: string;
  children: ReactNode | ((scale: number) => ReactNode);
  showControls?: boolean;
  className?: string;
}) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  // Mirrors dragRef for render: refs can't be read while rendering, and the
  // transition must turn off during a drag so the map follows the pointer.
  const [dragging, setDragging] = useState(false);

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

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (scale <= MIN_SCALE) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    setDragging(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset({ x: dragRef.current.originX + dx, y: dragRef.current.originY + dy });
  }

  function handlePointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  function reset() {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }

  const content = typeof children === "function" ? children(scale) : children;

  return (
    <div className={className}>
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
            transition: dragging ? "none" : "transform 100ms ease-out",
          }}
        >
          {content}
        </div>
      </div>
      {showControls && (
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
      )}
    </div>
  );
}
