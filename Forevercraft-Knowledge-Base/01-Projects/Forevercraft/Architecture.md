---
type: project
created: 2026-09-30
updated: 2026-09-30
tags: [forevercraft, architecture]
status: active
---

# Architecture

Living architecture reference. Mechanics that are already written up in `CLAUDE.md` (repo root, auto-loaded each session) are summarized and pointed at rather than copied; everything decided after it was last edited, plus the still-accurate parts of [[Site-Audit-2026-09-20]], lives here.

Back to [[Overview]] · Next: [[Roadmap]]

## Areas (details in CLAUDE.md "Active architecture")
- **Planner**: `/planner/<classId>/<buildCode>`; race is reference-only. Build codes are **versioned** (`lib/build-code.ts`): bump `CURRENT_VERSION` whenever a tree's talent membership/order changes.
- **Talent tree UI**: mobile tap/long-press model, desktop sizing (square cells, deliberate), single-tooltip-owner (`lib/active-tooltip.ts`).
- **Spellbooks**: shared `SpellbookBook`/`ClassAbilitiesSection`, Classic word-diff.
- **Content**: `lib/content.ts` shared loader (`lib/blog.ts` not yet migrated).
- **Reference**: racials, legacy perks, spellbooks, dungeon level ranges, dungeon loot, items catalog, professions, crafting calculator, world map.
- **Data workflows**: daily talentsforever snapshot diff, `scripts/` pipelines, `data/sources/` layout.

## Data normalization: master `items.json` (2026-09-29)
**Now:** item records live **once**, in `data/items.json` (21,458 items, built by `scripts/build-items.js`, read server-side via `lib/items.ts`'s `getItemById`). Structures that *use* an item carry only a lightweight reference, `{ itemId, name }`, and resolve the full record (icon, quality, tooltip, Classic diff, status) from the master catalog at render time (`lib/profession-utils.ts`, `lib/profession-recipes.ts`; build-time counterpart in `scripts/lib/profession-item-resolver.js`).

**What it replaced:** the profession catalog builder used to paste a full item record (name, slot, type, icon, quality, levels, tooltip array, Classic tooltip, status, drop info, source) into every recipe output and every reagent line, so the same item's data was duplicated across many files and many places in one file. Commit `e98233c` ("normalize recipe data") cut the crafting-profession catalogs by roughly 213k lines (net: 11k added, 213k removed).

**Why it matters:**
- **Single source of truth.** A tooltip fix or data refresh (`fetch-item-refresh.js`, `fetch-referenced-item-tooltips.js`) is made once in `items.json` and every recipe, reagent, leveling step, and the crafting calculator picks it up. Before, copies could drift apart (the 2026-09-24 "refresh stale item data" commit had to chase copies).
- **Smaller payloads and diffs.** Catalog JSON is a fraction of its former size, and data-refresh diffs are readable.
- **Unresolved references degrade visibly.** A missing id falls back to an `unresolvedItem(ref)` stub (name only) rather than showing stale embedded data.

**Scope, verified against the repo 2026-09-30 (not yet codebase-wide):**
| Structure | State |
|---|---|
| Crafting-profession catalogs (`data/professions-catalog/{alchemy,blacksmithing,cooking,enchanting,engineering,first-aid,leatherworking,tailoring}.json`): recipes, reagents, leveling materials | **Normalized** (`{itemId, name}` refs) |
| Gathering-profession catalogs (`mining`, `herbalism`, `skinning`) | Still embed full item records |
| Dungeon boss loot and quest rewards (`data/dungeons/*.json`, 28 files / ~1,800 embedded records) | Still embed full item records (quest rewards are enriched by an id join at *build* time, not resolved at render time) |
| Some profession-catalog sections (e.g. alchemy has embedded records outside the recipe lists) | Not audited individually |

Extending it is tracked on the [[Roadmap]] (Tech debt). Item ids are the join key, not names: name-matching is how the old pipelines drifted.

## Saved builds: Vercel KV (decided 2026-09-30, not built)
**Decision:** shared/saved builds will use simple key-value storage on **Vercel KV**, replacing the Postgres + Auth design (see Superseded below). It enables a browsable **"most used builds"** list. No accounts.

**What already exists and stays:** build codes are stateless and URL-shareable today (`/planner/<classId>/<buildCode>`), and `lib/saved-builds.ts` does per-device `localStorage` save/load. KV adds what those can't: *shared* storage and *aggregate* counts (popularity), not the basic ability to share.

**Open design points (a sketch, not a decision):**
- Store the build code **with its version segment** (see the versioned encoding above), so a stored build still decodes correctly after a tree change.
- Popularity is a counter/sorted-set problem (e.g. increment per `(class, buildCode)`); dedupe so one viewer can't inflate it.
- First write endpoint the site would have. Validate input by running it through `decodeBuild` (bounded by server-defined tree arrays, as in Security below), cap payload size, and rate-limit.
- **Verify the product name before building.** To my knowledge Vercel folded its own KV product into Redis offered through the Vercel Marketplace (Upstash), so "Vercel KV" may now mean provisioning that integration; I haven't confirmed the current state. No KV package is in `package.json` yet.

### Superseded: Auth + Postgres saved-builds design
*Shelved 2026-09-30; kept for the reasoning. See [[Roadmap]] "Shelved / Reconsidered".*
Originally "Phase 2": NextAuth for auth, Postgres (Vercel Postgres or Supabase) for account-backed saved builds, a per-user "My builds" page, then a lightweight admin view for editing `/data` and posts. This architecture note previously read only: "Phase 2 (not started): auth + Postgres + saved builds; do not begin early." The repo-root brief (`C:\Users\samue\Desktop\CLAUDE.md`) still describes this design.

## Routes (`app/`, verified 2026-09-30)
| Route | Notes |
|---|---|
| `/` | Home. No own `metadata` export (inherits root layout) |
| `/planner/[[...slug]]` | Optional catch-all; legacy 3-segment race URLs redirect. `generateMetadata` sets canonical `/planner`. Per-build OG via Route Handler `app/planner/og/[classId]/[buildCode]/route.tsx` (catch-all must be terminal, so the file convention can't be used) |
| `/reference` | Landing cards |
| `/reference/racials`, `/legacy-perks`, `/class-spellbooks`, `/dungeons` | Static; each has its own `opengraph-image.tsx` |
| `/reference/dungeons/loot`, `/[slug]` | 28 of 35 dungeons have loot data; `dynamicParams = false` |
| `/reference/items` | Server-side filtered/paginated catalog; canonical set |
| `/items/[itemId]` | **Not** statically generated (21,458 items on demand); `robots.index` true only for new/changed items |
| `/reference/professions`, `/[profession]` | 8 crafting + 3 gathering; `dynamicParams = false`; canonical set |
| `/reference/crafting-calculator` | Client component `components/professions/CraftingCalculator.tsx`, reads the normalized catalogs; has OG image; in nav and sitemap (2026-09-28) |
| `/reference/map/[continent]` | Leaflet world map (live, development paused, see [[Roadmap]]); bare `/reference/map` redirects |
| `/guides`, `/guides/[slug]` | Pipeline live, zero guide MDX files |
| `/blog`, `/blog/[slug]` | 12 posts (incl. the 7 profession write-ups migrated from `content/professions/` on 2026-09-23) |
| `/whats-new` | Footer link only (not nav) |
| `/contact`, `/privacy` | Contact embeds a Google feedback form (2026-09-28) |
| `robots.ts`, `sitemap.ts`, `not-found.tsx` | Metadata-file conventions |

## Data pipelines
- **Sources** (under `data/sources/`): `talentsforever` (dated immutable snapshots), `wowtbc` (dungeon loot), `foreverchanges` (dungeon loot/quests, item refreshes, profession data). All scraped/derived; client-extracted data via wow.export is the launch-critical goal on the [[Roadmap]].
- **Derived files** are regenerated by scripts, not hand-edited: `spellbooks.json` (`build-spellbooks.js`; auto-picks the latest snapshot), `talent-spell-links.json` (`build-talent-spell-links.js`), `items.json` (`build-items.js`), `data/dungeons/*.json` (`build-dungeons.js`), profession catalogs (`build-professions.js`, `build-gathering-professions.js`), map data (`build-map-zones.js`, `build-zone-areas.js`, `build-map-entrances.js`, `build-flight-masters.js`, `slice-map-tiles.js`). None are wired into `package.json` (only `dev/build/start/lint`); run by hand after a pull.
- **Dungeons:** `data/dungeons/<id>.json` (35 files) reconciles foreverchanges.pro (primary) and wowtbc.gg (fallback) **per dungeon per data type**, never item-by-item. `data/dungeon-loot.json` is the wowtbc intermediate (`build-dungeon-loot.js`) that `build-dungeons.js` still reads; it is not a live data source.
- **Daily data-diff workflow:** new dated snapshot → `node scripts/diff-talentsforever.js` → read the vendor changelog by hand (the diff can't see UI-only changes) → apply by name match (tree+row+col for Legacy Perks), never array index → rebuild spellbooks/spell-links if affected → commit. Verify regenerations with `git diff --stat` before trusting them over hand edits. Nothing enforces re-running the derived builds; it's caught by eye.
- **Known trap:** a hand-edit to `data/dungeons/hall-of-thanes.json` (quest 96403 faction) was once reverted by a rebuild; change it in the foreverchanges source file instead.

## Mobile vs. desktop, tooltips, spellbooks
Covered in CLAUDE.md (mobile tap/long-press/scroll disambiguation/haptics; `lib/active-tooltip.ts` single-owner store; Ctrl-hold linked-spell cards, desktop-only by nature). `LegacyPerkNode` now **does** use `active-tooltip` (adopted in `13acf37`, 2026-09-30); CLAUDE.md and the 2026-09-20 audit still say it doesn't. The Legacy Perks page's touch interactions still have no mobile pass (on the [[Roadmap]]). The retired per-rank `confirmedRanks` "(estimated)" mechanism must not be reintroduced without checking a fresh pull for nonzero `complete: false`.

## Content
- `lib/content.ts` (`listContentSlugs`, `readContentFile`) backs `lib/guides.ts`; `lib/blog.ts` still has its own copy of that plumbing.
- Frontmatter, image/credit, and SEO conventions: repo `docs/adding-content.md`. The vault template [[Guide-Content-Template]] is for drafting before content becomes MDX.
- Drafts 404 even by direct URL; there is no preview route. No frontmatter validation: a missing field renders blank rather than failing the build.
- `<GuideImage>` defaults to a Blizzard-reveal-screenshot credit; override with `credit`/`heroCredit`.

## SEO
- **Sitemap** covers static routes, guides, blog, all profession pages, the 28 dungeon-loot pages with data, the crafting calculator, and only **new/changed** item pages (9,606 of 21,458 at last count). Deliberate: same-as-Classic item pages are thin duplicates, kept crawlable (`index: false, follow: true`) so link equity still flows.
- **Canonicals** on `/planner`, `/reference/items`, `/reference/professions/[profession]`: the routes that render many `searchParams` permutations. `guides/[slug]` and `blog/[slug]` take no `searchParams`, so a canonical there would be inert.
- **OG images:** shared renderer `lib/og-template.tsx`; every background is re-encoded through `sharp` (1600px JPEG q82) because satori can't decode WebP data URIs. Missing: items catalog, dungeon loot, item pages (fall back to the static site image).
- Only `/planner` emits JSON-LD (static `WebApplication`). Permanent `/guides/dungeons` → `/reference/dungeons` redirect lives in `next.config.ts`.

## Security (2026-09-20 audit, still accurate unless noted)
- `npm audit`: 0 vulnerabilities on 2026-09-20 (not re-run for this pass).
- No `dangerouslySetInnerHTML`/`eval`/`innerHTML` except one static JSON-LD object in the planner page.
- User-influenced inputs reviewed safe: `decodeBuild` (bounded by server-defined arrays), `build-text-export.ts` (clipboard only), `saved-builds.ts` (React-escaped text), the OG Route Handler (validated `classId`), MDX (author-controlled files only).
- MDX slug routes set `dynamicParams = false` (path-traversal hardening, done 2026-09-20).
- `next.config.ts` has no `headers()` block (no CSP/X-Frame-Options). Acceptable with no auth, backend, or cookies. **The planned KV write endpoint changes that calculus** (see Saved builds); revisit headers and input limits when it's built.

## Deeper references
- Dated full audit: [[Site-Audit-2026-09-20]]. Its component/lib inventories still read correctly but are not re-verified; its routing, data, and SEO sections were superseded by the tables above.
- Repo docs: `docs/adding-content.md`, `docs/map-tile-cdn-plan.md`, `docs/map-reference-foreverchanges.md`
- Historical session detail: `03-Handoffs/project-history/2026-09-30-claude-md-archive` (local-only)
