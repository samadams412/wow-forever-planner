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

### Updating this data
When pulling a new snapshot, save it as a new dated file (never overwrite
an existing one) and diff it against the previous snapshot before
touching anything else -- covering at minimum `talents`, `spell_desc`,
`racials`, `class_racials`, `class_abilities`, and `legacy`. Apply only
what the diff shows changed; don't re-verify or re-transcribe sections
the diff says are identical. A throwaway diff script is fine -- it
doesn't need to be kept or polished, just accurate. Also check
`spellbooks[cls].notes` in the diff: it's prose describing the same
per-class findings and has repeatedly carried real corrections (e.g. the
09-14 Shield Wall fix) that don't otherwise show up in `spell_desc`.
