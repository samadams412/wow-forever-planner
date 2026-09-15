import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { getClassTalentData } from "@/lib/wow-data";
import { decodeBuild } from "@/lib/build-code";
import PlannerClient from "./PlannerClient";

// title/description/canonical stay identical across every
// /planner/<class>/<race>/<build> permutation this catch-all route
// matches, so Google consolidates ranking signal onto the base /planner
// URL instead of splitting it across build variations -- generateMetadata
// only exists here to vary openGraph.images per build; everything else
// below is the same object the old static `metadata` export used to be.
const BASE_METADATA: Metadata = {
  title: "WoW Forever Talent Calculator — Plan Your Build",
  description:
    "Build and share World of Warcraft: Forever talent trees for all nine classes. Pick a race and class, spend your points, and share your build with a link -- free and updated with every beta patch.",
  alternates: {
    canonical: "/planner",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug = [] } = await params;
  const [classId, , buildCode] = slug;

  // A catch-all segment must be the last part of its own route, so the
  // per-build OG image can't live at app/planner/[[...slug]]/opengraph-image.tsx
  // the way it would on a non-catch-all page -- it's a plain Route Handler
  // at the sibling static path app/planner/og/[classId]/[buildCode] instead,
  // pointed at here. Omitting openGraph entirely (no classId/buildCode, or
  // a build with zero points spent) falls back to the root layout's
  // site-wide static image.
  const classData = classId ? getClassTalentData(classId) : undefined;
  if (!classData || !buildCode) return BASE_METADATA;

  const ranks = decodeBuild(classData, buildCode);
  const totalPoints = Object.values(ranks).reduce((a, b) => a + b, 0);
  if (totalPoints === 0) return BASE_METADATA;

  return {
    ...BASE_METADATA,
    openGraph: {
      images: [{ url: `/planner/og/${classId}/${buildCode}`, width: 1200, height: 630 }],
    },
  };
}

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
