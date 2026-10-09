---
type: design
created: 2026-10-06
tags: [forevercraft, bis, design]
status: draft
---

# BIS builder: design doc

Related: [[Competitor-Analysis-2026-10-06]] · [[Roadmap]] · [[Architecture]]

**Status:** design only. No build is scheduled before level-60 data lands (see "Blocked on level-60 data"). Nothing here touches app code.

## Goal

A gear planner that sits next to the talent planner, so a user chooses class, spec and race once and gets talents and gear from the same flow. Forevercraft already does the first half. This adds the gear half.

Positioning, per [[CLAUDE.md]]: one continuous decision, not three separate tools.

## Decisions to make now

### 1. Persistence: reuse the Planner's model, not a new one

The Planner persists in three ways. Check `lib/` before choosing:

- **Shareable state in the URL.** `lib/build-code.ts` encodes a talent build as a versioned, positional code, and the route is `/planner/<classId>/<buildCode>`. Shared links are the core of sharing.
- **Per-device saves in localStorage.** `lib/saved-builds.ts` (`forevercraft:saved-builds`) holds named builds with classId and buildCode. `try/catch` everywhere.
- **Build tracking.** `lib/build-tracking-*` counts share/save/open events in Upstash, using HMAC-hashed tokens. Collection only, nothing reads it yet.

**Recommendation: a gear build should reuse all three.**

- Put gear in the same URL structure. Options:
  - (a) Extend the code with a gear segment after the talent segment, e.g. `/planner/<classId>/<buildCode>?g=<gearCode>`. Query params stay out of the route catch-all and don't disturb the existing parser.
  - (b) A sibling route, `/bis/<classId>/<specId>/<gearCode>`. Clean, but splits the mental model and duplicates OG/route plumbing.
  - **Lean: (a).** Keeps "one decision, one link". The query param must be ignored by the existing talent decoder so old links still work.
- Gear code uses the same versioning discipline as `build-code.ts`. Each gear slot's candidate list is positional, so any reorder of the candidate list for a slot needs a version bump, or old codes silently point at different items. The same warning applies: the versioning machinery must not be removed because it looks unused.
- Saved gear builds go in localStorage, keyed the same way as talent builds, or as an extra field on `SavedBuild` (optional, backwards compatible).
- Share counts can reuse `build-events.ts` with a new event subject. Don't add a new pipeline.

**Not recommended:** accounts, a database, or a new storage layer. That conflicts with the shelved Postgres/Auth decision (see [[Roadmap]] "Shelved"). The planned KV work is the place for "popular builds"; gear builds should feed the same counts later.

### 2. Data model: gear by class/spec/slot

Gear is a candidate list per (class, spec, slot). Items come from the existing catalog, not from a copy.

```
data/bis/
  <classId>/<specId>.json       # one file per spec (PvE/PvP/Tank as specId variants)
```

Shape (per spec file):

```json
{
  "class": "warrior",
  "spec": "pve",
  "level": 30,
  "slots": {
    "head": [
      { "itemId": 12345, "rank": 1, "source": "dungeon", "sourceNote": "...", "confidence": "confirmed" }
    ]
  }
}
```

Points that matter:

- **`itemId` is the only item reference.** Name, icon, quality, tooltip, source all come from `data/items.json` by id. This follows the item normalization already done for dungeon loot and quest rewards ([[Roadmap]] "Tech debt" lists what still embeds full records). Don't copy item records into BIS data.
- **Slots must use one canonical enum.** `data/items.json` is inconsistent today: `Main Hand` vs `One-Hand`, `Off Hand` vs `Held In Off-hand`, `Two-Hand`, and 9,479 of 21,625 items have `slot: null`. A slot-mapping table (catalog value → BIS slot) is a prerequisite. Don't key BIS data on the raw catalog strings.
- **`rank` is editorial.** Store the order explicitly. Don't derive it from stats.
- **`confidence` follows the project rule** (`confirmed` | `datamined` | `estimated`). Anything unverified is `estimated`, never silent. Competitors label this in-line ("reported, not checked"); Forevercraft should use its existing `ConfidenceBadge`.
- **Stat weights, if shown, are per spec and separate from rank.** ForeverChanges' PvE list states its priorities in prose; don't encode weights until there's a sourced basis.

### 3. Custom builder vs. hardcoded presets at launch

**Recommendation: custom builder first. Presets come later, as data, not as UI.**

Reasons:
- Presets are only as good as the ranking behind them, and the ranking can't be checked until level-60 gear exists. Shipping level-30 presets now means rewriting them at launch.
- The custom builder is what the planner flow needs: pick a slot, choose from its candidates, see the result next to the talent tree. Presets are then just prefilled builds, which is cheap to add once the builder works.
- Competitor presets are the editorial product. Forevercraft's differentiator is the unified flow plus the guides/blog, so presets should be written as guides (linked from the builder), not as a second system.

**Launch scope proposal:** builder with candidate lists per slot, the three spec variants per class where the data exists, and the confidence labels. Presets only if the data is verified for level 60 by then.

### 4. wow.export: what is a prerequisite and what isn't

Checked against the repo:

- **Item icons.** `data/items.json` records carry `icon` (an icon name such as `inv_shirt_12`), and `data/icons/` has 20 files, `public/icons/` is empty. So icon *names* exist for all items, but icon *art* for most of the catalog is not in the repo. Whether the existing item pages render art today is unverified; check the `LootItemPill` path before deciding this. **If art is needed, it's a prerequisite of the November extraction, not of this feature.**
- **Model assets (character/paper-doll art).** Not needed for a slot list. Only needed for a visual paper doll. **Defer; not a prerequisite.** The competitors use cosmetic character models, which is the part Forevercraft can skip.
- **Full item catalog and tooltips.** Already in `data/items.json` (21,625 items). The November extraction improves coverage; the BIS design doesn't block on it, as long as `itemId` stays the join key.

## Blocked on level-60 data

These parts must not be decided on level-30 data. Everything else above can be built on what exists.

| Area | Why it depends on level 60 | What to do now |
|---|---|---|
| Ranking within each slot | Candidate order is only meaningful for the level the player is at. Level-30 order will change at 60. | Design the schema (rank field, per-level). Don't populate rankings until 60 data exists. |
| Candidate lists per spec | Many level-30 items are replaced at 60. Lists must be built per level. | Add a `level` field to each spec file now; ship one level. |
| Drop-rate and source figures | Sources change with the level-60 content. Classic drop rates are a proxy until beta data exists. | Store `source` and `confidence`; leave drop-rate fields empty. |
| Enchants and consumables | Enchant recipes and buffs in the beta are being rebalanced. | Out of scope for v1. |
| Stat weights | Depends on level-60 gear and spec priorities. | Don't encode. |
| PvP variant lists | PvP gear and honor rewards may not exist at 60 in the same form. | Confirm whether PvP lists are in scope at 60 before designing the variant key. |

**Decision to revisit after level-60 data lands:** whether the candidate list per slot is a *ranked* list (ForeverChanges style) or a *filtered* list (all valid items for the slot, sorted by the user). Choose after seeing the 60 data volume; the schema above supports both.

## Build plan (after level-60 data; not now)

1. Slot-mapping table (catalog value → BIS slot). Needed regardless of the BIS build; it also fixes the catalog's inconsistent slot strings.
2. `data/bis/<class>/<spec>.json` schema + validator, one class first (same approach as the talent planner's one-class-first rule).
3. Gear code encoding with versioning, in `lib/bis-code.ts`, following `lib/build-code.ts`.
4. Builder UI in `/planner`: slot picker beside the talent tree. Per-slot candidate list, confidence label on each item.
5. Persistence: extend the URL with a gear param and the localStorage save. Reuse build-tracking events.
6. Presets, written as guides, linked from the builder.

## Open questions

- Does the existing `LootItemPill` render item art today? (Determines whether icon work is needed before launch.)
- Should PvP and Tank variants be separate spec files or a `variant` field on one spec file?
- Does the gear code go in the query string or a path segment? (Lean: query string, see above.)
- Who writes the rankings? A single author is the realistic answer; say so in the data notes.
