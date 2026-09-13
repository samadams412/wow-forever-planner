import type { Metadata } from "next";
import ComingSoon from "@/components/site/ComingSoon";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Leveling tips, class impressions, and patch breakdowns for World of Warcraft: Forever -- coming soon.",
};

export default function GuidesPage() {
  return (
    <ComingSoon
      title="Guides"
      blurb="Longer-form, less time-sensitive content — leveling tips, class impressions, patch breakdowns."
      detail="First guide: Warrior talent build walkthrough — coming soon."
    />
  );
}
