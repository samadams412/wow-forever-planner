---
type: content-draft
created: YYYY-MM-DD
tags: [forevercraft, content]
status: draft
kind: guide            # guide | blog | profession (profession write-ups currently ship as blog posts)
slug: your-slug-here   # kebab-case; becomes the filename and URL
target: content/guides/<slug>.mdx
publish-status: draft  # mirrors the MDX frontmatter `status` (draft | published)
---

# <Working title> — content draft

Vault-native planning and drafting note. Plan and write the piece here, then copy the **Draft body** into the real MDX file in the site repo. Conventions come from repo `docs/adding-content.md`, which stays the source of truth for how MDX content works; this template only mirrors it.

Related: [[Roadmap]] · [[Architecture]] (Content)

## Brief
- **Audience / question it answers:**
- **Why now** (beta patch, launch-week need, evergreen gap):
- **Scope** (what's in, what's deliberately out):
- **Deadline / target publish date:** (launch is 2026-11-04)

## Sources & data confidence
Cite where each claim comes from. Mark anything unconfirmed, same spirit as the site's confirmed / datamined / estimated indicators.
| Claim / section | Source (VOD, official panel, Blizzard post, site data file) | Confidence |
|---|---|---|
| | | confirmed / datamined / estimated |

- **Site data this draws on** (e.g. `data/professions-catalog/<id>.json`, `data/dungeons/<id>.json`, item ids):
- Any figures copied from site data: re-check against the current data before publishing; patches change it.

## Frontmatter (copy into the MDX file)
```yaml
---
title: ""              # shown as h1 and page title; don't append "| Forevercraft", the layout does
date: "YYYY-MM-DD"     # date only, no time; drives newest-first sort (not used for professions)
summary: ""            # listing card + meta description; one or two sentences
tags: []               # guides/blog only; omit entirely for profession pages
status: "draft"        # draft 404s even by direct URL; flip to "published" to go live
heroImage: "/images/<blog|guides|professions>/<slug>/hero.webp"
heroAlt: ""            # real description; it is the only alt text, there is no fallback
# heroCredit: ""       # optional, guides/blog only; overrides the default Blizzard-press-still credit
---
```
Every field except `heroCredit` is required in practice. Missing fields won't fail the build, they render blank or broken.

## Images
- Folder: `public/images/<blog|guides|professions>/<slug>/`; hero is `hero.webp`; `.webp` for anything new.
- **Credit:** `<GuideImage>` defaults to "Official World of Warcraft: Forever reveal screenshot, courtesy of Blizzard Entertainment", correct only for official press stills. Screenshots you took or custom graphics need `credit="..."` (or `credit=""` to suppress). Profession images render no credit line at all.
- Don't reproduce Blizzard's in-game art/icon assets without checking usage rights.

| File | Alt text | Credit | Source / rights checked? |
|---|---|---|---|
| hero.webp | | | |

## Outline
1. Opening paragraph (what this is, who it's for)
2. `##` First section
3. `##` Second section
4. Sourcing line at the end (same way existing posts close)

## Draft body
Standard Markdown plus `<GuideImage>` for images. Use `##`/`###` headings, not `#` (the title is the h1).

```mdx
Opening paragraph.

## First section heading

Body text.

<GuideImage src="/images/<kind>/<slug>/example.webp" alt="Describe this image" />

## Another section

More body text.

---

Source: cite where this came from (stream VOD, official panel, etc.).
```

## Pre-publish checklist
- [ ] Facts checked against sources above; unconfirmed claims labeled as such
- [ ] Frontmatter complete; `summary` reads well as a meta description; `date` correct
- [ ] Images in place, alt text written, credits correct
- [ ] Created `content/<blog|guides|professions>/<slug>.mdx` in the site repo and checked the rendered page locally (drafts 404, so temporarily flip `status` to `"published"` to preview, then flip back before committing)
- [ ] Set `status: "published"`; sitemap and per-post OG image generate automatically, nothing else to edit
- [ ] Updated this note: `publish-status` and link to the live URL
