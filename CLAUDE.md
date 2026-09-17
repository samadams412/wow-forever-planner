@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever — a race/class/talent
planner, a reference section, and guides/blog content. Not affiliated with
Blizzard, not monetized. This file is the living architecture reference for
the codebase; it's kept in sync with what's actually implemented (verified
against real files, not assumed from an earlier description) rather than
serving as a fixed project brief.

## Session handoff — 2026-09-17

**Stable and shipped this session:**
- Dungeons timeline polish (`components/reference/DungeonsTimeline.tsx`,
  see below for its move): inline level ranges on bars where they measure
  as actually fitting (canvas text measurement against real `clientWidth`,
  falls back to the bare label otherwise); a real bug this surfaced —
  `packDungeonRows` let two dungeons sharing an exact boundary level (one's
  `levelMax` == the next's `levelMin`) land in the same row, but each level
  is its own CSS grid column, so they rendered on top of each other — fixed
  by treating a shared boundary as a real overlap (`<` not `<=`). Also: a
  gold/bronze custom scrollbar, a faint parchment/map texture behind the
  grid, alternating 5-level background bands aligned to the tick marks, and
  hover/focus scale+glow on the clickable "new dungeon" bars only.
- Reference nav dropdown, and Dungeon Level Ranges moved from
  `/guides/dungeons` to `/reference/dungeons` — see Architecture below for
  both.
- New Professions content type (`content/professions/`,
  `/reference/professions`) — see Architecture below.
- Reusable Open Graph image template (`lib/og-template.tsx`) wired into
  every static route and the guides/professions/blog per-post dynamic
  routes — see Architecture below.

**Open / mid-flight — do not guess at these, ask or investigate fresh:**
- `data/sources/talentsforever-2026-09-15.json` and `-16.json` were last
  known to be in an inconsistent state (content appears shifted between
  them, plus a stray `-15-old.json`) that the user was resolving
  personally — not touched or re-checked this session, which was all
  guides/reference/professions work, not talent data. Re-verify
  `git status`/file contents before trusting which snapshot is which,
  rather than assuming it's still exactly as last described.
- No visual distinction exists yet between a directly-observed demo
  tooltip source and one that's inferred from indirect evidence (both
  currently render as the same green "confirmed" note) — still not decided
  or scheduled, not touched this session.
- The spellbook tooltip's mobile bottom-sheet placement (`useHoverTooltip`'s
  `mobileBottomSheet` option) was implemented in an earlier session but has
  never been visually verified on a real narrow viewport — `resize_window`
  doesn't actually shrink the viewport in this environment (window stays
  ~1920px regardless of the requested size; the coordinate mismatch this
  causes between screenshots and real CSS pixels was rediscovered and
  worked around this session on the dungeons page, see the timeline-polish
  commits), so the `<640px` code path has still never been seen rendering
  for real. Not touched this session.
- `classicDescription`/`classicStatus` backfill (7 of many spells done) —
  not touched this session, still real follow-up work.
- **Correction to an earlier handoff note above:** by the time this
  session's OG-image work touched every profession's frontmatter, 6 of the
  7 `heroImage` files already existed on disk (alchemy, blacksmithing,
  cooking, enchanting, engineering, first-aid) — only
  `public/images/professions/tailoring/hero.webp` is still missing. Not
  this session's doing either way; just re-verified directly rather than
  trusting the stale claim that all 7 were broken. Still flag tailoring's
  broken top image if asked, but the other 6 are fine now.
- `app/sitemap.ts` still has its literal TODO — now also missing every
  individual `/reference/professions/<slug>` page (only the index route is
  listed), on top of the pre-existing gap for blog posts and guides.
- Cosmetic, not urgent: each `public/images/professions/<profession>/`
  folder carries an empty, unreferenced `<profession>.txt` (e.g.
  `alchemy.txt`) — moved as-is from its old location along with the real
  images, not cleaned up since it's harmless and wasn't clearly mine to
  delete unasked.

**Suggested next:**
- Supply a real `hero.webp` for tailoring, the one remaining profession
  page with a broken top image (see above).
- Wire `getAllPosts()`/`getAllGuides()`/`getAllProfessions()` into
  `app/sitemap.ts` instead of leaving it a manual TODO — now three content
  types share that same gap, worth doing once rather than per-type.
- Everything carried over, unresolved, from the 2026-09-16 handoff above
  (data/sources snapshot naming, inferred-vs-observed citation styling,
  mobile bottom-sheet verification, classicDescription backfill) — the
  per-post OG image item from that list is now resolved, see Architecture
  below.

## Architecture notes

### Planner: race is reference-only; URL is `/planner/<class>/<build>`
Race is no longer app state or a URL segment — it never affects talent
calculations. `RaceReferenceTable` (`components/reference/RaceReferenceTable.tsx`)
is the full table, shared as-is between the planner (rendered inline below
the trees) and the standalone `/reference/racials` page.

**Reversal (2026-09-16):** `RacePicker` (`components/planner/RacePicker.tsx`)
— the compact, class-filtered race column that used to sit beside the tree
with racials via popover — has been removed from the planner page (its only
call site) to give the talent trees the full width instead (trees widened
from `max-w-77` to `max-w-89`, icon columns from `minmax(52px,...)` to
`minmax(60px,...)`). The component file itself is left in place, deliberately
unused, per instruction not to touch it — only its embedding in the planner
is gone; `RaceReferenceTable` (a different, larger component) is unaffected
and still renders both standalone at `/reference/racials` and inline below
the planner's trees, same as before. Do not reintroduce `RacePicker` into
the planner without a fresh explicit decision to do so; this was a
deliberate width trade-off, not an oversight.

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

`SpellbookBook` takes a `compareMode` prop (default `false`) that gates a
per-spell "Changed from Classic" word-diff (`TooltipClassicDiff`, built on
`lib/text-diff.ts`'s small LCS diff) shown only when that spell's
`classicStatus === "changed"` and it has a `classicDescription`. The
planner passes its existing `compareMode` state through; the standalone
`/reference/class-spellbooks` page has its own local `compareMode` state
and its own "Compare to Classic" button (mirroring the planner's), since it
has no other shared toggle to reuse. Each `SpellEntry`'s tooltip opens on
whichever side of its row is away from the list's continuation (alternates
by column) via `useHoverTooltip`'s `"left"`/`"right"` placement, and
switches to a bottom-anchored sheet below the `sm` breakpoint via that
hook's `mobileBottomSheet` option — see the open item above, that mobile
path hasn't been seen rendering on an actual narrow viewport yet.

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

### Content-type architecture: shared `lib/content.ts` loader
`lib/content.ts` factors the filesystem/frontmatter plumbing —
`listContentSlugs(dir)` and `readContentFile<Frontmatter>(dir, slug)` (a
thin wrapper around `fs.readdirSync`/`fs.readFileSync` + `gray-matter`,
generic over the frontmatter shape) — out of what used to be duplicated
directly in `lib/guides.ts`. `lib/guides.ts` now calls into it with no
behavior change; `lib/professions.ts` (new) is a second, thin wrapper over
the same loader. **`lib/blog.ts` was not migrated onto this shared loader**
this session — it still has its own independent `fs`/`gray-matter` reads.
That's a real candidate for the same factor-out later, not an oversight to
silently "fix"; it just wasn't part of what this session's task asked for.

Each wrapper module keeps its own frontmatter type and its own behavior on
top of the shared loader: `lib/professions.ts`'s `ProfessionFrontmatter`
has no `tags` field (a profession page's slug already says which
profession it's about), and `getAllProfessions()` sorts alphabetically by
`title` rather than newest-first by `date` (profession pages are evergreen
reference material, not dated posts) — both deliberate, not the guide/blog
shape trimmed down by mistake.

### Reference nav dropdown
`components/site/SiteHeader.tsx`'s `NAV_LINKS` entries can carry an
optional `children: {href, label}[]`; only Reference does (five entries:
Racials, Legacy Perks, Class Spellbooks, Dungeon Level Ranges,
Professions). Desktop is pure CSS (`group`/`group-hover`/
`group-focus-within`, no JS state) — the panel is a sibling `absolute`
div inside a `relative` wrapper around the trigger link, so hovering or
tabbing into the trigger opens it and it stays open as long as focus is
anywhere inside the group. This is also why `<header>` no longer has
`overflow-hidden`: it was clipping the dropdown panel (which needs to
extend below the header's own box), and wasn't actually protecting
anything — it existed to contain a decorative background gradient div
that's currently disabled and, even active, wouldn't have needed the
clip anyway (a `background-image` never paints outside its own element's
box). Mobile renders the same five links indented under "Reference" in
the existing flat mobile menu overlay, not a separate nested toggle.

### Dungeon Level Ranges lives under Reference, not Guides
Moved from `/guides/dungeons` to `/reference/dungeons` this session — it's
reference material (a static data chart), not a written guide. The
component moved with it: `components/reference/DungeonsTimeline.tsx` (was
`components/guides/DungeonsTimeline.tsx`); page/chart logic itself is
unchanged. `next.config.ts` has a permanent redirect from the old path.
Don't be surprised to find `/guides/dungeons` referenced in old
conversation history or external links — the redirect handles it, no
further action needed there.

### Professions content type
New `/reference/professions` (index, card-list like the Guides index) and
`/reference/professions/[slug]` (individual page, same shell as an
individual guide page — Breadcrumbs, h1, hero image, MDX body — but
matching the no-big-banner pattern every other Reference subpage uses).
See `lib/content.ts` above for the data layer.

All 7 profession write-ups (alchemy, blacksmithing, cooking, enchanting,
engineering, first-aid, tailoring) were migrated this session from
`content/guides/` (where they'd been sitting with `status: "draft"`,
invisible on the live Guides listing) to `content/professions/`, and their
images from `public/images/guides/professions/<profession>/` to
`public/images/professions/<profession>/`. Status was flipped to
`"published"` as part of the migration — they read as finished write-ups,
not stubs, and Professions now has a real home for them. While fixing each
file's image paths for the move, several **pre-existing** broken
references were found and fixed (not introduced by the migration): most
body `<GuideImage>` tags were missing the `professions/` path segment
entirely, cooking had a filename typo and a stale filename, and
first-aid's four images are actually `.jpg` despite every reference saying
`.webp`. **Still broken, deliberately not fabricated:** every profession's
`heroImage` points at a `hero.webp` that doesn't exist anywhere on disk —
flag this if asked why a profession page's top image is missing rather
than inventing a substitute.

Images render via a new `components/professions/ProfessionImage.tsx`, not
the shared `GuideImage` — `GuideImage` hardcodes an "official Blizzard
reveal screenshot" credit line that's accurate for guides/blog (real press
stills) but would misattribute profession images, which are clearly
concept art per their alt text (a gnomish poultryizer, glowing potion
flasks, etc.). `ProfessionImage` renders no credit line at all rather than
guessing at a real one. Profession `.mdx` bodies still use the
`<GuideImage>` tag name unchanged (prose wasn't rewritten during the
migration) — `components/professions/mdx-components.tsx` just maps that
tag to `ProfessionImage` instead, mirroring the existing "own file per
content type, not shared" convention already used by
`components/blog/mdx-components.tsx`.

### Open Graph images: shared template + file-convention routes
`lib/og-template.tsx` exports `renderOgImage({ title, subtitle?,
backgroundImage? })`, used by an `opengraph-image.tsx` file (the Next.js
file convention, not a Route Handler) colocated in every route segment that
needs one — both static (`/reference`, `/reference/racials`,
`/reference/legacy-perks`, `/reference/class-spellbooks`,
`/reference/dungeons`, `/reference/professions`, `/guides`, `/blog`) and
dynamic-slug (`/guides/[slug]`, `/reference/professions/[slug]`,
`/blog/[slug]`, each pulling `title`/`summary`/`heroImage` straight from
that post's frontmatter). Unlike the planner's build-code image (see
above), none of these routes sit under a catch-all segment, so the plain
file convention works directly and Next.js wires up the `<meta
property="og:image">` tags automatically — no manual `generateMetadata`
wiring needed. The homepage's own `openGraph.images` still points at the
static `public/images/og/opengraph.png` (unchanged) rather than the new
template, since that PNG *is* the visual reference the template was built
to match — regenerating a pixel-equivalent image via code would be pure
churn.

The template renders the gold hexagon talent-tree mark (same artwork as
`public/images/logo/gold-talent-tree-transparent.svg`, but with path data
embedded directly in `lib/og-template.tsx` rather than read from disk) plus
Cinzel Bold title / EB Garamond italic subtitle / a gold rule /
"FOREVERCRAFT.APP" footer, over a darkened background photo — `backgroundImage`
when given, else the homepage hero, with the same fallback triggering
automatically if a given path doesn't exist on disk (e.g. a profession's
`heroImage` that hasn't been supplied yet, see below). Both font files live
in a new top-level `assets/fonts/` (`Cinzel-Bold.ttf`,
`EBGaramond-Regular.ttf`, `EBGaramond-Italic.ttf` — only the italic is
currently loaded into `ImageResponse`, the other two are there for any
future non-italic EB Garamond use), pulled from Google Fonts' own hosting
via the legacy-user-agent trick that returns real `.ttf` files instead of
`.woff2` (`next/og`'s renderer only accepts ttf/otf/woff).

**Every background image is re-encoded through `sharp` before being
embedded as a data URI, unconditionally** — this isn't optional polish, two
real failures were hit and confirmed by testing directly against this
renderer before adding it: (1) `next/og`'s renderer (satori) cannot decode
WebP passed via a data-URI `<img>` — it crashes the whole response with an
opaque `"u2 is not iterable"` error with no useful stack, while the
identical layout with a JPEG/PNG source works fine, and most of this site's
hero images are `.webp`; (2) a full-resolution source
(`content/blog`'s hero, 5+MB) blows past satori's internal XML buffer limit
once base64-inflated, failing differently (`Resource limit exceeded: Buffer
size limit exceeded`). `readPublicImageAsDataUri` in `lib/og-template.tsx`
resizes every source to 1600px wide (`withoutEnlargement`) and re-encodes
as JPEG q82 regardless of its original format, which fixes both at once.
`sharp` was already present in `node_modules` only as an *optional*
dependency of `next` itself (used internally for `next/image`), which isn't
reliable to import from application code — it's now also a direct
`package.json` dependency for this reason.

### Adding guides/blog/profession content
See `docs/adding-content.md` for the full step-by-step: frontmatter schema,
image conventions and credit-line rules (including the guides/blog vs.
professions difference above), SEO metadata (what's automatic vs. not),
gotchas, and copy-pasteable templates, for all three content types. It's
written from the actual implementation (`next-mdx-remote` + filesystem
reads in `lib/blog.ts`/`lib/guides.ts`/`lib/professions.ts`, the latter two
via the shared `lib/content.ts` loader — see above), not the `@next/mdx`
file-convention routing an earlier description of this project assumed.
