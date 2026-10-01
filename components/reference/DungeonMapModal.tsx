"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import DungeonMapViewer from "@/components/reference/DungeonMapViewer";
import DungeonMapLegend, { type DungeonMapMarker } from "@/components/reference/DungeonMapLegend";

// The "much larger" full-screen view -- same DungeonMapViewer at a bigger
// heightClassName/sizes, plus the legend alongside it instead of squeezed
// underneath a 288px-wide sidebar.
export default function DungeonMapModal({
  src,
  alt,
  legend,
  onClose,
}: {
  src: string;
  alt: string;
  legend?: DungeonMapMarker[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col gap-3 overflow-hidden rounded-lg border border-accent/40 bg-surface p-4 shadow-lg sm:flex-row"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={alt}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded text-foreground-muted hover:text-foreground"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <DungeonMapViewer src={src} alt={alt} heightClassName="h-[60vh]" sizes="80vw" />
          <p className="mt-1 text-center text-[10px] text-foreground-muted/50">Map courtesy of Atlas Addon</p>
        </div>
        {legend && legend.length > 0 && (
          <div className="scrollbar-gold w-full shrink-0 cursor-default overflow-y-auto sm:w-56 sm:max-h-[60vh]">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Legend</h3>
            <DungeonMapLegend markers={legend} className="mt-1" />
          </div>
        )}
      </div>
    </div>
  );
}
