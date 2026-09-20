# Adding guides, blog posts, and profession pages

Quick reference for adding a new guide, blog post, or profession page by
hand. All three use the same underlying system (filesystem `.mdx` files +
`next-mdx-remote`, not Next's `@next/mdx` file-convention routing) — each
content type keeps its own thin wrapper module (`lib/blog.ts`, `lib/
guides.ts`, `lib/professions.ts`) over shared plumbing in `lib/content.ts`
(directory listing + frontmatter parsing, generic over the frontmatter
shape). The three wrapper modules — and each type's page shell/MDX styling —
are mirrored, separate implementations rather than one shared template, so
one content type's behavior/styling can diverge from the others later
without a refactor. Everything below applies identically to all three unless
a section says otherwise.

## How it actually works (not a build step)

There is **no manifest, index, or generator to run**. A post/guide/
profession page is just an `.mdx` file under `content/blog/`,
`content/guides/`, or `content/professions/`, read at request/build time via
`lib/content.ts`'s `listContentSlugs`/`readContentFile` (a thin wrapper
around `fs.readdirSync`/`fs.readFileSync` + `gray-matter`). The `[slug]`
route reads the matching file and renders its body through `<MDXRemote>`.

- **Filename → slug.** `content/blog/my-post.mdx` becomes `/blog/my-post`.
  Use kebab-case; the slug is the filename minus `.mdx`, verbatim.
- **Dev:** just save the file. No restart needed — confirmed by adding a
  file while `next dev` was already running and loading it immediately.
- **Production build:** guide/post pages are statically generated via
  `generateStaticParams`, so a new file needs a `next build` (i.e. a
  redeploy) before it exists in production — saving the file alone isn't
  enough there.
- **`status: "draft"` is fully hidden, not previewable.** Both the listing
  page and the `[slug]` page call the same `status !== "published"` check,
  so a draft **404s even by direct URL**. There's no draft-preview route.
  To check a draft's rendering, temporarily flip it to `"published"`
  locally, then flip back before committing.

## Adding a new guide

1. Create `content/guides/<slug>.mdx` with the frontmatter block below.
2. Add hero (and any in-body) images under `public/images/guides/<slug>/`
   (see [Images](#images)).
3. Write the body in Markdown/MDX below the frontmatter.
4. Run `npx next dev` (or use the one already running) and open
   `/guides/<slug>` to check it.
5. Done — no other file needs to change for it to exist, sitemap included
   (see [Gotchas](#gotchas--manual-steps)).

## Adding a new blog post

Identical steps, swapping `guides` for `blog`:

1. Create `content/blog/<slug>.mdx` with the frontmatter block below.
2. Add images under `public/images/blog/<slug>/`.
3. Write the body.
4. Check it at `/blog/<slug>`.
5. Done — same as guides, nothing else needs to change.

## Adding a new profession page

Same mechanics as a guide, at `/reference/professions/<slug>` instead of
`/guides/<slug>`, with two real differences (see
[Frontmatter schema](#frontmatter-schema) below): no `tags` field, and the
index (`/reference/professions`) sorts alphabetically by title rather than
newest-first, since profession pages are evergreen reference material, not
dated posts.

1. Create `content/professions/<slug>.mdx` with the frontmatter block
   below. Pick the slug to match the profession (`alchemy`, `first-aid`,
   etc.) — there's no separate "profession name" field, the slug is it.
2. Add hero (and any in-body) images under
   `public/images/professions/<slug>/` (see [Images](#images) — note the
   credit-line difference for this content type specifically).
3. Write the body in Markdown/MDX below the frontmatter. Body images use
   `<GuideImage>`, same tag name as guides/blog (see
   [Body content](#body-content-mdx)) even though it resolves to a
   different component here.
4. Check it at `/reference/professions/<slug>`.
5. Done — same as guides/blog, nothing else needs to change.

## Frontmatter schema

Pulled directly from `lib/blog.ts` / `lib/guides.ts` / `lib/professions.ts`
and cross-checked against every currently published post. **Note:**
`content/guides/` currently has zero files in it — the guide-authoring
steps and template below are real and wired up, but there is no live guide
to cross-check them against right now. Everything here was verified
against `lib/guides.ts`'s types and the working `/guides` route directly
instead.

| Field       | Required | Type              | Notes |
|-------------|----------|-------------------|-------|
| `title`     | Yes      | string            | Shown as the `<h1>` and fed into `generateMetadata` (page `<title>`, via the root layout's `"%s \| Forevercraft"` template — don't append the site name yourself). |
| `date`      | Yes      | string `"YYYY-MM-DD"` | Drives sort order on the listing page: newest-first for guides/blog, but **not used for sorting on professions** (that index sorts alphabetically by `title` instead — still shown on the page, just not the sort key). Rendered with `timeZone: "UTC"`, so pick the date, not a time. |
| `summary`   | Yes      | string            | Shown on the listing card and used as the meta description. |
| `tags`      | Guides/blog only | string[]  | Shown as small pill badges. Can be `[]`. **Not a field on professions** — a profession page's slug already says which profession it's about, so there's nothing for cross-cutting tags to group. |
| `status`    | Yes      | `"draft"` \| `"published"` | Only `"published"` is ever rendered anywhere (see above). |
| `heroImage` | Yes      | string (root-relative path) | e.g. `"/images/blog/mount-hyjal/hero.webp"`. Rendered via `<GuideImage>` for guides/blog, `<ProfessionImage>` for professions (same shape, different credit-line behavior — see [Images](#images)), `fill` + `object-cover`, forced 16:9. Also read by that post's `opengraph-image.tsx` as its OG image background — see [SEO metadata](#seo-metadata). |
| `heroAlt`   | Yes      | string            | Alt text for the hero image. Write a real description — it's the only alt text either image component renders, there's no fallback. |
| `heroCredit`| Guides/blog only, optional | string | Overrides `<GuideImage>`'s default Blizzard-press-still credit line under the **hero** image specifically (see [Images](#images) — this is the per-image override that section used to say didn't exist). Omit it to get the default credit; not a field on professions, which never show a credit line at all. |

Real example (from `content/blog/mount-hyjal.mdx`):

```yaml
---
title: "Mount Hyjal: What's Left After Archimonde"
date: "2026-09-13"
summary: "A first look at Forever's new endgame zone -- a World Tree slowly healing, old scars that haven't, and the two raids waiting at the top of the mountain."
tags: ["zones", "leveling", "lore"]
status: "published"
heroImage: "/images/blog/mount-hyjal/hero.webp"
heroAlt: "A moss-draped grove beneath the roots of the World Tree in Mount Hyjal, with dragonhawks circling a stone shrine over a glowing pool"
---
```

Real example (from `content/professions/alchemy.mdx`) — note no `tags`:

```yaml
---
title: "Alchemy Update: 29 New Recipes and Titles in Forever"
date: "2026-09-17"
summary: "An overview of 29 new Alchemy recipes coming to World of Warcraft: Forever, featuring thrown AoE potions, DoT flasks, stat elixirs, and profession titles."
status: "published"
heroImage: "/images/professions/alchemy/hero.webp"
heroAlt: "A collection of bubbling glass potion flasks glowing with green, red, and blue liquids on an alchemist's workbench"
---
```

Real example of `heroCredit` in use (from `content/blog/launch-day-beta.mdx`,
a non-Blizzard screenshot that needs its own attribution instead of the
default press-still credit):

```yaml
heroCredit: "Screenshot captured by author during Closed Beta queue"
```

Every field except `heroCredit` is required in the TypeScript type
(`PostFrontmatter`/`GuideFrontmatter`/`ProfessionFrontmatter` in
`lib/blog.ts`/`lib/guides.ts`/`lib/professions.ts`) — omitting a required
field won't error at build time (frontmatter is cast with `as`, not
validated), but it will render as `undefined` (e.g. a blank date or a
broken image), so treat every field listed as required (other than
`heroCredit`) as required in practice.

## Body content (MDX)

Standard Markdown works as-is (`##`/`###` headings, paragraphs, lists,
links, `**bold**`, `> blockquotes`) — each is mapped to a styled component in
`components/blog/mdx-components.tsx` / `components/guides/mdx-components.tsx`
/ `components/professions/mdx-components.tsx` (the three files are
intentionally mirrored copies, not a shared import, so one content type's
styling can drift from the others later without a refactor).

The MDX tag is `<GuideImage>` for images inside the body (not just the
hero) **in all three content types**, including professions — even though
professions' component map actually resolves that tag name to a different
component (`ProfessionImage`, not `GuideImage` itself). Keeping the same
tag name means profession `.mdx` bodies don't need touching if the mapping
ever changes again; write `<GuideImage>` regardless of which content type
you're adding:

```mdx
<GuideImage src="/images/blog/mount-hyjal/corruption.webp" alt="A blighted watchtower and crumbling ruins lit by a sickly green aurora, deep in a scarred stretch of Mount Hyjal" />
```

## Images

- **Location:** one folder per post/guide/profession, named after its slug:
  `public/images/blog/<slug>/`, `public/images/guides/<slug>/`, or
  `public/images/professions/<slug>/` (see `public/images/README.md`, which
  documents the guide/blog structure this mirrors).
- **Naming:** the hero image is conventionally `hero.webp`; additional
  in-body images get descriptive names (`corruption.webp`,
  `watchtower.webp` in existing posts).
- **Format:** `.webp` for every existing image, **except** the four
  `first-aid` profession images, which are `.jpg` (a pre-existing
  inconsistency from before the professions migration, not a new
  convention — match `.webp` for anything new).
- **Credit line — guides/blog only:** `<GuideImage>` defaults to a single
  credit string — *"Image: Official World of Warcraft: Forever reveal
  screenshot, courtesy of Blizzard Entertainment"* — under every image, but
  **does take a per-image override**: pass a `credit` prop (a plain string,
  or `credit=""` to suppress the line entirely) to change or remove it for
  that one image. For the **hero** image specifically, this is wired
  through frontmatter's `heroCredit` field (see
  [Frontmatter schema](#frontmatter-schema)) rather than a prop, since the
  hero is rendered by the page shell, not by hand in the MDX body — for a
  **body** image, pass `credit` directly on the `<GuideImage>` tag:
  `<GuideImage src="..." alt="..." credit="Your credit text" />`. Use this
  for a custom-made image (a diagram, a screenshot you took, a graphic you
  drew) that needs different credit, or no credit line, in a guide or blog
  post — `<GuideImage>`'s default is only correct for official Blizzard
  press stills/reveal screenshots.
- **Credit line — professions:** `<ProfessionImage>` (what the `<GuideImage>`
  tag actually renders in this content type — see [Body
  content](#body-content-mdx)) renders **no credit line at all**, by design:
  profession images are concept art for hypothetical recipes/items, not
  Blizzard press stills, so `<GuideImage>`'s hardcoded credit would be a
  false attribution here. Don't add a credit caption to a profession image
  unless you actually know its real source — if you do, that's a genuine
  per-image override `<ProfessionImage>` doesn't have yet, not a case to
  route through `<GuideImage>` instead.
- **Asset rights (from the project brief's non-goals):** don't reproduce
  Blizzard's actual in-game art/icon assets directly without checking
  usage rights first — the press-still convention above is what's
  currently vetted; treat anything else as unverified until checked.

## SEO metadata

- **Automatic:** `title` and `summary` frontmatter feed straight into each
  page's `generateMetadata` (`{ title: frontmatter.title, description:
  frontmatter.summary }`), and the title gets the sitewide `%s |
  Forevercraft` template applied automatically. Nothing to fill in by hand
  for basic SEO.
- **Automatic — per-post Open Graph image, no extra step needed:** each of
  the three content types has its own `opengraph-image.tsx` (the Next.js
  file-convention route, e.g. `app/blog/[slug]/opengraph-image.tsx`), which
  renders that post's own `title`/`summary`/`heroImage` through the shared
  `lib/og-template.tsx` template. This is generated automatically from the
  same frontmatter you already wrote — there's nothing to fill in by hand,
  and no separate image to design or upload. A post with no `heroImage` (or
  one Next can't resolve) falls back to the template's own default
  background, not the sitewide static PNG — that static image
  (`/images/og/opengraph.png`) is only ever used by the homepage.

## Gotchas / manual steps

- **Sitemap is automatic — no manual step needed.** `app/sitemap.ts` calls
  `getAllPosts()`, `getAllGuides()`, and `getAllProfessions()` directly, so
  every published post/guide/profession page is included the moment it's
  published — nothing to update by hand. (This wasn't always true: an
  earlier version of this doc described a manual-update gotcha here from
  before `app/sitemap.ts` was wired up to these functions — that's since
  been fixed, so a new post genuinely needs no sitemap step today.)
- **Draft posts 404, they don't preview.** Covered above — worth repeating
  since it's the one gotcha most likely to surprise someone expecting a
  standard draft-preview flow.
- **No content validation.** A missing or misspelled frontmatter field
  won't fail the build — it'll just render wrong (blank date, missing
  image, etc.) or throw at runtime if `next/image` can't resolve a bad
  `heroImage` path. Double-check the rendered page after adding a post, not
  just that the build succeeded.
- **CLAUDE.md is stale on this point.** The project brief describes
  `@next/mdx` filesystem-page routing under `/content` or `/app`; the
  actual implementation is `next-mdx-remote` + `fs`-based reads, described
  above. This doc reflects the real implementation.

## Minimal templates

### Guide template

Save as `content/guides/<slug>.mdx`:

```mdx
---
title: "Your Guide Title"
date: "2026-01-01"
summary: "One or two sentences shown on the guides listing page and used as the meta description."
tags: ["tag-one", "tag-two"]
status: "draft"
heroImage: "/images/guides/<slug>/hero.webp"
heroAlt: "Describe what the hero image actually shows"
---

Opening paragraph.

## First section heading

Body text.

<GuideImage src="/images/guides/<slug>/example.webp" alt="Describe this image" />

## Another section

More body text.
```

### Blog post template

Save as `content/blog/<slug>.mdx`:

```mdx
---
title: "Your Post Title"
date: "2026-01-01"
summary: "One or two sentences shown on the blog listing page and used as the meta description."
tags: ["tag-one", "tag-two"]
status: "draft"
heroImage: "/images/blog/<slug>/hero.webp"
heroAlt: "Describe what the hero image actually shows"
---

Opening paragraph.

## First section heading

Body text.

---

Source: cite where this came from (stream VOD, official panel, etc.), the
same way existing posts end with a sourcing line.
```

### Profession template

Save as `content/professions/<slug>.mdx` — note no `tags` field:

```mdx
---
title: "Your Profession Update Title"
date: "2026-01-01"
summary: "One or two sentences shown on the professions listing page and used as the meta description."
status: "draft"
heroImage: "/images/professions/<slug>/hero.webp"
heroAlt: "Describe what the hero image actually shows"
---

Opening paragraph.

## First section heading

Body text.

<GuideImage src="/images/professions/<slug>/example.webp" alt="Describe this image" />

## Another section

More body text.
```

Set `status: "published"` when it's ready to go live — the sitemap picks it up automatically, nothing else to do.
