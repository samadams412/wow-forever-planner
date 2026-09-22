// Deliberately NOT the green-checkmark VerificationBanner language used for
// talent/spellbook data (SpellbookBook.tsx) -- that means something
// specific (read straight from the beta client's own files). This data is
// the opposite: community-crowdsourced, explicitly provisional, and never
// confirmed against the beta client. Amber/caution styling instead of a
// confirmed-green one, so the two are never visually confusable.
export default function LootDisclaimer() {
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
