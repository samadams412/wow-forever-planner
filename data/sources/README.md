# Raw source snapshots

Dated, verbatim exports from third-party WoW: Forever data sources, kept
as-received so later sessions can diff what changed between pulls instead
of only ever seeing the latest state. Never overwrite an existing snapshot
in place -- a new pull gets a new dated file alongside the old one.

## Layout (reorganized 2026-09-23, grouped by source)

```
data/sources/
  cmangos/                quest-text.json -- narrative quest text (title/
                           details/objectives/offer-reward/request-items/
                           end text) plus Classic-era chain links
                           (prevQuestId/nextQuestId/nextQuestInChain)
                           pulled from cmangos/classic-db (GPL-3.0) via
                           scripts/build-cmangos-quest-text.js. Not dated/
                           archived like the other sources below -- it's a
                           point-in-time pull from an upstream repo, not a
                           recurring beta-data pull; re-run the script to
                           refresh in place. See lib/quests.ts for how this
                           cross-references against foreverchanges' quests/
                           list.json, and for the $N/$B/$C/.../$G...:...;
                           client-escape-code sanitizing applied before
                           this text is ever rendered. A handful of
                           quest_template rows' own chain-link columns point
                           at a duplicate-named, empty-text stub row instead
                           of the real one -- lib/quests.ts's
                           CHAIN_LINK_OVERRIDES patches the one confirmed
                           case (quest 2) rather than hand-editing this
                           generated file (see that constant's own comment
                           for the rest of the scan).

                           quest-givers.json -- quest-start giver name(s)
                           per quest id, from creature_questrelation/
                           gameobject_questrelation joined against
                           creature_template/gameobject_template (same dump,
                           via scripts/build-cmangos-quest-givers.js). Name
                           only, no coordinates -- see lib/quests.ts's
                           giverName. Covers the same Classic-carryover
                           quest set quest-text.json does.
  talentsforever/         talentsforever.com pulls -- talents, racials,
                           class abilities, spellbooks, spell_desc tooltip
                           text, and the Legacy Perk trees. See below.
    talentsforever-YYYY-MM-DD.json
    diffs/                scripts/diff-talentsforever.js's output --
                           {old}_to_{new}.md/.json per pull, read by both
                           future sessions applying a changelog and
                           lib/whats-new.ts (/whats-new page)
  wowtbc/                 wowtbc.gg community-reported dungeon loot --
                           now only the fallback for the 2 dungeons
                           (gnomeregan, sm-library) foreverchanges.pro has
                           no boss-loot pull for yet
    wowtbc-loot-YYYY-MM-DD.json
  foreverchanges/         everything pulled from foreverchanges.pro: the
                           primary dungeon loot/quest source, the full
                           item catalog, and the 3 gathering professions
    dungeon_data/         <slug>.json (boss/trash/rare loot) and
                           <slug>.quests.json (quest chains), per dungeon
    quests/               list.json -- flat 5,049-quest structured listing
                           (name/level/rewards/location, short keys -- see
                           lib/quests.ts's QUEST_FIELD comment). Consumed by
                           /reference/quests + /quests/<id>, cross-referenced
                           against cmangos/quest-text.json for narrative text.
                           missing-cmangos-text.json -- the 845 list.json
                           quests with no cmangos match (new to Forever, no
                           Classic-era precedent), name/level/zone included,
                           generated via `npx tsx
                           scripts/build-missing-quest-text-list.js`.
    items/                new.json / changed.json / same.json /
                           missing.json -- the full ~21k-item catalog
      archive/<version>-<date>/   previous pull's four bucket files,
                           archived here (unchanged filenames, just
                           moved) before the live files are overwritten
                           with a new pull. Folder name is
                           <forever_build>-<forever_build_date>, e.g.
                           archive/1.60.1.69913-2026-09-18/. Keep every
                           pull's archive permanently, same as
                           talentsforever/'s dated files.
                           scripts/diff-foreverchanges-items.js's no-arg
                           mode diffs the most recent archive/ subfolder
                           against the current live files.
      sources.json         per-item single source (quest/vendor/mob/
                           crafted/world-drop/rare/dungeon-trash),
                           `{forever_build, items: {id: [code, label,
                           location]}}`. Covers ~54% of the catalog
                           (11,625/21,561 ids as of 1.60.1.70170); not
                           read by any build script as of 2026-10-02,
                           see item detail page for the consuming code.
      known-duplicate-ids.json   hand-confirmed cases of foreverchanges.pro
                           issuing a new id for an item we already have
                           under an older id (not a real new item). See
                           scripts/lib/item-duplicates.js -- build-items.js
                           and build-dungeons.js both drop these ids before
                           they can shadow the canonical id in any name-
                           based lookup, and diff-foreverchanges-items.js
                           stops reporting them as new/changed once listed
                           here. Discovered 2026-10-08, see
                           Forevercraft-Knowledge-Base/03-Handoffs/
                           data-pipeline/2026-10-08-foreverchanges-item-diff.md
    item-category-labels.json      c:u item-class/subclass -> display
                                    label, built by
                                    build-item-category-labels.js
    item-tooltip-overlay-<date>.json   scoped re-fetch of "same"-status
                                        items actually referenced site-
                                        wide, merged onto items/*.json at
                                        build time (see fc-item.js)
    gathering-professions-<date>.json  Mining/Herbalism/Skinning raw pull
```

Before this reorg, every dated file and both foreverchanges_* directories
sat flat under `data/sources/` together -- functionally fine, but it made
"which source does this file belong to" a guessing game as the number of
sources grew from one (talentsforever) to three. Every script under
`scripts/` and the one runtime reader (`lib/whats-new.ts`) were updated to
the new paths in the same change that moved the files; if you're reading
an older commit's version of a script, expect the flat paths instead.

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
`data/sources/talentsforever/diffs/`, and prints the markdown to stdout.

It's a pure JSON-field diff, so it can't see a changelog item with no
data-level signal at all -- a UI/UX rebuild, a CSS-only fix, copy changed
only on our own site, or (as happened for the 09-15 Talented Legacy Perk
fix) something the vendor's site changed without it ever showing up in
this raw export. Read the vendor's own `changelog` array in the new
snapshot by hand for those; the script only tells you what the data
itself changed.

## wowhead/

- `wowhead/quests/scraped_quests_output.json` -- raw local scrape of Wowhead Forever quest pages (5.4MB, 838 entries, contains page-script junk). **Gitignored**; not needed at runtime.
- `wowhead/quest-text.json` -- parsed output (816 quests) in the same row shape as `cmangos/quest-text.json`, built by `node scripts/build-wowhead-quest-text.js`. Only consulted by `lib/quests.ts` for quests cMaNGOS has no row for.
- `wowhead/quest-extras.json` -- optional per-quest fields from the same scrape (829 quests): `xp`, `reputation`, `start`/`end` NPC name+id, `items` (mentioned item ids), `points` (start/end zone-percent map coords, stored but not rendered yet). Written by the same script. `lib/quests.ts` merges XP (only where list.json has 0), reputation, giver/turn-in and mentioned items.
