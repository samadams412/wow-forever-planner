# World map tiles: object storage + CDN plan (for the Classic-era toggle)

**Status: not started. Planning only, written 2026-09-25.** Nothing in this
document is implemented — it exists so a future session doesn't have to
re-derive the tradeoffs from scratch when the Classic-era map toggle is
picked up. Cross-referenced from `.gitignore` and `CLAUDE.md`'s world-map
architecture notes.

## Why this doc exists, and why now isn't the time to build it

As of 2026-09-25, the Forever-era tile pyramids for both continents
(`public/map/{eastern-kingdoms,kalimdor}/tiles/`) are committed directly to
git — 2,406 `.webp` files, ~69MB combined. That's small enough that git and
Vercel handle it with zero special infrastructure: the tiles are just
static files under `public/`, served exactly like `meta.json`/`zones.json`
already were. See `CLAUDE.md`'s "Continent tile pyramid" and "Real
`/reference/map/[continent]` route" architecture notes for how that pyramid
is generated and addressed (the global 64x64 ADT grid, zoom levels z0–z6).

That decision does **not** hold once a Classic-era map style is added.
Per `CLAUDE.md`'s "World map proof of concept" note, the Classic-era source
exports already sitting on the user's machine
(`C:/Users/samue/wow.export/maps/kalimdor/kalimdor_classic_era/` and
`.../azeroth/eastern_kngdoms_classic_era/`) are single stitched PNGs of
**114–183MB each**, before tiling — several times larger than either
Forever-era continent's *entire finished tile pyramid*. Tiling two images
that size, at the same zoom depth as the existing pyramids, would plausibly
put total repo tile weight well into the hundreds of MB to low GB range
once both eras exist for both continents. That's the threshold where
"just commit it" stops being efficient:

- Every regeneration (a re-tile after a source-data refresh, or a bug fix
  in `scripts/slice-map-tiles.js`) adds another full copy's worth of binary
  diff to git history, permanently — binary files don't delta-compress the
  way text does. A few times over this project's life is fine (see current
  state); doing that at Classic-era scale, repeatedly, is not.
- Every `git clone` of this repo gets slower and heavier for every
  contributor and every CI/deploy checkout, forever — there's no way to
  shed old blobs without rewriting history.
- It provides no benefit the current approach doesn't already give: tiles
  are immutable, rarely-changing binary assets addressed by a predictable
  `{z}/{x}_{y}.webp` path — exactly the shape object storage + a CDN is
  built for, and git is not.

**Trigger to actually build this:** when the Classic-era toggle is picked
up as real work, *before* running the tiler against the classic-era source
images for the first time. Don't tile them straight into
`public/map/<continent>/tiles/classic/` and commit — that's the mistake
this doc exists to prevent.

## Recommended approach: Cloudflare R2 + its own subdomain

**Cloudflare R2** is the recommended target, over AWS S3 or Vercel Blob,
for reasons specific to this project:

- **No egress fees.** R2's entire pitch is S3-compatible storage with zero
  bandwidth cost — this is a free, unmonetized fan site with unpredictable
  traffic; a per-GB egress bill (S3's model) is the wrong risk to take on
  for a project with no revenue.
- **Free tier is generous enough that this project likely never pays.**
  10GB storage and 10M Class B (read) operations/month free, as of this
  writing — comfortably above the low-single-digit-GB this feature needs
  even at Classic-era scale, and reads are what a tile server does almost
  exclusively.
- **A custom domain (e.g. `tiles.forevercraft.app`) can sit in front of an
  R2 bucket for free**, giving CDN-backed edge caching without a separate
  CDN product or bill.
- **S3-compatible API** — any tooling written against it (upload scripts,
  libraries) also works unmodified against real S3 or MinIO later if the
  provider ever needs to change.

**Runner-up, if avoiding a second account matters more than cost:** Vercel
Blob Storage, since the project already deploys on Vercel (one dashboard,
one bill, no DNS/CNAME setup for a tiles subdomain). Worth it only if R2's
account-per-provider overhead turns out to matter in practice — R2's
no-egress model is the stronger fit for a public, unmonetized site
otherwise.

**Not recommended:** Git LFS. It solves "don't bloat the git blob store"
but not the underlying problem — GitHub's free LFS tier is 1GB
storage/1GB bandwidth per month, which a public map feature with any real
traffic would exceed quickly, and Vercel's LFS pull-on-build adds build
time for an asset that doesn't need to be pulled into the build at all
(tiles are served directly to the browser, never touched by the Next.js
build itself).

## Architecture sketch

**Storage layout** (mirrors the existing local layout, just hosted
elsewhere):

```
tiles.forevercraft.app/
  eastern-kingdoms/
    forever/tiles/{z}/{x}_{y}.webp   <- today's pyramid, migrated
    classic/tiles/{z}/{x}_{y}.webp   <- new
  kalimdor/
    forever/tiles/{z}/{x}_{y}.webp
    classic/tiles/{z}/{x}_{y}.webp
```

An `era` segment (`forever` | `classic`) sits alongside the existing
per-continent split, not instead of it — this is additive to
`lib/map-continents.ts`'s existing `ContinentMapConfig`, not a redesign of
it.

**Build pipeline (local, unchanged in spirit):**
1. `scripts/slice-map-tiles.js` (or a small variant of it) tiles the
   classic-era source PNGs exactly like it already does for Forever-era
   ones — same global-ADT-grid addressing, same empty-tile-skipping, same
   `.webp` encoding. Output goes to a local-only directory, still
   gitignored (e.g. `public/map/<continent>/tiles-classic/` or a
   `.build-output/` scratch path — not `public/map/<continent>/tiles/`,
   to avoid ever accidentally `git add`-ing it out of habit).
2. A **new** `scripts/upload-map-tiles.js` walks that output directory and
   uploads it to the R2 bucket via the S3-compatible API (the `@aws-sdk/
   client-s3` package works against R2 unmodified with an R2-specific
   endpoint URL). Uploads should be content-hash-checked (skip a file
   whose remote ETag/hash already matches) so a partial re-run or a
   re-tile with mostly-unchanged output doesn't re-upload everything.
3. Nothing from this pipeline is committed to git — not the generated
   tiles, not a manifest of what was uploaded (R2's own bucket listing is
   the source of truth for what exists).

**Serving:** `lib/map-continents.ts`'s `getContinentMapConfig` gains an
`era` parameter (or a second config keyed by era) that produces a
`tileUrlTemplate` pointing at the CDN
(`https://tiles.forevercraft.app/<continent>/<era>/tiles/{z}/{x}_{y}.webp`)
instead of the current local `/map/<continent>/tiles/{z}/{x}_{y}.webp`.
`LeafletZoneMap.tsx`'s `L.tileLayer(...)` call already takes a URL
template as a prop-driven string — this needs no structural change there,
only a different string being passed in depending on which era is active.

**No more Vercel/local-only branching needed for tiles at all** — once
tiles live on a CDN, local dev, Vercel Preview, and Vercel Production all
fetch the exact same URLs. This is actually a simplification relative to
today's flow: `meta.json`/`zones.json`/entrance and flight-master data
still ship as committed JSON (small, code-adjacent, benefits from being
versioned with the code that reads it), only the large binary tile images
move off git.

**UI:** a small era toggle (Forever/Classic) in `MapSidebar.tsx`, alongside
the existing continent dropdown — out of scope for this doc to design in
detail, but it's a `MapLayers`-adjacent piece of UI state, not a new
routing segment (the continent stays the route; era is a client-side
choice, most naturally another URL-hash field following the existing
`x=&y=&z=&sel=&off=` convention in `MapExplorer.tsx`).

## Migration checklist, when this is picked up

1. Create the R2 bucket + a `tiles.<domain>` custom domain in front of it.
2. Write `scripts/upload-map-tiles.js` (hash-checked, idempotent uploads).
3. Migrate the **existing, already-committed** Forever-era tiles to R2
   too, so both eras are served the same way — don't leave Forever on git
   and Classic on R2 permanently; that's two serving paths to maintain for
   no benefit once R2 is in place. Delete the tile files from
   `public/map/*/tiles/` and restore the `.gitignore` rule from before this
   change once the CDN path is confirmed working in production.
4. Tile the classic-era source PNGs, upload the output, wire up
   `tileUrlTemplate`/era config in `lib/map-continents.ts`.
5. Add the era toggle to `MapSidebar.tsx` + `MapExplorer.tsx`'s hash state.
6. Verify live on both continents, both eras, before removing the old
   local tile-serving code path entirely.

## Non-goals for this doc

Not attempting to design the actual Classic/Forever toggle UX, decide
whether zone borders/entrances/flight masters differ by era (they
shouldn't — those are Forever-specific game data either way, only the
underlying map art changes), or pick exact zoom-level parity between the
two source images (the classic-era exports may not tile to the same
native zoom depth as the Forever ones; that's a tiling-time decision for
whoever implements this, not a storage decision).
