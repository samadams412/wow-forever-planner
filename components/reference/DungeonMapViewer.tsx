"use client";
import Image from "next/image";
import PanZoomViewport from "@/components/reference/PanZoomViewport";

// A single already-rasterized dungeon map image, panned and zoomed by the
// shared PanZoomViewport. Reused at two sizes (the sidebar's inline thumbnail
// and the full-screen DungeonMapModal) via heightClassName/sizes rather than
// being two components. Keeps this slot cheap on loot pages that otherwise ship
// no client JS beyond the jump-nav observer.
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
  return (
    <PanZoomViewport heightClassName={heightClassName}>
      <Image src={src} alt={alt} fill sizes={sizes} style={{ objectFit: "contain" }} draggable={false} />
    </PanZoomViewport>
  );
}
