"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ContinentSelect from "./ContinentSelect";
import type { ZoneAreaData, ZoneFaction } from "@/lib/zone-areas";
import type { EntranceMarker } from "@/lib/map-entrances";
import type { MapLayers } from "@/lib/map-layers";

const FACTION_DOT_COLOR: Record<ZoneFaction, string> = {
  alliance: "#6fb1ff",
  horde: "#ff7a6b",
  contested: "#ffd100",
};

// No explicit "is this a city" flag exists in zones.json's own schema --
// these 6 are the WoW Forever beta's real capital-city zones (Stormwind
// City/Ironforge/Undercity on EK, Orgrimmar/Thunder Bluff/Darnassus on
// Kalimdor), hardcoded here purely to give search results a "City" vs
// "Zone" type tag; nothing else in this project reads this list.
const CITY_ZONE_NAMES = new Set(["Stormwind City", "Ironforge", "Undercity", "Orgrimmar", "Thunder Bluff", "Darnassus"]);

export type SearchResult =
  | { kind: "zone"; areaId: number; name: string; tag: "Zone" | "City" }
  | { kind: "entrance"; markerId: string; name: string; tag: "Dungeon" | "Raid" | "Battleground" };

const KIND_TAG: Record<string, "Dungeon" | "Raid" | "Battleground"> = {
  dungeon: "Dungeon",
  raid: "Raid",
  battleground: "Battleground",
};

const LAYER_ROWS: { key: keyof MapLayers; label: string; countKind?: "dungeon" | "raid" | "battleground" }[] = [
  { key: "zoneBorders", label: "Zone borders" },
  { key: "zoneLabels", label: "Zone labels" },
  { key: "levelLines", label: "Level lines" },
  { key: "dungeons", label: "Dungeons", countKind: "dungeon" },
  { key: "raids", label: "Raids", countKind: "raid" },
  { key: "battlegrounds", label: "Battlegrounds", countKind: "battleground" },
];

// Zone list + search + layer toggles, all under the existing continent
// dropdown -- see components/map/MapExplorer.tsx for the state (selection,
// layers) this is driven by; this component is purely presentational.
export default function MapSidebar({
  continents,
  current,
  zoneAreas,
  entrances,
  selectedZoneId,
  onSelectZoneRow,
  onSearchPick,
  layers,
  onToggleLayer,
}: {
  continents: { id: string; name: string }[];
  current: string;
  zoneAreas: ZoneAreaData[];
  entrances: EntranceMarker[];
  selectedZoneId: number | null;
  onSelectZoneRow: (areaId: number) => void;
  onSearchPick: (result: SearchResult) => void;
  layers: MapLayers;
  onToggleLayer: (key: keyof MapLayers) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // "/" focuses search (docs/map-reference-foreverchanges.md section 6's
  // own convention) -- ignored while already typing in a text field so it
  // doesn't hijack a real "/" keystroke elsewhere on the page.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Keeps a map-side click (which highlights a row, not the other way
  // around) visible in a scrollable list instead of silently selecting
  // something off-screen.
  useEffect(() => {
    if (selectedZoneId == null) return;
    rowRefs.current.get(selectedZoneId)?.scrollIntoView({ block: "nearest" });
  }, [selectedZoneId]);

  const sortedZones = useMemo(() => {
    return [...zoneAreas].sort((a, b) => {
      const am = a.levelRange?.[0] ?? Infinity;
      const bm = b.levelRange?.[0] ?? Infinity;
      if (am !== bm) return am - bm;
      return a.name.localeCompare(b.name);
    });
  }, [zoneAreas]);

  const filteredZones = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedZones;
    return sortedZones.filter((z) => z.name.toLowerCase().includes(q));
  }, [sortedZones, query]);

  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];
    for (const z of zoneAreas) {
      if (z.name.toLowerCase().includes(q)) {
        out.push({ kind: "zone", areaId: z.areaId, name: z.name, tag: CITY_ZONE_NAMES.has(z.name) ? "City" : "Zone" });
      }
    }
    for (const e of entrances) {
      if (e.name.toLowerCase().includes(q)) {
        out.push({ kind: "entrance", markerId: e.id, name: e.name, tag: KIND_TAG[e.kind] });
      }
      if (e.type === "group") {
        for (const m of e.members) {
          if (m.name !== e.name && m.name.toLowerCase().includes(q)) {
            out.push({ kind: "entrance", markerId: e.id, name: m.name, tag: KIND_TAG[m.kind] });
          }
        }
      }
    }
    return out.slice(0, 20);
  }, [query, zoneAreas, entrances]);

  const entranceCounts = useMemo(() => {
    const counts = { dungeon: 0, raid: 0, battleground: 0 };
    for (const e of entrances) {
      if (e.type === "single") counts[e.kind]++;
      else for (const m of e.members) counts[m.kind]++;
    }
    return counts;
  }, [entrances]);

  return (
    <aside className="w-full shrink-0 md:w-72">
      <ContinentSelect continents={continents} current={current} />

      <div className="relative mt-3">
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          placeholder="Search zones, dungeons... (/)"
          className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-foreground placeholder:text-foreground-muted/60"
        />
        {searchFocused && query.trim() !== "" && (
          <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded border border-border bg-surface shadow-lg">
            {searchResults.length === 0 ? (
              <div className="px-2 py-2 text-xs text-foreground-muted">No matches</div>
            ) : (
              searchResults.map((r, i) => (
                <button
                  key={`${r.kind}-${r.kind === "zone" ? r.areaId : r.markerId}-${i}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSearchPick(r);
                    setQuery("");
                    setSearchFocused(false);
                  }}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
                >
                  <span className="truncate text-foreground">{r.name}</span>
                  <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-foreground-muted">{r.tag}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Zones</h2>
        <div className="mt-1 max-h-80 overflow-y-auto rounded border border-border">
          {filteredZones.map((z) => (
            <button
              key={z.areaId}
              type="button"
              ref={(el) => {
                if (el) rowRefs.current.set(z.areaId, el);
                else rowRefs.current.delete(z.areaId);
              }}
              onClick={() => onSelectZoneRow(z.areaId)}
              aria-pressed={selectedZoneId === z.areaId}
              className={`flex w-full items-center gap-2 border-b border-border/50 px-2 py-1.5 text-left text-sm last:border-b-0 hover:bg-surface-hover ${
                selectedZoneId === z.areaId ? "bg-accent/20" : ""
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: FACTION_DOT_COLOR[z.faction] }} />
              <span className="min-w-0 flex-1 truncate text-foreground">{z.name}</span>
              <span className="shrink-0 text-xs text-foreground-muted">{z.levelRange ? `${z.levelRange[0]}-${z.levelRange[1]}` : "—"}</span>
            </button>
          ))}
          {filteredZones.length === 0 && <div className="px-2 py-2 text-xs text-foreground-muted">No zones match &ldquo;{query}&rdquo;</div>}
        </div>
      </div>

      <div className="mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Layers</h2>
        <div className="mt-1 flex flex-col gap-1">
          {LAYER_ROWS.map((row) => (
            <button
              key={row.key}
              type="button"
              aria-pressed={layers[row.key]}
              onClick={() => onToggleLayer(row.key)}
              className={`flex items-center justify-between rounded border px-2 py-1 text-left text-sm ${
                layers[row.key] ? "border-accent/60 bg-accent/10 text-foreground" : "border-border text-foreground-muted"
              }`}
            >
              <span>{row.label}</span>
              {row.countKind && <span className="text-xs opacity-70">{entranceCounts[row.countKind]}</span>}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
