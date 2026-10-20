"use client";

import { Suspense, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import RaidCompPlanner from "./RaidCompPlanner";
import { decodeNames, decodeRoster } from "@/lib/raid-comp";

type Props = Omit<ComponentProps<typeof RaidCompPlanner>, "initialRoster" | "initialNames">;

// ?r= / ?n= are read client-side so /raid-comp stays a prerendered static
// page (same pattern as PlannerFromUrl). The Suspense fallback is the
// same planner with an empty roster, so the prerendered HTML has content.
export default function RaidCompFromUrl(props: Props) {
  return (
    <Suspense fallback={<RaidCompPlanner {...props} />}>
      <PlannerWithRoster {...props} />
    </Suspense>
  );
}

function PlannerWithRoster(props: Props) {
  const params = useSearchParams();
  return <RaidCompPlanner {...props} initialRoster={decodeRoster(params.get("r"))} initialNames={decodeNames(params.get("n"))} />;
}
