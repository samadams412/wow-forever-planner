import { Children, cloneElement, isValidElement, type ReactNode } from "react";

// Responsive grid for a set of <GuideImage> (-> ProfessionImage) children
// that belong together -- e.g. every item in one gear set, or every recipe
// in one batch -- so they read as a group instead of one long column of
// full-width images. 2 columns below the `sm` breakpoint, 3 at `sm` and up;
// a trailing partial row (e.g. 2 images in a 3-column grid) just leaves a
// gap rather than stretching to fill it.
//
// Children pass their src/alt as normal; this only injects
// `variant="grid"` onto each one so ProfessionImage sizes itself for a tile
// instead of a standalone full-bleed image, without every caller needing to
// set that prop by hand.
export default function GuideImageGrid({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {Children.map(children, (child) =>
        isValidElement(child) ? cloneElement(child, { variant: "grid" } as Partial<unknown>) : child
      )}
    </div>
  );
}
