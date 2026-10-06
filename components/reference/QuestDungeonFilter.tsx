"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { QuestDungeonOption } from "@/lib/quests";

// The Dungeon filter as a dropdown inside the location-kind tab row. "All
// dungeons" is the old blanket view (kind=dungeon); picking a dungeon narrows
// to its quests. Every other param -- kind, search, sort, direction -- is kept,
// so the dungeon choice composes with the rest instead of resetting them.
// Paging resets, as it does for every other filter change.
export default function QuestDungeonFilter({
  options,
  value,
  allCount,
  dungeonActive,
}: {
  options: QuestDungeonOption[];
  // A dungeon id, "all" for the blanket dungeon view, or "" when the Dungeon
  // filter is off.
  value: string;
  allCount: number;
  // Whether the Dungeon segment itself is highlighted as active.
  dungeonActive: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Clears the dungeon filter entirely -- back to the unfiltered "All" tab --
  // while keeping search and sort. The dropdown's own "All dungeons" option
  // only switches to the blanket dungeon view, so it can't do this.
  function handleClear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("kind");
    params.delete("dungeon");
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.set("kind", "dungeon");
      params.delete("dungeon");
    } else {
      params.set("dungeon", next);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <label
      className={`inline-flex items-center rounded-sm px-2 py-1 transition-colors ${
        dungeonActive ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
      }`}
    >
      <span className="sr-only">Dungeon</span>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="cursor-pointer bg-transparent text-xs focus:outline-none [&_option]:bg-surface [&_option]:text-foreground"
      >
        <option value="" disabled>
          Dungeon
        </option>
        <option value="all">All dungeons ({allCount.toLocaleString()})</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} ({option.count.toLocaleString()})
          </option>
        ))}
      </select>
      {dungeonActive && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear dungeon filter"
          title="Clear dungeon filter"
          className="ml-1 px-0.5 text-sm leading-none text-foreground-muted hover:text-foreground"
        >
          ×
        </button>
      )}
    </label>
  );
}
