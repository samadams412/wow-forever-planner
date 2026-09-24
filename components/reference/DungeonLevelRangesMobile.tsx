"use client";

import { useState } from "react";
import { type Dungeon } from "@/lib/dungeons";
import DungeonInlinePanel from "@/components/reference/DungeonInlinePanel";
import type { DungeonData } from "@/lib/dungeon-loot";

// The desktop timeline positions each dungeon on a horizontal level-range
// axis, which only works with room to scroll sideways -- exactly what a
// phone-width viewport doesn't have. Rather than reflowing DungeonBar's own
// positioned-on-an-axis layout with breakpoint classes (fighting its own
// grid-column-as-level-position mechanism), this is a genuinely different
// layout: one plain vertical list, sorted low-to-high level, each dungeon
// full-width instead of column-positioned. Reuses the same DungeonData
// (background art, New/Classic distinction, DungeonInlinePanel) rather than
// rebuilding any of that.
type Filter = "all" | "new" | "classic";

function DungeonRow({
  dungeon,
  data,
  selected,
  onSelect,
}: {
  dungeon: Dungeon;
  data: DungeonData | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const isNew = dungeon.type === "new";
  const backgroundImage = data?.backgroundImage;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      style={{
        backgroundImage: backgroundImage
          ? `linear-gradient(rgba(10,8,6,0.55), rgba(10,8,6,0.7)), url(${backgroundImage})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      className={`flex h-16 w-full shrink-0 items-center justify-between overflow-hidden rounded-lg px-3 text-left transition-colors ${
        isNew
          ? `border-2 ${selected ? "border-accent bg-accent/40" : "border-accent"}`
          : `border ${selected ? "border-accent bg-accent/25" : "border-accent/20"}`
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {isNew && (
          <span className="shrink-0 rounded-sm bg-green-600/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
            New
          </span>
        )}
        <span className="truncate font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
          {dungeon.name}
        </span>
      </span>
      <span className="shrink-0 pl-2 text-xs text-white/85 [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">
        {dungeon.levelMin}-{dungeon.levelMax}
      </span>
    </button>
  );
}

export default function DungeonLevelRangesMobile({
  dungeons,
  dungeonData,
}: {
  dungeons: Dungeon[];
  dungeonData: Record<string, DungeonData>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const sorted = [...dungeons].sort((a, b) => a.levelMin - b.levelMin || a.levelMax - b.levelMax);
  const filtered = filter === "all" ? sorted : sorted.filter((d) => d.type === filter);

  const filterClass = (v: Filter) =>
    `flex-1 rounded-sm px-2 py-1.5 text-center text-xs font-medium transition-colors ${
      filter === v ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
    }`;

  return (
    <div>
      {/* Real filter, not just a legend -- a static color-key legend (the
          desktop timeline's own approach, where the New/Classic distinction
          is already visible at a glance across a wide horizontal axis) is
          less useful once all 35 dungeons are a single scrolling column;
          filtering the list down is worth more here. */}
      <div className="mb-3 flex gap-1 rounded border border-border bg-surface p-0.5">
        <button type="button" onClick={() => setFilter("all")} className={filterClass("all")}>
          All {dungeons.length}
        </button>
        <button type="button" onClick={() => setFilter("new")} className={filterClass("new")}>
          New Dungeons {dungeons.filter((d) => d.type === "new").length}
        </button>
        <button type="button" onClick={() => setFilter("classic")} className={filterClass("classic")}>
          Classic Dungeons {dungeons.filter((d) => d.type === "classic").length}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((dungeon) => {
          const data = dungeonData[dungeon.id];
          const selected = selectedId === dungeon.id;
          return (
            <div key={dungeon.id}>
              <DungeonRow
                dungeon={dungeon}
                data={data}
                selected={selected}
                onSelect={() => setSelectedId((cur) => (cur === dungeon.id ? null : dungeon.id))}
              />
              {/* Opens directly under the tapped row (an accordion), not
                  pinned to the top of the list the way the desktop timeline
                  places it above the whole chart -- with 35 rows in a
                  scrolling column, jumping back to the top on every tap
                  would fight the list instead of reading as part of it.
                  DungeonInlinePanel already stacks its own art/tabs
                  vertically below `sm`, so no changes were needed there. */}
              {selected && data && (
                <div className="mt-2">
                  <DungeonInlinePanel data={data} onClose={() => setSelectedId(null)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
