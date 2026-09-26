"use client";

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import L from "leaflet";
import { worldToLatLng, latLngToWorld, type FullGridCorners } from "@/lib/map-coords";
import type { ZoneAreaData, ZoneAreaGeometry } from "@/lib/zone-areas";
import type { EntranceMarker, EntranceInfo, EntranceKind } from "@/lib/map-entrances";
import type { FlightMaster, FlightMasterFaction } from "@/lib/map-flight-masters";
import type { MapLayers } from "@/lib/map-layers";
// NOT imported here -- this component is loaded via next/dynamic(...,
// { ssr: false }) (see LeafletZoneMapLoader.tsx), and a CSS side-effect
// import inside a client-only-loaded chunk doesn't reliably make it into
// the page's stylesheet with this bundler (confirmed: the served CSS had
// zero .leaflet-* rules, which is why the map rendered blank white with no
// tiles positioned/sized correctly). Imported from the page itself
// instead, so it's part of the initial render.

// How many zoom levels past the tile pyramid's real depth (maxNativeZoom)
// the map allows zooming in -- Leaflet just upscales the deepest real
// tiles rather than requesting nonexistent ones (TileLayer's own
// maxNativeZoom option handles this). For our continents (nativeZoom
// always 6) this gives maxZoom 8, matching foreverchanges.pro/map's own
// range -- see docs/map-reference-foreverchanges.md.
const OVERZOOM_LEVELS = 2;

// Zoom thresholds for the zone-name label ladder (docs/map-reference-
// foreverchanges.md section 2's own tier ladder, adapted to our single
// "zone" tier -- we have no subzone/mid/small label data). One place, so
// both the visibility check and any future UI (a "zoom in for labels"
// hint, say) read the same numbers.
export const ZONE_LABEL_ZOOM = {
  namesFrom: 1, // zone names start appearing at this zoom
  levelLineFrom: 3, // the level-range sub-line only shows once zoomed in this far
} as const;

const FACTION_COLOR = {
  alliance: "#6fb1ff",
  horde: "#ff7a6b",
  contested: "#ffd100",
} as const;

// Zoom behavior for dungeon/raid/battleground entrance icons, one place
// per the task that added this: hidden below fadeInFrom (a CSS opacity
// transition on the icon itself handles the actual fade, driven by a
// single CSS custom property set on the pins pane -- see
// updateEntranceIconStyle), size interpolates linearly from sizeAtFadeIn
// to sizeAtMax between fadeInFrom and maxZoomForSizing, then holds at
// sizeAtMax past that. raidSizeMultiplier is applied on top of whatever
// the current interpolated size is.
export const ENTRANCE_ICON_ZOOM = {
  fadeInFrom: 2.5,
  sizeAtFadeIn: 16,
  sizeAtMax: 32,
  maxZoomForSizing: 6,
  raidSizeMultiplier: 1.15,
} as const;

const ENTRANCE_ICON_COLOR: Record<EntranceKind, string> = {
  dungeon: "#4fd8c4",
  raid: "#b478ff",
  battleground: "#ff6b6b",
};

// Same fade-in/scale curve as ENTRANCE_ICON_ZOOM above (see that constant's
// own comment for the mechanics -- a single CSS custom property set on the
// shared "pins" pane on zoomend, read by every marker's inner element), just
// a later fadeInFrom: flight masters are far more numerous than dungeon/
// raid/battleground entrances, so they'd clutter a whole-continent view if
// they appeared as early as z2.5.
export const FLIGHT_MASTER_ICON_ZOOM = {
  fadeInFrom: 3,
  sizeAtFadeIn: 16,
  sizeAtMax: 32,
  maxZoomForSizing: 6,
} as const;

// Reuses this map's existing faction color language (alliance blue / horde
// red / contested-or-neutral gold -- see FACTION_COLOR above) rather than
// inventing a second palette. "Both" isn't literally "contested" the way a
// zone's territory can be, but it's the same "neither side alone" case
// visually, so it gets the same gold.
const FLIGHT_MASTER_FACTION_COLOR: Record<FlightMasterFaction, string> = {
  Alliance: FACTION_COLOR.alliance,
  Horde: FACTION_COLOR.horde,
  Both: FACTION_COLOR.contested,
};

const ENTRANCE_KIND_LABEL: Record<EntranceKind, string> = {
  dungeon: "Dungeon",
  raid: "Raid",
  battleground: "Battleground",
};

// Which `layers` key gates each entrance kind's visibility -- one place,
// shared by the mount effect (initial marker visibility) and the
// layer-toggle effect (later changes).
const ENTRANCE_LAYER_KEY: Record<EntranceKind, keyof MapLayers> = {
  dungeon: "dungeons",
  raid: "raids",
  battleground: "battlegrounds",
};

// Imperative actions the parent (MapExplorer) drives directly against the
// live Leaflet map instance -- flying to a zone/entrance picked from the
// sidebar list or search can't be expressed as ordinary props since it's a
// one-shot action, not persistent state (unlike `selectedZoneId`, which
// IS persistent state and stays a controlled prop instead).
export type LeafletZoneMapHandle = {
  flyToWorldBounds: (b: { minX: number; minY: number; maxX: number; maxY: number }) => void;
  flyToWorldPoint: (x: number, y: number, zoom: number) => void;
  openEntrancePopup: (id: string) => void;
};

// Simple original SVGs, not client art -- the real client world-map pin
// icons for these (UiTextureAtlas 647's "dungeon"/"raid"/"crossedflags"
// members, FileDataID 1121272) were found and verified but that texture
// hasn't been exported from wow.export yet (see CLAUDE.md's "entrance icon
// art" session note for exactly what to export and the crop rectangles to
// use once it is) -- these are a placeholder, swappable for a real
// extracted PNG in public/map/icons/ later with no rendering-logic change,
// not a permanent design choice.
function entranceIconSvg(kind: EntranceKind): string {
  const color = ENTRANCE_ICON_COLOR[kind];
  if (kind === "raid") {
    return `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/><circle cx="16" cy="16" r="8" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="16" cy="16" r="2.5" fill="${color}"/></svg>`;
  }
  if (kind === "battleground") {
    return `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/><path d="M9 9 L23 23 M23 9 L9 23" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  return `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/><path d="M10 20 V13 A6 6 0 0 1 22 13 V20" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/></svg>`;
}

// A simple original glyph (not client art -- see entranceIconSvg's own
// comment on the same policy): an L-profile boot (shaft, heel, flat sole)
// with two feather shapes fanning off the ankle. Tinted by faction via
// FLIGHT_MASTER_FACTION_COLOR. Checked at full render size before trusting
// it -- an earlier version (a plain vertical bar with a flared base) read
// as the numeral "1" once shrunk to icon size, not a boot at all.
function flightMasterIconSvg(faction: FlightMasterFaction): string {
  const color = FLIGHT_MASTER_FACTION_COLOR[faction];
  return (
    `<svg viewBox="0 0 32 32" width="100%" height="100%">` +
    `<circle cx="16" cy="16" r="14" fill="#0d0b07" stroke="${color}" stroke-width="2.5"/>` +
    `<path d="M15 9 Q7 5 4 10 Q9 11 15 10 Z" fill="${color}" opacity="0.55"/>` +
    `<path d="M15 11 Q8 9 6 14 Q11 14 15 12 Z" fill="${color}" opacity="0.8"/>` +
    `<path d="M13 6 L19 6 L19 17 L19 19 L24 19 Q27 19 27 21.5 Q27 24 24 24 L8 24 L8 19.5 Q8 17.5 10 17 L13 17 Z" fill="${color}"/>` +
    `</svg>`
  );
}

function flightMasterPopupHtml(f: FlightMaster): string {
  return (
    `<div style="font-family:inherit;text-align:center;min-width:180px">` +
    `<strong style="color:#c9a961;font-size:14px">${f.name}</strong><br/>` +
    `<span style="opacity:.85">${f.faction} flight master</span>` +
    `<div style="margin-top:5px;font-size:11px;opacity:.6">Source: ${f.source}</div>` +
    `<div style="font-size:11px;opacity:.6">world ${Math.round(f.worldPosition.x)}, ${Math.round(f.worldPosition.y)}</div>` +
    `</div>`
  );
}

function entranceLevelText(m: { levelMin: number | null; levelMax: number | null }): string {
  if (m.levelMin == null) return "";
  return m.levelMax != null && m.levelMax !== m.levelMin ? `${m.levelMin}-${m.levelMax}` : `${m.levelMin}`;
}

function entranceProvenanceLabel(source: string | null): string {
  if (source === "map.corpse") return "client data (Map.Corpse)";
  if (source === "manual") return "manual";
  return "unknown";
}

function entranceMemberLine(m: EntranceInfo): string {
  const level = entranceLevelText(m);
  const linkHtml = m.href ? ` &middot; <a href="${m.href}" style="color:#c9a961">Loot &amp; quests &rarr;</a>` : "";
  return (
    `<div style="margin-top:6px;padding-top:6px;border-top:1px solid #3a4557;text-align:left">` +
    `<strong style="color:#c9a961">${m.name}</strong> ` +
    `<span style="opacity:.7">(${ENTRANCE_KIND_LABEL[m.kind]}${level ? `, Lv ${level}` : ""})</span>${linkHtml}` +
    `</div>`
  );
}

function entrancePopupHtml(marker: EntranceMarker): string {
  if (marker.type === "group") {
    return (
      `<div style="font-family:inherit;min-width:220px;max-width:280px">` +
      `<div style="text-align:center"><strong style="color:#c9a961;font-size:14px">${marker.name}</strong></div>` +
      marker.members.map(entranceMemberLine).join("") +
      `</div>`
    );
  }
  const level = entranceLevelText(marker);
  return (
    `<div style="font-family:inherit;text-align:center;min-width:190px">` +
    `<strong style="color:#c9a961;font-size:14px">${marker.name}</strong><br/>` +
    `<span style="opacity:.85">${ENTRANCE_KIND_LABEL[marker.kind]}${level ? ` &middot; Level ${level}` : ""}</span>` +
    `<div style="margin-top:5px;font-size:11px;opacity:.6">Position: ${entranceProvenanceLabel(marker.source)}</div>` +
    `<div style="font-size:11px;opacity:.6">world ${Math.round(marker.worldPosition.x)}, ${Math.round(marker.worldPosition.y)}</div>` +
    (marker.href ? `<div style="margin-top:5px"><a href="${marker.href}" style="color:#c9a961">View loot &amp; quests &rarr;</a></div>` : "") +
    `</div>`
  );
}

function parseHashView(
  hash: string,
  opts: { minZoom: number; maxZoom: number; bounds: [[number, number], [number, number]]; corners: FullGridCorners; gridSize: number; tileSize: number; nativeZoom: number }
): { center: [number, number]; zoom: number } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const worldX = parseFloat(params.get("x") ?? "");
  const worldY = parseFloat(params.get("y") ?? "");
  const zoom = parseFloat(params.get("z") ?? "");
  if (!Number.isFinite(worldX) || !Number.isFinite(worldY) || !Number.isFinite(zoom)) return null;
  if (zoom < opts.minZoom || zoom > opts.maxZoom) return null;
  const center = worldToLatLng(opts.corners, opts.gridSize, opts.tileSize, opts.nativeZoom, worldX, worldY);
  if (!L.latLngBounds(opts.bounds).contains(center)) return null;
  return { center, zoom };
}

// A GeoJSON Polygon/MultiPolygon's coordinates (world-unit [x,y] pairs) as
// Leaflet LatLngs, normalized to the multi-polygon shape either way (array
// of parts, each an array of rings, outer ring first then holes) -- so
// every caller handles one shape regardless of which GeoJSON type a given
// zone happens to be.
function geometryToLatLngParts(
  geometry: ZoneAreaGeometry,
  corners: FullGridCorners,
  gridSize: number,
  tileSize: number,
  nativeZoom: number
): L.LatLng[][][] {
  const toRing = (ring: number[][]) =>
    ring.map(([wx, wy]) => L.latLng(worldToLatLng(corners, gridSize, tileSize, nativeZoom, wx, wy)));
  if (geometry.type === "Polygon") return [geometry.coordinates.map(toRing)];
  return geometry.coordinates.map((part) => part.map(toRing));
}

// Ray-casting point-in-polygon, in projected pixel space (both the ring and
// the test point must come from the same map.latLngTo*Point call so they're
// in the same coordinate space at the current view). Only the outer ring of
// each part is tested -- holes are ignored deliberately: this is used for
// "is the viewport mostly inside this zone" label-hiding, where being
// generous about a hole (usually a small carved-out city) is the safer
// direction, not a correctness requirement.
function pointInRing(point: L.Point, ring: L.Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const { x: xi, y: yi } = ring[i];
    const { x: xj, y: yj } = ring[j];
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInAnyPart(point: L.Point, outerRings: L.Point[][]): boolean {
  return outerRings.some((ring) => pointInRing(point, ring));
}

type Rect = { left: number; top: number; right: number; bottom: number };

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

const DEFAULT_ZONE_STYLE: L.PathOptions = { color: "#ffd100", weight: 1, opacity: 0.55, fill: false };
const ACTIVE_ZONE_STYLE: L.PathOptions = { color: "#fad961", weight: 2.5, opacity: 0.95, fill: false };

type ZoneEntry = {
  data: ZoneAreaData;
  border: L.Polygon;
  outerRingsLayerPoints: () => L.Point[][]; // recomputed lazily per label pass, current-view pixel space
};

type EntranceMarkerEntry = { id: string; kind: EntranceKind; marker: L.Marker };
type FlightMasterMarkerEntry = { id: string; marker: L.Marker };

// Real tiled map (wow.export-extracted client art, sliced by
// scripts/slice-map-tiles.js), rendered with Leaflet's CRS.Simple -- this
// is a plain pixel-space image, not a geographic lat/lng map. Loaded via
// next/dynamic(..., { ssr: false }) from its page since Leaflet touches
// `window` at import time and isn't SSR-safe.
//
// Selection (`selectedZoneId`) and `layers` are controlled props, not
// internal state -- MapExplorer.tsx is the single source of truth so a
// sidebar zone-list click and a map border click stay in sync regardless
// of which one the user acted on. Panning/zooming and one-shot "fly to X"
// actions stay imperative (`onViewChange` callback / the `ref` handle)
// since they're not persistent UI state the same way.
const LeafletZoneMap = forwardRef<
  LeafletZoneMapHandle,
  {
    mapName: string;
    bounds: [[number, number], [number, number]];
    minZoom: number;
    maxNativeZoom: number;
    tileSize: number;
    gridSize: number;
    fullGridCorners: FullGridCorners;
    zoneAreas: ZoneAreaData[];
    entrances: EntranceMarker[];
    flightMasters: FlightMaster[];
    selectedZoneId: number | null;
    onSelectZone: (areaId: number | null) => void;
    onViewChange: (view: { x: number; y: number; z: number }) => void;
    layers: MapLayers;
    // Responsive by default (a fraction of viewport height, floored so it's
    // never too cramped) rather than the old fixed 520px -- override for a
    // specific layout.
    heightClassName?: string;
  }
>(function LeafletZoneMap(
  {
    mapName,
    bounds,
    minZoom,
    maxNativeZoom,
    tileSize,
    gridSize,
    fullGridCorners,
    zoneAreas,
    entrances,
    flightMasters,
    selectedZoneId,
    onSelectZone,
    onViewChange,
    layers,
    heightClassName = "h-[70vh] min-h-[360px]",
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const zoneEntriesRef = useRef<Map<number, ZoneEntry>>(new Map());
  const entranceMarkersRef = useRef<EntranceMarkerEntry[]>([]);
  const flightMasterMarkersRef = useRef<FlightMasterMarkerEntry[]>([]);
  const appliedSelectionRef = useRef<number | null>(null);
  const layersRef = useRef<MapLayers>(layers);
  const updateLabelsRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const maxZoom = maxNativeZoom + OVERZOOM_LEVELS;

    const map = L.map(containerRef.current, {
      crs: L.CRS.Simple,
      minZoom,
      maxZoom,
      // zoomSnap 0.25 lets scroll/pinch land on quarter-zoom increments
      // instead of only whole levels; zoomDelta 1 keeps the +/- buttons
      // (and keyboard +/-) stepping by a full level, matching
      // foreverchanges.pro/map's own button behavior (see the reference
      // doc) even though free zoom is now finer than that.
      zoomSnap: 0.25,
      zoomDelta: 1,
      attributionControl: false,
      // Constrains panning to `bounds` (the continent's own populated
      // area, not the full 64x64 grid most of which has no tiles at all)
      // -- without this, nothing stopped scrolling past the real map into
      // blank/transparent space. maxBoundsViscosity:1 makes it a hard
      // stop rather than a soft rubber-band.
      maxBounds: bounds,
      maxBoundsViscosity: 1,
    });
    mapRef.current = map;

    // Custom panes, stacked above the stock tile pane: zone borders, then
    // pins, then name labels on top of everything -- matches
    // docs/map-reference-foreverchanges.md section 3's own layering
    // (zones 450, pins 600, names 650). Names get pointer-events:none so a
    // label never steals a click/hover meant for a pin or a zone border
    // underneath it.
    map.createPane("zones");
    map.getPane("zones")!.style.zIndex = "450";
    map.createPane("pins");
    map.getPane("pins")!.style.zIndex = "600";
    map.createPane("names");
    map.getPane("names")!.style.zIndex = "650";
    map.getPane("names")!.style.pointerEvents = "none";
    map.getPane("zones")!.style.display = layersRef.current.zoneBorders ? "" : "none";

    // No `bounds` option on the tile layer itself -- restricting tile
    // validity to a LatLngBounds is a common source of "zero tiles ever
    // load" bugs in CRS.Simple setups (confirmed the hard way on the
    // proof of concept). `maxBounds` on the map above is a different,
    // safe mechanism for the same "don't go past the edge" goal.
    L.tileLayer(`/map/${mapName}/tiles/{z}/{x}_{y}.webp`, {
      tileSize,
      noWrap: true,
      minZoom,
      maxZoom,
      // The tile pyramid's real depth -- Leaflet fetches z6 tiles for any
      // requested zoom above this and scales them up, instead of
      // requesting (nonexistent) z7/z8 tile files.
      maxNativeZoom,
    }).addTo(map);

    // --- Zone borders: one shared canvas renderer for every zone's paths ---
    const zonesRenderer = L.canvas({ pane: "zones" });
    const zoneEntries = new Map<number, ZoneEntry>();
    zoneEntriesRef.current = zoneEntries;

    for (const zone of zoneAreas) {
      const parts = geometryToLatLngParts(zone.geometry, fullGridCorners, gridSize, tileSize, maxNativeZoom);

      // Faint dark underlay first (drawn beneath, same shared renderer/
      // pane), so the gold line reads on bright terrain -- not
      // interactive, it only exists to improve legibility of the border
      // drawn on top of it.
      L.polygon(parts, {
        renderer: zonesRenderer,
        pane: "zones",
        color: "#000",
        weight: 3,
        opacity: 0.35,
        fill: false,
        interactive: false,
      }).addTo(map);

      const border = L.polygon(parts, {
        renderer: zonesRenderer,
        pane: "zones",
        ...DEFAULT_ZONE_STYLE,
        bubblingMouseEvents: false,
      }).addTo(map);

      const entry: ZoneEntry = {
        data: zone,
        border,
        outerRingsLayerPoints: () => parts.map((rings) => rings[0].map((ll) => map.latLngToLayerPoint(ll))),
      };
      zoneEntries.set(zone.areaId, entry);

      border.on("mouseover", () => {
        if (appliedSelectionRef.current !== zone.areaId) border.setStyle(ACTIVE_ZONE_STYLE);
      });
      border.on("mouseout", () => {
        if (appliedSelectionRef.current !== zone.areaId) border.setStyle(DEFAULT_ZONE_STYLE);
      });
      border.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectZone(zone.areaId);
      });
    }

    // Clicking empty map space (not a zone border -- those stop
    // propagation above) clears the current selection.
    map.on("click", () => onSelectZone(null));

    // --- Zone name labels: divIcon markers, recomputed on zoomend/moveend ---
    const namesLayer = L.layerGroup().addTo(map);

    function labelHtml(zone: ZoneAreaData, showLevelLine: boolean): string {
      const nameLine = `<div style="font:700 13px/1.15 system-ui,-apple-system,sans-serif;letter-spacing:0.05em;text-transform:uppercase;color:#c9a961;text-shadow:0 0 3px #000,0 0 6px #000,0 1px 2px #000;white-space:nowrap;text-align:center">${zone.name}</div>`;
      if (!showLevelLine || !zone.levelRange) return nameLine;
      // Real AreaTable.FactionGroupMask, merged into zones.json by
      // scripts/build-map-zones.js -- see lib/zone-areas.ts's ZoneFaction
      // type and CLAUDE.md's "Zone territory" session note.
      const color = FACTION_COLOR[zone.faction];
      const [lo, hi] = zone.levelRange;
      const levelLine = `<div style="font:700 11px/1.2 system-ui,-apple-system,sans-serif;color:${color};text-shadow:0 0 3px #000,0 0 5px #000;text-align:center;margin-top:1px">${lo}-${hi}</div>`;
      return nameLine + levelLine;
    }

    function updateLabels() {
      namesLayer.clearLayers();
      if (!layersRef.current.zoneLabels) return;
      const zoom = map.getZoom();
      if (zoom < ZONE_LABEL_ZOOM.namesFrom) return;
      const showLevelLine = layersRef.current.levelLines && zoom >= ZONE_LABEL_ZOOM.levelLineFrom;

      const size = map.getSize();
      const viewportCorners = [
        map.containerPointToLayerPoint([0, 0]),
        map.containerPointToLayerPoint([size.x, 0]),
        map.containerPointToLayerPoint([0, size.y]),
        map.containerPointToLayerPoint([size.x, size.y]),
      ];

      type Candidate = { zone: ZoneAreaData; point: L.Point; areaUnits: number };
      const candidates: Candidate[] = [];
      for (const entry of zoneEntries.values()) {
        const zone = entry.data;
        if (!zone.labelAnchor) continue;

        // Hide a zone's own label once the whole viewport sits inside it
        // -- you don't need the name of the zone you're already deep
        // inside, only its neighbors' names near the edges.
        const outerRings = entry.outerRingsLayerPoints();
        if (viewportCorners.every((p) => pointInAnyPart(p, outerRings))) continue;

        const [wx, wy] = zone.labelAnchor;
        const latlng = worldToLatLng(fullGridCorners, gridSize, tileSize, maxNativeZoom, wx, wy);
        const point = map.latLngToContainerPoint(latlng);
        if (point.x < -100 || point.y < -100 || point.x > size.x + 100 || point.y > size.y + 100) continue; // well outside viewport, skip

        const b = zone.worldBounds;
        const areaUnits = Math.abs(b.maxX - b.minX) * Math.abs(b.maxY - b.minY);
        candidates.push({ zone, point, areaUnits });
      }

      // Larger zones (by real-world bbox area) win collisions -- place
      // biggest first, skip anything that overlaps an already-placed box.
      candidates.sort((a, b) => b.areaUnits - a.areaUnits);

      const placed: Rect[] = [];
      const PADDING = 4;
      for (const c of candidates) {
        const hasLevelLine = showLevelLine && !!c.zone.levelRange;
        const width = Math.max(40, c.zone.name.length * 7.5 + 12);
        const height = hasLevelLine ? 30 : 16;
        const rect: Rect = {
          left: c.point.x - width / 2 - PADDING,
          right: c.point.x + width / 2 + PADDING,
          top: c.point.y - height / 2 - PADDING,
          bottom: c.point.y + height / 2 + PADDING,
        };
        if (placed.some((p) => rectsOverlap(p, rect))) continue;
        placed.push(rect);

        const icon = L.divIcon({
          className: "",
          html: labelHtml(c.zone, showLevelLine),
          iconSize: [width, height],
          iconAnchor: [width / 2, height / 2],
        });
        const [wx, wy] = c.zone.labelAnchor!;
        L.marker(worldToLatLng(fullGridCorners, gridSize, tileSize, maxNativeZoom, wx, wy), {
          icon,
          pane: "names",
          interactive: false,
          keyboard: false,
        }).addTo(namesLayer);
      }
    }
    updateLabelsRef.current = updateLabels;

    map.on("zoomend", updateLabels);
    map.on("moveend", updateLabels);

    // Restore view from the URL hash (#x=<world_x>&y=<world_y>&z=<zoom>,
    // real WoW world coordinates -- not lat/lng or pixels, so a shared
    // link is meaningful independent of this map's own internal CRS) if
    // present and valid; otherwise fall back to fitBounds, same as before
    // hash support existed. "Valid" means parses to finite numbers, zoom
    // within range, and the resulting position actually falls inside this
    // continent's own populated bounds -- a garbage or out-of-bounds hash
    // (wrong continent's coordinates, hand-edited nonsense) falls back
    // rather than landing somewhere meaningless or erroring.
    const hashView = parseHashView(window.location.hash, {
      minZoom,
      maxZoom,
      bounds,
      corners: fullGridCorners,
      gridSize,
      tileSize,
      nativeZoom: maxNativeZoom,
    });
    if (hashView) {
      map.setView(hashView.center, hashView.zoom);
    } else {
      // fitBounds, not a hand-computed setView: an earlier version computed
      // a "default zoom" analytically from the bounds' own size and a
      // target pixel count, without knowing the real container size at
      // compute time -- verified live to produce an off-center, non-fitting
      // initial view (real content pushed into one corner, blank space
      // elsewhere). fitBounds asks Leaflet to do this against the
      // container's actual measured size instead, which is what it's for.
      map.fitBounds(bounds);
    }
    // Guards against the container being measured at 0x0 the instant
    // L.map() was constructed (a known React-ref-timing gotcha with
    // Leaflet) -- cheap no-op if sizing was already correct. Also: the
    // map's very first setView/fitBounds (before Leaflet considers itself
    // "loaded") never fires `moveend`, so updateLabels' own moveend
    // listener above never runs for the initial view -- confirmed live: a
    // synchronous updateLabels() call right here produced zero labels
    // (map.getSize() still returned its pre-layout cached value, so every
    // zone's anchor point failed the "on screen" bounds check). A second,
    // nested rAF -- after invalidateSize()'s own layout effects have had a
    // frame to actually paint -- is what reliably gets a correct size.
    //
    // Both rAF ids are cancelled on cleanup below -- React StrictMode's dev-
    // mode double-invoke (mount -> cleanup -> mount) otherwise leaves the
    // FIRST mount's callback armed; it fires after that first map instance
    // is already `.remove()`d, throwing inside Leaflet's own
    // containerPointToLayerPoint (confirmed live: "Cannot read properties
    // of undefined (reading '_leaflet_pos')") since a removed map's panes
    // are torn down. Not just cosmetic -- an uncaught exception here was
    // silently aborting that call's updateLabels(), which is why a border
    // click could appear to do nothing.
    let rafOuter = 0;
    let rafInner = 0;
    rafOuter = requestAnimationFrame(() => {
      map.invalidateSize();
      rafInner = requestAnimationFrame(updateLabels);
    });

    // Reports the current view up to the parent once panning/zooming
    // settles (moveend fires after pan AND zoom, including animations) --
    // not on every intermediate frame, matching foreverchanges.pro/map's
    // own "hash lags the animation" behavior. The parent (MapExplorer)
    // owns the actual URL-hash write, combining this with selection/layer
    // state it also tracks -- this component no longer writes the hash
    // itself, since two independent writers each reconstructing the whole
    // hash string from only what they know would stomp each other.
    function reportView() {
      const center = map.getCenter();
      const { worldX, worldY } = latLngToWorld(fullGridCorners, gridSize, tileSize, maxNativeZoom, center.lat, center.lng);
      onViewChange({ x: Math.round(worldX), y: Math.round(worldY), z: Number(map.getZoom().toFixed(2)) });
    }
    map.on("moveend", reportView);

    // --- Entrance markers (dungeons/raids/battlegrounds) ---
    // Fixed-size OUTER wrapper (32x32, the largest the icon ever gets) so
    // Leaflet's own iconAnchor/position math never changes as the icon
    // visually resizes with zoom -- only the INNER element's width/height
    // (driven by --entrance-icon-size, set once per zoom change on the
    // pins pane itself and inherited by every marker's inner element, per
    // the task's own "resize via a CSS variable... not by re-creating
    // markers") actually changes size. The inner element is centered
    // inside the fixed outer box so the anchor point never drifts.
    const pinsPane = map.getPane("pins")!;
    pinsPane.style.setProperty("--entrance-icon-size", `${ENTRANCE_ICON_ZOOM.sizeAtFadeIn}px`);
    pinsPane.style.setProperty("--entrance-icon-opacity", "0");

    function updateEntranceIconStyle() {
      const zoom = map.getZoom();
      const t = Math.max(
        0,
        Math.min(1, (zoom - ENTRANCE_ICON_ZOOM.fadeInFrom) / (ENTRANCE_ICON_ZOOM.maxZoomForSizing - ENTRANCE_ICON_ZOOM.fadeInFrom))
      );
      const size = ENTRANCE_ICON_ZOOM.sizeAtFadeIn + t * (ENTRANCE_ICON_ZOOM.sizeAtMax - ENTRANCE_ICON_ZOOM.sizeAtFadeIn);
      pinsPane.style.setProperty("--entrance-icon-size", `${size}px`);
      pinsPane.style.setProperty("--entrance-icon-opacity", zoom >= ENTRANCE_ICON_ZOOM.fadeInFrom ? "1" : "0");
    }
    map.on("zoomend", updateEntranceIconStyle);
    updateEntranceIconStyle();

    const entranceMarkerEntries: EntranceMarkerEntry[] = [];
    entranceMarkersRef.current = entranceMarkerEntries;

    for (const entrance of entrances) {
      const sizeExpr =
        entrance.kind === "raid"
          ? `calc(var(--entrance-icon-size, 16px) * ${ENTRANCE_ICON_ZOOM.raidSizeMultiplier})`
          : "var(--entrance-icon-size, 16px)";
      const innerStyle =
        `width:${sizeExpr};height:${sizeExpr};opacity:var(--entrance-icon-opacity, 0);` +
        `transition:opacity 200ms ease,filter 120ms ease;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 0 3px rgba(0,0,0,.8))`;
      const icon = L.divIcon({
        className: "",
        html:
          `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;pointer-events:none">` +
          `<div class="entrance-icon-inner" style="${innerStyle}">${entranceIconSvg(entrance.kind)}</div>` +
          `</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const latlng = worldToLatLng(fullGridCorners, gridSize, tileSize, maxNativeZoom, entrance.worldPosition.x, entrance.worldPosition.y);
      const leafletMarker = L.marker(latlng, { icon, pane: "pins" })
        .addTo(map)
        .bindPopup(entrancePopupHtml(entrance));
      leafletMarker.on("mouseover", () => {
        const el = leafletMarker.getElement()?.querySelector<HTMLElement>(".entrance-icon-inner");
        if (el) el.style.filter = "drop-shadow(0 0 5px rgba(255,255,255,.85)) brightness(1.3)";
      });
      leafletMarker.on("mouseout", () => {
        const el = leafletMarker.getElement()?.querySelector<HTMLElement>(".entrance-icon-inner");
        if (el) el.style.filter = "drop-shadow(0 0 3px rgba(0,0,0,.8))";
      });
      const entranceId = entrance.type === "group" ? entrance.id : entrance.id;
      entranceMarkerEntries.push({ id: entranceId, kind: entrance.kind, marker: leafletMarker });
      const layerKey = ENTRANCE_LAYER_KEY[entrance.kind];
      if (!layersRef.current[layerKey]) leafletMarker.getElement()!.style.display = "none";
    }

    // --- Flight master markers ---
    // Own CSS var pair (distinct from --entrance-icon-*) so this layer's
    // fade-in/scale curve (FLIGHT_MASTER_ICON_ZOOM, fading in later than
    // entrance icons) is independent of the dungeon/raid/battleground one,
    // even though both are set on the same shared "pins" pane and follow
    // the identical mechanism -- see ENTRANCE_ICON_ZOOM's own comment.
    pinsPane.style.setProperty("--flight-master-icon-size", `${FLIGHT_MASTER_ICON_ZOOM.sizeAtFadeIn}px`);
    pinsPane.style.setProperty("--flight-master-icon-opacity", "0");

    function updateFlightMasterIconStyle() {
      const zoom = map.getZoom();
      const t = Math.max(
        0,
        Math.min(1, (zoom - FLIGHT_MASTER_ICON_ZOOM.fadeInFrom) / (FLIGHT_MASTER_ICON_ZOOM.maxZoomForSizing - FLIGHT_MASTER_ICON_ZOOM.fadeInFrom))
      );
      const size = FLIGHT_MASTER_ICON_ZOOM.sizeAtFadeIn + t * (FLIGHT_MASTER_ICON_ZOOM.sizeAtMax - FLIGHT_MASTER_ICON_ZOOM.sizeAtFadeIn);
      pinsPane.style.setProperty("--flight-master-icon-size", `${size}px`);
      pinsPane.style.setProperty("--flight-master-icon-opacity", zoom >= FLIGHT_MASTER_ICON_ZOOM.fadeInFrom ? "1" : "0");
    }
    map.on("zoomend", updateFlightMasterIconStyle);
    updateFlightMasterIconStyle();

    const flightMasterMarkerEntries: FlightMasterMarkerEntry[] = [];
    flightMasterMarkersRef.current = flightMasterMarkerEntries;

    for (const fm of flightMasters) {
      const innerStyle =
        `width:var(--flight-master-icon-size, 16px);height:var(--flight-master-icon-size, 16px);` +
        `opacity:var(--flight-master-icon-opacity, 0);transition:opacity 200ms ease,filter 120ms ease;` +
        `pointer-events:auto;cursor:pointer;filter:drop-shadow(0 0 3px rgba(0,0,0,.8))`;
      const icon = L.divIcon({
        className: "",
        html:
          `<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;pointer-events:none">` +
          `<div class="flight-master-icon-inner" style="${innerStyle}">${flightMasterIconSvg(fm.faction)}</div>` +
          `</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const latlng = worldToLatLng(fullGridCorners, gridSize, tileSize, maxNativeZoom, fm.worldPosition.x, fm.worldPosition.y);
      const leafletMarker = L.marker(latlng, { icon, pane: "pins" }).addTo(map).bindPopup(flightMasterPopupHtml(fm));
      leafletMarker.on("mouseover", () => {
        const el = leafletMarker.getElement()?.querySelector<HTMLElement>(".flight-master-icon-inner");
        if (el) el.style.filter = "drop-shadow(0 0 5px rgba(255,255,255,.85)) brightness(1.3)";
      });
      leafletMarker.on("mouseout", () => {
        const el = leafletMarker.getElement()?.querySelector<HTMLElement>(".flight-master-icon-inner");
        if (el) el.style.filter = "drop-shadow(0 0 3px rgba(0,0,0,.8))";
      });
      flightMasterMarkerEntries.push({ id: fm.id, marker: leafletMarker });
      if (!layersRef.current.flightMasters) leafletMarker.getElement()!.style.display = "none";
    }

    return () => {
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedZoneId/layers/onSelectZone/onViewChange are intentionally handled by their own effects/refs below, not remount triggers
  }, [mapName, bounds, minZoom, maxNativeZoom, tileSize, gridSize, fullGridCorners, zoneAreas, entrances, flightMasters]);

  // Applies `selectedZoneId` changes to border styling without touching
  // the rest of the map -- keeps MapExplorer's state as the single source
  // of truth (a sidebar-list click and a map-border click both flow
  // through the same onSelectZone callback into this same prop).
  useEffect(() => {
    const zoneEntries = zoneEntriesRef.current;
    const prev = appliedSelectionRef.current;
    if (prev !== null && prev !== selectedZoneId) {
      zoneEntries.get(prev)?.border.setStyle(DEFAULT_ZONE_STYLE);
    }
    if (selectedZoneId !== null) {
      zoneEntries.get(selectedZoneId)?.border.setStyle(ACTIVE_ZONE_STYLE);
    }
    appliedSelectionRef.current = selectedZoneId;
  }, [selectedZoneId]);

  // Applies layer-toggle changes live -- zone borders/pins panes toggle by
  // CSS display, entrance markers individually by kind, and zone labels
  // recompute immediately (updateLabels reads layersRef itself, so this
  // just needs to trigger one fresh call).
  useEffect(() => {
    layersRef.current = layers;
    const map = mapRef.current;
    if (!map) return;
    map.getPane("zones")!.style.display = layers.zoneBorders ? "" : "none";
    for (const entry of entranceMarkersRef.current) {
      const el = entry.marker.getElement();
      if (el) el.style.display = layers[ENTRANCE_LAYER_KEY[entry.kind]] ? "" : "none";
    }
    for (const entry of flightMasterMarkersRef.current) {
      const el = entry.marker.getElement();
      if (el) el.style.display = layers.flightMasters ? "" : "none";
    }
    updateLabelsRef.current();
  }, [layers]);

  useImperativeHandle(
    ref,
    () => ({
      flyToWorldBounds(b) {
        const map = mapRef.current;
        if (!map) return;
        const c1 = worldToLatLng(fullGridCorners, gridSize, tileSize, maxNativeZoom, b.minX, b.minY);
        const c2 = worldToLatLng(fullGridCorners, gridSize, tileSize, maxNativeZoom, b.maxX, b.maxY);
        map.flyToBounds(L.latLngBounds(c1, c2), { padding: [24, 24], duration: 0.6 });
      },
      flyToWorldPoint(x, y, zoom) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo(worldToLatLng(fullGridCorners, gridSize, tileSize, maxNativeZoom, x, y), zoom, { duration: 0.6 });
      },
      openEntrancePopup(id) {
        const entry = entranceMarkersRef.current.find((e) => e.id === id);
        entry?.marker.openPopup();
      },
    }),
    [fullGridCorners, gridSize, tileSize, maxNativeZoom]
  );

  // Inline style, not a Tailwind bg-* class: Leaflet's own default CSS sets
  // `.leaflet-container { background: #ddd }`, which was found to win over
  // a class-based background regardless of the site theme's own dark
  // tokens (confirmed live -- the map showed light grey outside the
  // continent's own tiles, not the theme's dark background). An inline
  // style always wins on specificity, so this covers both "outside every
  // tile" and "behind a tile's own transparent pixels" (missing-children
  // areas within a composited tile) in one place, without depending on
  // stylesheet load order.
  return (
    <div
      ref={containerRef}
      className={`w-full rounded-md border border-border/60 ${heightClassName}`}
      style={{ backgroundColor: "#000" }}
    />
  );
});

export default LeafletZoneMap;
