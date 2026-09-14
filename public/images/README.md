# Image assets

```
public/images/
  hero/    homepage hero background(s)
  og/      opengraph/social preview image(s)
  guides/
    <zone-or-dungeon-slug>/   one folder per guide, e.g. mount-hyjal/
  blog/
    <post-slug>/              one folder per post, e.g. zephras-isle/
  logo/    the runestone mark variants (carved/forged/ember)
```

When a new guide or blog post gets written, give it its own folder
under `guides/` or `blog/` named after the MDX file's slug and
reference images from there in the frontmatter (`heroImage`) and body
(`<GuideImage src="...">` -- shared by both content types).

`public/backgrounds/` (talent tree backgrounds) and `public/cursors/`
are separate, unrelated asset sets and aren't part of this structure.
