import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import PlannerClient from "./PlannerClient";

// Static (not generateMetadata) on purpose: every /planner/<class>/<race>/<build>
// permutation this catch-all route matches should carry the exact same
// title/description/canonical, so Google consolidates ranking signal onto
// the base /planner URL instead of splitting it across build variations.
export const metadata: Metadata = {
  title: "WoW Forever Talent Calculator — Plan Your Build",
  description:
    "Build and share World of Warcraft: Forever talent trees for all nine classes. Pick a race and class, spend your points, and share your build with a link -- free and updated with every beta patch.",
  alternates: {
    canonical: "/planner",
  },
};

const WEB_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Forevercraft Talent Calculator",
  applicationCategory: "GameApplication",
  operatingSystem: "Any (web browser)",
  url: `${SITE_URL}/planner`,
  description:
    "Free World of Warcraft: Forever talent point calculator -- pick a race and class, plan your talent build, and share it with a link.",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const [classId, raceId, buildCode] = slug;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEB_APPLICATION_JSON_LD) }}
      />
      <PlannerClient
        initialClassId={classId ?? null}
        initialRaceId={raceId ?? null}
        initialBuildCode={buildCode ?? null}
      />
    </>
  );
}
