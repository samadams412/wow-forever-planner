# Raw source snapshots

Dated, verbatim exports from third-party WoW: Forever data sources, kept
as-received so later sessions can diff what changed between pulls instead
of only ever seeing the latest state. Never overwrite an existing snapshot
in place -- a new pull gets a new dated file alongside the old one.

## talentsforever-YYYY-MM-DD.json

Full `data.json` export from talentsforever.com (a fan-made WoW: Forever
talent calculator). Per its own `_readme` field: values were read off
BlizzCon 2026 demo footage frame-by-frame and, in places, checked directly
against Blizzard's official Deep Dive slides.

Confidence signals baked into this file (used to derive our own
`confidence`/`iconPlaceholder`-style fields when ingesting it):
- Talents: `complete: true` -> confirmed. `complete: false` -> only the
  ranks listed in `confirmed: [...]` are confirmed; the rest on that
  talent are estimated (scaled/synthesized).
- Spell tooltips (`spell_desc`): `s: "demo"` -> confirmed (read from
  actual footage). `s: "classic"` -> estimated (Classic-era fallback, not
  yet verified for Forever).

Top-level shape: `talents` (per class, trees of talents), `spellbooks`
(level-38 demo spellbook pages per class), `spell_desc` (tooltip text
keyed `Class|Spell|Rank`), `racials`, `class_racials`, `class_abilities`,
`legacy` (Legacy perk trees), `changelog`.

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
