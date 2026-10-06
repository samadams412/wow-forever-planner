"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import QuestCard from "@/components/reference/QuestCard";
import type { Quest } from "@/lib/dungeon-loot";

const FACTION_GROUPS: { key: "Alliance" | "Horde" | "Both" | "none"; label: string }[] = [
  { key: "Both", label: "Both Factions" },
  { key: "Alliance", label: "Alliance" },
  { key: "Horde", label: "Horde" },
  { key: "none", label: "Quests" },
];

type FactionChoice = "all" | "Alliance" | "Horde";

const FILTER_STORAGE_KEY = "forevercraft:quest-faction-filter";
// Emblems are different aspect ratios (Alliance is wide, Horde is square), so
// both sit in the same 16px box with object-contain -- neither dominates the chip.
const FILTER_CHOICES: { key: FactionChoice; label: string; emblem?: string }[] = [
  { key: "all", label: "All" },
  { key: "Alliance", label: "Alliance", emblem: "/images/icons/faction-alliance.png" },
  { key: "Horde", label: "Horde", emblem: "/images/icons/faction-horde.png" },
];

// Remembered per viewer, not shared: a Horde player who picks "Horde" once
// sees it on every dungeon. Storage can be blocked (private windows, cleared
// site data), so every access is guarded and the filter just falls back to
// "All" without it.
function readSavedChoice(): FactionChoice {
  try {
    const saved = window.localStorage.getItem(FILTER_STORAGE_KEY);
    return saved === "Alliance" || saved === "Horde" ? saved : "all";
  } catch {
    return "all";
  }
}

// Same-tab changes don't fire the "storage" event, so saving also dispatches
// this one -- every mounted card (and the other tabs, via "storage") re-reads.
const CHANGE_EVENT = "forevercraft:quest-faction-change";

function saveChoice(choice: FactionChoice) {
  try {
    window.localStorage.setItem(FILTER_STORAGE_KEY, choice);
  } catch {
    // Not persisted this time -- the in-memory choice still applies.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// A faction-only quest is hidden when the other faction is chosen; shared
// ("Both") and unlabelled quests are always kept, since they apply to everyone.
function matchesChoice(quest: Quest, choice: FactionChoice): boolean {
  if (choice === "all") return true;
  return !quest.faction || quest.faction === "Both" || quest.faction === choice;
}

// One "Quests" section for a dungeon -- a distinct card from the boss-loot
// cards above it (same border/bg language). Grouped by faction (Hall of
// Thanes' "Alliance Only" / Ragefire Chasm's "Horde Only") rather than one
// flat list, since several dungeons mix faction-restricted and shared
// quests; a dungeon with only one faction value present renders that one
// group with no heading noise from the others. The faction chips only show
// when the dungeon has faction-only quests to filter between.
export default function LootQuestRewardsCard({
  quests,
  dungeonId,
  dungeonName,
}: {
  quests: Quest[];
  dungeonId: string;
  dungeonName: string;
}) {
  // The server snapshot is "all", so the server render and first client render
  // match; the saved choice is picked up on the client right after hydration.
  const choice = useSyncExternalStore(subscribe, readSavedChoice, (): FactionChoice => "all");

  if (quests.length === 0) return null;

  const hasFactionOnly = quests.some((q) => q.faction === "Alliance" || q.faction === "Horde");
  const visibleQuests = quests.filter((q) => matchesChoice(q, choice));

  const groups = FACTION_GROUPS.map((g) => ({
    ...g,
    quests: visibleQuests.filter((q) => (q.faction ?? "none") === g.key),
  })).filter((g) => g.quests.length > 0);
  // No faction grouping to show (every quest shares one value) -- fall back
  // to a flat list so a single-faction dungeon doesn't get a redundant
  // group heading.
  const showGroupHeadings = groups.length > 1;

  function selectChoice(next: FactionChoice) {
    saveChoice(next);
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-heading text-base font-semibold text-accent">
          <Image src="/images/icons/available.png" alt="" width={18} height={18} />
          Quests
        </h3>
        {hasFactionOnly && (
          <div role="group" aria-label="Filter quests by faction" className="inline-flex rounded border border-border bg-background p-0.5 text-[11px]">
            {FILTER_CHOICES.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={choice === option.key}
                onClick={() => selectChoice(option.key)}
                className={`inline-flex items-center rounded-sm px-2 py-0.5 font-semibold transition-colors ${
                  choice === option.key ? "bg-accent/20 text-accent" : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {option.emblem && (
                  <Image src={option.emblem} alt="" width={16} height={16} className="mr-1 h-4 w-4" style={{ objectFit: "contain" }} />
                )}
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <p className="mt-3 text-xs text-foreground-muted">No {choice} quests in this dungeon.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.key}>
              {showGroupHeadings && (
                <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">{group.label}</h4>
              )}
              <div className="flex flex-col gap-4">
                {group.quests.map((quest) => (
                  <QuestCard key={quest.id} quest={quest} dungeonId={dungeonId} dungeonName={dungeonName} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
