"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
// NOT imported here -- this component is loaded via next/dynamic(...,
// { ssr: false }) (see LeafletZoneMapLoader.tsx), and a CSS side-effect
// import inside a client-only-loaded chunk doesn't reliably make it into
// the page's stylesheet with this bundler (confirmed: the served CSS had
// zero .leaflet-* rules, which is why the map rendered blank white with no
// tiles positioned/sized correctly). Imported from the page itself
// instead, so it's part of the initial render.

export type ZoneMapMarker = {
  latlng: [number, number];
  name: string;
  levelRange: string;
  href: string;
};

// Real tiled map (wow.export-extracted client art, sliced by
// scripts/slice-map-tiles.js), rendered with Leaflet's CRS.Simple -- this
// is a plain pixel-space image, not a geographic lat/lng map. Loaded via
// next/dynamic(..., { ssr: false }) from its page since Leaflet touches
// `window` at import time and isn't SSR-safe.
export default function LeafletZoneMap({
  mapName,
  bounds,
  maxNativeZoom,
  tileSize,
  markers,
}: {
  mapName: string;
  bounds: [[number, number], [number, number]];
  maxNativeZoom: number;
  tileSize: number;
  markers: ZoneMapMarker[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom: 0,
      maxZoom: maxNativeZoom,
      attributionControl: false,
    });
    mapRef.current = map;

    // No `bounds` option on the layer itself -- restricting tile validity
    // to a LatLngBounds is a common source of "zero tiles ever load" bugs
    // in CRS.Simple setups, and isn't needed for a single small crop with
    // noWrap already set. `bounds` (the prop) is only used below to compute
    // a starting center/zoom.
    L.tileLayer(`/map/${mapName}/tiles/{z}/{x}_{y}.webp`, {
      tileSize,
      noWrap: true,
      minZoom: 0,
      maxZoom: maxNativeZoom,
    }).addTo(map);

    // Explicit setView instead of fitBounds: fitBounds computes a "best
    // fit" zoom that can come out fractional or clamped in ways that are
    // hard to reason about without live devtools -- setView to a known
    // center at a known valid zoom is simpler to verify. Midpoint of both
    // bound corners (not just half of one corner) since `bounds[0]` isn't
    // necessarily [0, 0] and lat runs negative (see getZone0Bounds).
    const centerLat = (bounds[0][0] + bounds[1][0]) / 2;
    const centerLng = (bounds[0][1] + bounds[1][1]) / 2;
    map.setView([centerLat, centerLng], 0);
    // Guards against the container being measured at 0x0 the instant
    // L.map() was constructed (a known React-ref-timing gotcha with
    // Leaflet) -- cheap no-op if sizing was already correct.
    requestAnimationFrame(() => map.invalidateSize());

    const icon = L.divIcon({
      className: "",
      html: '<div style="width:22px;height:22px;border-radius:9999px;border:2px solid #c9a961;background:#0d0b07;box-shadow:0 0 6px rgba(0,0,0,0.6)"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    for (const marker of markers) {
      L.marker(marker.latlng, { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:inherit;text-align:center">` +
            `<strong style="color:#c9a961">${marker.name}</strong><br/>` +
            `<span>Level ${marker.levelRange}</span><br/>` +
            `<a href="${marker.href}" style="color:#c9a961">View loot &amp; quests →</a>` +
            `</div>`
        );
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapName, bounds, maxNativeZoom, tileSize, markers]);

  return <div ref={containerRef} className="h-[520px] w-full rounded-md border border-border/60 bg-background" />;
}
