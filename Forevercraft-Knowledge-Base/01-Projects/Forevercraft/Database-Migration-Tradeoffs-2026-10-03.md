# Database vs. committed JSON for reference data — tradeoffs — 2026-10-03

Analysis only. No implementation. Question: should Forevercraft move its reference data
(quests, items, dungeons, professions, and later talents) from committed JSON to a real database,
given the scale now in play and the Phase 2 plan (Postgres + Prisma + NextAuth, plus an admin
dashboard that edits this data)?

## Where things stand

Data scale (current repo):

| Data | Shape | Size |
| --- | --- | --- |
| Items catalog | `data/items.json`, 21,458 rows | 10.2 MB, one file |
| Quests | 5,049 listing rows + 5,049 detail shards | 26.4 MB (`data/quests/`, ~22.6 MB of detail) |
| Dungeons | `data/dungeons/<id>.json`, 35 files | incl. traced map PNGs |
| Professions | `data/professions-catalog/<id>.json`, 11 files | — |
| Source snapshots | `data/sources/` (immutable, dated) | 132 MB |
| Talents, racials, spellbooks, legacy perks, map zones | small static JSON | — |

How the data is read today:

- **Build time (SSG):** most pages (5,049 quest pages, dungeon/loot, professions, map) read JSON
  during `next build` and prerender HTML. Runtime cost: zero.
- **Request time (ƒ routes):** `/reference/items`, `/items/[itemId]`, `/reference/quests`, and
  `/blog` read JSON through module-level caches (`lib/items.ts` parses `items.json` once per
  cold start, ~31 ms locally). The 10 MB file is traced into those function bundles.
- **Client-fetched:** map tiles and a few binaries under `public/`.

How the data is written today:

- **Scripts, not people.** `scripts/build-*.js` regenerate JSON from immutable source snapshots
  (`data/sources/<source>/`). Changes arrive as a regeneration, a diff, and a commit.
- **Git is the audit trail.** Every data change is a reviewable diff with blame. The talent
  pipeline's "diff the two newest snapshots, then read the vendor changelog" workflow depends on
  this.
- **Known fragility, already logged:** a hand-edit to a generated file was silently reverted by a
  rebuild (`hall-of-thanes.json`). The fix there was to edit the source, not the output.

## The two futures this has to serve

1. **Mostly-static reference site (now and most of the time).** Reads dominate. Data changes in
   batches during beta data passes (2–3+ before Nov 4). Correctness and diffability matter more
   than write speed.
2. **Admin dashboard (Phase 2).** A non-coder edits items, quests, dungeon notes, and guide drafts
   from a browser, many times, on the deployed site. Writes are small and frequent, with
   authorship and history needed.

The key constraint: **a deployed Vercel site cannot write to committed JSON.** The filesystem is
read-only at runtime (only ephemeral `/tmp` is writable). So the admin dashboard cannot edit
`data/*.json` directly, whatever the storage choice is for the rest. Something durable has to
hold edits, or the dashboard has to commit to git through an API (possible, but it turns every
edit into a deploy).

## Options

### A. Stay on committed JSON (status quo)

- **Pro:** zero infrastructure, zero cost, zero runtime dependency, diffs and blame, works offline,
  builds are deterministic, the static site is genuinely static.
- **Pro:** nothing to back up separately; git is the backup.
- **Con:** the admin dashboard has no clean write path (see above). Git-commit-from-the-dashboard
  is possible but slow, deploy-coupled, and fragile under concurrent edits.
- **Con:** request-time routes still ship/parse a 10 MB file inside function bundles. Solvable with
  per-item shards (the November plan already points this way) without a DB.
- **Con:** no queries. Every server-side filter is a hand-written loop over an in-memory array.

### B. Postgres as an *authoring store*, JSON still exported at build (hybrid)

The DB holds the editable truth. A build step reads it and emits the same JSON the loaders
already consume. The site stays static. Runtime never touches the DB except the admin dashboard.

- **Pro:** the public site keeps its SSG profile and its zero-runtime-cost read path. Loader
  return shapes (`lib/quests.ts`, `lib/items.ts`, `lib/dungeon-loot.ts`) do not change, so the
  migration blast radius is the build scripts and the export step.
- **Pro:** the admin dashboard gets real writes, validation, and row-level history.
- **Pro:** the 10 MB items file and the 26 MB quest data leave the function bundles, *if* the
  request-time routes read from the DB instead (see C).
- **Con:** builds now need DB access (a secret in Vercel env, network at build time). A DB outage
  fails the deploy instead of the site being ready regardless.
- **Con:** git diffs of data changes disappear unless the export is also committed or the DB keeps
  its own history table. You trade "diff in PR" for "history in DB". Real loss for the current
  workflow.
- **Con:** two sources of truth during the transition, which is where the hall-of-thanes class of
  bug comes from. Mitigate with a one-way rule: DB → export only; never hand-edit the export.

### C. Postgres as the runtime read path too

Request-time routes (`/reference/items`, `/items/[itemId]`, `/reference/quests`) query the DB
instead of parsing JSON.

- **Pro:** server-side filtering and pagination become real indexed queries. Removes the 10 MB
  bundled file from functions. `/items/[itemId]` by primary key is trivial.
- **Con:** every filter change and every uncached item view now makes a DB round trip. Serverless
  Postgres adds cold-start latency (Neon suspends on idle). Every such request is still a function
  invocation, same as today — the DB does not reduce invocations on ƒ routes, it only changes what
  they read.
- **Con:** ties page rendering to DB availability and to the DB's free-tier egress and compute.
- **Note:** this option only makes sense *after* the ƒ-route caching question is answered (see the
  performance audit). If item pages are cached on the CDN, DB reads are rare anyway.

## Hosting and cost within a free tier

Limits quoted from current secondary reporting (2026-10-03); verify on the vendor pricing pages
before committing.

| Option | Free-tier shape | Fit for this data | Fit for Phase 2 |
| --- | --- | --- | --- |
| **Neon** (Postgres; the Vercel Marketplace integration path) | 0.5 GB storage per project; 100 CU-hours/month; scales to zero after 5 min idle; 5 GB egress/month | Our full dataset is well under 0.5 GB as rows. Scale-to-zero means build-time reads cost little. | Good. Postgres, native Vercel integration, branches for preview deploys. |
| **Supabase** (Postgres + auth + storage) | 500 MB database; 1 GB file storage; 5 GB egress; **free projects pause after 1 week of inactivity** | Fits size. The pause is the problem: a paused project breaks builds that need the DB and breaks the admin until someone restores it. | Attractive if you want its auth/storage too, but the pause policy is a real risk for a long-lived site. |
| **SQLite on disk** (committed `.db`, or a local authoring file) | No service at all | Good as a *local authoring store* for the scripts. Bad as a committed binary: no diffs, every edit is a whole-file change in git. | Poor. Vercel's runtime filesystem is read-only, so the dashboard cannot write it in production. |
| **Vercel Postgres** | Now provided through Neon's integration | Same as Neon. | Same as Neon. |
| **Stay on JSON** | Free, no limits relevant at this size | Best for the static site. | Needs a separate write path (see A). |

Cost arithmetic: the static site's data (committed JSON) costs nothing per view. A DB only costs
per query, and the public site, under option B, makes no queries at all at request time. So
option B's free-tier exposure is **build-time reads only** — a few seconds of compute per build,
well inside Neon's 100 CU-hours. Option C's exposure is per-request and is what could actually
burn the free tier if traffic grows.

## Prisma vs. alternatives (Phase 2, not now)

The roadmap assumes Prisma. The genuine tradeoff:

- **Prisma:** mature tooling, migrations, a clear schema file, good for the admin CRUD surface.
  Costs: the query engine and generated client add to function bundle size, which is already the
  project's standing concern (see the standing rule in `CLAUDE.md`). Measure the trace delta before
  committing.
- **Drizzle:** lighter runtime, SQL-shaped, smaller bundles, fewer abstractions to fight. Costs:
  less scaffolding for migrations and admin tooling; you write more by hand.
- **Neither is needed for option A or for the build-time export in option B.** The DB client only
  needs to exist in the build script and the admin routes, not in the public static routes.

This is a real tradeoff, not an obvious win. Bundle size favours Drizzle; developer ergonomics for
an admin surface favour Prisma. Pick based on a measured trace delta, not the roadmap's assumption.

## Migration effort (given the current script pattern)

The scripts already share one shape: read sources → transform → write JSON. Migrating to option B
changes only the last step:

1. **Schema.** Tables for items (21k rows, indexed by id/quality/slot/status), quests (5k rows with
   JSON columns for map groups, chain, rewards, objectives), dungeons, professions and their
   recipes, and a `provenance` table mirroring `data/quests/provenance.json`. Nested data as
   `jsonb` keeps the shapes stable.
2. **Import.** One-time script: current JSON → DB. Verify row counts and a round-trip export that
   matches the committed JSON byte-for-byte (or semantically, for key order).
3. **Build scripts.** Replace `writeFileSync(...)` at the end of each `build-*.js` with a DB upsert,
   and add an export step that writes the same JSON. The export is what the loaders read, so
   loaders do not change in option B.
4. **Keep sources out of the DB.** `data/sources/` (132 MB of immutable snapshots) stays in git.
   It is raw input and has its own diff workflow. Do not import it.
5. **Guardrails.** The export is generated; keep the "never hand-edit the output" rule, now
   enforced by the export overwriting it on every build.

Estimated shape, not a schedule: the import and export are small (a few scripts). The effort is in
making the diff/review workflow survive, which is the part most likely to be underestimated.

## Recommendation

**Do not migrate the public reference data to a database now.** The static JSON-plus-scripts model
is correct for a mostly-static, batch-updated site, and nothing about it is currently blocking
launch.

**Do decide the admin write path before Phase 2 starts,** because that is the one place JSON
genuinely cannot serve:

- **Preferred when the admin starts:** option B — Postgres (Neon via the Vercel integration) as the
  editable authoring store, a build-time export to the same JSON the loaders already read, the
  public site left static. Keeps the current read path and its zero-runtime-cost profile, gives the
  dashboard real writes, and avoids the Supabase pause risk.
- **Keep in mind:** option C (DB on the request path) only after the ƒ-route caching decision is made;
  it does not reduce invocations by itself.
- **Genuinely open, to decide with a measured trace:** Prisma vs. Drizzle.
- **Genuinely open, to decide with the user:** whether DB-as-truth with git-history loss is
  acceptable, or whether exports are also committed so the diff history survives.

Until then, the cheapest useful step is the one already on the November plan: per-item JSON shards,
which fixes the 10 MB bundle problem without a database.
