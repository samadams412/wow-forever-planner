# Vercel deployment audit, 2026-10-19

Read-only health check of project `texs-projects-536fb399/wow-forever-planner`
(Hobby plan, Fluid compute, iad1, Node 24.x). Latest production deployment:
`dpl_5LCpFwSf5D9PzLUjDkewXEsjTXLs` (`wow-forever-planner-asu5t4ou9-…`), commit
`4802449`, created 2026-10-15 23:25 CDT. Nothing was changed.

Commands used (CLI 62.4.0, authenticated by the CLI's stored login because
`VERCEL_TOKEN` wasn't set in the agent's shells): `vercel ls`, `vercel inspect
<url> --logs`, `vercel logs --json` (paged with `--until`), `vercel env ls`,
`vercel project inspect`, `vercel api /v13/deployments/<id>`.

## Status (updated 2026-10-19, later the same day)

| Item | Status |
|---|---|
| H1 tracking no-op | **Resolved.** `11f60aab` accepts `KV_REST_API_*`. Verified live: the event landed in Redis and the cron returned `ok`. Test data was cleaned up. |
| M2 planner renders per request | **Resolved.** `d786051f` reads `?order=` client-side, and `/planner` plus the class pages are prerendered. Pushed 2026-10-19. Junk class slugs return 404 (`37dc3388`). |
| OAI-SearchBot volume | **Deliberately deferred** (2026-10-19) until the usage re-check below. |
| Savings from these changes | **Re-check scheduled for 2026-10-21 or later.** The baseline is below. |
| Firewall rate limit on `/api/builds/track` (carried over from CLAUDE.md) | **Resolved.** Live rule, 30 POST/60s/IP, then 429. Tested live: 30 passed, then 429. |
| L1 crawler on item pages | **Mitigated.** `bc43b5da` robots.txt blocks `?from=` variants, catalog filter URLs, build URLs, MJ12bot and Amazonbot. The item route itself is unchanged (see below). |
| M1, M3, L2–L7 | Still open. |

### Usage overage follow-up (CDN Requests, ISR Reads/Writes, Fast Origin Transfer)

Data from `vercel firewall traffic list` (24h) and `vercel metrics` (Hobby:
1h for grouped queries, 1d for totals; anything longer needs Observability
Plus):

- 27.4k requests/day, about 820k/month against the 1M CDN Requests limit.
- **Verified bots were about half of all traffic.** OAI-SearchBot 7.7k (the
  same ~20 static pages, ~150–180 times each), Amazonbot 3.2k, MJ12bot 1.8k
  (all item pages), Googlebot 1.3k, GoogleOther 1.0k.
- Top path: `/reference/items` at 1.3k/day. It's dynamic, so every hit is a
  full render, which is Fast Origin Transfer.
- `/80f5eaee580a985b/view` (836/day) is the `@vercel/analytics` v2 page-view
  beacon. 509 of those come from Googlebot rendering pages, which spends Web
  Analytics events.
- ISR is billed per 8 KB unit only on a CDN miss. A prerendered quest page is
  80 KB HTML + 37 KB RSC (about 15 units). A crawler walking 21.7k item pages
  misses almost every time, and each deploy resets the item cache.
- **Item route (A):** already 404s unknown ids through an exact
  `data/items.json` lookup (`getItemById` → `notFound()`). The sampled hour had
  zero 404s, so the cost is real items, and the route was left unchanged.
  Prerendering all items with `dynamicParams = false` was considered and
  declined (about 7–8 min more per build, and the ISR saving is unverified).
- **OAI-SearchBot: decision deferred, 2026-10-19.** It's deliberately left
  allowed, with no robots.txt or Firewall change. This is a real trade-off
  between ChatGPT search visibility and request volume (7.7k/day, 28% of all
  traffic, on 2026-10-19). Revisit it after the re-check below, once the
  2026-10-19 deploy has had time to take effect.
- **Junk planner URLs: fixed, `37dc3388`.** `/planner/<unknown class>` now calls
  `notFound()` before any planner render or redirect. Previously, each junk path
  rendered and cached the Warrior fallback (about 102 KB). Verified locally with
  `next start`:
  - `/planner`, `/planner/warrior` and `/planner/druid` return 200 (cache HIT),
    and `/planner/mage` renders all 3 trees in Chrome.
  - Build URLs return 200, and the legacy `/planner/warrior/human/<code>`
    returns 307.
  - `/planner/notaclass`, `/planner/notaclass/<code>` and
    `/planner/notaclass/human/<code>` return 404.
  - Remaining cost: Next still caches the 404 response (about 15 KB, roughly
    2 ISR units, vs 13 for the old fallback page), the same as the item route.
    Writing nothing at all would need the class as its own route segment with
    `dynamicParams = false` (`/planner/og/` is a sibling static segment, so the
    move needs care). Not done.

### Usage re-check (scheduled, not yet measured)

The planner, robots.txt and firewall changes were pushed 2026-10-19
(`11f60aab..ffaa7ac9`, production deploy started about 23:20 UTC).
`37dc3388` (junk planner 404) follows in a later push. **Re-check on or after
2026-10-21** (a full 24h window after the deploy), then fill in the "After"
column.

Baseline, captured 2026-10-19. The window is the 24h of `vercel firewall
traffic list`, 2026-10-18 23:00 to 2026-10-20 00:00 UTC (the CLI's own label;
the run happened about 23:00 UTC on 10-19):

| Measure | Baseline (2026-10-19) | After (re-check date) | Delta |
|---|---|---|---|
| Allowed requests / 24h | 27.4k | not measured yet | not measured yet |
| Denied (DDoS mitigation) / 24h | 393 | not measured yet | not measured yet |
| OAI-SearchBot | 7.7k | not measured yet | not measured yet |
| Amazonbot (now robots-blocked) | 3.2k | not measured yet | not measured yet |
| MJ12bot (now robots-blocked) | 1.8k | not measured yet | not measured yet |
| Googlebot | 1.3k | not measured yet | not measured yet |
| `/reference/items` (top path) | 1.3k | not measured yet | not measured yet |
| `vercel metrics vercel.request.count --since 1d` | 28,421 (2026-10-18 22:00 to 10-19 23:00 UTC) | not measured yet | not measured yet |

How to re-check:
1. `vercel firewall traffic list`: the totals, Verified Bots and Top Request
   Paths fill in the table above.
2. `vercel firewall traffic inspect bot amazonbot --group-by path` and the
   same for `mj12bot`. Robots-compliant crawlers re-read robots.txt within
   about a day, so non-zero counts by 10-21 mean the block isn't being
   honored.
3. `vercel metrics vercel.request.count --since 1d` for the same-shaped total.
4. Check the Usage dashboard by hand (ISR Reads/Writes and Fast Origin
   Transfer aren't queryable from the CLI on Hobby without Observability
   Plus).
5. Then decide on OAI-SearchBot (see above).

## High

**H1. Build tracking is a silent no-op in production.** `getRedis()`
(`lib/build-tracking-server.ts:36`) returns `null` unless
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Vercel has
neither in any environment. The Upstash Marketplace integration provides
`KV_REST_API_URL` / `KV_REST_API_TOKEN`. The `UPSTASH_*` names exist only in
the hand-edited `.env.local`. So since launch, `POST /api/builds/track` returns
204 and stores nothing, and the daily cron returns `{status:"unavailable"}`.
The 4 "test events" in production `builds:agg:*` probably came from local
runs. `@upstash/redis` 1.39's `Redis.fromEnv()` already falls back to
`KV_REST_API_*`; only the guard blocks it.
→ Make the guard accept `KV_REST_API_URL`/`KV_REST_API_TOKEN` as well (or add
`UPSTASH_*` aliases in Vercel Production). Update CLAUDE.md's "Secrets/env"
line, which says the integration sets `UPSTASH_*`.

## Medium

**M1. Runtime logs keep about 1 hour (Hobby).** `--until 1h` returned 0 rows.
Errors, cold starts and the 06:00 UTC cron run are invisible after an hour.
That is how H1 went unnoticed for two weeks.
→ Check the cron result in the dashboard (Cron Jobs / Observability tab), or
have the rollup log an error-level line when it returns `unavailable` in
production, so the dashboard's error counters pick it up.

**M2. The planner renders on every request (ƒ).** It's dynamic only because
`app/planner/[[...slug]]/page.tsx:103` awaits `searchParams.order`. In the
sampled hour, 20 `/planner` hits were all serverless MISS. The planner is the
flagship and the most-shared URL.
→ Read `order` on the client (`useSearchParams` under Suspense, as
`ProfessionExplorer` does). Planner pages could then prerender or be cached.

**M3. The quest-detail trace warning is back and growing.** The build log
warns that `lib/quest-detail.ts:11` matches **10,420** files (it was 10,098 on
2026-10-06). The `/quests/*` trace exclude works, but `vercel inspect` lists
`λ quests/8364` at **28.84 MB** (the previous recorded size was 24.2 MB).
→ Replace the variable path with a generated literal map (the existing open
item). Recheck function sizes after the November data import.

## Low

**L1. Item pages render on demand, and a crawler is walking them.** 377
`/items/:id` requests in the hour hit 366 distinct ids. 49 were cold renders
(`cacheReason: cold`). Every cold instance parses the 10.8 MB
`data/items.json`, and every deploy resets the cache.
→ No action now. Fold this into the November data-layout decision
(per-item shards).

**L2. Static generation dominates the build.** 5,322 pages take 110 s of a
3 m 31 s build, on 1 worker of the 2 vCPUs. Builds bill about 10 CPU-minutes.
→ Optional: test `experimental.cpus: 2` locally and watch memory (8 GB box).

**L3. `vercel` is in devDependencies.** The build warns `"vercel" found in
project dependencies and will be ignored`, and the build runs its own CLI
(64.0.2).
→ Drop it from `package.json` if the global CLI is enough.

**L4. npm `allowScripts` warnings.** The install skips `esbuild` and
`unrs-resolver` postinstall scripts ("not yet covered by allowScripts").
Builds pass today because the cache is warm.
→ Run `npm install-scripts ls` and approve both, so a cold-cache build can't
break.

**L5. No security headers.** `next.config.ts` has no `headers()`, so there's
no `X-Content-Type-Options`, `Referrer-Policy`, or frame-ancestors/CSP.
→ Add a small `headers()` block. Low risk, since the site is static content
with no auth.

**L6. Unused integration env vars.** `REDIS_URL`, `KV_URL`, and
`KV_REST_API_READ_ONLY_TOKEN` are never referenced in code. The Upstash
integration injects them.
→ Leave them alone. Unlinking one breaks the integration's management, and
they cost nothing.

**L7. Preview has the Redis credentials but not the secrets.** `KV_*` are set
in Preview and Production. `BUILD_TRACKING_SECRET`/`CRON_SECRET` are set in
Production only, and nothing is set for Development. This looks intentional:
without the secret, `keyedHash` fails and previews no-op. After fixing H1,
though, previews point at the **production** Redis.
→ Keep `BUILD_TRACKING_SECRET` out of Preview on purpose. Add a comment so
nobody "fixes" it.

## Info (checked, no action)

- **Deployments:** 4 visible in 13 days, all Production, all Ready, 4 min each
  except one 6 min build 11 days ago (around the Next 16.3.8 bump / cache
  rebuild). No failures. No preview deployments are retained, so everything
  ships straight to production from `main`.
- **Runtime (2026-10-19 21:18–22:16 UTC, 962 requests):** 100% status 200, 0
  error/warning-level logs, 0 4xx/5xx. A 14-day filtered query also returned 0
  rows, but that only covers the 1-hour retention window. No
  `/api/builds/track` calls were in the window. All traffic was on
  `www.forevercraft.app`.
- **Runtimes:** every route that declares one uses `nodejs`, and the project
  runs Fluid compute (300 s timeout, Active CPU). Edge is deprecated on Vercel,
  so nothing should move to it.
- **Images:** 14 components use `next/image` with `remotePatterns` for zamimg
  and foreverchanges. There were 15 `/_next/image` requests in the hour, well
  inside Hobby limits.
- **`.env.local` contains a `VERCEL_TOKEN` key.** The file is gitignored and
  the value wasn't read. If the token is meant to live only in the shell,
  remove it from the file.
- `.codex/` is untracked and not gitignored.
