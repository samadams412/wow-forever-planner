import type { ComponentType } from "react";
import GuideImage from "./GuideImage";

// MDX's component map is inherently heterogeneous -- each entry has its own
// prop shape (an <h2> takes different props than <GuideImage>) -- so a
// single precise value type isn't expressible here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const guideMdxComponents: Record<string, ComponentType<any>> = {
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
};
