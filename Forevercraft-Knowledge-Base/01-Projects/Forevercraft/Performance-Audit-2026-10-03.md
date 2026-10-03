# Performance and free-tier audit — 2026-10-03

Scope: serverless function count and size, build time and output size after the
quest data landed, which routes render dynamically when they could be cached,
image handling, and anything else that burns Vercel Hobby quota. Report only —
nothing here was fixed except the items back-link change noted in §1.

Measured locally on a `npm run build` (Next 16.3.5) and a `next start` smoke
test, not on Vercel. Vercel's own dashboard numbers are the ground truth for
invocations, transfer, and build minutes; this audit tells you where the
exposure is and what to watch there.

## Free-tier limits this is measured against

Per current secondary reporting (checked 2026-10-03; confirm on the vendor pages before
relying on them):

| Resource | Hobby limit | Source |
| --- | --- | --- |
| Function invocations | 1,000,000 / month | [Vercel limits](https://docs.vercel.com/docs/limits) |
| Fast Data Transfer (bandwidth) | 100 GB / month | [Vercel limits](https://docs.vercel.com/docs/limits) |
| Build minutes | 100 / month | [Vercel Hobby plan](https://examples.vercel.com/docs/plans/hobby) |
| Image optimization source images | 1,000 / month | [Vercel Hobby plan](https://examples.vercel.com/docs/plans/hobby) |
| Active CPU | 4 CPU-hours / month | [Vercel Hobby plan](https://examples.vercel.com/docs/plans/hobby) |

The most exposed of these, for this site, is **bandwidth** (large unoptimized
images), then **invocations** on routes that should be cached.

## Findings, ranked by impact

### 1. Dynamic (ƒ) routes that should be cacheable — each view is a function invocation

The build's route table has 7 ƒ routes. Only these matter for invocations:

| Route | Why dynamic | Traced bundle | Cache header on `next start` |
| --- | --- | --- | --- |
| `/items/[itemId]` | No `generateStaticParams` (deliberate, 21k items) | 20.1 MB | `no-store` (every view invokes) |
| `/blog` | `searchParams` read for `?page=` pagination (same anti-pattern as quests/items) | 17.4 MB | not measured (ƒ) |
| `/planner/[[...slug]]` | Catch-all with no `generateStaticParams`; the flagship page | 4.7 MB | not measured (ƒ) |
| `/planner/og/[classId]/[buildCode]` | Route Handler, per-build OG card; every share unfurl/crawler hit | 15.4 MB | not measured (ƒ) |
| `/reference/items` | Server-side filter/pagination over the 21k catalog via `searchParams` | 34.7 MB | `no-store` |
| `/reference/quests` | Server-side filter via `searchParams` | 20.6 MB | `no-store` |

Control case: `/quests/2` (SSG) returns `x-nextjs-cache: HIT` and
`Cache-Control: s-maxage=31536000`. Static routes cost nothing per view; ƒ routes cost one invocation
and active CPU each time.

**Done in this audit:** `/items/[itemId]` no longer reads `searchParams` on the server (the back
link moved client-side, same pattern as quests). That removed the request-time
dependency, but the route is still `no-store` because it has no static params and Next
renders it per request. Making it cacheable is a real decision (see
"Decision: item page caching" below).

**Open:**
- `/blog` — the `?page=` read is the same bug. Fix is either client-side pagination or
  static `/blog/page/[n]` routes. Small, low-traffic, cheap to do.
- `/planner` — the highest-value candidate. Prerendering the class roots (`/planner` plus the 9
  classes, Warrior default) with `generateStaticParams` makes the landing view static. Build-code
  URLs stay dynamic (unbounded), or use `dynamicParams` with a cache policy. Needs a decision on
  whether build-code pages should be cached on first hit.
- `/reference/items` and `/reference/quests` — filtering is intentionally server-side so the 10 MB
  catalog never ships to the client. The tradeoff is each filter/search/page change is an
  invocation and the 34.7 MB trace cold-starts a 10 MB JSON parse. A static pre-sliced
  "default view" plus client filtering would reduce invocations but ship data to the browser.
  Genuine tradeoff; not a quick fix.

### 2. Unoptimized heavy images — bandwidth

Image handling is mostly raw `<img>` (87 usages); `next/image` appears in 12 files. Some
of the largest assets are served as-is:

| File | Size | Used by |
| --- | --- | --- |
| `public/images/blog/tailoring/WoW_Forever_Announce_Zones_NewWater_006.jpg` | 4.5 MB | `/blog/tailoring` hero |
| `public/images/blog/hero.webp` | 5.2 MB | not referenced by any `heroImage` frontmatter (verify before deleting) |
| `public/images/guides/WoW_Camelot_Announce_Zones_Riverglades_035.webp` | 1.4 MB | guide hero |
| `public/images/beta_images/beta_mulgore.png` | 3.3 MB | **no references found** |
| `public/images/beta_images/beta_undead_atmosphere.png` | 2.9 MB | **no references found** |
| `public/images/beta_images/beta_zephyr_zone_01.png` | 2.4 MB | **no references found** |
| `public/images/beta_images/zephyr_isle_01.png` | 1.7 MB | **no references found** |
| `public/images/beta_images/beta_undead_zone_02.jpg` | 0.5 MB | **no references found** |

Rough ceiling: a 4.5 MB hero means ~22,000 cold views of that one page would consume the
100 GB Hobby transfer allowance on its own (ignores CDN hits, so this is a worst case
and the real number is lower, but the margin is thin for a single page).

The four beta PNGs (~10 MB) are unreferenced by name anywhere in `app/`, `components/`,
`lib/`, or `content/`. They cost nothing per view but are dead weight in the repo and the
deploy.

**Recommendation:** pre-shrink at build time to ~1600 px WebP at quality ~80 (the project already
does this for OG backgrounds in `scripts/build-og-backgrounds.js`). This avoids spending the
1,000-source-image Hobby allowance on runtime `next/image` optimization. Use `next/image` only
where responsive sizes genuinely matter.

### 3. Build output size and build minutes

Measured: the production build compiles in ~2.3 s, typechecks in ~2.7 s, and generates 5,158
static pages in ~14.5 s on this machine (warm cache). That is not representative of a cold Vercel
build, so **check the Vercel dashboard's build durations** — that is the number that counts against
100 build minutes/month.

Output size after the quest data:

- `.next/server/app/quests`: **35,352 files, ~827 MB** on disk
  - 5,049 `.html` pages, 346 MB (~69 KB each)
  - 25,245 `.rsc` payloads, 477 MB (5 per page)
  - 5,049 `.meta` files, 3 MB
- Other routes are small by comparison (`reference/professions` 133 files, 25 MB).

The 827 MB is local output, not per-visit transfer — but a 35k-file static output is worth knowing
about for deploy time, and the five RSC variants per quest are the biggest multiplier. Check whether
the quest page's RSC payload carries data each variant doesn't need (the full quest map/chain
objects are the likely culprit).

Each push that rebuilds runs the full prerender, including all 5,049 quests. At ~100 build
minutes/month, a few dozen deploys is the ceiling, so **batch data commits** rather than deploying
per commit during data refresh passes.

### 4. Function size and cold starts

All function traces are well under the 250 MB uncompressed limit. The ƒ-route traces (see §1) are
4.7 MB to 34.7 MB. Notable:

- `data/items.json` (10.2 MB) is traced into the items, reference/items, and other function
  bundles. Parsing it on a cold start takes ~31 ms locally — not the bottleneck, but it inflates
  every bundle and every cold start.
- `@img/sharp-wasm32` (8.6 MB) appears in several traces. `sharp` is a **runtime dependency** in
  `package.json`, but the project only uses it at build time (`scripts/build-og-backgrounds.js`).
  **To verify:** move `sharp` to `devDependencies` and confirm the wasm drops out of the traces
  and the OG routes still build.
- `data/dungeons/city_of_dalaran/2959_bb5462f2.png` (3.4 MB) is traced into the dungeon/loot and
  dungeon-index functions — it should be a `public/` asset or pre-shrunk, not a traced data file.
  (Those routes are static, so this only bites if they ever become ƒ.)

### 5. Static pages with large per-page weight

Quest pages are ~69 KB of HTML each plus JS chunks. Acceptable for a single page; relevant only if
quest pages get very high traffic, since they are static (CDN-served, no invocations).

### 6. Hotlinked third-party assets

Icons from `wow.zamimg.com`, and boss portraits / dungeon map images / ability icons hotlinked from
`foreverchanges.pro` (`next.config.ts` remotePatterns, `BossCard.tsx`, `BossPortrait.tsx`,
`DungeonPinMap.tsx`). These do not count against Vercel quota, but they are third-party
dependencies with no SLA, and the foreverchanges ones are an attribution/licensing concern (see
the attribution change in this session).

### 7. Analytics

`@vercel/analytics` adds a small script and events. Low impact; check the Analytics quota on the
dashboard if traffic grows.

## Decision: item page caching (not applied)

`/items/[itemId]` is now served with `no-store`. To cache it, the options are:

**A. Add `export const dynamic = "force-static"`** (keeps `generateStaticParams` absent). Each item
is rendered on its first request and cached indefinitely after that, served from the CDN.
- Pro: most item views become CDN hits; invocations drop to ~one per distinct item viewed.
- Con: first view of each item is still an invocation; cache is permanent until redeploy, so data
  refreshes need a deploy (fine — item data only changes on data passes).
- Con: unverified against this route on Vercel; should be tested with `next start` headers first.

**B. Pre-render the top N items** with `generateStaticParams` (e.g. items linked from dungeons and
professions). Build time grows by N pages.
- Pro: first view is also cached.
- Con: a build-time cost, and a judgement about which items are "top".

**C. Leave dynamic.** Simplest. Cost is one invocation per item view. Acceptable at current traffic;
the first ƒ route to worry about if quota pressure appears.

**Recommendation:** A, after a single test on a deployed preview. It is one line and reversible.

## Ranked summary

1. Cache-eligible ƒ routes (`/planner`, `/items/[itemId]`, `/blog`) — invocations per view. (Item
   back-link fix applied; caching decision above.)
2. Unoptimized heavy images, including a 4.5 MB hero on a single blog page — bandwidth.
3. Build minutes and the 35k-file / 827 MB quest output — check Vercel build durations; batch data
   deploys.
4. `reference/items` and `reference/quests` server-side filtering — invocations per filter change;
   a real tradeoff, not a quick fix.
5. `sharp` as a runtime dependency — function size; verify then move to devDependencies.
6. Dead assets (~10 MB unreferenced beta PNGs) — repo/deploy weight, no per-view cost.
7. Traced 3.4 MB dungeon PNG in static-route traces — only matters if those routes turn dynamic.
8. Hotlinked third-party assets — not quota; dependency and licensing risk.
9. Analytics — low.

## What was not measured

- Real traffic, real invocation counts, active CPU, and Vercel build durations — needs the Vercel
  dashboard.
- Whether `force-static` on the item route behaves as expected on Vercel (verify on a preview).
- Whether moving `sharp` to devDependencies removes it from traces (verify with a build).
