# Vercel deployment audit, 2026-10-19

Read-only health check of project `texs-projects-536fb399/wow-forever-planner`
(Hobby plan, Fluid compute, iad1, Node 24.x). Latest production deployment:
`dpl_5LCpFwSf5D9PzLUjDkewXEsjTXLs` (`wow-forever-planner-asu5t4ou9-…`), commit
`4802449`, created 2026-10-15 23:25 CDT. Nothing was changed.

Commands used (CLI 62.4.0, authenticated by the CLI's stored login because
`VERCEL_TOKEN` wasn't set in the agent's shells): `vercel ls`, `vercel inspect
<url> --logs`, `vercel logs --json` (paged with `--until`), `vercel env ls`,
`vercel project inspect`, `vercel api /v13/deployments/<id>`.

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
