@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever — a race/class/talent
planner, a reference section, and guides/blog content. Not affiliated with
Blizzard, not monetized. This file is the living architecture reference for
the codebase; it's kept in sync with what's actually implemented (verified
against real files, not assumed from an earlier description) rather than
serving as a fixed project brief.

## Session handoff — 2026-09-16

**Stable and shipped this session:**
- Mobile talent tree rebuilt end to end: tap-always-adds (never toggles to
  remove), long-press-to-peek, scroll-vs-tap touch-threshold, single
  overlay tooltip that closes on scroll, per-tree reset, add/remove
  pulse+haptic feedback, and a widened mobile layout matching the site's
  `px-3`/`sm:px-4` gutter. See "Mobile talent tree interaction model" below.
- 10 Hunter talent icons corrected against Wowhead-verified slugs.
- 2026-09-16 talentsforever pull ingested: per-rank `confirmedRanks` marker
  added (generic, opt-in — see below) and applied to Improved Holy
  Strike/Reverence, the Talented legacy perk's wording reconciled, Call of
  the Ancestors spellbook tooltip added, Ghost Wolf's base cast time
  corrected to 2 sec with an inferred-not-observed citation.
- `docs/adding-content.md` written and verified by scaffolding (then
  deleting) throwaway guide/blog posts in dev.

**Open / mid-flight — do not guess at these, ask or investigate fresh:**
- `data/sources/talentsforever-2026-09-15.json` and `-16.json` are
  currently in an inconsistent state (content appears shifted between
  them, plus a stray `-15-old.json`) — the user is handling this
  personally as of this handoff. Don't touch those three files until
  confirmed resolved; re-check `git status`/file contents before trusting
  which snapshot is which.
- No visual distinction exists yet between a directly-observed demo
  tooltip source and one that's inferred from indirect evidence (both
  currently render as the same green "confirmed" note) — flagged during
  the Ghost Wolf fix as a possible follow-up, not decided or scheduled.
- Per-post Open Graph images for guides/blog posts aren't built — every
  post falls back to the sitewide default image regardless of its own
  `heroImage`. Noted in `docs/adding-content.md`, not scheduled.
- `app/sitemap.ts` has a literal TODO and currently omits all four
  published blog posts (and any future guides) — adding a new post/guide
  does not add it to the sitemap.
- I was asked to note a previously-flagged "Druid Thick Hide missing
  rank-2 text" bug in this handoff, but checked `data/talents/druid.json`
  directly and it currently has distinct, fully-populated text for all
  three ranks. Either it was already fixed in a session not reflected in
  my visible history, or this refers to something other than the talent
  data itself (e.g. a rendering issue) — re-verify against the live page
  before assuming it's still broken.

**Suggested next:**
- Once the user has resolved the `data/sources/` snapshot naming, resume
  the normal daily-pull workflow (below).
- Wire `getAllPosts()`/`getAllGuides()` into `app/sitemap.ts` instead of
  leaving it a manual TODO.
- Zero guides are published yet (`content/guides/` is empty) — the
  authoring path is now verified end-to-end via `docs/adding-content.md`,
  so this is now a content task, not a dev task.
- Decide (don't assume) whether per-post OG images are worth building for
  guides/blog, using the planner's Route Handler OG image as a precedent.

## Architecture notes

### Planner: race is reference-only; URL is `/planner/<class>/<build>`
Race is no longer app state or a URL segment — it never affects talent
calculations. `RacePicker` (`components/planner/RacePicker.tsx`) shows a
compact, class-filtered race column beside the tree with racials via
popover; `RaceReferenceTable` (`components/reference/RaceReferenceTable.tsx`)
is the full table, shared as-is between the planner (rendered inline below
the trees) and the standalone `/reference/racials` page.

URL scheme is `/planner/<classId>/<buildCode>` (2 segments), handled by the
catch-all route `app/planner/[[...slug]]/page.tsx`. Old-style 3-segment
`/planner/<classId>/<raceId>/<buildCode>` links (from when race was a URL
segment) are detected in that route's `parseSlug()` — a second segment
matching a known race id — and redirected to the canonical 2-segment form.

### Per-build Open Graph image: a Route Handler, not the file convention
Lives at `app/planner/og/[classId]/[buildCode]/route.tsx` as a plain Route
Handler, not the `opengraph-image.tsx` file convention — that convention
requires the image route to be the terminal segment of its own route,
which isn't possible nested under the planner's catch-all `[[...slug]]`.
`generateMetadata` in `app/planner/[[...slug]]/page.tsx` points
`openGraph.images` at this sibling route once a decoded build has at least
one point spent, falling back to the root layout's site-wide static image
otherwise (no classId/buildCode, or a build with zero points).

### Mobile talent tree interaction model
`components/planner/TalentNode.tsx` + `TalentTreeGrid.tsx` implement a
touch model that's deliberately separate from desktop's plain `onClick`:
- A tap always adds a point — it never toggles into removing one. Removal
  is only the dedicated minus button, shown when that talent's rank > 0.
- A 450ms long-press peeks a talent's tooltip without spending a point.
- **Scroll-vs-tap:** `touchstart` records the touch's start position;
  `touchmove` tracks distance traveled; `touchend` only fires the tap
  action if the touch moved ≤10px total — otherwise it's treated as a
  scroll that happened to graze the icon, and nothing fires (no
  `preventDefault`, so the browser's own scroll/momentum handling isn't
  disturbed).
- The tooltip is a **single overlay instance** (`position: fixed`,
  `pointer-events: none`, via `TooltipCard`) — not part of document flow,
  so it never pushes the grid layout and taps to icons underneath/behind
  it still land. It's dismissed by a real `scroll` event listener, not a
  timeout or a tap-elsewhere handler.
- Adding/removing a point plays a brief scale-pulse plus a
  `navigator.vibrate()` tick, gated to touch-originated changes only (a
  ref set immediately before a touch-driven add/remove, consumed by an
  effect that only reacts to an actual rank change) — a desktop mouse
  click never triggers either.

### Shared class spellbook component
`SpellbookBook` and `ClassAbilitiesSection` (its "New & changed abilities"
sub-section) are the same components, rendered in multiple places: standalone
at `/reference/class-spellbooks`, and embedded in the planner below the
talent tree, wrapped together in one `Collapsible` that's collapsed by
default. `ClassAbilitiesSection` also wraps itself in its own nested
`Collapsible` when used standalone. Spell tooltip citations
(`TooltipSourceNote`) currently use a strict binary `confirmed` boolean —
see the open item above about inferred-vs-observed sourcing having no
distinct visual treatment yet.

### `confirmed` field — per-rank talent confirmation (resolved)
talentsforever's source data can carry a per-rank `confirmed: number[]`
array — which specific ranks' text is vendor-verified, distinct from the
existing whole-talent `confidence` field. This is implemented generically:
`Talent` (`lib/wow-data.ts`) has an optional `confirmedRanks?: number[]`,
and the tooltip (`TalentNode.tsx`) marks any rendered rank *not* in that
list with a small "(estimated)" note. Talents without the field (the large
majority) are completely unaffected — it's opt-in per-talent, not a
blanket behavior change. Separately and independently, a talent whose
source `complete` flag flips to `true` gets its whole `confidence` bumped
`estimated → confirmed` (a pre-existing rule, unrelated to
`confirmedRanks`).

### Daily data-diff workflow
`data/sources/` holds dated, **immutable** snapshots of talentsforever.com's
export (`talentsforever-YYYY-MM-DD.json`) — a new pull always gets a new
dated file, never overwrites an existing one in place (see
`data/sources/README.md`). `node scripts/diff-talentsforever.js` diffs the
two most recent snapshots and writes both a markdown summary and the raw
JSON diff to `data/sources/diffs/` — **this is the standard first step
before applying any changelog update**, so changes get applied from the
diff's actual field-level output rather than re-transcribing the whole
export by hand. The script is a pure JSON-field diff — it can't see
UI/UX-only changes with no data-level signal, so also read the vendor's own
`changelog` array by hand for those.

### Adding guides/blog content
See `docs/adding-content.md` for the full step-by-step: frontmatter schema,
image conventions and credit-line rules, SEO metadata (what's automatic vs.
not), gotchas, and copy-pasteable templates for both content types. It's
written from the actual implementation (`next-mdx-remote` + filesystem
reads in `lib/blog.ts`/`lib/guides.ts`), not the `@next/mdx` file-convention
routing an earlier description of this project assumed.
