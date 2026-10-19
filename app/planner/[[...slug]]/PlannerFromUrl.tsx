"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PlannerClient from "./PlannerClient";

type Props = { initialClassId: string | null; initialBuildCode: string | null };

// ?order= is read here, client-side, so the page itself stays prerendered and
// CDN-cached (reading it from the page's searchParams made every visit a
// server render). Same pattern as ProfessionExplorer: the Suspense fallback is
// the same planner without an order, so the prerendered HTML has real content.
export default function PlannerFromUrl(props: Props) {
  return (
    <Suspense fallback={<PlannerClient {...props} initialOrder={null} />}>
      <PlannerWithOrder {...props} />
    </Suspense>
  );
}

function PlannerWithOrder(props: Props) {
  const order = useSearchParams().get("order");
  return <PlannerClient {...props} initialOrder={order} />;
}
