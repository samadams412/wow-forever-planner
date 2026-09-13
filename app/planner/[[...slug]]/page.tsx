import PlannerClient from "./PlannerClient";

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const [classId, raceId, buildCode] = slug;

  return (
    <PlannerClient
      initialClassId={classId ?? null}
      initialRaceId={raceId ?? null}
      initialBuildCode={buildCode ?? null}
    />
  );
}
