"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { dungeons, MIN_DUNGEON_LEVEL, MAX_DUNGEON_LEVEL, type Dungeon } from "@/lib/dungeons";
import { packDungeonRows } from "@/lib/dungeon-layout";

const LEVEL_SPAN = MAX_DUNGEON_LEVEL - MIN_DUNGEON_LEVEL + 1; // inclusive
const ROW_HEIGHT = 38;
const ROW_GAP = 5;
const TICK_LEVELS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

function levelToCol(level: number) {
  return level - MIN_DUNGEON_LEVEL + 1;
}

function levelToPercent(level: number) {
  return ((level - MIN_DUNGEON_LEVEL) / (LEVEL_SPAN - 1)) * 100;
}

const LEVEL_BANDS: { start: number; end: number }[] = (() => {
  const bands: { start: number; end: number }[] = [];
  let start = MIN_DUNGEON_LEVEL;
  let boundary = Math.ceil(MIN_DUNGEON_LEVEL / 5) * 5;
  if (boundary === start) boundary += 5;
  while (start < MAX_DUNGEON_LEVEL) {
    const end = Math.min(boundary, MAX_DUNGEON_LEVEL);
    bands.push({ start, end });
    start = end;
    boundary += 5;
  }
  return bands;
})();

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let measureCanvasCtx: CanvasRenderingContext2D | null = null;
function measureTextWidth(text: string, font: string): number {
  if (!measureCanvasCtx) {
    measureCanvasCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCanvasCtx) return Infinity;
  measureCanvasCtx.font = font;
  return measureCanvasCtx.measureText(text).width;
}

function useInlineRangeText(fullText: string, fallbackText: string) {
  const ref = useRef<HTMLElement>(null);
  const [text, setText] = useState(fallbackText);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const cs = getComputedStyle(el);
      const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const available = el.clientWidth - 10;
      const fits = measureTextWidth(fullText, font) <= available;
      setText(fits ? fullText : fallbackText);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fullText, fallbackText]);

  return { ref, text };
}

function DungeonBar({
  dungeon,
  row,
  revealed,
  index,
  onSelect,
}: {
  dungeon: Dungeon;
  row: number;
  revealed: boolean;
  index: number;
  onSelect: (d: Dungeon) => void;
}) {
  const isNew = dungeon.type === "new";
  const label = isNew ? dungeon.name : (dungeon.abbr ?? dungeon.name);
  const withRange = `${label} (${dungeon.levelMin}-${dungeon.levelMax})`;
  const { ref: textRef, text: displayText } = useInlineRangeText(withRange, label);

  const style = {
    gridColumn: `${levelToCol(dungeon.levelMin)} / ${levelToCol(dungeon.levelMax) + 1}`,
    gridRow: row + 1,
    transitionDelay: revealed ? `${Math.min(index * 18, 600)}ms` : "0ms",
    transformOrigin: "left center",
  };

  const sharedClasses = `flex items-center justify-center overflow-hidden rounded-sm px-1 text-center text-[11px] font-medium leading-tight transition-all duration-500 ease-out sm:text-xs ${
    revealed ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
  }`;

  if (isNew) {
    return (
      <button
        ref={textRef as React.RefObject<HTMLButtonElement>}
        type="button"
        data-cursor="gauntlet-active"
        onClick={() => onSelect(dungeon)}
        style={style}
        className={`${sharedClasses} cursor-pointer border-2 border-accent bg-accent/25 text-accent shadow-[0_0_8px_rgba(201,169,97,0.4)] hover:z-10 hover:scale-105 hover:bg-accent/40 hover:shadow-[0_0_16px_rgba(201,169,97,0.75)] focus-visible:z-10 focus-visible:scale-105 focus-visible:bg-accent/40 focus-visible:shadow-[0_0_16px_rgba(201,169,97,0.75)]`}
        title={`${dungeon.name} (Level ${dungeon.levelMin}-${dungeon.levelMax}) -- click for details`}
      >
        {displayText}
      </button>
    );
  }

  return (
    <div
      ref={textRef as React.RefObject<HTMLDivElement>}
      style={style}
      /* [AESTHETIC TWEAK]: Rich dark-leather card styling with a subtle amber border to match the parchment theme */
      className={`${sharedClasses} border border-accent/20 bg-[#1c1712]/90 text-foreground-muted shadow-sm hover:border-accent/40 hover:text-foreground`}
      title={`${dungeon.name} (Level ${dungeon.levelMin}-${dungeon.levelMax})`}
    >
      {displayText}
    </div>
  );
}

function DungeonDetailModal({ dungeon, onClose }: { dungeon: Dungeon; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-accent/50 bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={dungeon.name}
      >
        {dungeon.image && (
          <div className="relative h-48 w-full sm:h-56">
            <Image src={dungeon.image} alt="" fill sizes="512px" style={{ objectFit: "cover" }} />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ backgroundImage: "linear-gradient(to top, rgba(13,11,7,0.85), transparent 55%)" }}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-sm text-white hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-heading text-lg font-semibold text-accent">{dungeon.name}</h3>
            <span className="shrink-0 text-xs text-foreground-muted">
              Level {dungeon.levelMin}-{dungeon.levelMax}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground-muted">
            {dungeon.zone && <span>{dungeon.zone}</span>}
            {dungeon.faction && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  dungeon.faction === "Horde" ? "bg-red-500/15 text-red-400" : "bg-sky-500/15 text-sky-300"
                }`}
              >
                {dungeon.faction}
              </span>
            )}
          </div>
          {dungeon.description && (
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">{dungeon.description}</p>
          )}
          {dungeon.confidence === "estimated" && (
            <p className="mt-2 text-[11px] italic text-foreground-muted/70">
              Sparse early details -- expect this to firm up as beta coverage continues.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DungeonsTimeline() {
  const { placed, rowCount } = packDungeonRows(dungeons);
  const [selected, setSelected] = useState<Dungeon | null>(null);
  const [revealed, setRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRevealed(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm border-2 border-accent bg-accent/20" /> New Dungeons (Launch)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm border border-accent/20 bg-[#1c1712]" /> Original Classic Dungeons
        </span>
      </div>

      <div
        className="scrollbar-gold overflow-x-auto rounded-lg border border-accent/40 p-3 shadow-inner"
        style={{
          backgroundColor: "#14110e",
          backgroundImage: [
            "radial-gradient(circle at 15% 20%, rgba(201,169,97,0.18), transparent 45%)",
            "radial-gradient(circle at 85% 80%, rgba(180,140,70,0.14), transparent 50%)",
            "linear-gradient(135deg, rgba(40,32,22,0.9) 0%, rgba(15,12,9,0.95) 100%)",
          ].join(", "),
        }}
        ref={containerRef}
      >
        {/* w-max + min-w forces scroll on mobile; md:w-full md:min-w-0 makes it fit the screen fluidly on desktop */}
        <div className="relative w-max min-w-[950px] md:w-full md:min-w-0">
          
          {/* Alternating 5-level bands */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {LEVEL_BANDS.map(
              (band, i) =>
                i % 2 === 1 && (
                  <div
                    key={band.start}
                    className="absolute inset-y-0 bg-accent/[0.07]"
                    style={{
                      left: `${levelToPercent(band.start)}%`,
                      width: `${levelToPercent(band.end) - levelToPercent(band.start)}%`,
                    }}
                  />
                )
            )}
          </div>

          {/* [AESTHETIC TWEAK]: Subtle vertical grid lines matching tick levels */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {TICK_LEVELS.map((lvl) => (
              <div
                key={lvl}
                className="absolute inset-y-0 border-l border-accent/[0.08]"
                style={{ left: `${((lvl - MIN_DUNGEON_LEVEL) / (LEVEL_SPAN - 1)) * 100}%` }}
              />
            ))}
          </div>

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${LEVEL_SPAN}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rowCount}, ${ROW_HEIGHT}px)`,
              gap: `${ROW_GAP}px 3px`,
            }}
          >
            {placed.map(({ dungeon, row }, i) => (
              <DungeonBar
                key={dungeon.id}
                dungeon={dungeon}
                row={row}
                revealed={revealed}
                index={i}
                onSelect={setSelected}
              />
            ))}
          </div>

          <div className="relative mt-2 border-t border-accent/40 pt-1.5">
            {TICK_LEVELS.map((lvl) => (
              <span
                key={lvl}
                className="absolute -translate-x-1/2 text-[11px] text-foreground-muted"
                style={{ left: `${((lvl - MIN_DUNGEON_LEVEL) / (LEVEL_SPAN - 1)) * 100}%` }}
              >
                {lvl}
              </span>
            ))}
            <span className="invisible text-[11px]">60</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-foreground-muted">
        Tip: Scroll horizontally across the chart on mobile devices to view full level brackets clearly.
      </p>

      {selected && <DungeonDetailModal dungeon={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}