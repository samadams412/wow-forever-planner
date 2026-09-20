# Forevercraft — Site Overview & Audit

**Last verified:** 2026-09-20, against commit `10845ff` on `main`, by direct
inspection of the codebase (routes, components, data files, `npm audit`,
`git log`) — not from memory of past sessions. Where this document's
findings disagree with `CLAUDE.md`'s own architecture notes or
`docs/adding-content.md`, that's called out explicitly rather than quietly
preferring one source.

**Follow-up pass, same day:** several quick-win gaps this audit surfaced
were fixed immediately after review rather than left to rot as a backlog —
see §4 for the marked-done list. `docs/adding-content.md` was corrected in
the same pass. Findings below describe what was found; §4 tracks what was
actually done about it.

**On scope:** the task that produced this document asked to read
`CLAUDE.md` and `CLAUDE_CMS.md` first. **`CLAUDE_CMS.md` does not exist
anywhere in this repository** — only `CLAUDE.md` (project root) and
`AGENTS.md` (a Next.js–generated file, unrelated to CMS content) are
present. This document was produced from `CLAUDE.md` plus direct codebase
inspection only; if `CLAUDE_CMS.md` exists somewhere else (a different
branch, a local untracked file, a different machine), it wasn't found here
and its absence should be double-checked before assuming this document is
complete.

This is a living reference, not a one-time status update — update it
directly (like `CLAUDE.md`) rather than letting it drift out of sync with
the codebase.

---

## 1. Site map / file structure overview

### 1.1 `app/` — routing structure

The router is the App Router. One route (the planner) uses an **optional
catch-all** segment specifically to support a URL shape shorter than its
own tree depth; a sibling static route deliberately escapes that catch-all
to host a Route Handler the file-convention OG-image mechanism can't reach.

| Route | Type | Metadata | OG image |
|---|---|---|---|
| `/` (`app/page.tsx`) | static | **no own export** — inherits root `app/layout.tsx`'s static `metadata` | none of its own; layout's `openGraph.images` → static `public/images/og/opengraph.png` |
| `/planner/[[...slug]]` | **optional catch-all**, handles `/planner`, `/planner/<class>`, `/planner/<class>/<build>`, plus a legacy 3-segment redirect (old race-in-URL links) | `generateMetadata` (dynamic) — sets `alternates.canonical: "/planner"` unconditionally, and `openGraph.images` only when a decoded build has ≥1 point spent | **Route Handler**, not the file convention: `app/planner/og/[classId]/[buildCode]/route.tsx`. A catch-all must be the terminal segment of its own route, so `opengraph-image.tsx` can't live inside `[[...slug]]/`; the static sibling path wins routing priority for anything under `/planner/og/*`. Falls back to the layout's static PNG with no build/points. |
| `/reference` | static | static `metadata` | own `opengraph-image.tsx` |
| `/reference/racials` | static | static `metadata` | own `opengraph-image.tsx` |
| `/reference/legacy-perks` | static | static `metadata` | own `opengraph-image.tsx` |
| `/reference/class-spellbooks` | static | static `metadata` | own `opengraph-image.tsx` |
| `/reference/dungeons` | static | static `metadata` | own `opengraph-image.tsx` |
| `/reference/professions` (index) | static | static `metadata` | own `opengraph-image.tsx` |
| `/reference/professions/[slug]` | dynamic slug | `generateMetadata` (async, per-profession frontmatter) | own dynamic `opengraph-image.tsx` |
| `/guides` (index) | static | static `metadata` | own `opengraph-image.tsx` |
| `/guides/[slug]` | dynamic slug | `generateMetadata` (async) | own dynamic `opengraph-image.tsx` |
| `/blog` (index) | static | static `metadata` | own `opengraph-image.tsx` |
| `/blog/[slug]` | dynamic slug | `generateMetadata` (async) | own dynamic `opengraph-image.tsx` |
| `/whats-new` | static | static `metadata`, sets `robots: {index:false, follow:false}` | none |
| `app/robots.ts` | Route Handler (metadata file convention) | — | — |
| `app/sitemap.ts` | Route Handler (metadata file convention) | — | — |
| `app/not-found.tsx` | special file | — | — |

None of the three dynamic-slug content routes (`guides/[slug]`,
`blog/[slug]`, `reference/professions/[slug]`) set an explicit
`alternates.canonical` — only `/planner` does, deliberately, to consolidate
every class/build variant's ranking signal onto the bare `/planner` URL.
See §3e for whether the other three should follow suit.

### 1.2 `data/` — game data

| File | Shape | Hand-authored or derived? |
|---|---|---|
| `races.json` | `{id, name, faction, allowedClasses[], notes, icon}[]` | Hand-authored; some entries note reconciling two disagreeing sources |
| `racials.json` | Object keyed by race id → `{name, type, description, confidence, icon}[]` | Hand-authored, synced from vendor pulls by **name-match**, not array position |
| `class-racials.json` | Object keyed by class → `{note, source, races: {RaceName: [...]}}` | Hand-authored/synced; currently only Priest is populated |
| `class-abilities.json` | Object keyed by class → `{abilities: [{name, description, icon}]}` | Hand-authored, backs the "New & changed abilities" section |
| `dungeons.json` | Array + a `_readme` provenance note | Hand-authored, sourced from Wowhead — **not** talentsforever, a different provenance line than everything else here |
| `legacy-perks.json` | `{source, spendCap, earnCapNote, mountCostNote, expansionNote, trees:[...]}`, talent-tree-shaped | Hand-authored/synced from the vendor's `legacy` section |
| `spellbooks.json` (~40.6k lines) | `{source, classes: {classId: {demoRace, notes[], notOpened[], tabs:[{name, spells:[...]}]}}}` | **Derived** — regenerated by `scripts/build-spellbooks.js`, with a few hand-curated fields preserved across regeneration (see §1.6) |
| `talent-spell-links.json` | `"class:talentId"` → `{name, kind, source, description, icon}[]` | **Derived** — regenerated by `scripts/build-talent-spell-links.js`; the file itself carries a "don't hand-edit, regenerate" comment |
| `data/talents/{class}.json` × 9 | `{class, trees:[{name, talents:[{id, name, tier, col, maxRank, ranks[], confidence, prereq, status, icon, classic:{...}}]}]}` | Hand-authored/synced; matches the schema `CLAUDE.md` documents |
| ~~`data/talents/talent_data.json`~~ | Vendor's **raw** shape (`{Warrior: {trees:[{talents:[{name, max, row, col, ...}]}]}}` — capitalized class keys, `row`/`max`/`desc` instead of `tier`/`maxRank`/`ranks`) | **Deleted as a follow-up to this audit.** A repo-wide grep confirmed zero references anywhere in `.ts`/`.tsx`/`.js`; `git log` traced it to a single commit (`d58c4b4`, merging Classic-comparison data for Warrior) with no further activity since — a staging file left behind after that merge landed. Removed via `git rm`. |

**`data/sources/`** holds dated, immutable `talentsforever-YYYY-MM-DD.json`
snapshots — a new pull always gets a new file, per `data/sources/README.md`.
Three filenames don't match that plain pattern; all three are confirmed
benign, not orphaned data:
- `talentsforever-2026-09-15-old.json` — excluded from the diff script's
  auto-picker by its own regex (`^talentsforever-\d{4}-\d{2}-\d{2}\.json$`),
  though the README's prose doesn't explain the `-old` suffix — a minor
  doc gap.
- `talentsforever-2026-09-18-v2-data.json` — confirmed **byte-identical**
  (md5) to the same-day plain file; a redundant re-pull kept around, no
  new data.
- `talentsforever-2026-09-18-v3-spelldesc.json` — genuinely different:
  `spell_desc` jumped from 368 to 1,771 entries as the vendor extended
  beta-client extraction to full per-rank tooltips. This is the actual
  source `build-talent-spell-links.js` reads.

Both `-v2`/`-v3` files deliberately don't match the plain naming pattern so
the diff script's two-most-recent picker skips them.

### 1.3 `content/` — guides/blog/professions

| Directory | Count | Notes |
|---|---|---|
| `content/blog/*.mdx` | 5 published | `classic-plus-new`, `deep-dive-panel-notes-2`, `launch-day-beta`, `mount-hyjal`, `zephras-isle` |
| `content/guides/*.mdx` | **0** | **Clarified after this audit's first pass:** `content/guides/` was confirmed to be an empty, untracked directory (git doesn't track empty dirs) — literally empty because everything ever placed there was moved out over time: a Mount Hyjal zone guide moved to `content/blog/` early on, then the 7 profession write-ups that later drafted there moved to `content/professions/`. The now-empty directory itself was removed as a follow-up to this audit (harmless — `lib/content.ts`'s loader already tolerates a missing directory, returning `[]`, confirmed by rebuilding after removal). **This does not close the underlying gap**, though: guides remain a stated core content pillar in the site brief, the `/guides` route and full pipeline (`lib/guides.ts`, MDX component mapping, sitemap inclusion) are live and working, and there is currently zero authored guide content to put through it. See §3c. |
| `content/professions/*.mdx` | 7 published | alchemy, blacksmithing, cooking, enchanting, engineering, first-aid, tailoring — migrated from `content/guides/` drafts in an earlier session (see above) |

`lib/content.ts` is a small shared loader (`listContentSlugs(dir)`,
`readContentFile<Frontmatter>(dir, slug)` — gray-matter over the
filesystem, generic over frontmatter shape). `lib/guides.ts` and
`lib/professions.ts` both wrap it thinly and are structurally
near-identical (list → map → filter `published` → sort), differing only in
frontmatter shape and sort order (guides: newest-first by `date`;
professions: alphabetical by `title`, since they're evergreen reference
material). **`lib/blog.ts` is still not on this shared loader** — it has
its own independent `fs`/`gray-matter` calls duplicating exactly what
`lib/content.ts` factors out — confirmed still true, a live refactor
candidate rather than something fixed along the way.

### 1.4 `components/` — major shared components and every consumer

| Component | What it does | Every consumer (confirmed by import grep) |
|---|---|---|
| `TalentTreeGrid` (`planner/`) | One talent tree's grid: background, connector arrows, per-cell `TalentNode`s; reads `lib/talent-rules.ts` for tier-unlock gating | `app/planner/[[...slug]]/PlannerClient.tsx` only |
| `TalentNode` (`planner/`) | One talent icon: click/tap-to-spend, rank display, hover tooltip, mobile long-press-peek, Ctrl-hold linked-spell expansion, single-tooltip-owner integration, scroll-vs-tap disambiguation, haptic pulse | Reached only through `TalentTreeGrid` — i.e. only the planner |
| `SpellbookBook` (`reference/`) | Full spellbook UI: book view + by-level view, tag pills, tooltips | `PlannerClient.tsx` (embedded, collapsed by default) **and** `ClassSpellbooksReference.tsx` → `/reference/class-spellbooks` |
| `ClassAbilitiesSection` (`reference/`) | "New & changed abilities" sub-section (exports `AbilityCard` too) | Same two call sites as `SpellbookBook` |
| `TooltipCard` (`planner/`) | Shared tooltip-primitive rendering, despite living under `planner/` | `SpellbookBook.tsx`, `LegacyPerkNode.tsx`, and `TalentNode.tsx` (same-directory sibling import) |
| `RaceReferenceTable` (`reference/`) | Full race/racials table | `PlannerClient.tsx` (inline below the trees) **and** `RacialsReference.tsx` → `/reference/racials` |
| `RacePicker` (`planner/`) | Compact class-filtered race column with popover racials | **Confirmed genuinely unused** — zero imports anywhere. Left on disk deliberately per an earlier explicit "don't touch it" decision when it was pulled out of the planner for width. |
| `LegacyPerkTreeGrid` / `LegacyPerkNode` (`reference/`) | 3-column Legacy Perks tree, mirroring the talent grid's layout but with its own gating (`lib/legacy-perks.ts`, not `talent-rules.ts`) | `LegacyPerksReference.tsx` → `/reference/legacy-perks` only — no planner usage |
| `DungeonsTimeline` (`reference/`) | Dungeon level-range chart | `/reference/dungeons` only |
| `ProfessionImage` (`professions/`) | Profession image, **no credit line** | `/reference/professions/[slug]` directly, and via `components/professions/mdx-components.tsx`'s `GuideImage → ProfessionImage` tag mapping |
| `GuideImage` (`guides/`) | Guide/blog image, hardcodes a Blizzard-reveal-screenshot credit **unless overridden** — see §3b, this is more flexible than `CLAUDE.md`/`docs/adding-content.md` currently describe | `/guides/[slug]`, `/blog/[slug]` directly, and via `components/blog/mdx-components.tsx`'s tag mapping |

**`lib/saved-builds.ts` — a real, shipped feature worth flagging clearly.**
It's pure client-side `localStorage` CRUD (`getSavedBuilds`/`saveBuild`/
`deleteSavedBuild`, all try/catch-wrapped against storage failures), no
network, no backend. The only consumer is `PlannerClient.tsx`, which
already has a save/name/load/delete UI wired to it. This is easy to
conflate with `CLAUDE.md`'s Phase 2 roadmap item ("'My builds' page per
user," tied to NextAuth + Postgres) — but it's a materially different,
already-working, per-device feature that needs no backend at all. Worth
distinguishing explicitly in any roadmap conversation: **a basic
"save builds on this device" feature already exists today; Phase 2's item
is specifically about cross-device, account-backed builds.**

### 1.5 `lib/` — key modules

| Module | Purpose |
|---|---|
| `wow-data.ts` | Central data-access layer — statically imports all 9 `data/talents/{class}.json` files, defines the core `Talent`/`TalentTree`/`Confidence`/`TalentStatus` types |
| `build-code.ts` | Encodes/decodes shareable build URLs; versioned to survive tree reshuffles (§2.2) |
| `build-text-export.ts` | Builds the "Copy build for AI" plain-text summary |
| `saved-builds.ts` | Client-only localStorage build save/load/delete (§1.4) |
| `active-tooltip.ts` | Single-tooltip-owner module store (§2.4) |
| `use-hover-tooltip.ts` | Viewport-aware tooltip positioning hook (measures real rendered size, flips/clamps against every edge; supports a `mobileBottomSheet` mode) |
| `use-ctrl-held.ts` / `use-pointer-fine.ts` | Small hooks: is Ctrl currently held; is the pointer fine (mouse) vs. coarse (touch) |
| `talent-status.ts` | Static label/color lookup tables for new/changed/moved/unchanged badges — no logic |
| `talent-rules.ts` | Class-talent tier-unlock gating (5-points-per-row) |
| `legacy-perks.ts` | Legacy Perk gating — deliberately separate from `talent-rules.ts` since each perk specifies its own explicit `gate`, not row math |
| `talent-spell-links.ts` | Typed accessor over the generated `data/talent-spell-links.json` |
| `text-diff.ts` | Small hand-rolled word-level LCS diff, used only for the spellbook's "Changed from Classic" highlighting |
| `content.ts` / `blog.ts` / `guides.ts` / `professions.ts` | Content loaders (§1.3) |
| `class-abilities.ts` / `class-racials.ts` / `dungeons.ts` / `dungeon-layout.ts` / `spellbooks.ts` | Thin typed accessors over their matching `data/*.json` files |
| `og-template.tsx` | Shared OG image renderer (gold hexagon mark + Cinzel/EB Garamond type over a photo). Every background image is unconditionally re-encoded through `sharp` (resize to 1600px wide, re-encode JPEG q82) before being embedded as a data URI — required because `next/og`'s renderer (satori) can't decode WebP data-URIs at all, and a full-resolution source blows its internal buffer limit once base64-inflated |
| `countdown.ts` | Launch countdown computed against `America/Chicago` via live `Intl.DateTimeFormat` offset math, so it stays correct across DST rather than using a fixed UTC offset |
| `site.ts` | Two constants: `SITE_URL`, `SITE_NAME` |
| `whats-new.ts` / `whats-new-style.ts` | Data/styling for the shelved-from-nav `/whats-new` page (§3c) |

### 1.6 `scripts/` — none wired into `package.json`; all run ad hoc

`package.json`'s `scripts` block is only `dev`/`build`/`start`/`lint` — the
three data scripts below are never run automatically and must be invoked
by hand after a data pull:

- **`node scripts/diff-talentsforever.js [oldPath] [newPath]`** — defaults
  to the two most recent plain-named snapshots. Diffs `talents`
  (field-level, separating markup-only from substantive changes), `legacy`
  perks (matched by **tree+row+col, not name** — several placeholders
  share the literal name "Unknown"), `spellbooks`/`spell_desc`, and does a
  structural schema-drift check on `racials`/`class_racials`/
  `class_abilities` that reports a brand-new field as one value-count
  summary line rather than one line per record. Writes
  `data/sources/diffs/{old}_to_{new}.{md,json}`.
- **`node scripts/build-spellbooks.js [snapshotPath]`** — rebuilds
  `data/spellbooks.json`, preserving a few hand-curated fields (`demoRace`,
  `notes`, the "General" tab, a "Pet" tab label override) across
  regeneration. Its default argument used to be a hardcoded path to
  `talentsforever-2026-09-19.json`, already stale as of this audit (09-20
  was the latest snapshot). **Fixed as a follow-up to this audit** — it now
  auto-picks the most recent plain-dated snapshot in `data/sources/`,
  mirroring `diff-talentsforever.js`'s own picker, so this can't go stale
  the same way again. Verified byte-identical output against the
  already-committed `data/spellbooks.json` before and after the fix.
- **`node scripts/build-talent-spell-links.js`** — rebuilds
  `data/talent-spell-links.json` from `data/talents/*.json` +
  `data/spellbooks.json` via a name-text-scan heuristic, with a manual
  `EXCLUDE_PAIRS` escape hatch for false-positive matches.

---

## 2. How the core systems actually work

### 2.1 Daily data-diff / sync workflow, end to end

1. Pull a fresh vendor export, save as a new dated
   `data/sources/talentsforever-YYYY-MM-DD.json` — snapshots are
   immutable, never overwritten in place.
2. Run `node scripts/diff-talentsforever.js`. It's a pure JSON-field diff
   — it cannot see UI/UX-only or copy-only changes with no data-level
   signal, so the vendor's own changelog still needs a human read for
   those.
3. Apply the diff's field-level output to `data/*.json` by hand, matching
   by **name** (or tree+row+col for Legacy Perks), never array index or
   position — the vendor has reordered arrays before (racials, class
   racials), and index-based matching would silently attribute the wrong
   text to the wrong entry.
4. If spellbook data changed: `node scripts/build-spellbooks.js
   data/sources/talentsforever-<date>.json` (pass the path explicitly —
   see §1.6's stale-default flag). Verify the regeneration is purely
   additive/expected (`git diff --stat`) before trusting it over any
   hand-applied edits already sitting in the working tree — both can be
   in-flight on the same data at once, which happened on 2026-09-20.
5. If talents or spellbooks changed: `node
   scripts/build-talent-spell-links.js`.
6. Commit.

### 2.2 Build-code encoding and why it's versioned

A build code is positional: one base36 rank digit per talent, ordered by
tier then column within each tree, trees joined with `-`. There is no
name/id tie-back to the encoded digits — **position is identity.** Any
change to a tree's talent membership or order (add, remove, reshuffle)
silently reassigns every digit after the change point to a *different*
talent when an old link is decoded against new data. This isn't a decode
error — it's a wrong answer with no error at all, and for a removed
talent, data just drops off the end of a now-shorter array silently.

The fix is a version segment: `encodeBuild` prepends a version number as
its own `-`-separated segment, detected by segment count (rather than a
special character, so codes stay plain base36+`-` and drop into any URL
segment without escaping questions). `decodeBuild` branches on that:
versioned codes decode directly against the current tree order; legacy
(unversioned) codes decode against a frozen historical snapshot of
whichever trees changed shape, translate old talent ids via an explicit
mapping table, then clamp to the current talent's `maxRank`. Confirmed
safe against adversarial/malformed input during this audit (§3d) — bounds
are enforced by the fixed, server-defined tree/talent arrays, never by
anything decoded from the URL.

**The next time a tree's membership or order changes**, this requires
bumping the version and adding a new frozen snapshot + translation table.
That's deliberate, purpose-built machinery for a real silent-corruption
failure mode — not something to simplify away because it looks unused
most of the time.

### 2.3 The retired confirmed/estimated per-rank mechanism

Early in the beta, the vendor's data sometimes marked only *some* ranks of
a multi-rank talent as verified (`confirmed: number[]`), distinct from the
whole-talent `confidence` field (confirmed/datamined/estimated). The
planner used to render an "(estimated)" note on any tooltip rank not in
that list.

This was retired once a 2026-09-18 pull confirmed 100% of talents via
direct beta-client extraction (`src: "beta"`, `complete: true` on all
468) — the per-rank signal stopped ever being partial, so the mechanism
had nothing left to display. The whole-talent `confidence` field is
untouched and still does real work. **Don't reintroduce the per-rank
mechanism without first checking a fresh pull for a nonzero `complete:
false` count** — if the vendor's extraction regresses to partial data,
per-rank confirmation becomes meaningful again.

### 2.4 Mobile vs. desktop interaction models

**Talent tree** (`TalentNode.tsx` / `TalentTreeGrid.tsx`):
- Desktop: plain click adds a point; a separate minus button (shown when
  rank > 0) removes one; hover shows the tooltip.
- Mobile: tap always *adds* — it never toggles removal, which stays the
  dedicated minus button. A 450ms long-press peeks the tooltip without
  spending a point. Scroll-vs-tap is disambiguated by tracked touch
  travel distance: >10px before release is treated as an incidental
  scroll-graze and nothing fires (no `preventDefault`, so native
  scroll/momentum isn't disturbed).
- Point changes get a scale-pulse + `navigator.vibrate()` tick, gated to
  touch-originated changes only — a desktop click never triggers either.

**Single-tooltip-owner** (`lib/active-tooltip.ts`): both the talent tree
tooltip and the spellbook tooltip share one module-level "which tooltip is
allowed to be open" claim. This exists because a window blur/focus cycle
mid-hover isn't guaranteed to deliver a matching `mouseleave` — alt-tabbing
away while hovering one talent, then returning and hovering a different
one, used to leave the first tooltip stuck open. `claimActiveTooltip` /
`releaseActiveTooltip` / `useIsActiveTooltip` enforce a hard single-owner
invariant instead of relying on each tooltip's own lifecycle firing
correctly; a window `blur` is handled directly inside the module. It's a
plain module-level store rather than lifted React state, since talent
nodes and spellbook entries are unrelated siblings many levels deep with
no natural shared ancestor. **`LegacyPerkNode`'s tooltip does not use this
mechanism yet.**

**Ctrl-hold linked-spell explainer:** hovering a talent whose description
names another spell/talent highlights that name inline; holding Ctrl
expands a card per linked spell with its own tooltip text at the correct
rank. Backed by `data/talent-spell-links.json` + `lib/talent-spell-links.ts`
+ `lib/use-ctrl-held.ts` + `lib/use-pointer-fine.ts` — this is inherently a
pointer-fine/keyboard feature with no mobile equivalent, by nature of
needing a modifier key.

### 2.5 Spellbook: views, tags, verification banner

`SpellbookBook.tsx` renders two views of the same per-class spell data
(`data/spellbooks.json`):
- **Book view** — spells grouped by trainer tab, column-major reading
  order.
- **By-level view** — the same spells regrouped by learned-at level across
  all trees, with a "From your talents" bucket for spells whose first rank
  has no real trainer level (or whose `talent` flag forces rank 1 into
  that bucket regardless).

A spell can carry a status pill — new / reworked / removed / **talent**
(driven by a `talent?: boolean` field on `SpellbookEntry`, set from the
vendor's own per-class `spellbooks.<Class>.talents` name list at
generation time, not name-matched by this codebase at render time). A
talent-granted spell shows a "Talent" pill in book view and lands in the
"From your talents" bucket in the by-level view.

The verification banner is this project's own wording (not the vendor's),
stating the data's confirmation status as a trust signal — separate from
the per-spell `confirmed` boolean used by `TooltipSourceNote` citations,
which is currently a strict binary with no middle state for
inferred-vs-directly-observed sourcing (§3c).

---

## 3. Gap audit

### 3a. Data/content automation

**Automated:** the diff script (name/position-matched, schema-drift-aware,
markdown+JSON output) and two derived-data generators (`build-spellbooks.js`,
`build-talent-spell-links.js`). All three are correct and match what
`CLAUDE.md` claims — no drift found here.

**Fully manual:** applying a diff's findings to `data/*.json` (by design —
this is a judgment call, not something to auto-apply), reading the
vendor's own changelog for non-JSON-signal changes, and all guide/blog/
profession authoring.

**Rough edges found this session (both fixed as follow-ups, see below):**
- `scripts/build-spellbooks.js`'s hardcoded default snapshot path was
  already one pull behind (§1.6) — fixed to auto-pick the latest snapshot.
- `data/talents/talent_data.json` was an orphaned, schema-mismatched
  leftover from a single old commit with zero live references — deleted.
- Nothing in the pipeline currently verifies that `build-spellbooks.js` /
  `build-talent-spell-links.js` were actually re-run after a data pull
  that should have triggered them — this is caught by eye
  (`git diff --stat`) each time, not enforced.

### 3b. Content authoring ease

`docs/adding-content.md` was checked line-by-line against the current
guides/blog/professions pipeline. Two of its claims were **confirmed
stale**, not just "worth double-checking" — **both have been corrected
in `docs/adding-content.md` itself as a follow-up to this audit**, so the
findings below describe what was wrong, not the doc's current state:

1. **OG-image claim is wrong.** The doc states there's no per-post Open
   Graph image and that "if per-post social preview images matter, that's
   unbuilt — flag it." This is false today: `app/blog/[slug]/
   opengraph-image.tsx`, `app/guides/[slug]/opengraph-image.tsx`, and
   `app/reference/professions/[slug]/opengraph-image.tsx` all exist,
   pulling `title`/`summary`/`heroImage` from each post's own frontmatter
   via `lib/og-template.tsx`. `CLAUDE.md`'s own architecture notes describe
   this correctly — `docs/adding-content.md` simply wasn't updated after
   the feature shipped.
2. **Credit-line claim is wrong.** The doc says `<GuideImage>` hardcodes a
   single credit string with "no per-image override... a real gap for
   [guides/blog], not a solved case." Also false: `GuideImage.tsx` takes an
   optional `credit?: string` prop (passing `credit=""` suppresses the line
   entirely), both `lib/blog.ts` and `lib/guides.ts` define an optional
   `heroCredit?: string` frontmatter field, and it's in active use —
   `content/blog/launch-day-beta.mdx` sets a real custom credit line for a
   non-Blizzard screenshot. The doc's own frontmatter table doesn't list
   `heroCredit` at all.

Other findings:
- The doc says "there are currently no fields that are sometimes omitted
  in practice" — also no longer true; `launch-day-beta.mdx` has
  `heroCredit` and the other four blog posts don't.
- `GuideImageGrid` (a `components/professions/mdx-components.tsx` tag
  wrapping multiple `<GuideImage>` children in a responsive grid) exists
  and is undocumented — profession-only currently, not mapped in the blog
  MDX components.
- `content/guides/` had **zero files** (the directory itself has since
  been removed as part of this audit, per §1.3's clarification — the
  `/guides` route and pipeline are unaffected) — meaning the doc's entire
  "Adding a new guide" section had zero live examples to have been
  cross-checked against. `docs/adding-content.md` now says this
  explicitly rather than implying guides exist to check the doc against.
- Everything else checked out accurate: the professions frontmatter
  example, the `<GuideImage>`-tag-resolves-differently-per-content-type
  mechanism, the filesystem-driven/no-manifest/draft-404s-not-previews
  mechanics, and the doc's own prior self-correction about `next-mdx-remote`
  vs. `@next/mdx` (still correctly describing the real implementation).

### 3c. Feature gaps / roadmap items (consolidated)

Pulled from `CLAUDE.md`'s accumulated session handoffs plus this audit's
own findings, into one place so nothing gets rediscovered from scratch:

- **Zero guide content exists.** The site brief treats guides as a core
  pillar alongside blog and professions, but there are currently no guides
  at all — only blog posts and profession write-ups exist as content. This
  wasn't previously flagged anywhere in `CLAUDE.md`; it's a real,
  currently-unaddressed content gap, not an infrastructure gap — the
  `/guides` route and pipeline are fully functional and waiting, there's
  simply nothing authored yet. (The now-empty `content/guides/` directory
  itself was removed as a follow-up to this audit, §1.3 — that was pure
  housekeeping, not a fix for this gap, which is a content-authoring task,
  not an engineering one.)
- **Shelved `/whats-new` page** — fully built and functional, deliberately
  unlinked from nav (`robots: noindex/nofollow` set), not broken. Re-link
  once the page is fleshed out further.
- **Legacy Perks page is desktop-only by explicit scope cut** — no mobile
  tap/long-press model, tooltip doesn't use the single-tooltip-owner
  mechanism. Low priority unless the page gets real mobile traffic.
- **Square talent cells vs. talentsforever.com's wider-column rhythm** — a
  disclosed, deliberate trade-off (matches their row pitch within 1px,
  intentionally doesn't match their wider column pitch). Don't "fix"
  without a fresh explicit decision — risks the connector-arrow geometry
  for a proportions-only gain.
- **No visual distinction between directly-observed vs. inferred spell
  tooltip sourcing** — `TooltipSourceNote` is a strict binary today.
- **Racials "Requires Shadowform"/"Requires Spirit of Redemption" lines** —
  an old instruction to remove these couldn't be resolved; neither phrase
  exists anywhere in current data or either historical vendor snapshot
  checked. Needs a screenshot or different source if raised again.
- **Priest's Renewed Hope** highlights "Heal" as a linked-spell match when
  it's really the tail of "Greater Heal," a spell not tracked in
  `data/spellbooks.json` — a data-coverage gap, not a matching bug.
- **`classicDescription`/`classicStatus` backfill is partial** (7+ of many
  spells) — the "Compare to Classic" diff only works where this exists.
- **Every profession's `heroImage` points at a `hero.webp` that doesn't
  exist on disk**, for all 7 professions, not just tailoring. Falls back
  automatically for the OG image (via `og-template.tsx`'s missing-file
  fallback), but the in-page hero image on `/reference/professions/[slug]`
  itself would render broken — worth a direct check next time that page is
  touched.
- **Spellbook mobile bottom-sheet placement** has never been visually
  verified on a real narrow viewport — separate from an earlier session's
  confirmed check of the collapsed tab rail, which is a different UI
  state.
- **`lib/blog.ts` not migrated onto the shared `lib/content.ts` loader** —
  confirmed still true this session (§1.3). Low urgency, real drift, not
  addressed as part of this audit's follow-ups (a refactor, not a quick
  fix).
- ~~`data/talents/talent_data.json`~~ — orphaned, unused, schema-mismatched
  leftover file (§1.2, §3a). **Fixed: deleted** as a follow-up to this
  audit.
- ~~`scripts/build-spellbooks.js`'s stale hardcoded default snapshot
  path~~ (§1.6, §3a). **Fixed:** now auto-picks the latest snapshot.
- **A basic client-side "save builds" feature already exists**
  (`lib/saved-builds.ts`, §1.4) and is easy to conflate with the Phase 2
  accounts roadmap item — worth clarifying in any future roadmap
  discussion that these are two different things at two different scopes.

### 3d. Security

**`npm audit`: 0 vulnerabilities**, run live this session — 568 total
resolved dependencies (154 prod / 380 dev / 91 optional), clean across
every severity tier. No action needed.

**Dangerous-pattern grep** (`dangerouslySetInnerHTML`, `eval(`,
`new Function(`, `innerHTML`, `document.write`) across `app/`,
`components/`, `lib/`: exactly one hit, in
`app/planner/[[...slug]]/page.tsx` — a static, hardcoded `WEB_APPLICATION_
JSON_LD` object (JSON-LD SEO markup, no request input touches it).
**Benign**, a standard pattern.

**User-influenced input paths reviewed:**
- **`lib/build-code.ts`'s `decodeBuild`** (parses a URL segment) — safe.
  Loops are bounded by fixed, server-defined tree/talent arrays, never by
  anything decoded from the URL; out-of-range indices produce `undefined`
  → `NaN`, caught by `Number.isFinite` guards, no throw; decoded values
  are only ever used as clamped numeric ranks or plain rendered numbers,
  never interpolated into HTML.
- **`lib/build-text-export.ts`** ("Copy build for AI") — safe. Builds a
  plain-text string from static data + numeric ranks, only ever written to
  the clipboard, never rendered as HTML anywhere.
- **`lib/saved-builds.ts`** — safe. The one user-supplied field
  (`build.name`) renders as plain JSX text content, React-escaped, not via
  `dangerouslySetInnerHTML`.
- **`app/planner/og/[classId]/[buildCode]/route.tsx`** (the one Route
  Handler taking user-influenced path input) — safe. `classId` is
  validated via a data lookup that returns falsy for unknown ids and falls
  back to the generic static OG image; `buildCode` flows into the
  already-reviewed-safe `decodeBuild`.
- **MDX rendering** (`app/blog/[slug]`, `app/guides/[slug]`,
  `app/reference/professions/[slug]`, via `next-mdx-remote/rsc`) — content
  is exclusively author-controlled local `.mdx` files, not user-submitted;
  no custom MDX component renders raw unsanitized HTML from frontmatter or
  props.

**One real, low-severity finding — fixed as a follow-up to this audit:**
none of the three MDX slug routes (`app/blog/[slug]/page.tsx`,
`app/guides/[slug]/page.tsx`, `app/reference/professions/[slug]/page.tsx`)
set `export const dynamicParams = false`, and `readContentFile`'s
`path.join(dir, `${slug}.mdx`)` doesn't sanitize `slug` against `..`
traversal. Practical impact was narrow — Next.js's router already
decodes/handles the dynamic segment, and a traversal payload would only
succeed against a file that happens to end in exactly `.mdx` outside the
content directory — but it wasn't defended in depth either. **Fix
applied:** `export const dynamicParams = false` added to all three pages
(they're small, fully-enumerable content sets — this also matches the
static-data/no-backend Phase 1 design intent). Verified: `/guides/
does-not-exist` now returns a real 404 instead of attempting an on-demand
render, while every real slug still renders normally.

**Config:** `next.config.ts` has no `headers()` block — no CSP, no
`X-Frame-Options`, nothing project-specific beyond Vercel's platform
defaults. Not a live issue today (no auth, no backend, no cookies), but
worth revisiting once Phase 2 (auth) lands.

### 3e. SEO

**Sitemap (`app/sitemap.ts`)** — the long-standing "guides/blog missing"
claim from earlier sessions is **confirmed fixed**: static routes plus
every guide (`getAllGuides()`) and every blog post (`getAllPosts()`) were
already included dynamically. Two further gaps were found, and **both are
now fixed as a follow-up to this audit**:

- ~~`/reference/racials` was missing~~ from the static routes list — the
  only Reference subpage left out. **Fixed:** added to `STATIC_ROUTES`.
- ~~`/reference/professions/[slug]` individual pages were missing~~ —
  `lib/professions.ts` exports `getAllProfessions()`, but `app/sitemap.ts`
  never called it, so none of the 7 published profession pages were in the
  sitemap despite having their own metadata and OG images. **Fixed:**
  `app/sitemap.ts` now calls `getAllProfessions()` and includes all 7.
- `/whats-new` is correctly excluded, consistent with its noindex.
- Verified live: `/sitemap.xml` now lists `/reference/racials` and all 7
  `/reference/professions/<slug>` URLs alongside everything already there.

**Redirects:** `next.config.ts`'s permanent `/guides/dungeons` →
`/reference/dungeons` redirect is confirmed still present. No other
redirects/headers/trailing-slash config exist.

**Canonical tags:** only `/planner` sets an explicit `alternates.canonical`
anywhere in the app tree (deliberately, to consolidate ranking signal
across build variants). The root layout sets `metadataBase`, which lets
Next.js resolve relative OG/image URLs, but no other route — including the
three dynamic content-slug routes — declares its own canonical. Worth a
look for `/guides/[slug]`, `/blog/[slug]`, `/reference/professions/[slug]`.

**Metadata coverage:** every route has either a static `metadata` export
or a `generateMetadata` function, **except the homepage**, which has
neither and fully inherits the root layout's defaults.

**Robots:** `app/robots.ts` exists, `allow: "/"` for all agents, points at
the sitemap, no disallow rules — the right pattern for keeping
`/whats-new` crawlable-but-noindexed via its page-level meta tag
(confirmed present) rather than hiding it from crawlers entirely (which
would hide the noindex tag from them too).

**OG images:** 11 `opengraph-image.tsx` files, exactly matching the list
`CLAUDE.md` claims — confirmed complete and accurate. The homepage's
static-PNG exception and the planner's custom Route Handler are both
documented, deliberate exceptions, not gaps.

**Structured data:** **not absent, as had been assumed** — `/planner`
emits a static `application/ld+json` `WebApplication` schema (hardcoded,
no user input, no injection risk — see §3d). Nothing else in the codebase
emits JSON-LD: no `Article`/`BlogPosting` schema on guides/blog posts, no
`BreadcrumbList` despite the site having a working `Breadcrumbs` component
that could back one directly.

---

## 4. Suggested priorities

This is a starting point for discussion, not a decided ordering — flag
disagreement freely. **Items 1, 2, 4, 5, and 6 below were completed as
quick-win follow-ups alongside this audit** (each its own commit); they're
left in the list, marked done, so this document still shows the full
original punch list rather than quietly editing history.

1. ~~Fix the two sitemap gaps (§3e)~~ — **done.** Added `/reference/racials`
   and all 7 profession slugs to `app/sitemap.ts`; verified live via
   `/sitemap.xml`.
2. ~~Fix `scripts/build-spellbooks.js`'s stale default snapshot path
   (§1.6)~~ — **done.** Now auto-picks the latest snapshot instead of a
   hardcoded date; verified byte-identical regeneration output.
3. **Decide on `content/guides/` content (§3c) — still open.** Either
   write a first guide or two, or consciously accept that "guides" is
   currently vaporware and adjust messaging/expectations accordingly. The
   empty leftover directory itself was removed as housekeeping, but that
   doesn't touch this gap — it's a content decision, not an engineering
   one, and it's a real gap against the site's own stated differentiator
   (a *hub*, not just a calculator).
4. ~~Update `docs/adding-content.md`'s two stale claims (§3b)~~ — **done.**
   Also corrected the doc's sitemap-gotcha section and the frontmatter
   table to match the sitemap fix and the `heroCredit` field.
5. ~~Harden the MDX slug routes (§3d)~~ — **done.** `dynamicParams = false`
   added to all three; verified an unknown slug now 404s cleanly.
6. ~~Decide on `data/talents/talent_data.json` (§1.2, §3a)~~ — **done.**
   Deleted; confirmed zero references anywhere in the codebase beforehand.
7. **Canonical tags on the three content-slug route types (§3e) — still
   open.** Lower urgency than the sitemap fix since these pages aren't
   duplicated elsewhere, but cheap to add next time metadata is touched.
8. Everything else in §3c is either genuinely low-priority by its own
   disclosed reasoning (Legacy Perks mobile, square-cell geometry,
   inferred-sourcing distinction) or blocked on a real external input
   (the racials "Requires" mystery needs a source; the profession hero
   images need actual art) — worth keeping visible in this document, but
   not worth scheduling ahead of item 3 or 7.

Deliberately not re-prioritized here: the Phase 2 roadmap (auth, Postgres,
account-backed builds, an admin content editor) — `CLAUDE.md`'s own
"don't start Phase 2 until Phase 2 actually starts" framing still holds,
and nothing in this audit surfaced a reason to pull that forward. The one
adjacent nuance worth remembering is that a lightweight, no-backend version
of "save your builds" already exists today (§1.4) — Phase 2 is specifically
about making that cross-device and account-backed, not building the
feature from zero.
