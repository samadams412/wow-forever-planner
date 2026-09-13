import PlannerClient from "./PlannerClient";

export default async function PlannerPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const [raceId, classId, buildCode] = slug;

  return (
    <PlannerClient
      initialRaceId={raceId ?? null}
      initialClassId={classId ?? null}
      initialBuildCode={buildCode ?? null}
    />
  );
}
