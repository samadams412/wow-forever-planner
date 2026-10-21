"use client";

import { Suspense, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import GearPlanner from "./GearPlanner";

type Props = Omit<ComponentProps<typeof GearPlanner>, "initialCode">;

// ?g= is read client-side so /gear/<class> stays a prerendered static page
// (same pattern as RaidCompFromUrl). The fallback is the planner without a
// code, which shows the first preset once the pool loads.
export default function GearFromUrl(props: Props) {
  return (
    <Suspense fallback={<GearPlanner {...props} initialCode={null} />}>
      <PlannerWithCode {...props} />
    </Suspense>
  );
}

function PlannerWithCode(props: Props) {
  const params = useSearchParams();
  return <GearPlanner {...props} initialCode={params.get("g")} />;
}
