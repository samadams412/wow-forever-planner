"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import LeafletZoneMap from "./LeafletZoneMapLoader";
import type { LeafletZoneMapHandle } from "./LeafletZoneMap";
import MapSidebar, { type SearchResult } from "./MapSidebar";
import { DEFAULT_MAP_LAYERS, type MapLayers } from "@/lib/map-layers";
import type { FullGridCorners } from "@/lib/map-coords";
import type { ZoneAreaData } from "@/lib/zone-areas";
import type { EntranceMarker } from "@/lib/map-entrances";
import type { FlightMaster } from "@/lib/map-flight-masters";

// Owns every piece of state that has to be shared between the sidebar and
// the map (selection, layer toggles) plus the URL hash that persists them
// -- LeafletZoneMap.tsx and MapSidebar.tsx are both otherwise-independent
// presentational components driven entirely by props/callbacks from here.
// See LeafletZoneMap.tsx's own header comment for why selection/layers are
// controlled props while pan/zoom stays imperative (a ref handle).

const LAYER_KEYS = Object.keys(DEFAULT_MAP_LAYERS) as (keyof MapLayers)[];

function parseHash(hash: string): {
  sel: string | null;
  off: Set<keyof MapLayers>;
  view: { x: number; y: number; z: number } | null;
} {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const off = new Set<keyof MapLayers>();
  for (const key of (params.get("off") ?? "").split(",")) {
    if (LAYER_KEYS.includes(key as keyof MapLayers)) off.add(key as keyof MapLayers);
  }
  const x = parseFloat(params.get("x") ?? "");
  const y = parseFloat(params.get("y") ?? "");
  const z = parseFloat(params.get("z") ?? "");
  const view = Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null;
  return { sel: params.get("sel"), off, view };
}

export default function MapExplorer({
  continentId,
  registeredContinents,
  mapConfig,
  zoneAreas,
  entrances,
  flightMasters,
}: {
  continentId: string;
  registeredContinents: { id: string; name: string }[];
  mapConfig: {
    mapName: string;
    bounds: [[number, number], [number, number]];
    minZoom: number;
    maxNativeZoom: number;
    tileSize: number;
    gridSize: number;
    fullGridCorners: FullGridCorners;
  };
  zoneAreas: ZoneAreaData[];
  entrances: EntranceMarker[];
  flightMasters: FlightMaster[];
}) {
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedEntranceId, setSelectedEntranceId] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayers>(DEFAULT_MAP_LAYERS);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const mapHandleRef = useRef<LeafletZoneMapHandle>(null);
  const viewRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const restoredRef = useRef(false);
  // Mirror of the three pieces of state writeHash needs, kept current by
  // the effect below -- writeHash itself reads ONLY these refs (never
  // closes over selectedZoneId/selectedEntranceId/layers directly) so its
  // own identity stays stable across every render. This matters because
  // LeafletZoneMap's mount effect binds `onViewChange` to a Leaflet
  // `moveend` listener ONCE, outside React's render cycle (selection/
  // layers are deliberately excluded from that effect's own deps, see its
  // header comment) -- an unstable writeHash would leave that listener
  // permanently bound to whatever selection/layers looked like at mount
  // time. Confirmed live, not just reasoned about: before this fix,
  // clicking a zone row wrote `#sel=zone:12` immediately, then the fly
  // animation's own moveend handler overwrote it with a hash that had
  // silently dropped `sel=` entirely.
  const selectedZoneIdRef = useRef<number | null>(null);
  const selectedEntranceIdRef = useRef<string | null>(null);
  const layersRef = useRef<MapLayers>(DEFAULT_MAP_LAYERS);

  // One combined hash write, so a view-pan, a zone-list click, and a layer
  // toggle never stomp each other's part of the hash (each would if it
  // reconstructed a hash string from only what it knows) -- see
  // LeafletZoneMap.tsx's own reportView() comment for the same reasoning
  // from its side.
  const writeHash = useCallback(() => {
    const params = new URLSearchParams();
    const v = viewRef.current;
    if (v) {
      params.set("x", String(v.x));
      params.set("y", String(v.y));
      params.set("z", v.z.toFixed(2));
    }
    if (selectedZoneIdRef.current !== null) params.set("sel", `zone:${selectedZoneIdRef.current}`);
    else if (selectedEntranceIdRef.current !== null) params.set("sel", `entrance:${selectedEntranceIdRef.current}`);
    const offKeys = LAYER_KEYS.filter((k) => !layersRef.current[k]);
    if (offKeys.length) params.set("off", offKeys.join(","));
    const hash = params.toString();
    history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    selectedZoneIdRef.current = selectedZoneId;
    selectedEntranceIdRef.current = selectedEntranceId;
    layersRef.current = layers;
    // Also gated on the map having reported a view at least once
    // (viewRef.current !== null), not just `restoredRef` -- confirmed live:
    // without this, the hash-restore effect's own setSelectedZoneId/
    // setLayers calls (below) trigger this effect again on the very next
    // render, before LeafletZoneMap -- a next/dynamic(ssr:false) component,
    // so it mounts asynchronously and hasn't necessarily read
    // window.location.hash for its OWN x/y/z restoration yet -- and
    // writeHash() would destructively strip x/y/z out of the URL (since
    // viewRef.current is still null) before the map ever got a chance to
    // read them. A real bug found this way, not just reasoned about: a
    // shared link's view silently fell back to the default fit-bounds on
    // reload while sel=/off= restored correctly.
    if (restoredRef.current && viewRef.current !== null) writeHash();
  }, [selectedZoneId, selectedEntranceId, layers, writeHash]);

  // Restore selection + layer toggles from the hash once on mount --
  // invalid/unknown values are simply ignored, falling back to defaults
  // (no selection, every layer on), same "don't error on garbage" stance
  // LeafletZoneMap.tsx's own view-hash parsing already takes. A lazy
  // useState initializer would avoid the lint rule below outright, but
  // would also read `window.location.hash` during the client's very first
  // (hydration) render -- diverging from the server-rendered default
  // markup and risking a real hydration mismatch. Reading it here, one
  // tick after mount, is the "sync initial state from a non-React source"
  // case react-hooks/set-state-in-effect's own docs call out as a
  // legitimate (if edge-case) use of an effect.
  useEffect(() => {
    const { sel, off, view } = parseHash(window.location.hash);
    // Primes viewRef directly from the hash, without waiting for a real
    // moveend -- LeafletZoneMap's own mount effect independently parses this
    // same x/y/z and calls map.setView() with it, but per that component's
    // own header comment, a map's very first setView (before Leaflet
    // considers itself "loaded") never fires moveend, so onViewChange/
    // reportView would otherwise never run and viewRef.current would stay
    // null until the user's first real pan/zoom. Confirmed live: without
    // this, toggling a layer (or picking a sidebar zone) immediately after
    // opening a shared link -- before ever touching the map -- silently
    // failed to persist, since writeHash's own `viewRef.current !== null`
    // guard (see that function's header comment for why the guard exists at
    // all) blocked it. Priming from the hash is safe specifically because
    // it's the same value LeafletZoneMap is about to render anyway, unlike
    // the reload-clobber bug that guard was originally added for, where the
    // ref was null because the true view genuinely wasn't known yet.
    if (view) viewRef.current = view;
    if (off.size) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLayers((prev) => {
        const next = { ...prev };
        for (const k of off) next[k] = false;
        return next;
      });
    }
    if (sel) {
      const i = sel.indexOf(":");
      const kind = i === -1 ? sel : sel.slice(0, i);
      const id = i === -1 ? "" : sel.slice(i + 1);
      if (kind === "zone") {
        const areaId = Number(id);
        if (zoneAreas.some((z) => z.areaId === areaId)) setSelectedZoneId(areaId);
      } else if (kind === "entrance") {
        if (entranceExists(entrances, id)) {
          setSelectedEntranceId(id);
          whenMapReady(mapHandleRef, () => flyToEntranceId(entrances, mapHandleRef.current!, id));
        }
      }
    }
    restoredRef.current = true;
    // Only ever runs once on mount for this continent -- a continent switch
    // navigates to a new page/route entirely (see MapSidebar's
    // ContinentSelect), which remounts this component fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewChange = useCallback(
    (v: { x: number; y: number; z: number }) => {
      viewRef.current = v;
      writeHash();
    },
    [writeHash]
  );

  const handleSelectZoneOnMap = useCallback((areaId: number | null) => {
    setSelectedZoneId(areaId);
    setSelectedEntranceId(null);
  }, []);

  const handleSelectZoneRow = useCallback(
    (areaId: number) => {
      setSelectedZoneId(areaId);
      setSelectedEntranceId(null);
      const zone = zoneAreas.find((z) => z.areaId === areaId);
      if (zone) mapHandleRef.current?.flyToWorldBounds(zone.worldBounds);
    },
    [zoneAreas]
  );

  const handleToggleLayer = useCallback((key: keyof MapLayers) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSearchPick = useCallback(
    (result: SearchResult) => {
      setMobileSidebarOpen(false);
      if (result.kind === "zone") {
        setSelectedZoneId(result.areaId);
        setSelectedEntranceId(null);
        const zone = zoneAreas.find((z) => z.areaId === result.areaId);
        if (zone) mapHandleRef.current?.flyToWorldBounds(zone.worldBounds);
      } else {
        setSelectedZoneId(null);
        setSelectedEntranceId(result.markerId);
        flyToEntranceId(entrances, mapHandleRef.current, result.markerId);
      }
    },
    [zoneAreas, entrances]
  );

  return (
    <div className="mt-6 flex flex-col gap-4 md:flex-row">
      <button
        type="button"
        onClick={() => setMobileSidebarOpen((o) => !o)}
        className="rounded border border-border bg-surface px-3 py-2 text-sm text-foreground md:hidden"
        aria-expanded={mobileSidebarOpen}
      >
        {mobileSidebarOpen ? "Close menu" : "Map menu"}
      </button>

      <div
        className={`${mobileSidebarOpen ? "block" : "hidden"} fixed inset-0 z-40 overflow-y-auto bg-background p-4 md:static md:z-auto md:block md:w-72 md:shrink-0 md:overflow-visible md:bg-transparent md:p-0`}
      >
        <MapSidebar
          continents={registeredContinents}
          current={continentId}
          zoneAreas={zoneAreas}
          entrances={entrances}
          flightMasters={flightMasters}
          selectedZoneId={selectedZoneId}
          onSelectZoneRow={handleSelectZoneRow}
          onSearchPick={handleSearchPick}
          layers={layers}
          onToggleLayer={handleToggleLayer}
        />
      </div>

      <div className="min-w-0 flex-1">
        <LeafletZoneMap
          ref={mapHandleRef}
          mapName={mapConfig.mapName}
          bounds={mapConfig.bounds}
          minZoom={mapConfig.minZoom}
          maxNativeZoom={mapConfig.maxNativeZoom}
          tileSize={mapConfig.tileSize}
          gridSize={mapConfig.gridSize}
          fullGridCorners={mapConfig.fullGridCorners}
          zoneAreas={zoneAreas}
          entrances={entrances}
          flightMasters={flightMasters}
          selectedZoneId={selectedZoneId}
          onSelectZone={handleSelectZoneOnMap}
          onViewChange={handleViewChange}
          layers={layers}
        />
      </div>
    </div>
  );
}

function entranceExists(entrances: EntranceMarker[], markerId: string): boolean {
  return entrances.some((e) => e.id === markerId);
}

function flyToEntranceId(entrances: EntranceMarker[], handle: LeafletZoneMapHandle | null, markerId: string) {
  const marker = entrances.find((e) => e.id === markerId);
  if (!marker || !handle) return;
  handle.flyToWorldPoint(marker.worldPosition.x, marker.worldPosition.y, 5);
  handle.openEntrancePopup(markerId);
}

// The map mounts async (next/dynamic(..., { ssr:false })), so its ref
// handle isn't available the instant this component itself mounts --
// polled via rAF rather than a fixed delay, matching this project's own
// established pattern for "wait for the map to actually be ready"
// elsewhere in LeafletZoneMap.tsx.
function whenMapReady(ref: React.RefObject<LeafletZoneMapHandle | null>, cb: () => void, triesLeft = 60) {
  if (ref.current) {
    cb();
    return;
  }
  if (triesLeft <= 0) return;
  requestAnimationFrame(() => whenMapReady(ref, cb, triesLeft - 1));
}
