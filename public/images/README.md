# Image assets

```
public/images/
  hero/    homepage hero background(s)
  og/      opengraph/social preview image(s)
  guides/
    <zone-or-dungeon-slug>/   one folder per guide, e.g. mount-hyjal/
  logo/    the runestone mark variants (carved/forged/ember)
```

When a new guide gets written, give it its own folder under `guides/`
named after the zone/dungeon slug (matching the MDX file's slug in
`content/guides/`) and reference images from there in the guide's
frontmatter (`heroImage`) and body (`<GuideImage src="...">`).

`public/backgrounds/` (talent tree backgrounds) and `public/cursors/`
are separate, unrelated asset sets and aren't part of this structure.
