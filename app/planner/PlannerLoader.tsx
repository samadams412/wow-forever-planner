"use client";

import dynamic from "next/dynamic";

const PlannerClient = dynamic(() => import("./PlannerClient"), { ssr: false });

export default function PlannerLoader() {
  return <PlannerClient />;
}
