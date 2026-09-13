"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { races, getRaceById, getRacialsForRace, getClassTalentData } from "@/lib/wow-data";
import { encodeBuild, decodeBuild, type RankState } from "@/lib/build-code";
import { canAddPoint, canRemovePoint, totalPointsSpent, MAX_TALENT_POINTS } from "@/lib/talent-rules";
import RacePicker from "@/components/planner/RacePicker";
import RacialsPanel from "@/components/planner/RacialsPanel";
import ClassPicker from "@/components/planner/ClassPicker";
import RaceReferenceTable from "@/components/planner/RaceReferenceTable";
import TalentTreeGrid from "@/components/planner/TalentTreeGrid";

function buildPlannerPath(raceId: string | null, classId: string | null, code: string | null): string {
  const parts: string[] = [];
  if (raceId) {
    parts.push(raceId);
    if (classId) {
      parts.push(classId);
      if (code) parts.push(code);
    }
  }
  return parts.length ? `/planner/${parts.join("/")}` : "/planner";
}

export default function PlannerClient({
  initialRaceId,
  initialClassId,
  initialBuildCode,
}: {
  initialRaceId: string | null;
  initialClassId: string | null;
  initialBuildCode: string | null;
}) {
  const router = useRouter();
  const [raceId, setRaceId] = useState<string | null>(initialRaceId);
  const [classId, setClassId] = useState<string | null>(initialClassId);
  const [ranks, setRanks] = useState<RankState>(() => {
    const classData = initialClassId ? getClassTalentData(initialClassId) : undefined;
    return classData && initialBuildCode ? decodeBuild(classData, initialBuildCode) : {};
  });
  const [copied, setCopied] = useState(false);

  const race = raceId ? getRaceById(raceId) : undefined;
  const classData = classId ? getClassTalentData(classId) : undefined;

  useEffect(() => {
    const code = classData && Object.keys(ranks).length > 0 ? encodeBuild(classData, ranks) : null;
    router.replace(buildPlannerPath(raceId, classId, code), { scroll: false });
  }, [raceId, classId, ranks, classData, router]);

  const handleSelectRace = useCallback(
    (id: string) => {
      setRaceId(id);
      const newRace = getRaceById(id);
      if (classId && newRace && !newRace.allowedClasses.includes(classId)) {
        setClassId(null);
        setRanks({});
      }
    },
    [classId]
  );

  const handleSelectClass = useCallback((id: string) => {
    setClassId(id);
    setRanks({});
  }, []);

  const addPoint = useCallback(
    (talentId: string) => {
      if (!classData) return;
      const tree = classData.trees.find((t) => t.talents.some((tal) => tal.id === talentId));
      const talent = tree?.talents.find((tal) => tal.id === talentId);
      if (!tree || !talent) return;
      if (!canAddPoint(tree, talent, ranks, totalPointsSpent(classData.trees, ranks))) return;
      setRanks((prev) => ({ ...prev, [talentId]: (prev[talentId] ?? 0) + 1 }));
    },
    [classData, ranks]
  );

  const removePoint = useCallback(
    (talentId: string) => {
      if (!classData) return;
      const tree = classData.trees.find((t) => t.talents.some((tal) => tal.id === talentId));
      const talent = tree?.talents.find((tal) => tal.id === talentId);
      if (!tree || !talent) return;
      if (!canRemovePoint(tree, talent, ranks)) return;
      setRanks((prev) => {
        const next = { ...prev, [talentId]: (prev[talentId] ?? 0) - 1 };
        if (next[talentId] <= 0) delete next[talentId];
        return next;
      });
    },
    [classData, ranks]
  );

  const resetBuild = useCallback(() => setRanks({}), []);

  const totalSpent = classData ? totalPointsSpent(classData.trees, ranks) : 0;

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; nothing to fall back to without a visible text field
    }
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-3 py-1 sm:px-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-semibold text-accent">Planner</h1>
        <p className="text-xs text-foreground-muted">
          Pick a race, see its racials, then plan your talent build — all in one flow.
        </p>
      </div>

      <div className="mt-1 space-y-1">
        <RacePicker races={races} selectedRaceId={raceId} onSelect={handleSelectRace} />

        {race && (
          <>
            <RacialsPanel race={race} racials={getRacialsForRace(race.id)} />
            <ClassPicker
              allowedClasses={race.allowedClasses}
              selectedClassId={classId}
              onSelect={handleSelectClass}
            />
          </>
        )}

        {classData && (
          <section>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Spend talent points
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground-muted">
                  {totalSpent} / {MAX_TALENT_POINTS} pts
                </span>
                <button
                  type="button"
                  onClick={resetBuild}
                  className="rounded border border-border px-2 py-0.5 text-xs text-foreground-muted hover:border-accent/60 hover:text-foreground"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded border border-accent/60 px-2 py-0.5 text-xs text-accent hover:bg-surface-hover"
                >
                  {copied ? "Copied!" : "Copy share link"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {classData.trees.map((tree) => (
                <TalentTreeGrid
                  key={tree.name}
                  classId={classData.class}
                  tree={tree}
                  ranks={ranks}
                  totalSpent={totalSpent}
                  onAdd={addPoint}
                  onRemove={removePoint}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="mt-8">
        <RaceReferenceTable races={races} />
      </div>
    </main>
  );
}
