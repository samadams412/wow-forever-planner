import type { Metadata } from "next";
import ComingSoon from "@/components/site/ComingSoon";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Dated posts on World of Warcraft: Forever beta impressions, patch breakdowns, and updates -- coming soon.",
};

export default function BlogPage() {
  return (
    <ComingSoon
      title="Blog"
      blurb="Dated posts — beta impressions, patch breakdowns, and updates as Forever evolves."
      detail="First post: BlizzCon 2026 recap — coming soon."
    />
  );
}
