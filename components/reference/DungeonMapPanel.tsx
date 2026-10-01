"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import DungeonMapViewer from "@/components/reference/DungeonMapViewer";
import DungeonMapModal from "@/components/reference/DungeonMapModal";
import DungeonMapLegend, { type DungeonMapMarker } from "@/components/reference/DungeonMapLegend";

export default function DungeonMapPanel({
  src,
  alt,
  legend,
  attribution = "Map courtesy of Atlas Addon",
}: {
  src: string;
  alt: string;
  legend?: DungeonMapMarker[];
  attribution?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="relative">
        <DungeonMapViewer src={src} alt={alt} heightClassName="h-56" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="View full screen"
          className="absolute right-1.5 top-1.5 z-10 rounded border border-border bg-surface/90 p-1 text-foreground-muted hover:bg-surface-hover"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      {legend && legend.length > 0 && (
        <div className="scrollbar-gold mt-2 max-h-48 cursor-default overflow-y-auto">
          <DungeonMapLegend markers={legend} />
        </div>
      )}
      <p className="mt-1 text-center text-[10px] text-foreground-muted/50">{attribution}</p>
      {open && <DungeonMapModal src={src} alt={alt} legend={legend} attribution={attribution} onClose={() => setOpen(false)} />}
    </div>
  );
}
