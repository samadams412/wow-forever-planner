import { Swords, ScrollText, MapPin } from "lucide-react";

// Small sticky jump nav for the dungeon loot page -- section links (Loot,
// Quests, Where quests start), icons for quick recognition. Separate from
// DungeonLootSidebar's per-boss DungeonJumpNav: that one lives in the
// sidebar (md+ only, scroll-synced per boss); this one is a lightweight
// top-of-page anchor bar so mobile visitors (no sidebar until they scroll
// past the content) have a way to jump straight to Quests on long pages.
export default function DungeonStickyNav({ hasQuests, hasQuestGivers }: { hasQuests: boolean; hasQuestGivers: boolean }) {
  return (
    <nav className="sticky top-0 z-10 -mx-3 mt-3 flex gap-1 border-b border-border bg-background/95 px-3 py-1.5 backdrop-blur sm:-mx-4 sm:px-4">
      <a
        href="#bosses"
        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted hover:bg-surface-hover hover:text-foreground"
      >
        <Swords className="h-3.5 w-3.5" aria-hidden="true" />
        Loot
      </a>
      {hasQuests && (
        <a
          href="#quests"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted hover:bg-surface-hover hover:text-foreground"
        >
          <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
          Quests
        </a>
      )}
      {hasQuestGivers && (
        <a
          href="#quest-givers"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted hover:bg-surface-hover hover:text-foreground"
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          Where quests start
        </a>
      )}
    </nav>
  );
}
