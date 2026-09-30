"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Frame, Tag, SlidersHorizontal, Share2, Menu, X, Check } from "lucide-react";
import type { MapLayers } from "@/lib/map-layers";

// Zone-display toggles that used to live in the sidebar's own "Layers"
// section (see MapSidebar.tsx's own comment) -- moved here, into a toolbar
// in the empty space top-right of the page header, above the map. Not
// duplicated in the sidebar. Entrance-type toggles (dungeons/raids/
// battlegrounds) and the flight-master POI toggle stay in the sidebar.
const TOGGLE_BUTTONS: { key: keyof MapLayers; label: string; Icon: typeof Frame }[] = [
  { key: "zoneBorders", label: "Zone borders", Icon: Frame },
  { key: "zoneLabels", label: "Zone labels", Icon: Tag },
  { key: "levelLines", label: "Level lines", Icon: SlidersHorizontal },
];

function ToggleButton({
  active,
  label,
  Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon: typeof Frame;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`group relative flex h-9 w-9 shrink-0 items-center justify-center rounded border transition-colors ${
        active ? "border-accent/60 bg-accent/10 text-accent" : "border-border text-foreground-muted hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-[11px] text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {label}
      </span>
    </button>
  );
}

// Copies the current URL (with hash) to the clipboard, with a brief
// "Copied" confirmation -- falls back to a selectable text field when the
// Clipboard API isn't available (not secure context, older browser, or a
// permission denial), rather than failing silently.
function ShareButton({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<"idle" | "copied" | "fallback">("idle");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const fallbackInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state !== "copied") return;
    const t = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (state !== "fallback") return;
    fallbackInputRef.current?.focus();
    fallbackInputRef.current?.select();
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setState("idle");
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [state]);

  async function handleClick() {
    const url = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(url);
        setState("copied");
        return;
      } catch {
        // fall through to the fallback field below
      }
    }
    setFallbackUrl(url);
    setState("fallback");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Share view"
        title="Share view"
        onClick={handleClick}
        className={`flex h-9 items-center gap-1.5 rounded border border-border px-2.5 text-xs font-medium text-foreground-muted transition-colors hover:border-accent/60 hover:text-foreground ${
          compact ? "w-full justify-start" : ""
        }`}
      >
        {state === "copied" ? <Check className="h-4 w-4 text-accent" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
        {state === "copied" ? "Copied" : "Share view"}
      </button>
      {state === "fallback" && (
        <div className={`absolute z-20 mt-1.5 w-64 rounded border border-border bg-surface p-2 shadow-lg ${compact ? "left-0" : "right-0"}`}>
          <p className="mb-1.5 text-[11px] text-foreground-muted">Clipboard unavailable -- copy this link:</p>
          <input
            ref={fallbackInputRef}
            type="text"
            readOnly
            value={fallbackUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          />
        </div>
      )}
    </div>
  );
}

export default function MapToolbar({
  layers,
  onToggleLayer,
  mobileOpen,
  onToggleMobile,
}: {
  layers: MapLayers;
  onToggleLayer: (key: keyof MapLayers) => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  // This toolbar's own wrapper is only as wide as the hamburger button --
  // the header row it sits in (title block + toolbar) is `flex flex-wrap
  // justify-between`, so on a narrow viewport the toolbar often wraps onto
  // its own line and lands at the LEFT edge (a single item on a wrapped
  // flex line sits at flex-start, not space-between's usual opposite ends)
  // instead of the right edge it sits at on desktop. The dropdown's
  // default `right-0` anchor assumes the latter -- confirmed live this
  // pushes it mostly off-screen to the left on a ~440px-wide layout
  // (rect.left ended up around -172px). Rather than guess which side the
  // wrapper lands on at a given width, measure after paint and flip to a
  // left-anchored, viewport-clamped position if the default overflows --
  // same "measure real rendered size, then correct" approach already used
  // for tooltip placement in lib/use-hover-tooltip.ts. useLayoutEffect (not
  // useEffect) so the correction applies before the browser paints, no
  // visible flash at the wrong position.
  useLayoutEffect(() => {
    if (!mobileOpen) return;
    const el = dropdownRef.current;
    if (!el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();
    if (rect.left < margin) {
      el.style.right = "auto";
      el.style.left = `${margin}px`;
    } else if (rect.right > window.innerWidth - margin) {
      el.style.left = "auto";
      el.style.right = `${margin}px`;
    }
  }, [mobileOpen]);

  return (
    <div className="relative shrink-0">
      {/* Desktop: a plain icon-button row, in the empty space to the right of
          the title/description, above the map. */}
      <div className="hidden items-center gap-1.5 md:flex">
        {TOGGLE_BUTTONS.map((t) => (
          <ToggleButton key={t.key} active={layers[t.key]} label={t.label} Icon={t.Icon} onClick={() => onToggleLayer(t.key)} />
        ))}
        <div className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
        <ShareButton />
      </div>

      {/* Mobile: collapses to a hamburger opening a small menu -- a separate
          control from the sidebar's own "Map menu" toggle (MapExplorer.tsx
          keeps the two mutually exclusive: opening one closes the other). */}
      <div className="md:hidden">
        <button
          type="button"
          aria-label={mobileOpen ? "Close map display options" : "Map display options"}
          aria-expanded={mobileOpen}
          onClick={onToggleMobile}
          className="flex h-9 w-9 items-center justify-center rounded border border-border text-foreground-muted"
        >
          {mobileOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
        </button>
        {mobileOpen && (
          <div ref={dropdownRef} className="absolute right-0 top-full z-30 mt-1.5 w-56 rounded border border-border bg-surface p-2 shadow-lg">
            <div className="flex flex-col gap-1">
              {TOGGLE_BUTTONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={layers[t.key]}
                  onClick={() => onToggleLayer(t.key)}
                  className={`flex items-center gap-2 rounded border px-2 py-1.5 text-left text-sm ${
                    layers[t.key] ? "border-accent/60 bg-accent/10 text-foreground" : "border-border text-foreground-muted"
                  }`}
                >
                  <t.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="my-2 h-px bg-border" aria-hidden="true" />
            <ShareButton compact />
          </div>
        )}
      </div>
    </div>
  );
}
