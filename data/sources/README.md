# Raw source snapshots

Dated, verbatim exports from third-party WoW: Forever data sources, kept
as-received so later sessions can diff what changed between pulls instead
of only ever seeing the latest state. Never overwrite an existing snapshot
in place -- a new pull gets a new dated file alongside the old one.

## talentsforever-YYYY-MM-DD.json

Full `data.json` export from talentsforever.com (a fan-made WoW: Forever
talent calculator). Through 2026-09-16, its own `_readme` field described
values as read off BlizzCon 2026 demo footage frame-by-frame and, in
places, checked directly against Blizzard's official Deep Dive slides.

**As of `talentsforever-2026-09-18.json`, the source fundamentally
changed**: every talent now carries `src: "beta"` (100% of 468 talents),
meaning the export is now extracted directly from the WoW Forever beta
client (per the vendor's own site changelog: build `1.60.1.69876`), not
stream/demo footage. "Estimated" as a concept is largely retired going
forward -- see the 2026-09-18 session's summary for how this changed our
own `confidence`/`confirmedRanks` handling.

Confidence signals baked into this file (used to derive our own
`confidence`/`iconPlaceholder`-style fields when ingesting it):
- Talents: `complete: true` -> confirmed. `complete: false` -> only the
  ranks listed in `confirmed: [...]` are confirmed; the rest on that
  talent are estimated (scaled/synthesized). Since 2026-09-18 essentially
  every talent is `complete: true` (beta-client extraction, not partial
  footage reads), so this distinction is close to moot going forward.
- Spell tooltips (`spell_desc`): `s: "demo"` -> confirmed (read from
  actual footage). `s: "classic"` -> estimated (Classic-era fallback, not
  yet verified for Forever). Unaffected by the `src`/beta-client change
  above, which is a talents-only field so far.

Top-level shape: `talents` (per class, trees of talents), `spellbooks`
(level-38 demo spellbook pages per class), `spell_desc` (tooltip text
keyed `Class|Spell|Rank`), `racials`, `class_racials`, `class_abilities`,
`legacy` (Legacy perk trees). `_readme` mentions a `changelog` array but no
snapshot so far has actually included one -- changelog information has
only ever come from the vendor's own site, read by hand.

**`legacy` perk shape changed as of `talentsforever-2026-09-18.json`**:
each perk was a `[name, maxRank, description, icon]` tuple through
2026-09-16; from 09-18 on it's a talent-shaped object --
`{ name, max, row, col, icon, ranks: [...], gate, req?, placeholder? }` --
matching a real 3-column (Adventure/Resourcefulness/Professions) tree
layout with prerequisites (`req`, by perk name) and point gates (`gate`,
points required in that tree). `placeholder: true` marks an
unrevealed `"Unknown"` slot. `scripts/diff-talentsforever.js` diffs perks
by tree+row+col (not name -- several placeholders share the name
"Unknown", and the main transition this data goes through is a
placeholder getting revealed in place). The one-time tuple-to-object
transition itself (09-16 -> 09-18) isn't diffed item-by-item -- tuples
carry no row/col/gate concept to match against -- the script calls this
out explicitly instead of guessing; read `legacy` in the 09-18 snapshot
directly for that one pull.

### Snapshots
- `talentsforever-2026-09-13.json` -- first full ingestion pass (Warrior/
  Paladin reconciled against our existing data, remaining 7 classes
  populated directly, spellbook tooltips wired up, Legacy Perks
  corrected, racials/class abilities merged in).
- `talentsforever-2026-09-14.json` -- rank-estimator fixes (several
  talents' non-confirmed ranks were scaling the wrong numbers, or
  scaling numbers that should've stayed fixed), ~70 spell tooltips
  upgraded from Classic fallback to real demo text (`s: "classic"` ->
  `"demo"`), two racial corrections (Human Sword Specialization, Gnome
  Eureka!), and rewritten class-spellbook notes. `class_racials.Priest`
  and `legacy` were already unchanged from the 13th by the time this was
  ingested.
- `talentsforever-2026-09-15.json` -- Talented (Legacy Perk) points-from-
  level went per-rank instead of one flat line; nine Warrior talent icons
  swapped (Spearing Strike, Bloodthrill, Weaponmaster, Boundless Rage,
  Raging Blows, Master of Defense, Vanguard, Vitality, Bastion); 20
  occurrences of Season-of-Discovery override markup stripped from
  `classic.text` across 17 entries (15 of them talents we track -- the
  "clean" text was itself still broken/truncated for 5 of those and had
  to be reconstructed, see the ingestion commit); confirmed Ice Lance/
  Arcane Blast are real talents and not on the Mage abilities card; and
  Elune's Grace/Starshards (Night Elf racials) removed from the Priest
  spellbook's Discipline tab. `class_abilities`, `legacy`, and `racials`
  were unchanged from the 14th.
  **Not yet applied:** `spell_desc` entries gained new `cs`/`cd`/`cl`
  fields (Classic-comparison status/text/stat-lines for spellbook
  tooltips, ~290 entries) that our site doesn't read anywhere -- this
  is a real new upstream feature, not something any of the day's
  changelog items called for, so it's untouched pending its own task.
- `talentsforever-2026-09-18.json` -- the beta-client switch described
  above: every talent gains `src: "beta"`, `desc` moves from sparse
  per-rank objects to full per-rank arrays for nearly every talent (466
  field-level changes across all 9 classes), and Legacy Perks moves from
  flat tuples to a real 3-column tree (see above). Also: 2 talents added
  (Rogue Flawless Execution, Warlock Wrack), 2 same-slot renames (Rogue
  Restless Blades, Warlock Drain Hope -- the talents each new one
  replaced), 2 outright removals (Warrior Vitality, Druid Balance of
  Nature), a 3-talent Warrior Protection layout reshuffle (Vitality's
  removal let Bastion and Focused Rage move slots), a 2-talent Shaman
  Restoration position swap (Tidal Mastery/Totemic Focus), a Priest
  "Shadow" -> "Shadow Magic" and Shaman "Elemental" -> "Elemental Combat"
  tab rename, dropped prereqs (Aggression no longer needs Hack and Slash,
  Conflagrate no longer needs Shadowburn), several false Priest/Human
  "Requires <form>" racial lines that were actually a usable-in-form flag
  misread as a hard requirement, a near-total racials/class_racials
  rewrite (demo guesses -> real beta values, section reordered), one new
  trainer spell (Mage Frostfire Bolt), and assorted half-second-rounding
  and `?`-placeholder value fixes. See the 2026-09-18 session's summary
  for the full list of what got applied vs. flagged for a decision.
- `talentsforever-2026-09-18-v2-data.json` -- a same-day re-pull that
  turned out to be byte-identical to `talentsforever-2026-09-18.json`
  (confirmed by md5). Nothing to sync from it; kept only because it was
  already saved, not because it carries any new data. Doesn't match this
  file's `talentsforever-YYYY-MM-DD.json` naming convention, which is also
  why `scripts/diff-talentsforever.js`'s default two-most-recent-snapshots
  picker skips it.
- `talentsforever-2026-09-18-v3-spelldesc.json` -- a later same-day pull
  that, unlike the v2 one above, is genuinely different: `talents`,
  `racials`, `legacy` and `class_abilities` are all unchanged from
  `talentsforever-2026-09-18.json`, but `spell_desc` jumped from 368 to
  1,771 entries (97.6% now `s: "beta"`) as the vendor extended the same
  beta-client extraction from talents to full per-rank spellbook tooltips
  -- e.g. `Warrior|Overpower|Rank 4` and `Warrior|Rend|Rank 7` now exist
  with real text, where before only one demo-observed rank per spell was
  ever captured. This is the source `scripts/build-talent-spell-links.js`
  reads rank-accurate spell text from for the planner talent tooltip's
  Ctrl-hold "explain N names" feature (see `data/talent-spell-links.json`
  and `lib/talent-spell-links.ts`). Also picked up 3 new spell_desc fields
  (`sc` spell school, `co` spell-power coefficient, `nt` unclear so far) --
  flagged, not yet surfaced anywhere on the site.

### Updating this data
When pulling a new snapshot, save it as a new dated file (never overwrite
an existing one), then run
`node scripts/diff-talentsforever.js` (no args: diffs the two most recent
snapshots here) before touching anything else. It covers `talents`
(added/removed/changed, with field-level call-outs and markup/whitespace-
only changes collapsed separately from substantive ones), `legacy` perks,
`spellbooks` entries and notes text, `spell_desc`, and a structural check
on `racials`/`class_racials`/`class_abilities` -- including flagging any
brand-new field it's never seen before, so a schema addition doesn't go
unnoticed just because nothing yet reads it. Apply only what the diff
shows changed; don't re-verify or re-transcribe sections it says are
identical. It writes both a markdown summary and the raw JSON diff to
`data/sources/diffs/`, and prints the markdown to stdout.

It's a pure JSON-field diff, so it can't see a changelog item with no
data-level signal at all -- a UI/UX rebuild, a CSS-only fix, copy changed
only on our own site, or (as happened for the 09-15 Talented Legacy Perk
fix) something the vendor's site changed without it ever showing up in
this raw export. Read the vendor's own `changelog` array in the new
snapshot by hand for those; the script only tells you what the data
itself changed.
