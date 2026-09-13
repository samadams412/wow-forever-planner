import PlannerLoader from "./PlannerLoader";

// The planner reads/writes its state from the URL on the client and has no
// SEO-relevant content, so it's rendered client-only to avoid a hydration
// mismatch between server (no URL access) and client.
export default function PlannerPage() {
  return <PlannerLoader />;
}
