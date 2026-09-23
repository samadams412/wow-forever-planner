import type { ComponentType } from "react";
import GuideImage from "@/components/guides/GuideImage";
import GuideImageGrid from "@/components/guides/GuideImageGrid";

// Same typographic treatment as guides -- mirrored, not shared, so guide and
// blog content styling can drift independently if the two ever need to.
// GuideImage itself IS shared as-is: same press-still + credit-line pattern
// applies to both content types, so a second component would just duplicate it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const blogMdxComponents: Record<string, ComponentType<any>> = {
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
  GuideImage,
  GuideImageGrid,
};
