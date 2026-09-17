import type { ComponentType } from "react";
import ProfessionImage from "./ProfessionImage";
import GuideImageGrid from "./GuideImageGrid";

// Same typographic treatment as guides/blog -- mirrored, not shared, per the
// existing convention (see components/blog/mdx-components.tsx) so each
// content type's styling can drift independently if it ever needs to.
// Unlike guides/blog, the image component here is its own ProfessionImage
// rather than the shared GuideImage, since GuideImage's credit line doesn't
// apply to profession concept art -- see ProfessionImage for why. Profession
// .mdx bodies still write `<GuideImage .../>` (unchanged from before the
// migration), so that's the key this map needs, even though it now resolves
// to a different component. `<GuideImageGrid>` wraps a set of `<GuideImage>`
// children in a responsive 2/3-column grid for item sets or recipe batches
// that belong together -- see GuideImageGrid.tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const professionMdxComponents: Record<string, ComponentType<any>> = {
  h2: (props) => (
    <h2 className="mt-8 font-heading text-xl font-semibold tracking-wide text-accent" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-6 text-base font-semibold text-foreground" {...props} />
  ),
  p: (props) => <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-foreground-muted" {...props} />,
  ul: (props) => (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground-muted" {...props} />
  ),
  ol: (props) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-foreground-muted" {...props} />
  ),
  li: (props) => <li className="max-w-[68ch]" {...props} />,
  a: (props) => <a className="text-accent hover:underline" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mt-3 border-l-2 border-accent/50 pl-3 text-sm italic leading-relaxed text-foreground-muted/90"
      {...props}
    />
  ),
  GuideImage: ProfessionImage,
  GuideImageGrid,
};
