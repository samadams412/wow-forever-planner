---
type: project
created: 2026-09-30
updated: 2026-10-06
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

## Saved builds: Vercel KV (decided 2026-09-30; collection built 2026-10-06, see Build tracking below)
**Decision:** shared/saved builds will use simple key-value storage on **Vercel KV**, replacing the Postgres + Auth design (see Superseded below). It enables a browsable **"most used builds"** list. No accounts.

**2026-10-06 update:** the product-name question below is resolved. "Vercel KV" is retired; the Marketplace now offers **Upstash Redis**, and that's what got built — see "Build tracking" below for the full implementation. That section covers event collection only; the "most used builds" **display** (the actual point of this decision) is still not built.

**What already exists and stays:** build codes are stateless and URL-shareable today (`/planner/<classId>/<buildCode>`), and `lib/saved-builds.ts` does per-device `localStorage` save/load. KV adds what those can't: *shared* storage and *aggregate* counts (popularity), not the basic ability to share.

**Open design points (a sketch, not a decision):**
- Store the build code **with its version segment** (see the versioned encoding above), so a stored build still decodes correctly after a tree change.
- Popularity is a counter/sorted-set problem (e.g. increment per `(class, buildCode)`); dedupe so one viewer can't inflate it.
- First write endpoint the site would have. Validate input by running it through `decodeBuild` (bounded by server-defined tree arrays, as in Security below), cap payload size, and rate-limit.
- **Verify the product name before building.** To my knowledge Vercel folded its own KV product into Redis offered through the Vercel Marketplace (Upstash), so "Vercel KV" may now mean provisioning that integration; I haven't confirmed the current state. No KV package is in `package.json` yet.

### Superseded: Auth + Postgres saved-builds design
*Shelved 2026-09-30; kept for the reasoning. See [[Roadmap]] "Shelved / Reconsidered".*
Originally "Phase 2": NextAuth for auth, Postgres (Vercel Postgres or Supabase) for account-backed saved builds, a per-user "My builds" page, then a lightweight admin view for editing `/data` and posts. This architecture note previously read only: "Phase 2 (not started): auth + Postgres + saved builds; do not begin early." The repo-root brief (`C:\Users\samue\Desktop\CLAUDE.md`) still describes this design.

## Build tracking (built 2026-10-06)
Fast-reference version lives in CLAUDE.md ("Build tracking" — schema, hashing, secrets, routes, rate limits, dedup rule, cron schedule). This section is the full story: why it's shaped this way, what was verified and how, and the build-time/Vercel-usage investigation from the same work. See also `docs/popular-builds-research.md` (what talentsforever.com does, the design this was built from) and the local-only handoff `03-Handoffs/infrastructure/2026-10-06-build-tracking-infrastructure.md` (session-by-session narrative, superseded by this doc for anything still true).

**Status:** collection is live in production (Upstash Redis, endpoint `enabling-mallard-202178.upstash.io`, console name `upstash-kv-alizarin-blanket`, Free Tier). Verified against real Redis 2026-10-06: a real browser's Copy share link / Save build / page-load-with-build-code all landed as hashed-token events, and a manual rollup run aggregated them into `builds:agg:classes`/`builds:agg:talents` correctly, trimming the raw list to empty afterward. Cron (`/api/cron/build-rollup`, `0 6 * * *`) is confirmed live on the dashboard's Cron Jobs page. Dedup (one event per type/token/build/UTC day) is verified against a local Upstash REST stand-in, including the real-Redis `SET NX EX` primitive it depends on.

**Why dedup exists:** a live test found two `shared` events for one visitor action — not a double-fire in the click handler (it fires once), but two *separate* real clicks in testing, one of which registered late because `navigator.clipboard.writeText` needs a focused tab and silently rejects otherwise. Dedup wasn't built to patch that specific artifact; it was built because reloads and repeat save-clicks are a real risk once real traffic arrives, and the late-clipboard-callback case showed the shape of the problem concretely.

**Design choices not in the CLAUDE.md summary:**
- Raw events are a capped Redis **list** (`builds:events:raw`, 100k cap), not a stream or sorted set — the rollup only ever needs to drain it head-first in daily batches, and a list's `LRANGE`/`LTRIM` do that with no extra bookkeeping key.
- The rollup writes aggregate counters **before** trimming the raw batch it just read, so a crash between the two re-counts that batch next run rather than losing it (at-least-once, not exactly-once — acceptable at this volume).
- Aggregates are Redis hashes, not the static `data/popularity/<class>.json` file the research doc sketches, because a Vercel Function has no repo write access. **This design question is still open** — a build-time export script, a committed snapshot refreshed by a workflow, or an endpoint the client fetches at request time are the live options; none is decided.
- The 90-day raw-event retention window is enforced by the rollup's own filter, but in practice raw events live about a day (the rollup drains them daily) — the 90-day number only matters if the rollup stops running for a while.

### Build-time investigation (2026-10-06): why every build regenerates ~5,160 pages
Triggered by the build log always showing `Generating static pages (5160/5160)`, even when game data hadn't changed. Findings, in the order checked:
- **(a) Determinism is not the cause.** The data-generator scripts (`scripts/build-quests.js` and others) do write `new Date().toISOString()` timestamps into `data/quests/index.json` and `data/quests/provenance.json`. But those files are **committed**, and the Vercel build's `prebuild` only runs `build-og-backgrounds.js` and `build-map-data-imports.js` — the quest data is not regenerated during a deploy, so the timestamps never change build-to-build. Nothing in `app/`/`lib/` reads `generatedAt`, so even a re-run wouldn't change rendered output. Ruled out.
- **(b) Next's build cache cannot skip unchanged SSG prerendering.** The bundled `node_modules/next/dist/docs` confirm remote/`use cache` entries are keyed by build id and don't persist across deploys by design. There is no mechanism that skips re-rendering a `generateStaticParams` page because its output would be byte-identical — "Restored build cache from previous deployment" covers the compile cache (webpack/Turbopack, fetch cache), not prerendered HTML. A full `next build` always re-renders every statically generated page. This is the actual reason the page count stays fixed.
- **Where the 5,160 pages come from:** the quest route (`app/quests/[questId]/page.tsx`, `dynamicParams = false`) alone accounts for **5,049 of 5,160** — it statically generates one page per row in `data/quests/index.json` (5,049 quests). Everything else (professions, dungeons, maps, blog, guides, items-with-data) is the remaining ~110.
- **(c) The `dynamicParams: true` + ISR option was evaluated, not implemented.** It would cut the build to roughly 110 pages (every quest removed from `generateStaticParams`, left to render on first request). The blocker: `getQuestById` currently reads the per-quest detail shard **at build time** specifically so no request-time function needs the 5,049-file `data/quests/detail/` directory — see the standing rule in CLAUDE.md about runtime-variable/full-directory disk reads bloating every function. Switching to on-demand rendering would need either (i) all shards bundled into the quest function anyway (defeats the point, and is the exact anti-pattern the standing rule exists to prevent), or (ii) moving shard data to `public/` and fetching it, which is a real architecture change, not a config flag.
- **Recommendation (not implemented, pending a decision):** leave the full prerender as-is. Local build is 29s with 27 workers; Vercel's Hobby build machine (2 vCPU → effectively 1 worker) takes ~87s for the same 5,160 pages, confirmed in the build log. Hobby's Build Time budget is only ~1% used (1h/100h over the last 30 days — see Vercel usage below), so this is a known, accepted cost, not a current problem. Revisit only if build time itself becomes the constraint, not because the page count looks large.
- **2026-10-06 follow-up: the build-time jump is the quest pipeline, pinned to a deploy.** Production build durations (Vercel deployment history, `ready − buildingAt`): ~43–75 s through the Oct 2 deploys; **49 s** at `e6324ac2` (Oct 3 09:15); **223 s** at `38b89fd` (Oct 3 09:18); 190–252 s on every production deploy since. `38b89fd` is a docs-only commit and is *not* the cause — it was simply the first deploy to ship the commits between it and `e6324ac2`. Those commits are `b34d8378` (quest scraper, which commits the 5,049 `data/quests/detail/*.json` shards) and `95652368`, which introduced `generateStaticParams` on `app/quests/[questId]/page.tsx`. That's the quest-pipeline cost described above, now confirmed as the source of the ~3–4 minute builds and a known, accepted cost.

### Vercel usage investigation (2026-10-06)
Checked `https://vercel.com/texs-projects-536fb399/wow-forever-planner/usage` directly (not assumed from the build-time finding above). Project is on the **Hobby** plan.
- **The constrained metric is Deployment Storage: 9.69 GB of 10 GB (~97%).** Not retention/bandwidth as might be assumed — Fast Origin Transfer is 5.03/10 GB (~50%), Fast Data Transfer 3.34/100 GB (~3%), Build Time 1h/100h (~1%), Build CPU 5h54m with no stated cap.
- **The retention policy (Settings → Build and Deployment → "Deployment Retention Policy"; the section is at the bottom of that page, not a separate URL):** Canceled 1 day · Errored 1 day · Pre-Production 1 day · **Production 1 week**. The earlier assumption of "1 day" was wrong for production deployments. The policy's start date isn't shown in the UI, so "since when" is unknown.
- **Why storage is at 97%:** 31 production deployments are in the listing (Sep 28 to Oct 6). Four are under a day old, 25 are 1–7 days old, and **2 are already past the 1-week window** (Sep 28 `776b6d7c` and Sep 29 `e98233c3`), so the policy is due to prune them but hasn't yet. At ~0.3 GB per deployment, the bulk is the week's ordinary deploy volume, not pre-policy leftovers. Removing only the two overdue deployments frees ~0.6 GB, which doesn't get the project comfortably under the cap. The main lever is how many deploys are kept, not the age of old ones. A 1-day production retention would cut the stored set to roughly the last day's deploys, at the cost of rollback history beyond that.
- **Do not delete deployments without the owner's explicit go-ahead on which ones.** Deployment deletion is irreversible. Options for the owner: (a) shorten production retention to 1 day (automatic, reversible setting, but drops rollback history beyond a day); (b) keep 1 week and manually delete everything except the current production deployment plus the last 2–3 for rollback; (c) reduce deploy frequency, since every push builds and stores a full deployment. **Outcome (2026-10-06):** option (b) applied by the owner — the 1-week production policy is kept, and older production deployments were deleted manually, keeping the current deployment plus 2 earlier ones for rollback (3 total). Recheck Deployment Storage on the usage page; it should be far below the 10 GB cap.

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
