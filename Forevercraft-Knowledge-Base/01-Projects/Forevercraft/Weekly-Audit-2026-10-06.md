---
type: project
created: 2026-10-06
updated: 2026-10-06
tags: [forevercraft, audit, security, regression, tech-debt]
status: active
---

# Weekly audit: 2026-10-06 (week of 09-30 → 10-06)

Regression check, security review, architecture and tech-debt concerns, and improvement ideas, scoped to what was observed this week. Orientation is in [[Site-Overview-2026-10-06]].

Back to [[Overview]] · [[Architecture]] · [[Roadmap]]

**Commit state:** nothing committed. Branch `leveling-verification-overlay` at `d7687a6d`. Four small fixes are in the working tree, uncommitted on purpose; see §2. The two new KB docs (`01-Projects/Forevercraft/Site-Overview-2026-10-06.md`, this file) and the CLAUDE.md pointer are also uncommitted.

**Environment used:** `npm run build` (prebuild + Turbopack) run four times; `next start -p 3300` (production server, started fresh for this pass; ports 3000 and 3100 were held by processes I didn't start and weren't touched); Chrome against `localhost:3300`; `npx tsx` against the real loaders; live `https://foreverchanges.pro/dungeons/*.json` for drift.

---

## 0. Summary

| Area | Result |
|---|---|
| Regression items (5 asked) | **5 pass**, with caveats noted. One new regression found and fixed (loot index boss count). |
| Security | **1 critical dependency advisory (next/og RCE), not exploitable here, patched.** Tracking endpoint: no injection/secret issues, but **can be polluted cheaply by minting tokens**, and command quota can be burned. Remaining `npm audit` noise is almost all from the `vercel` CLI sitting in `dependencies`. |
| Standing rule (variable-path reads) | One known violation (`lib/quest-detail.ts`, still a warning, not a build breaker), plus a second, quieter one (`lib/dungeon-loot.ts` directory read pulling ~4.4 MB of stray PNGs into 10 traces). |
| Tech debt | Profession-leveling gate churn, two item-data copies that drift, no override layer for generated dungeon files, stale docs (CLAUDE.md build-code version, `data/sources/README.md`). |

---

## 1. Regression and verification pass

### 1.1 Dungeon header image: narrow-screen stacking: **PASS**
- **How:** a same-origin 390×844 iframe on the production server (media queries respond to the iframe width, so this is a real breakpoint test, not a window resize). This matches the 2026-10-06 handoff's method. **A real narrow Chrome window was not used** (see §6).
- **Razorfen Kraul @390px:** `innerWidth` 390; image 351×197 (natural ratio, uncropped); image bottom y=310, `<h1>` top y=326, so it's stacked with a 16 px gap; fade overlay `display: none`; `documentElement.scrollWidth` ≤ 390 (no horizontal page scroll). The only element wider than the viewport is the "Where quests start" table (`min-w-[520px]`), which scrolls inside its own container.
- Screenshot of three 390 px frames (RFK header, Cooking overlay, Deadmines boss cards): scratchpad `mobile-390-evidence.jpg` (not in the repo).
- **Desktop @1920 (dark):** image 560×306, title to the right. Fine.
- **Light theme (first time viewed):** the fade computes to `linear-gradient(to right, transparent 60%, rgb(255,255,255) 100%)` = page background, which is correct. **Cosmetic finding:** the source art has dark vignetted edges (bottom-row mean luminance 23–46 / 255 across RFK, Uldaman, Deadmines, Wailing Caverns). With no bottom fade, the light theme shows a hard dark bottom edge and a faint line at the right edge. Invisible in dark theme. Not a regression; see Ideas.
- **Also observed:** on a cold optimizer cache the header area is blank for several seconds (remote foreverchanges image, no placeholder). It loaded on retry.

### 1.2 Full build + browser click-through after the BIS docs pass: **PASS**
- `npm run build`: exit 0 on Next 16.3.5 (before any change) and again on 16.3.8 after the fixes. 5,160 pages. One warning (1.5).
- `npx tsc --noEmit`: clean. `npx eslint`: **0 errors** after the fixes in §2 (it was 242 errors: 241 from Obsidian plugin bundles, 1 real).
- **Route smoke test** (41 URLs via curl against `next start`): every page 200, `/reference/map` 307, `/quests/999999` and `/nope` 404, no `__next_error__`/"Application error" markers. Includes planner (with and without code), the per-build OG image (177 KB PNG), all reference sections, items (incl. `/items/274748` Buckshot, `/items/1483` sell-price-only), quests, blog/guides, sitemap, robots, a section OG image.
- **Browser:** planner `/planner/warrior` renders, 0 console errors. Professions, dungeon pages, items search and quest filters were exercised (below).
- API negative tests: track with bad JSON → 400, bad token → 400; cron with no auth → 401, wrong bearer → 401. (No valid track request was sent: see the caution in §3.2.)

### 1.3 Razorfen Kraul / Stockade live-data restore + boss/rare split: **PASS (roster); RFK has new item-level drift**
- Served HTML: RFK "7 bosses, 2 rare spawns", 2 Rare badges, Roogug present. Stockade "5 bosses, 1 rare spawn", 1 Rare badge. Deadmines "8 bosses, 1 rare spawn", 1 Rare badge.
- Real loader (`rosterCounts` via `npx tsx`): RFK {7, 2}, Stockade {5, 1}, Deadmines {8, 1}.
- Multi-boss drops intact: 19268 under Lord Incendius (BRD) and Hydrospawn (DM East); 23320 under Ambassador Flamelash (BRD) and Pyroguard Emberseer (UBRS).
- Quest XP: 332 dungeon quests checked against `data/quests/index.json`. All consistent (the 6 apparent misses are index `xp: 0` ↔ page `null`, i.e. "no XP" on both sides).
- **Live drift check (new):** `the-stockade.json` is byte-identical to live. **`razorfen-kraul.json` is not:** same 10 entries and kinds, but live has more drops per boss (Aggem 6→7, Jargba 4→6, Roogug 3→4, Ramtusk 5→7, Agathelos 4→7, Charlga 5→9, Halmgar 3→4). That's foreverchanges adding drops since this morning's restore. Not re-pulled (needs a go-ahead; §4.3).
- **New regression found and fixed:** the **loot index** (`/reference/dungeons/loot`) still showed `data.bosses.length` (Deadmines **11**, i.e. 8 bosses + 1 rare + Trash + Defias Gunpowder). The split fix had covered the detail page, sidebar and inline panel but not `getDungeonLootIndex()`. Now it shows "8 +1 rare" (§2.4).

### 1.4 Profession leveling overlay: **PASS in the production build**
Checked in Chrome against `next start` (the earlier handoff only had dev-server checks):

| URL | Leveling tab | Overlay (`inert`, tape, "isn't verified" card) | Notes |
|---|---|---|---|
| `cooking?view=leveling` | active | yes (opacity 0.4, `/contact` link) | **Single view**; the duplicate-view symptom from the port-3217 dev run doesn't reproduce in prod. |
| `alchemy?view=leveling` | active | yes | |
| `mining?view=leveling` | active | yes | gathering path |
| `herbalism?view=leveling` | active | yes | gathering path |
| `blacksmithing?view=leveling` | active | **no** (verified) | |
| `first-aid?view=leveling` | active | **no** (verified) | |
| `cooking?view=camp` | Camp active only | no | no double highlight |
| `skinning?view=leveling` | n/a (no leveling data) | no | falls back to "What to Skin" tab cleanly; see the inconsistency below |
| `cooking` @390px | | yes | card wraps, tape bands clip at the edges by design, no page h-scroll |

- **Inconsistency (minor):** the listing marks Skinning "In the works", but its "What to Skin" bracket view (a level-by-level guide in effect) has no overlay.
- **Double notice (from the handoff, still true):** unverified leveling views show the overlay card **and** `ProfessionLevelingGuide`'s own blue "Work in Progress" box. Decide which one stays.

### 1.5 Turbopack `data/quests/detail/` warning: **still a warning, not a build breaker**
- Build exit 0 every time. One warning, now attributed to **`lib/quest-detail.ts:11`** (CLAUDE.md still says `lib/quests.ts`; the read moved in the 10-03 refactor).
- **The code comment is wrong about tracing.** `lib/quest-detail.ts` says the shard directory "is never traced into a serverless function". The local trace for `/quests/[questId]/page.js.nft.json` lists **5,049** `data/quests/detail/*.json` files (29.0 MB trace, 23.3 MB of it `data/`). Whether Vercel actually deploys a function for this fully-static route (`dynamicParams = false`, no revalidate) wasn't checked; if it does, that's the size it carries. The fix is still the one CLAUDE.md names: a generated literal-path map, or an `outputFileTracingExcludes` entry for `data/quests/detail/**` on that route (safe *only* because every shard is read at build time; verify the build still prerenders).

---

## 2. Fixes made in this pass (uncommitted, stopped before commit)

Suggested as four separate commits:

1. **Security patch: `next` 16.3.5 → 16.3.8, `eslint-config-next` 16.3.5 → 16.3.8, `sharp` ^0.35.4 → ^0.35.5.** Files: `package.json`, `package-lock.json`. Clears GHSA-vcvr-r3jv-pc5j (critical, `next/og` ImageResponse RCE, affects 16.2.0–16.3.5) and GHSA-wq5f-xc86-pv6w (sharp/librsvg, high, dev-only here). Exact pins kept for `next`/`eslint-config-next`, matching the previous style. Build, tsc, lint and the route smoke test all passed on 16.3.8.
2. **ESLint ignores the Obsidian vault.** `eslint.config.mjs`: added `"Forevercraft-Knowledge-Base/**"` to `globalIgnores` (241 of the 242 errors were minified plugin bundles in `.obsidian/plugins/`). `npx eslint` is now 0 errors / 18 warnings.
3. **`ItemsSearchInput` resync without setState-in-effect.** `components/reference/ItemsSearchInput.tsx`: the outside-reset sync (added 10-06 for "Clear filters") moved from a `useEffect` + `setValue` (flagged `react-hooks/set-state-in-effect`, the one real lint error) to React's adjust-state-during-render pattern (`prevInitialValue`). Same behavior, verified in Chrome: typing `buckshot gun ` keeps the trailing space while the URL gets `q=buckshot gun`; "Clear filters" on `/reference/quests?kind=dungeon&dungeon=uldaman&q=stone&sort=level&dir=desc` empties the box, keeps `sort`/`dir`, and hides the link.
4. **Loot index uses roster counts.** `lib/dungeon-loot.ts` (`getDungeonLootIndex` now uses `rosterCounts`; `DungeonLootSummary` gains `rareCount`) and `app/reference/dungeons/loot/page.tsx` (cell renders `8 +1 rare`). `dungeon-roster.ts` imports only a *type* from `dungeon-loot.ts`, so the new value import is not a runtime cycle. Verified in the served HTML: The Deadmines 8 +1 rare, Wailing Caverns 8 +1 rare, The Stockade 5 +1 rare, RFK 7 +2 rare, Uldaman 10.

---

## 3. Security findings

### 3.1 `npm audit` (run 2026-10-06)
Before: **42 vulnerabilities (2 critical, 29 high, 11 moderate)**, 40 of them in the prod tree. After the §2.1 bump: **38 (1 critical, 26 high, 11 moderate).**

| Finding | Severity | Reaches production? | Action |
|---|---|---|---|
| `next` <16.3.6: RCE in `next/og` `ImageResponse` (Node) when attacker input reaches SVG content/attributes/styles | Critical | Framework is in prod. **Not exploitable in this code:** the only `ImageResponse` with request input is `/planner/og/[classId]/[buildCode]`, which renders a server-side class label and decoded point totals; the only `<svg>` is a static logo in `lib/og-template.tsx`. | **Patched** (16.3.8). |
| `sharp` <0.35.5 (librsvg) | High | No (devDependency, build-time only) | **Patched** (0.35.5). |
| `tar` (critical), `smol-toml`, `undici`, `path-to-regexp`, `minimatch`, `ajv`, `ts-morph`, `@fastify/busboy`, every `@vercel/*` builder | Critical/high/moderate | **No:** all come from the **`vercel` CLI (v62.4.0) listed under `dependencies`**. Nothing in `app/`/`lib/` imports it. | **Recommend** moving `vercel` to `devDependencies` (or removing it and using a global/npx CLI). That drops ~30 findings from the prod tree. The "fix" `npm audit` offers is a *downgrade* to vercel@54, so don't take it. Not done: changing dependency classes is a structural call. |
| `gray-matter` → `js-yaml` 3.x/4.x quadratic DoS, `sprintf-js` | High/moderate | Build/render-time only, on **author-controlled** MDX frontmatter. No user input reaches it. | Accept. (The suggested fix is a gray-matter *downgrade*.) |
| `eslint-config-next` → `fast-glob`/`micromatch`/`braces`; `brace-expansion`; `source-map-js` | High | Dev tooling only | Accept or `npm audit fix` (non-breaking for brace-expansion/source-map-js). |

### 3.2 Build-tracking endpoints (`/api/builds/track`, `/api/cron/build-rollup`)
Reviewed `lib/build-events.ts`, `lib/build-tracking-server.ts`, `lib/build-rollup.ts`, `lib/build-tracking-client.ts`, both routes.

**Solid:** strict payload validation (enum type, known class, `^[0-9a-z-]{1,200}$` build code, 32-hex token); no raw token or IP stored (HMAC-SHA256 with `BUILD_TRACKING_SECRET`); all failures fail closed and silently; cron requires the bearer and refuses when `CRON_SECRET` is unset; rollup has a lock, a batch cap, retention filtering and malformed-row handling; the privacy page discloses it. Vercel overwrites `x-forwarded-for`, so the IP key isn't spoofable **on Vercel** (it would be if self-hosted).

**Findings, most to least important:**
1. **Popularity pollution is cheap (medium).** The token is client-generated, so an attacker mints a fresh 32-hex token per request. That bypasses both the 100/day per-token cap and the per-(token, build, day) dedup. The only real limit is **30/min per IP ≈ 43,200 accepted events per IP per day** for one build. A handful of IPs or a cheap proxy pool could make any build "most popular". Mitigations, in order of value: (a) count **distinct hashed IPs** per build per day for popularity, not events (a HyperLogLog `PFADD builds:hll:<class>:<build>:<day> <ipHash>` costs one command); (b) a per-IP daily cap on *accepted* events (e.g. 50/day); (c) a Vercel Firewall rate-limit rule on `/api/builds/track`.
2. **Invalid builds are accepted and counted (low–medium).** The validator checks the build-code alphabet only. A crafted code that decodes to every talent at max rank (>51 points, ignoring tier gates and prereqs) is stored and inflates **every** talent's aggregate. The rollup only skips codes that throw. Fix: at write time (or rollup time), reject builds whose decoded total exceeds the level-60 point cap or that violate tier gating. The planner already has these rules.
3. **Quota burn / cost DoS (low–medium).** Every request, including rate-limited ones, runs a 4-command pipeline before it's rejected, and invalid-but-well-formed requests run 5–7. Upstash Free is 500k commands/month, so ~100–125k junk requests exhaust it, after which tracking silently stops (the site itself is unaffected). Each request is also a Vercel function invocation. Mitigation: the firewall rule in 1(c), and/or a cheap in-memory per-instance pre-check before touching Redis.
4. **Googlebot and other JS-executing crawlers can fire `opened` (low).** `opened` fires on any page load with a build code. Rendering crawlers execute JS, so crawled build URLs add noise. Mitigation: skip when `navigator.webdriver` is set or the UA matches known bots, or ignore `opened` in popularity and rank by `shared` + `saved`.
5. **Edge cases (low):** the rollup's `finally` deletes the lock unconditionally (a run that overran 15 min could delete a newer run's lock); the write-side `LTRIM -100000 -1` shifts list indices if the cap is ever hit mid-rollup, so the post-rollup `LTRIM read -1` could drop unread events. Only matters at ≥100k pending events.
6. **Local dev writes to production Redis (process, low).** `.env.local` holds the real production URL/token/secrets, so `npm run dev`/`next start` locally records real events whenever a planner build URL is opened in a browser. (Avoided during this audit: no build URL was opened in the browser and no valid POST was sent.) Use a separate Upstash database for local, or unset the URL locally.
7. **Production aggregates still hold the 4 test events** from 2026-10-06 (`warrior:opened=1, shared=2, saved=1`). Decide whether to `DEL builds:agg:*` before Popular Builds goes live.

### 3.3 Hardcoded secrets / env vars
- Scanned all tracked files for AWS/Stripe/GitHub/Slack/Google key patterns, private keys, bearer tokens, `*_TOKEN=`/`*SECRET=` literals: **no secrets found.**
- `process.env` is used only for the four tracking vars. No `NEXT_PUBLIC_*` vars. `.env.example` is tracked with empty values. `.env.local` and `.vercel/` are gitignored and untracked.
- **Low (info disclosure):** the GitHub repo is **public** (`api.github.com/repos/samadams412/wow-forever-planner` → 200), and the tracked `01-Projects/Forevercraft/Architecture.md` named the Upstash endpoint host and console DB name (redacted 2026-10-06). A hostname isn't a credential (the REST token is required), but there's no reason to publish it. Consider redacting it in the next edit (it stays in git history).
- The private `03-Handoffs/` folder is gitignored, so the handoffs that discuss the setup aren't published.

### 3.4 Standing rule: variable-path / whole-file server reads
Scanned every `fs`/`process.cwd()` read in `app/`, `lib/`, `components/`:

| Read | Status |
|---|---|
| `lib/quest-detail.ts` (`detail/${id}.json`) | **Violation (known).** 10,098-file warning; 5,049 shards in the quest trace (§1.5). |
| `lib/dungeon-loot.ts` (`readdirSync(data/dungeons)`) | **Quiet violation (new finding this week, partially known from the 10-03 perf audit).** The directory read makes the tracer include everything under `data/dungeons/`, including **six committed non-JSON files (~4.9 MB)**: `city_of_dalaran/2959_bb5462f2.png` (3.5 MB), `hall_of_thanes/*.png/.jpg`, `ruins_of_lordaeron/*.png/.jpg`, and `Classic-Classic.lua`. Traced into **10 functions**, including the **ƒ route `/reference/items`** (so it now ships in a real function, not only static ones). Fix: move those source files to `data/sources/…` or `assets/` (update `scripts/build-dungeon-map-legends.js`, `convert-dungeon-maps.js`, `crop-dungeon-maps.js` paths), or exclude `data/dungeons/**/*.{png,jpg,lua}` from traces. |
| `lib/items.ts` (whole 10.3 MB `items.json` per cold start) | Known, accepted for now; the November layout decision replaces it. |
| `lib/item-sources.ts` (576 KB `sources.json`) | Literal path, OK. |
| `lib/blog.ts`, `lib/content.ts`, `lib/patch-notes.ts`, `lib/whats-new.ts`, `lib/profession-recipes.ts`, `lib/gathering-professions.ts` | Directory reads of small, all-relevant directories. Acceptable. |
| OG routes (`lib/og-template.tsx`, `og-backgrounds.generated.ts`, planner OG `public/images/og/opengraph.png`) | Literal paths, OK. |

**Nothing new crept in from this week's UI work.** The variable-path issues predate it (10-03 quest refactor; dungeon PNGs from 10-01).

---

## 4. Architecture and design-pattern concerns (this week)

1. **The profession-leveling gate was rebuilt three times in one day.** The sequence: an allowlist that hid the tab (`LIVE_LEVELING_PROFESSION_IDS`, `hasLiveLeveling`, `leveling: null` passed from the page), then a "not ready" block (`LevelingNotReady`, the `levelingHeld` special case; blocked by a dev-only duplicate-view symptom), then the overlay (`LEVELING_VERIFIED_PROFESSION_IDS`, `LevelingUnderConstruction`). The final shape is good (data always flows; presentation-only gate; one allowlist). Residue to clean up: (a) `InTheWorksCard` is now used only on the listing; (b) two "work in progress" notices stack on unverified views; (c) Skinning's guide-like tab isn't covered; (d) the listing card and the overlay say different things ("coming soon" vs "shown below, not verified"). **Lesson worth recording:** decide the user-facing state (hidden vs visible-but-flagged) before building the gate. Each rework touched the page, the explorer and the listing.
2. **Two item-data pipelines with different resolution timing.** Professions were normalized to `{itemId, name}` refs resolved at render time (09-29). Dungeons still bake full item records at build time, so every item pull needs a dungeon rebuild, and drift is only caught by an item-level diff (157 stale records found this week). This is the biggest inconsistency between the dungeon-loot and catalog pipelines. Normalizing dungeon boss loot to refs (as the [[Roadmap]] tech-debt item says) would remove a whole class of bug. The cost is that `lib/dungeon-loot.ts` would then need `items.json` at runtime, so it belongs in the November data-layout decision.
3. **Generated dungeon files have no override layer.** Roster corrections live in render code (`isNamedBoss`), XP corrections in load code (`applyIndexXp`), and anything else would be lost on rebuild (the `hall-of-thanes` quest-96403 trap). Fine while there are two such rules. Before a third, add `dungeon_overrides.json` merged by `build-dungeons.js` that fails loudly on unmatched entries (as the 10-06 handoff proposed).
4. **Raw dungeon data is partially fresh.** 10 of 29 raw files were re-pulled this week (RFK, plus the nine from the 70235 pull, which include The Stockade); the other 19 predate the live endpoint, and RFK has already drifted again since this morning (§1.3). Count-only audits miss drift. An item-level drift script (fetch live → compare per-boss item id sets → report) would turn this into a 2-minute routine instead of a forensic exercise.
5. **`lib/dungeon-loot.ts` vs `lib/dungeon-roster.ts` split is load-bearing but unenforced.** One stray value import from the server module into a client component breaks the browser bundle (it happened this week). Add `import "server-only"` at the top of `lib/dungeon-loot.ts`, `lib/items.ts`, `lib/quest-detail.ts` and `lib/build-tracking-server.ts`. The build then fails with a clear message instead of a `fs` resolution error.
6. **The dungeon loot page: less of a "god component" than feared.** The route file is 191 lines and delegates to focused components (`BossCard` 123, `LootItemPill` 208, `DungeonLootSidebar` 115, `QuestGiversTable` 132, `LootQuestRewardsCard` 155). The real accumulation is in **derived counts computed in several places**: roster counts live in the page, `DungeonInlinePanel`, the sidebar props and (until §2.4) a stale copy in `getDungeonLootIndex`. Suggest a single `getDungeonView(id)` (or `summarizeDungeon(data)`) that returns `{counts, totalItems, namedBosses, otherGroups, jumpNav}` once, used by the page, the index, the inline panel and the sitemap. `LootItemPill` is the other hotspot: it now has `slotTypeBelow`, `context`, an icon-only mode and link-source context. Watch it before adding another mode.
7. **The `/reference/dungeons` page ships ~1.98 MB of HTML** (all 35 dungeons' inline panel data serialized up front), and `/reference/crafting-calculator` ~2.08 MB. Static and CDN-cached, but heavy on mobile. Lazy-load the inline panel's per-dungeon data (fetch on open) if mobile traffic matters.
8. **Docs drift.** CLAUDE.md says build-code `CURRENT_VERSION` is "currently 3" (it's **5**) and attributes the quest warning to `lib/quests.ts` (it's `lib/quest-detail.ts`). `data/sources/README.md` says `sources.json` is read by no build script (it's read by `build-dungeons.js`) and its coverage figure is from 70170. `Architecture.md` routes table says 28 loot pages (29) and that `/items/[itemId]` isn't statically generated (it's `force-static`, rendered on first request then cached). [[Overview]] still says 21,458 items and 12 posts.
9. **Stray tracked files.** `data/sources/foreverchanges/New folder/` (an older `list.json` + `missing-cmangos-text.json`, tracked); the source PNGs/Lua in `data/dungeons/` (§3.4). Deleting them needs the owner's OK.
10. **`vercel` CLI in runtime `dependencies`** (§3.1): installs a large toolchain into every deploy's `node_modules` and is the source of most audit noise.

---

## 5. Improvement ideas (short, concrete)

**UI/UX**
- Light theme dungeon header: add a short bottom fade (or fade all four edges) on `sm+`, and a neutral placeholder background so a cold image doesn't leave an empty 560×306 hole.
- Loot index: now that it shows "+N rare", consider sorting/filtering by level bracket with a "my level" input (foreverchanges has one).
- Professions: merge the two "not verified / work in progress" notices into the overlay card; give Skinning's bracket view the same treatment (or mark Skinning verified).
- Boss loot pills at phone width render one per row with ragged widths (`min-w-max` + 12rem basis). Consider `w-full` below `sm`.
- Class-filter highlighting on loot pages (gray out gear the selected class can't use) is in `To Do.md`. It needs the slot/armor-type mapping that BIS needs too, so build that table once.

**Workflow**
- Add `import "server-only"` guards (§4.5) and a CI-ish `npm run check` = `tsc --noEmit && eslint && npm run build` before commits.
- Make the trace-size check a script (`scripts/report-trace-sizes.js`) that prints the top 10 `.nft.json` sizes and fails above a threshold. It was done by hand twice this week.
- Use a separate Upstash database (or no URL) for local dev (§3.2.6).

**Data pipeline**
- `scripts/check-dungeon-drift.js`: live vs local per-boss item-id sets for all 29 slugs, read-only, prints a table. It would have caught RFK's new drift automatically.
- Extend `diff-foreverchanges-items.js` to cover `sources.json` and `p/d/v/t`, with no tooltip truncation (already an open item, still the most likely way to miss a change).
- Popularity metric: rank by distinct IPs (HyperLogLog) of `shared` + `saved`, and validate builds against the point cap at write time (§3.2.1–2), before any Popular Builds UI ships.

---

## 6. Not verified / blocked

- **A real narrow Chrome window** was not used for mobile; the 390 px iframe method was. The user offered help setting one up. Worth a 2-minute confirmation of the dungeon header and the profession overlay on a real phone-width window (or a phone) before calling mobile done.
- **Vercel-side behavior:** whether the `/quests/[questId]` function is actually deployed with the 5,049 shards; whether the 16.3.8 bump changes Vercel function sizes. No Vercel CLI/dashboard access in this session.
- **Tracking under real load:** no valid event was sent (to avoid writing to production Redis). Rate limits and TTLs still have only stand-in verification.
- **Light theme** checked on RFK only; dark theme on RFK, Uldaman and Deadmines.
- Item-level drift for the 19 raw dungeon files outside this week's re-pulls was not checked (only RFK and Stockade).
