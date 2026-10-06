# Popular Builds: research and proposed design

Status: research only. No app code changed. Not committed.

## 1. What talentsforever.com does (observed in Chrome, Oct 6 2026)

Method: opened `talentsforever.com/warrior` in Chrome. Read the page's Resource Timing entries, fetched and read the page's `popular.js`, read the rendered text, and clicked "Save this build" while watching for new network requests.

### Where the feature lives

- The Popular Builds section is on each class page: "Popular Warrior builds — What people planned here for level 60, since the Oct 2 hotfixes to build 70170, updated daily."
- Its data is a **static file**, `/popular.js`, loaded with the page. It is not a live API. No request is made when the section is used.
- Also loaded: `/talents.js`, `/spellbooks.js`, `/racials.js`, `/legacy.js`, `/spelldesc.js`, `/updates.js`, `/changelog.js`, plus Google Analytics (`gtag`) and Cloudflare Insights.

### What `popular.js` contains

The file is a JSON-like object with a note from the site's own generator:

> "aggregated from our own analytics (no identities, counts only). Written by wrapped_agg.py + popular_gen.py."

Observed fields and values (Warrior, window Sep 13 to Oct 6 2026):

- `window`: "Sep 13 to Oct 6, 2026, updated daily"
- `updated`: an ISO timestamp (2026-10-06T02:24Z at capture time)
- `note`: "Builds within a few points of each other count as one, and the rows are ranked by how often people shared, saved or opened them. The count starts on 13 Sep, before the beta; everything since is added on top."
- Totals: `builds` 58,522 (builds shared, saved or opened), `full` 10,989 (builds with all 51 points), `shared` 3,206, `saved` 6,216, `opened` 84,462 (build links opened).
- Per-spec split: `spec` (Arms 23, Fury 36, Protection 41 for the full set), and `specN` for the other classes.
- Ranked rows: `top` entries with `code` (the build code, e.g. `warrior/60/0502-05-...`), `pts` (points per tree), `lead`, `rank`, `score`, `views`, `variants`, `most`/`least`, `pick`, `pickBy`.
- Freshness/state flags: `ready`, `complete`, `stale`, `live`, `need`, `epoch`. These suggest a gate on whether a window's data is trustworthy. I did not see what they do.
- Per-talent counts: each class has arrays per tree (e.g. `Feral Combat`, `Restoration`) of per-talent pick numbers.

### What the page shows

- **Almost everyone takes** lists talents with high pick rates. Observed: Cruelty 91%, Unbridled Wrath 61%, Deflection 58%, Improved Rend 55%, Improved Tactical Mastery 52%.
- **Almost nobody takes** lists low rates. Observed: Improved Disarm 5%, Improved Hamstring 6%, Improved Intercept 10%.
- Each popular row shows its own counts: "shared 2 · saved 21 · opened 45 · across 62 close builds".
- The section header shows the window, the total builds, and the share/save/open counts.
- I could not find the exact cutoff that decides "almost everyone" vs. a plain list. The 52% row is listed as "almost everyone," so the cutoff is at or below 52%; the lowest "almost nobody" row is 5%. Treat the exact threshold as unknown.

### Save, share, and open

- **Save this build**: clicking it produced **zero network requests**, so saving is local only. Its counts come from elsewhere.
- **Copy link**: copies the build URL. It copies the build with every talent's full text too (a separate "copy for AI" action).
- **Opens** and **shares** are counted server-side in `wrapped_agg.py` from their analytics. I did not confirm which client actions send those events, since I didn't watch requests during a load or a share.

### Counting and anti-abuse (what the note says, and what is inferable)

- **Dedup by similarity, not by identity**: builds "within a few points of each other" merge into one row. This blunts near-duplicate spam, but it is a fuzzy grouping, not per-user dedupe.
- **No identities**: the note says counts only. There is no per-user data on the page.
- **Cumulative with a start date**: the count started Sep 13 and "everything since is added on top," so the totals only grow. Percentages are over that whole period.
- **Weighting**: ranking uses shared, saved, and opened together, with no published weights. Opens dominate the total (84,462 opens vs 6,216 saves), so opens probably carry little weight per event.
- **Not observed**: rate limits, bot filtering, or per-visitor dedupe. None is mentioned on the page.

### Freshness

- Updated daily (per the page), with a timestamp in the file. The pipeline is Python scripts (`wrapped_agg.py`, `popular_gen.py`), so it is a batch job, not streaming.

## 2. What this means for our site

- Their model is a **daily batch aggregate of anonymous counts**, shipped as a static file the page loads. That fits our no-database Phase 1 rule better than a live API would.
- Their "Save this build" is local, so they had to capture popularity through analytics events instead. We would need the same: a deliberate capture point, not the save button.
- The fuzzy "within a few points count as one" rule is a cheap, useful dedupe. It is easy to copy and does not need identity.

## 3. Proposed design for our site

### 3.1 Capture

Start with two deliberate events, both anonymous:

| Event | Captured when | Stored |
|---|---|---|
| `build_shared` | Visitor clicks Copy link | class id, build code, day |
| `build_saved` | Visitor clicks Save (sent only if they are on the Phase 2 accounts/DB) | class id, build code, day |

Opens are the largest signal theirs and the weakest per event. Add them later, with a lower weight, after shares and saves are stable.

### 3.2 Aggregation (match the static-file model)

- A nightly script (a Node script like our other `scripts/build-*.js`, not a live query) reads the day's events and writes `data/popularity/<class>.json`, shipped as a static file like `popular.js`.
- The file holds per-talent pick counts over the window, the window dates, the total build count, and the generation timestamp.
- Keep the same honest copy as theirs: "counts only, no identities, updated daily, counting since <date>".
- Phase 1 can ship the script and the empty-state text before any events exist. The planner shows "not enough data yet" until a threshold is met.

### 3.3 Counting rules

- **Distinct builds**: count each build code once per visitor per day. Repeat clicks change nothing.
- **Similarity merge**: reuse the "within a few points" grouping so near-identical builds count as one row.
- **Minimum sample**: show percentages only above a total build count (start with 50).
- **Window**: a cumulative total plus a rolling 30-day window, so the numbers can reflect current patches.
- **Thresholds**: set "almost everyone" and "almost nobody" cutoffs as product decisions. Their observed list suggests they are near 50% and 10%, but I could not confirm the exact cutoffs.

### 3.4 Abuse and privacy

- **Rate limit** events per visitor token at the write endpoint (Phase 2), and drop bursts.
- **Anonymous token**: a random browser token, hashed server-side, never stored raw. Say so on `/privacy`.
- **No identities** in the published file: only build codes and counts.
- **Retention**: keep raw events for a fixed window (e.g. 90 days), then keep only the aggregates.

### 3.5 Phase split

- **Phase 1**: nothing collected. Ship only the copy and the empty state, if wanted.
- **Phase 2**: event capture endpoint with rate limiting, the nightly aggregate script, and the static per-class files the planner reads.

## 4. Open questions

1. Do you want opens counted, given they dominate the vendor's totals and are easiest to inflate?
2. Set the "almost everyone" / "almost nobody" cutoffs. I'd start near 50% and 10%, to match what the vendor's list shows.
3. Is a cumulative total plus a 30-day window the right pair, or should we only show the window?
4. The vendor's `ready`/`stale`/`complete` flags look like a data-quality gate. Worth copying, but I haven't seen what sets them, so I'd design our own gate instead.
