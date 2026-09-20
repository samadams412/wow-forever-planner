@AGENTS.md

# Forevercraft

Free, fan-made hub site for World of Warcraft: Forever — a race/class/talent
planner, a reference section, and guides/blog content. Not affiliated with
Blizzard, not monetized. This file is the living architecture reference for
the codebase; it's kept in sync with what's actually implemented (verified
against real files, not assumed from an earlier description) rather than
serving as a fixed project brief.

## Session handoff — 2026-09-19

**Stable and shipped this session:**
- Vercel Web Analytics actually wired up (`app/layout.tsx`): the prior
  session had installed `@vercel/analytics` and imported `Analytics` from
  `@vercel/analytics/next`, but never rendered the component — so despite
  looking complete (import present, package installed), zero events were
  ever firing. Added `<Analytics />` inside `<body>`. Checked against
  Vercel's live docs (fetched directly, not from training knowledge) to
  confirm `@vercel/analytics/next` is the correct App Router variant (not
  `/react`, not the Pages Router `_app.tsx` pattern) and that placement
  matches their example. Confirmed no other analytics/tracking setup
  exists anywhere in the codebase to conflict with it. Verified live via
  a real browser: in dev, the component loads `va.vercel-scripts.com/v1/
  script.debug.js` and the console logs `[Vercel Web Analytics] Running
  queued event pageview` → `[view] .../_vercel/insights/view` — dev mode
  intentionally queues without sending to the server, which is expected
  debug behavior per Vercel's own docs, not a bug. **Still needs a
  dashboard action from the user, not code**: Vercel project → Analytics
  in the sidebar → **Enable** — required before any real data flows,
  regardless of how correct the code is. Commit `588715a`.
- Spellbook mobile tab rail + spine (`components/reference/
  SpellbookBook.tsx`): the task as described assumed desktop already
  showed icon+name tabs and mobile's icon+name was the one causing
  horizontal scroll. Reading the actual code (and confirming live)
  showed the reverse — desktop was **already** icon-only (`sm:hidden` on
  the tab's name `<span>`), and mobile was the one rendering full names,
  which is what forced the scroll. Flagged this mismatch to the user
  before touching anything; they chose the simpler fix (make mobile
  match desktop) over the literal ask (add names to desktop's 56px
  rail). Removed the name `<span>` entirely — `title={tab.name}` on the
  button still gives it an accessible/hover name at every breakpoint —
  and added `hidden sm:block` to the book's center spine-shadow div so
  it doesn't render on mobile's single-column stacked layout. Desktop
  verified live via screenshot, both before and after. Commit `a808ceb`.

**Session from 2026-09-18 (spanning several conversations, same day) — folded forward, unchanged this session:**
- Planner "Copy build for AI" export: a plain-text summary of the current
  build (spec numbers, per-tree points, each spent talent's actual tooltip
  at its chosen rank, the share URL) copied to the clipboard from a new
  button in the planner controls row, for pasting into an AI chat. Disabled
  at 0 points like the other build-action buttons.
- `/whats-new` page: a talent-change breakdown (added/removed/moved/
  prerequisite-changed) generated from `scripts/diff-talentsforever.js`'s
  existing diff JSON, with a per-class picker and plain-language detail,
  linked from a small badge next to the planner header (not primary nav).
  Building it surfaced a real gap in the diff script itself: it never
  tracked a talent's `req` (prerequisite) field, so a dropped/added
  prereq was invisible to the tool and only ever caught by hand-reading
  the vendor changelog — fixed, and all historical diffs regenerated.
- Talent tooltip "Ctrl-hold to explain linked spells" feature: hovering a
  talent whose description names another spell/talent (e.g. Bloodthrill
  mentioning Rend and Overpower) highlights that name inline, and holding
  Ctrl expands a card per linked spell with its own tooltip text at the
  correct rank. New data layer (`data/talent-spell-links.json`,
  `scripts/build-talent-spell-links.js`, `lib/talent-spell-links.ts`) plus
  `lib/use-ctrl-held.ts`/`lib/use-pointer-fine.ts`. See the dedicated
  architecture note below for the data pipeline and two real bugs found
  and fixed while auditing it (a cross-class talent-id collision, a
  substring-overlap match bug) — the initial ship had a rendering gap
  that silently broke highlighting for every multi-rank talent at 0
  points (i.e. most talents, most of the time); fixed same session.
- Spellbook tooltip polish: a `TooltipLevelReq` line (surfaces
  `SpellTooltip.levelReq`, which existed in the data but was never
  rendered) and a typography tweak, matching a talentsforever.com study
  pass without copying their cream/yellow palette.
- Tooltip positioning rewritten to be viewport-aware for real (`lib/
  use-hover-tooltip.ts`): measures the tooltip's actual rendered size and
  flips/clamps against every edge, instead of clamping against a static
  height estimate that could still run off-screen — see architecture note
  below.
- Desktop talent tree resized and centered to match talentsforever.com's
  density (43px icons / 24px gap / 67px pitch, within 1px of their own
  44px/24px/68px) and the tree group centered as a unit instead of left-
  aligned with empty space beside it — see the dedicated architecture note
  below, including the deliberate square-cells-not-their-rhythm trade-off.
- Fixed a real bug where two tooltips could be open at once after a
  window blur/focus cycle mid-hover (e.g. alt-tabbing away without moving
  the mouse, then returning and hovering elsewhere) — see the new
  `lib/active-tooltip.ts` architecture note below. Covers both the talent
  tree tooltip and the spellbook tooltip, and both the desktop hover and
  mobile tap-to-open interaction models.
- Mobile re-verified against a real device-emulated browser window (not
  just reasoned about from unchanged CSS classes, which is as far as an
  earlier pass in this same session could get — see Tooling notes below
  for why): confirmed the desktop resize above didn't touch mobile's own
  icon sizing, and confirmed the single-tooltip fix also holds for the
  mobile tap-to-open flow.
- A talentsforever.com pull (`talentsforever-2026-09-18.json`) that changed
  the vendor's *source*, not just its values: every talent now carries
  `src: "beta"` (100% of 468), meaning direct WoW Forever beta-client
  extraction (build `1.60.1.69876`) rather than stream/demo footage.
  Practical effect: "estimated" is functionally retired for talents (see
  below), and 466 talent field-level changes plus a full racials rewrite
  landed from this one pull.
- `scripts/diff-talentsforever.js` fixed for the new Legacy Perks shape and
  upgraded schema-drift reporting — see Architecture below.
- Talent tree structural changes applied and browser-verified: Warrior
  Protection lost Vitality (Bastion and Focused Rage each moved into a
  vacated slot); Rogue Combat's Restless Blades and Warlock Affliction's
  Drain Hope were each replaced in-slot by a new talent (Flawless
  Execution, Wrack); Druid Balance lost Balance of Nature outright; Rogue
  Aggression no longer requires Hack and Slash; Warlock Conflagrate no
  longer requires Shadowburn; Priest's tab is now "Shadow" (was "Shadow
  Magic") and Shaman's is "Elemental" (was "Elemental Combat") — **that
  direction was verified against both raw vendor snapshots directly and
  corrects an earlier wrong assumption**, so trust the live tree names in
  `data/talents/*.json` over any older note describing it the other way.
  This rename also broke two things it wasn't obviously connected to
  (found and fixed later the same day, once flagged): the Priest/Shaman
  talent tree background images, and the Class Spellbooks page's tab
  icons for those two specs — see the "tab renames touch more than tree
  data" architecture note below for what actually broke and why.
- `lib/build-code.ts` versioned to protect existing shared links from the
  reshuffle above — see Architecture below.
- `/reference/legacy-perks` rebuilt as an interactive 3-column tree — see
  Architecture below.
- Racials rewrite applied by name-matching (36 general + 12 Priest
  class-specific) — see Architecture below.
- The `confirmedRanks`/per-rank "(estimated)" mechanism was retired
  (removed from `Talent`, `TalentNode.tsx`, and confirmed absent from every
  `data/talents/*.json` file) now that it has nothing left to distinguish —
  see Architecture below for why, and don't reintroduce it without first
  checking whether the vendor data has gone back to partial/estimated.

**Open / mid-flight:**
- Mobile verification for the spellbook change above isn't fully closed:
  got a real mobile-width window rendering correctly (330×717, confirmed
  via screenshot — not `resize_window`, still non-functional, same
  finding as 2026-09-18 below), but every click attempt inside that tab
  timed out (`Input.dispatchMouseEvent`) even though screenshots on the
  same tab worked fine — see the new Tooling note below. So the collapsed
  list was confirmed icon-only-ready, but an actual *expanded* book on a
  real phone-width viewport (tab rail + spine together, in context) was
  never seen — only reasoned about from the same Tailwind breakpoint
  logic that was directly confirmed on desktop. User opted to skip
  further live click-through rather than keep troubleshooting the click
  timeout. Worth a real manual phone check next time this page is
  touched.
- Not investigated this session, flagging rather than guessing: the
  working tree at session end carries changes this session didn't make
  and has no context on — `data/racials.json`, `data/spellbooks.json`,
  `data/talents/{hunter,paladin,warrior}.json`, plus an untracked
  `data/sources/talentsforever-2026-09-20.json`. Looks like a fresh
  vendor pull/diff-apply happened outside this conversation. Don't
  assume it's finished, reviewed, or safe to build on without checking
  with whoever ran it.
- One instruction this session ("drop false 'Requires Shadowform'/'Requires
  Spirit of Redemption' lines from Priest racials and Human Perception")
  could not be resolved — grepped current `data/racials.json` and
  `data/class-racials.json` (neither schema has a requirement-line field at
  all) and the full text of both the 09-16 and 09-18 vendor snapshots (zero
  occurrences of either phrase in either file). Not fixed, not fabricated.
  If this comes up again, ask for a screenshot or a different source before
  acting — it isn't in anything this codebase currently tracks.
- Legacy Perks page (`/reference/legacy-perks`) is desktop-only by explicit
  scope cut — see Architecture below. No mobile tap/long-press model yet,
  and `LegacyPerkNode`'s tooltip does not yet use the new single-tooltip-
  owner mechanism (`lib/active-tooltip.ts`) either — both ports are
  optional/low-priority unless this page turns out to get real traffic.
- Priest's Renewed Hope highlights "Heal" inside its own description text
  even where that word is really the tail of "Greater Heal" (a spell that
  isn't tracked anywhere in `data/spellbooks.json`) — a data-coverage gap
  found while auditing the linked-spell feature, not a matching-logic bug.
  Left as-is rather than fabricating "Greater Heal" data; would need a real
  source for that spell to fix properly.
- The talent tree's square talent cells vs. talentsforever.com's own wider-
  column, non-square rhythm (91px column pitch vs. their 68px row pitch)
  is a disclosed, deliberate trade-off, not an oversight — see the sizing
  architecture note below before "fixing" this into non-square cells.
- Carried over from 2026-09-17, still untouched: no visual distinction
  between directly-observed vs. inferred spell tooltip sourcing;
  spellbook tooltip's mobile bottom-sheet placement still never visually
  verified on a real narrow viewport (note: this session verified the
  *talent tree's* mobile sizing and tap-tooltip behavior on a real
  device-emulated window — that's a different check from the spellbook's
  bottom-sheet placement specifically, which remains unverified);
  `classicDescription`/`classicStatus` backfill (7+ of many spells done);
  tailoring's missing `hero.webp`; `app/sitemap.ts`'s manual TODO (still
  missing per-slug profession pages, blog posts, and guides).

**Suggested next:**
- If picking this project back up cold: the standing backlog above
  (racials "Requires" mystery, sitemap TODO, tailoring hero image,
  spellbook mobile bottom-sheet verification — a different, still-open
  check from this session's tab-rail/spine change, see above) plus this
  session's two new open items (real mobile click-through on the
  spellbook, and the unreviewed uncommitted data-pull files) are the
  standing backlog, not new discoveries.
- The claude-in-chrome click-timeout-on-an-unfocused-window issue (see
  Tooling notes below) is worth watching for. It only happened once, so
  it was worked around with a user hand-off rather than investigated —
  if it recurs, it's probably worth digging into properly instead of
  routing around it every time.
- Optional, low-priority: Legacy Perks could get the planner's mobile touch
  model (tap-to-add, long-press-peek, haptic pulse) ported over from
  `TalentNode.tsx` if this page turns out to get real mobile traffic — see
  Architecture below for why it was scoped out initially.
- Optional: decouple the talent tree's row/column spacing to match
  talentsforever.com's non-square cell rhythm exactly, if that proportion
  difference turns out to matter — see the sizing architecture note for
  why it wasn't done this session (risk to the connector-arrow geometry
  for a proportions-only gain).

## Tooling notes

### claude-in-chrome can drive more than one open Chrome window
Learned 2026-09-18, after wrongly assuming otherwise for a while first:
the extension is not bound to a single fixed window for the life of a
session. `tabs_create_mcp` creates its new tab in whichever Chrome window
currently has OS focus — not necessarily the window holding this
session's other tabs — and the resulting tab keeps its own addressable
`tabId` afterward regardless of which window it landed in or which window
has focus later. Both tabs stay independently usable by `tabId` at the
same time.

Practical effect: testing across two open windows (e.g. one at normal
desktop size, one set to a mobile responsive-mode viewport) just needs
the user to focus the target window, then a fresh `tabs_create_mcp` call
— no need to close/reopen either window, and no need to treat the tool as
limited to whatever viewport it happened to attach to first. This
directly unblocked a real mobile-verification need this session:
`resize_window` on an existing tab was confirmed unreliable in this
environment across many separate attempts (it reports success but
`window.innerWidth` never actually changes), which had previously been
written off as "mobile can't be visually verified here, only reasoned
about from unchanged CSS classes" — that conclusion was wrong. If a
resize-based approach isn't working, ask the user whether a second real
window is available before falling back to code-only reasoning.

### A second real window can screenshot fine but time out on clicks
Observed 2026-09-19, not yet root-caused: after the user set up a second,
mobile-sized Chrome window per the note above, `tabs_create_mcp` landed a
new tab there and `computer` `screenshot` worked on it repeatedly and
correctly (confirmed a genuine 330×717 viewport) — but every `computer`
`left_click` on that same tab timed out on `Input.dispatchMouseEvent`
after 30s, even immediately after a successful screenshot. The likely
cause is that CDP input-event dispatch needs the target window to have
real OS focus, which a second window sitting behind/beside the active
one may not have, while screenshot capture apparently doesn't need it.
Not confirmed against Chrome/CDP internals this session — treat as a
working theory, not a proven mechanism.

**Practical effect:** if clicks on a real secondary window mysteriously
time out while screenshots on the same tab keep working, don't loop
retrying the click — ask the user to click into (focus) that window
first, or fall back to asking them to perform the click themselves and
just screenshot the result. This session's spellbook mobile-tab
verification (see the 2026-09-19 handoff above) hit exactly this and the
user opted to skip further live interaction rather than troubleshoot it
further, so the underlying cause is still unconfirmed — worth revisiting
if it blocks something more important later.

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

### Build codes are versioned (`lib/build-code.ts`)
Encoding is positional — one base36 rank digit per talent, talents ordered
by tier then col within each tree, trees joined with `-` — with **no
name/id tie-back to the encoded digits**. That means any change to a
tree's talent membership or order (add/remove/reshuffle) shifts every
digit after the change point onto a *different* talent for anyone
decoding an old link against the current data: not a decode failure, a
silent wrong-talent assignment, and for a removed talent, a decode that
runs past the new (shorter) array just drops that digit's data with no
error at all. This is exactly what the 2026-09-18 tree restructuring above
would have done to old links with points in Warrior Protection's tier
5-7, Rogue Combat, Warlock Affliction, or Druid Balance.

Fixed with a version segment: `encodeBuild` prepends a version number
(currently `2`) as an extra `-`-separated segment, so a versioned code has
`classData.trees.length + 1` segments vs. exactly `classData.trees.length`
for a pre-versioning code — detected by segment count, not a special
character, so codes stay plain base36+`-` and drop safely into any URL
segment (including the OG image route's path) with no escaping questions.
`decodeBuild` branches on that: versioned codes decode directly against
the current tree order; unversioned (legacy) codes decode against a
frozen `LEGACY_TREE_ORDER` snapshot of the 4 talent trees that changed
shape on 2026-09-18, then translate old talent ids to current ones
(`LEGACY_ID_TRANSLATION` — identity for anything unchanged, an explicit
mapping for the 2 same-slot renames, `null`/dropped for the 2 outright
removals) before clamping to the current talent's `maxRank`. Every other
tree, on every other class, is untouched by any of this and always
decodes the same way it always did.

**The next time a tree's talent membership or order changes**, bump
`CURRENT_VERSION` again and add a new frozen `LEGACY_TREE_ORDER`-style
snapshot (and translation table) for whatever changed, following this
same pattern — don't simplify the versioning away just because it looks
like unused-most-of-the-time machinery; it exists specifically because
array-position encoding plus a tree reshuffle is a silent-corruption
scenario, verified directly against constructed legacy codes for all 4
trees affected on 2026-09-18 (see that commit for the exact repro).

### Legacy Perks: interactive 3-column tree (`/reference/legacy-perks`)
Rebuilt 2026-09-18 to match the vendor's real Legacy Tree UI (three
columns — Adventure, Resourcefulness, Professions — each row/col/gate/
ranks/req-shaped like a talent tree; see `.reference/deep-dive-images/`
for the actual in-game reference screenshots) instead of the old flat
description-list page. `components/reference/LegacyPerkTreeGrid.tsx` +
`LegacyPerkNode.tsx` reuse `TalentTreeGrid.tsx`'s grid/connector-arrow
layout and `TooltipCard`'s tooltip primitives rather than a parallel UI.
One real geometry difference from class talent trees: every Legacy Perk
prereq (`req` in the vendor data, resolved to `prereq: {id, ranks: 1}` at
data-authoring time in `data/legacy-perks.json`) runs within the same row,
never between rows — so only `TalentTreeGrid`'s existing same-tier
horizontal-connector path (originally built for the rare same-tier class-
talent case, e.g. Paladin Holy Shock → Divine Precision) is ever exercised
here.

`lib/legacy-perks.ts`'s gating (`canAddLegacyPoint`/`canRemoveLegacyPoint`)
is deliberately its own thing, not a reuse of `lib/talent-rules.ts`: a
class talent tier unlocks at a fixed 5-points-per-row formula, but each
Legacy Perk specifies its own explicit `gate` that doesn't follow row math
at all (confirmed in the data: Resourcefulness's row-1 "For Great Honor"
has `gate: 5` while its row-2 neighbor "Gourmand" has `gate: 0`).

**Explicit scope cut, not an oversight:** `LegacyPerkNode` is click-to-add
/ shift-click-or-right-click-to-remove only — no touch-specific tap/
long-press-peek/haptic model ported from `TalentNode.tsx`. This is a
lower-traffic reference page, not the main planner, and the source data
has no confidence/classic-compare fields to show either, so the component
is meaningfully smaller than a straight fork would suggest. Plain clicks
still register via tap-triggers-click on a touch browser; only the extra
mobile affordances (long-press peek, haptic pulse) are missing. Port them
from `TalentNode.tsx` if this page turns out to get real mobile traffic.
Also **not persisted anywhere** — no build-code, URL, or localStorage; the
page is a spend-order scratch pad, not a saved/shareable build like the
main planner.

### A tab rename touches more than tree/tooltip logic
The 2026-09-18 Priest "Shadow Magic" → "Shadow" and Shaman "Elemental
Combat" → "Elemental" talent-tree tab renames (see the session handoff
above) broke two things that weren't visually checked in that same
session's own "verified live" pass, both surfacing only after the fact:

- **`treeBackgroundUrl()`** (`lib/wow-data.ts`) derives its image path by
  slugifying `tree.name` directly — `public/backgrounds/<classId>/<slug>
  .jpg`. Renaming the tree left it requesting `shadow.jpg`/`elemental.jpg`
  paths that didn't exist on disk yet (`shadow-magic.jpg`/`elemental-
  combat.jpg` were the tracked files). Fixed by renaming the actual image
  files to match — the derivation is single-domain (only ever called with
  the talent tree's own name from `TalentTreeGrid.tsx`), so renaming the
  assets is the complete, permanent fix, not a stopgap.
- **`getTreeIcon()`**'s `TREE_ICON_OVERRIDES` map (`lib/wow-data.ts`) is
  shared by two *different* naming domains that happened to be identical
  strings before this rename and no longer are after it: `TalentTreeGrid
  .tsx` calls it with the talent tree's name (now "Shadow"/"Elemental"),
  but `SpellbookBook.tsx` calls it with the trainer-spellbook tab name from
  `data/spellbooks.json`, which the vendor left unchanged ("Shadow Magic"/
  "Elemental Combat" — confirmed by direct inspection, not a mistake to
  "fix" there). Renaming only the override keys orphaned the spellbook's
  lookup, which fell through to the icon fallback and rendered a
  placeholder "?" for both tabs. Fixed by keeping **both** keys
  (`"priest:Shadow"` and `"priest:Shadow Magic"`, same for Shaman) mapped
  to the same icon — this is correct steady-state, not a duplicate to
  clean up later, as long as the two domains stay split.

**The lesson, not just the fix:** a rename like this can propagate through
any code that derives a path/lookup key from the renamed string, not just
the obvious tree-rendering and tooltip call sites a "did the tree still
work in the browser" check would catch. Before considering a tab/tree
rename done, grep the *entire* codebase (components, `lib/`, data files)
for the literal old string, not just the files you already expect to
touch — and don't take an earlier session's "verified live" note as proof
nothing else broke; it verified what it looked at, not everything the
string touched.

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

### Desktop talent tree sizing matches talentsforever.com within 1px (square cells, not their rhythm)
`TalentTreeGrid.tsx`'s desktop sizing is a set of `sm:`-prefixed Tailwind
classes layered on top of the mobile values above — mobile is completely
untouched by any of this (verified live against a real device-emulated
window, not just reasoned about from the class names — see Tooling notes).
Tuned 2026-09-18 by direct pixel measurement (`getBoundingClientRect`, not
their CSS/JS) against talentsforever.com's live tree: their icons render
at 44px on a 24px gap (68px row pitch); ours now measures 43px icons, 24px
gap, 67px pitch — within 1px of every one of their numbers. Concretely:
panel width `sm:max-w-[296px]`, grid gap `sm:gap-5`, column floor
`minmax(44px, 1fr)`, with the connector bar thickness, arrow triangle
size, and rank-badge text size all given matching `sm:`-only reductions so
nothing scaled independently of the icons. The tree group itself is
centered as a unit (`justify-center`, no `sm:justify-start` override) —
a stray override from an earlier width change had been left-aligning it
with a large empty gap on one side once the panels got narrower than the
container.

**Deliberately not matched: their non-square cell rhythm.** talentsforever
's own column pitch (91px) is noticeably wider than their row pitch
(68px) — a rectangular, not square, cell. Ours stays square (`TalentNode`
's `aspect-square` wrapper ties row height to column width via the grid
track), matching their row pitch but not reproducing the wider columns.
**This is a disclosed trade-off, not an oversight** — don't "fix" it into
non-square cells without a fresh explicit decision to do so. Decoupling
row/column spacing to match their rhythm exactly would mean removing
`aspect-square` and giving the grid explicit, separate row and column
tracks, which touches the same cell geometry the connector-arrow
legibility work depended on; matching a proportions difference that's
already within 1px on the dimension that actually matters (row pitch,
since that's what determines whether the tree fits without scrolling)
wasn't judged worth that risk. Also don't assume these exact pixel values
stay right forever — talentsforever.com is a live site that gets its own
updates, so re-measure before trusting the numbers above as still
accurate.

### Single-tooltip-owner mechanism (`lib/active-tooltip.ts`)
Both the talent tree tooltip (`TalentNode.tsx`) and the spellbook tooltip
(`SpellbookBook.tsx`'s `SpellEntry`) share one module-level "which tooltip
is currently allowed to be open" claim, added 2026-09-18 to fix a real
bug: each tooltip used to manage its own visibility purely from its own
mouseenter/mouseleave (and focus/blur) pair via `useHoverTooltip`'s local
state, and a window blur/focus cycle mid-hover isn't guaranteed to
deliver a mouseleave to the element the mouse never actually left — so
alt-tabbing away while hovering one talent, then returning and hovering a
different one, could leave the first tooltip stuck open alongside the
second. Verified fixed by reproducing the actual desync (dispatching
`mouseenter` on one talent, a window `blur` with no matching `mouseleave`
ever fired, then `mouseenter` on a different talent with the first still
never released) rather than just the surface symptom.

`claimActiveTooltip(id)` / `releaseActiveTooltip(id)` / `useIsActiveTooltip
(id)` enforce a hard single-owner invariant: every tooltip's render gates
on holding the claim, not just on its own local show/hide state, so a
different tooltip claiming it (or a window `blur`, handled directly inside
the module) hides a stuck one immediately regardless of whether its own
lifecycle ever fires correctly. It's a plain module-level store, not React
state lifted through a shared ancestor — talent nodes and spellbook
entries are siblings many levels deep with no natural place to hold
shared state, and threading it through every intermediate component would
be its own source of bugs. The spellbook entry releases its claim on the
same delayed timer as its existing hide-on-leave grace period (not
immediately on mouseleave), since releasing early would hide the tooltip
before the player has a chance to move the mouse into it.

**Any future tooltip-like component should use this mechanism from the
start**, not reinvent its own show/hide lifecycle — the failure mode here
(a stuck-open tooltip after a window focus change) is generic to anything
built on hover/focus events, not specific to talents or spellbooks.
`LegacyPerkNode`'s tooltip does not currently use this and would be worth
migrating if that page gets a mobile/touch pass (see the open items above).

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

### Per-rank `confirmedRanks` mechanism — retired 2026-09-18
talentsforever's source data used to sometimes carry a per-rank
`confirmed: number[]` array (which specific ranks' text is vendor-verified,
distinct from the whole-talent `confidence` field), and `Talent`
(`lib/wow-data.ts`) had a matching optional `confirmedRanks?: number[]`
that `TalentNode.tsx` used to mark any rendered rank *not* in that list
with a small "(estimated)" note.

Removed this session: the 2026-09-18 pull confirmed 100% of 468 talents at
`complete: true` (extracted directly from the beta client, `src: "beta"`,
not partial stream/demo reads), and `data/talents/*.json` already carried
zero `confirmedRanks` arrays by that point — the mechanism had nothing
left to ever display. `confirmedRanks` is gone from the `Talent` type and
`TalentNode.tsx`'s tooltip no longer has any per-rank estimated marker.

**The whole-talent `confidence` field itself is untouched** and still
flips `estimated → confirmed` when a talent's `complete` flag does
(`ConfidenceBadge.tsx` still renders it) — this removal was specifically
about the now-always-vacuous per-rank marker, not the talent-level
concept. Don't reintroduce `confirmedRanks` without first checking a fresh
`talentsforever-*.json` pull for a nonzero `complete: false` count — if
the vendor ever goes back to partial/estimated extraction, per-rank
confirmation becomes meaningful again and this mechanism (or something
like it) would be worth rebuilding, but re-add it from that evidence, not
speculatively.

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

**Legacy Perks are diffed by tree+row+col, not name** (fixed 2026-09-18,
when the vendor moved this section from `[name, maxRank, description,
icon]` tuples to full talent-shaped objects —
`name/max/row/col/icon/ranks/gate/req?/placeholder?`, see the Legacy Perks
architecture note below): several placeholder perks share the literal name
"Unknown", and the main transition this data goes through is a placeholder
getting revealed in place, which position-keying reports as one "changed"
entry (with a "(revealed)" marker) instead of a spurious remove+add pair.
The one-time tuple→object transition itself has no sound cross-shape
identity to diff and is called out explicitly in the markdown rather than
guessed at — every pull since is object-vs-object and diffs normally.

**Schema-drift fields are reported as a value-count summary, not spammed
per-talent** (also fixed 2026-09-18): a field that appears on every talent
at once (e.g. `src` going from absent to `"beta"` on all 468 when the
vendor switched to direct beta-client extraction) shows up as one summary
line — count and value distribution — under "New fields seen on talents",
not one "changed" line per talent. Only fields never seen in the old
snapshot get this treatment; a real per-talent value change still shows
individually.

**Match by name (or position, for Legacy Perks — see above), never array
index, when applying a rewrite the vendor reordered.** The racials/
class_racials sections in particular have been reordered by the vendor
before (2026-09-18's pull shuffled both the per-race `classes` list and
the `abilities` array order) — diffing or applying by index there silently
attributes the wrong text to the wrong ability. Match by the vendor's own
`race`/ability `name` fields instead, the same approach used for the
2026-09-18 racials resync (36 general + 12 Priest class-specific abilities,
0 unmatched in either direction) and worth repeating for any future
resync of that section.

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

### "What's New" is built but intentionally unlinked from navigation
Shelved, not broken or abandoned: the planner header's "What's new" badge
(a `Link` to `/whats-new` with an unread-change-count pill) was removed
along with the now-unused `latestChangeCount` prop threaded from
`app/planner/[[...slug]]/page.tsx` through to `PlannerClient.tsx` (that
page's own `getLatestDiffSummary()` call went with it). Nothing else was
touched — `/whats-new`'s own page, `components/whats-new/*`,
`lib/whats-new.ts`/`lib/whats-new-style.ts`, and
`scripts/diff-talentsforever.js`'s diff-generation pipeline it reads from
are all fully intact and functional.

The route itself is a deliberate middle ground, not a hard removal: it's
left fully reachable for anyone with the direct URL (no redirect, no 404)
since the feature isn't broken, just not something the site is currently
pointing people toward -- but its metadata now sets `robots: { index:
false, follow: false }` so it doesn't surface in search results while
unlinked. If this comes back to nav, drop that `robots` block along with
re-adding the link.

**Don't "clean up" any of this as dead code** without checking here first
— it's mid-shelf, not mid-removal. Re-link it (and re-thread
`latestChangeCount` back through, or redesign that badge) once the page
itself is fleshed out further; until then this note is the reason it
looks unreachable-but-present.

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
