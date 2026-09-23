import type { ReactNode } from "react";

// Responsive grid for a set of <GuideImage> children that belong together --
// e.g. every item in one gear set, or every recipe in one batch -- so they
// read as a group instead of one long column of full-width images. 2
// columns below the `sm` breakpoint, 3 at `sm` and up; a trailing partial
// row (e.g. 2 images in a 3-column grid) just leaves a gap rather than
// stretching to fill it. Moved here from components/professions/ when the
// profession write-ups migrated to content/blog/ -- GuideImage (unlike the
// profession-only ProfessionImage it originally paired with) has no
// grid/standalone size variant of its own, so this is a plain layout
// wrapper with no prop injection needed.
export default function GuideImageGrid({ children }: { children: ReactNode }) {
  return <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
