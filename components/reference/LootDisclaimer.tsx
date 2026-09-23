// This dungeon's item data (icons, stats, and each item's new/changed/
// same/missing-vs-Classic status) is read from the WoW Forever beta client
// via foreverchanges.pro -- the same tier of confidence as this site's own
// talent/spellbook data. What's still NOT beta-confirmed, for original
// (non-launch) dungeons: which boss actually drops which item, and at what
// chance -- those are still Classic's own known loot tables carried
// forward, same as foreverchanges' own equivalent page states. New-in-
// Forever dungeons don't have this caveat -- every drop shown for those was
// observed on an actual boss in the beta.
function ForeverchangesDisclaimer({ isClassic }: { isClassic: boolean }) {
  return (
    <div className="rounded border border-sky-400/40 bg-sky-400/5 px-3 py-2.5 text-xs text-foreground-muted">
      <p>
        <span className="font-semibold text-sky-300">Item data is beta-client sourced.</span> Icons,
        stats, and each item&apos;s new/changed/same-since-Classic status come from{" "}
        <a
          href="https://foreverchanges.pro/dungeons"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline hover:text-accent-hover"
        >
          foreverchanges.pro
        </a>
        , which reads the WoW Forever beta client directly.
      </p>
      {isClassic && (
        <p className="mt-1.5">
          Which boss drops which item, and the drop chances, are still Classic&apos;s own loot tables
          carried forward -- not yet confirmed boss-by-boss for Forever.
        </p>
      )}
    </div>
  );
}

// Deliberately NOT the green-checkmark VerificationBanner language used for
// talent/spellbook data (SpellbookBook.tsx) -- that means something
// specific (read straight from the beta client's own files). This data is
// the opposite: community-crowdsourced, explicitly provisional, and never
// confirmed against the beta client. Amber/caution styling instead of a
// confirmed-green one, so the two are never visually confusable.
function WowtbcDisclaimer() {
  return (
    <div className="rounded border border-amber-400/40 bg-amber-400/5 px-3 py-2.5 text-xs text-foreground-muted">
      <p>
        <span className="font-semibold text-amber-300">Community-reported, not confirmed.</span> This
        loot data comes from{" "}
        <a
          href="https://wowtbc.gg/warcraftforever/loot-tables/dungeons/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline hover:text-accent-hover"
        >
          wowtbc.gg
        </a>
        &apos;s community-sourced WoW Forever loot tables, not the beta client -- unlike the talent and
        spellbook data elsewhere on this site, none of it is verified against the game&apos;s own files.
      </p>
      <p className="mt-1.5">
        Loot is still being discovered. Drops for the original (non-launch) dungeons are carried over
        from Classic Era loot tables and may have moved since. Treat this as a starting point, not a
        confirmed source -- expect corrections as the beta continues.
      </p>
    </div>
  );
}

export default function LootDisclaimer({
  source,
  dungeonType,
}: {
  source?: "foreverchanges" | "wowtbc" | null;
  dungeonType?: "new" | "classic";
}) {
  if (source === "foreverchanges") return <ForeverchangesDisclaimer isClassic={dungeonType === "classic"} />;
  return <WowtbcDisclaimer />;
}
