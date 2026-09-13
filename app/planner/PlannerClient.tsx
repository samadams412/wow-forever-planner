"use client";

import { useCallback, useEffect, useState } from "react";
import { races, getRaceById, getRacialsForRace, getClassTalentData } from "@/lib/wow-data";
import { encodeBuild, decodeBuild, type RankState } from "@/lib/build-code";
import { canAddPoint, canRemovePoint, pointsSpentInTree } from "@/lib/talent-rules";
import RacePicker from "@/components/planner/RacePicker";
import RacialsPanel from "@/components/planner/RacialsPanel";
import ClassPicker from "@/components/planner/ClassPicker";
import TalentTreeGrid from "@/components/planner/TalentTreeGrid";

const MAX_TALENT_POINTS = 51;

function readFromUrl() {
  if (typeof window === "undefined") return { raceId: null, classId: null, ranks: {} as RankState };
  const params = new URLSearchParams(window.location.search);
  const raceId = params.get("r");
  const classId = params.get("c");
  const code = params.get("b");
  const classData = classId ? getClassTalentData(classId) : undefined;
  const ranks = classData && code ? decodeBuild(classData, code) : {};
  return { raceId, classId, ranks };
}

export default function PlannerClient() {
  // This component is only ever rendered client-side (see page.tsx), so it's
  // safe for the initial state to read from the URL directly.
  const [raceId, setRaceId] = useState<string | null>(() => readFromUrl().raceId);
  const [classId, setClassId] = useState<string | null>(() => readFromUrl().classId);
  const [ranks, setRanks] = useState<RankState>(() => readFromUrl().ranks);
  const [copied, setCopied] = useState(false);

  const race = raceId ? getRaceById(raceId) : undefined;
  const classData = classId ? getClassTalentData(classId) : undefined;

  useEffect(() => {
    const params = new URLSearchParams();
    if (raceId) params.set("r", raceId);
    if (classId) params.set("c", classId);
    if (classData && Object.keys(ranks).length > 0) {
      params.set("b", encodeBuild(classData, ranks));
    }
    const query = params.toString();
    const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [raceId, classId, ranks, classData]);

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
      if (!canAddPoint(tree, talent, ranks)) return;
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

  const totalSpent = classData
    ? classData.trees.reduce((sum, tree) => sum + pointsSpentInTree(tree, ranks), 0)
    : 0;

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
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-accent">Planner</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Pick a race, see its racials, then plan your talent build — all in one flow.
      </p>

      <div className="mt-8 space-y-8">
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
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
                3. Spend talent points
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-foreground-muted">
                  {totalSpent} / {MAX_TALENT_POINTS} points spent
                </span>
                <button
                  type="button"
                  onClick={resetBuild}
                  className="rounded border border-border px-3 py-1 text-sm text-foreground-muted hover:border-accent/60 hover:text-foreground"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded border border-accent/60 px-3 py-1 text-sm text-accent hover:bg-surface-hover"
                >
                  {copied ? "Copied!" : "Copy share link"}
                </button>
              </div>
            </div>
            <p className="mb-4 text-xs text-foreground-muted/70">
              Click a talent to add a point. Shift-click or right-click to remove one.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {classData.trees.map((tree) => (
                <TalentTreeGrid
                  key={tree.name}
                  tree={tree}
                  ranks={ranks}
                  onAdd={addPoint}
                  onRemove={removePoint}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
