"use client";

import { useEffect, useRef, useState } from "react";
import { dungeons, MIN_DUNGEON_LEVEL, MAX_DUNGEON_LEVEL, type Dungeon } from "@/lib/dungeons";
import { packDungeonRows } from "@/lib/dungeon-layout";
import DungeonInlinePanel from "@/components/reference/DungeonInlinePanel";
import type { DungeonData } from "@/lib/dungeon-loot";

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
  backgroundImage,
  row,
  revealed,
  index,
  selected,
  onSelect,
}: {
  dungeon: Dungeon;
  backgroundImage: string | undefined;
  row: number;
  revealed: boolean;
  index: number;
  selected: boolean;
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
    backgroundImage: backgroundImage ? `linear-gradient(rgba(10,8,6,0.55), rgba(10,8,6,0.7)), url(${backgroundImage})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  const sharedClasses = `flex items-center justify-center overflow-hidden rounded-sm px-1 text-center text-[11px] font-medium leading-tight transition-all duration-500 ease-out sm:text-xs cursor-pointer ${
    revealed ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
  }`;

  const borderClasses = isNew
    ? `border-2 ${selected ? "border-accent bg-accent/40 shadow-[0_0_16px_rgba(201,169,97,0.75)]" : "border-accent text-accent shadow-[0_0_8px_rgba(201,169,97,0.4)]"} hover:z-10 hover:scale-105 hover:shadow-[0_0_16px_rgba(201,169,97,0.75)] focus-visible:z-10 focus-visible:scale-105`
    : `border ${selected ? "border-accent bg-accent/25" : "border-accent/20"} text-foreground-muted hover:z-10 hover:scale-105 hover:border-accent/50 hover:text-foreground focus-visible:z-10 focus-visible:scale-105`;

  return (
    <button
      ref={textRef as React.RefObject<HTMLButtonElement>}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(dungeon)}
      style={style}
      className={`${sharedClasses} ${borderClasses} text-white`}
      title={`${dungeon.name} (Level ${dungeon.levelMin}-${dungeon.levelMax}) -- click for bosses, loot and quests`}
    >
      <span className="[text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">{displayText}</span>
    </button>
  );
}

export default function DungeonsTimeline({ dungeonData }: { dungeonData: Record<string, DungeonData> }) {
  const { placed, rowCount } = packDungeonRows(dungeons);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const selectedData = selectedId ? dungeonData[selectedId] : null;

  return (
    <div>
      {selectedData && <DungeonInlinePanel data={selectedData} onClose={() => setSelectedId(null)} />}

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
                backgroundImage={dungeonData[dungeon.id]?.backgroundImage}
                row={row}
                revealed={revealed}
                index={i}
                selected={selectedId === dungeon.id}
                onSelect={(d) => setSelectedId((cur) => (cur === d.id ? null : d.id))}
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
    </div>
  );
}
