import type { Metadata } from "next";
import WrappedStory from "@/components/wrapped/WrappedStory";
import type { WrappedClasses } from "@/components/wrapped/WrappedSlides";
import { BETA_WRAPPED } from "@/lib/beta-wrapped";
import { CLASS_COLOR, CLASS_ICON, classLabel, getClassTalentData, getTreeIcon, mediumIconUrl, treeBackgroundUrl } from "@/lib/wow-data";

const DESCRIPTION =
  "Every change Blizzard made in the World of Warcraft: Forever beta, Sept 16 to Oct 27, 2026: builds, class changes, new and removed talents, and the final racial pass.";

export const metadata: Metadata = {
  title: "WoW Forever Beta Wrapped — Every Change, Sept 16 to Oct 27",
  description: DESCRIPTION,
  alternates: { canonical: "/beta-wrapped" },
  openGraph: {
    title: "Beta Wrapped | Forevercraft",
    description: DESCRIPTION,
    url: "/beta-wrapped",
    siteName: "Forevercraft",
    type: "website",
  },
};

export default function BetaWrappedPage() {
  // Colors and icons resolved here so the client bundle never imports lib/wow-data.
  const artTree = Object.fromEntries(BETA_WRAPPED.slides.flatMap((s) => (s.kind === "class" ? [[s.classId, s.tree]] : [])));
  const classes = Object.fromEntries(
    Object.keys(CLASS_COLOR).map((id) => [
      id,
      {
        label: classLabel(id),
        color: CLASS_COLOR[id],
        icon: mediumIconUrl(CLASS_ICON[id]),
        specIcons: (getClassTalentData(id)?.trees ?? []).map((t) => mediumIconUrl(getTreeIcon(id, t.name))),
        art: treeBackgroundUrl(id, artTree[id]),
      },
    ]),
  ) as WrappedClasses;

  return (
    <main className="flex-1">
      <WrappedStory edition={BETA_WRAPPED} classes={classes} />
    </main>
  );
}
