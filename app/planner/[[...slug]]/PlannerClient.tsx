"use client";

import { useCallback, useEffect, useState } from "react";
import { races, getClassTalentData, classLabel, mediumIconUrl, CLASS_ICON } from "@/lib/wow-data";
import { encodeBuild, decodeBuild, type RankState } from "@/lib/build-code";
import { canAddPoint, canRemovePoint, totalPointsSpent, MAX_TALENT_POINTS } from "@/lib/talent-rules";
import { getSavedBuilds, saveBuild, deleteSavedBuild, type SavedBuild } from "@/lib/saved-builds";
import RacePicker from "@/components/planner/RacePicker";
import ClassPicker from "@/components/planner/ClassPicker";
import RaceReferenceTable from "@/components/planner/RaceReferenceTable";
import ClassHero from "@/components/planner/ClassHero";
import TalentTreeGrid from "@/components/planner/TalentTreeGrid";
import CompareLegend from "@/components/planner/CompareLegend";
import Dialog from "@/components/site/Dialog";
import Collapsible from "@/components/site/Collapsible";
import SpellbookBook from "@/components/reference/SpellbookBook";
import ClassAbilitiesSection from "@/components/reference/ClassAbilitiesSection";
import { spellbooks } from "@/lib/spellbooks";

const DEFAULT_CLASS_ID = "warrior";

// Race is reference-only (see RacePicker) -- it never affects talent
// calculations, so it isn't app state and isn't part of the URL. The build
// code sits directly after the class: /planner/<class>/<build>.
function buildPlannerPath(classId: string, code: string | null): string {
  const parts = code ? [classId, code] : [classId];
  return `/planner/${parts.join("/")}`;
}

export default function PlannerClient({
  initialClassId,
  initialBuildCode,
}: {
  initialClassId: string | null;
  initialBuildCode: string | null;
}) {
  const [classId, setClassId] = useState<string>(initialClassId ?? DEFAULT_CLASS_ID);
  const [ranks, setRanks] = useState<RankState>(() => {
    const classData = getClassTalentData(initialClassId ?? DEFAULT_CLASS_ID);
    return classData && initialBuildCode ? decodeBuild(classData, initialBuildCode) : {};
  });
  const [copied, setCopied] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [myBuildsOpen, setMyBuildsOpen] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    // Reads localStorage, which isn't available during SSR -- state starts
    // empty (matching the server-rendered HTML) and is synced once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedBuilds(getSavedBuilds());
  }, []);

  const classData = getClassTalentData(classId);
  const eligibleRaces = races.filter((r) => r.allowedClasses.includes(classId));

  useEffect(() => {
    // window.history.replaceState, not next/navigation's router.replace: the
    // App Router treats every changed catch-all segment as a distinct route
    // and re-fetches/swaps the whole subtree, unmounting PlannerClient (and
    // resetting/flashing everything in it, including the toolbar) on every
    // single point spent. Updating the address bar directly keeps this a
    // pure URL-bar sync with no React tree impact.
    const code = classData && Object.keys(ranks).length > 0 ? encodeBuild(classData, ranks) : null;
    window.history.replaceState(null, "", buildPlannerPath(classId, code));
  }, [classId, ranks, classData]);

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

  const handleOpenSaveDialog = useCallback(() => {
    setBuildName("");
    setSaveError(false);
    setSaveDialogOpen(true);
  }, []);

  const handleConfirmSave = useCallback(() => {
    const name = buildName.trim();
    if (!name || !classData) return;
    const code = Object.keys(ranks).length > 0 ? encodeBuild(classData, ranks) : "";
    const saved = saveBuild({ name, classId, buildCode: code });
    if (!saved) {
      setSaveError(true);
      return;
    }
    setSavedBuilds(getSavedBuilds());
    setSaveDialogOpen(false);
  }, [buildName, classData, classId, ranks]);

  const handleLoadBuild = useCallback(
    (build: SavedBuild) => {
      setClassId(build.classId);
      const buildClassData = getClassTalentData(build.classId);
      setRanks(buildClassData && build.buildCode ? decodeBuild(buildClassData, build.buildCode) : {});
      setMyBuildsOpen(false);
    },
    []
  );

  const handleDeleteBuild = useCallback((id: string) => {
    deleteSavedBuild(id);
    setSavedBuilds(getSavedBuilds());
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-1 sm:px-4">
      <div className="flex items-baseline gap-2">
        <h1 className="font-heading text-lg font-semibold tracking-wide text-accent">Planner</h1>
        <p className="text-xs text-foreground-muted">
          Pick a class, plan your talent build, then check a race beside it for racials — all in one flow.
        </p>
      </div>

      <div className="mt-1 space-y-1.5">
        <ClassPicker selectedClassId={classId} onSelect={handleSelectClass} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-xs text-foreground-muted">
            {totalSpent} / {MAX_TALENT_POINTS} pts
          </span>
          <button
            type="button"
            onClick={() => setCompareMode((v) => !v)}
            aria-pressed={compareMode}
            className={`rounded border px-2 py-0.5 text-xs transition-colors ${
              compareMode
                ? "border-sky-400/70 text-sky-300 bg-sky-400/10"
                : "border-border text-foreground-muted hover:border-accent/60 hover:text-foreground"
            }`}
          >
            Compare to Classic
          </button>
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
            disabled={totalSpent === 0}
            title={totalSpent === 0 ? "Spend at least one talent point to get a share link" : undefined}
            className="rounded border border-accent/60 px-2 py-0.5 text-xs text-accent hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {copied ? "Copied!" : "Copy share link"}
          </button>
          <button
            type="button"
            onClick={handleOpenSaveDialog}
            disabled={totalSpent === 0}
            title={totalSpent === 0 ? "Spend at least one talent point to save a build" : undefined}
            className="rounded border border-border px-2 py-0.5 text-xs text-foreground-muted hover:border-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
          >
            Save build
          </button>
          <button
            type="button"
            onClick={() => setMyBuildsOpen(true)}
            className="rounded border border-border px-2 py-0.5 text-xs text-foreground-muted hover:border-accent/60 hover:text-foreground"
          >
            My Builds{savedBuilds.length > 0 ? ` (${savedBuilds.length})` : ""}
          </button>
        </div>

        {compareMode && <CompareLegend />}

        {classData && <ClassHero classId={classData.class} />}

        <div className="flex flex-col gap-3 sm:flex-row">
          <RacePicker races={eligibleRaces} />

          {classData && (
            <div className="flex min-w-0 flex-1 flex-wrap justify-center gap-2 sm:justify-start">
              {classData.trees.map((tree) => (
                <TalentTreeGrid
                  key={tree.name}
                  classId={classData.class}
                  tree={tree}
                  ranks={ranks}
                  totalSpent={totalSpent}
                  onAdd={addPoint}
                  onRemove={removePoint}
                  compareMode={compareMode}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {classData && (
        <div className="mt-8">
          <Collapsible
            title={`${classLabel(classData.class)} spellbook at level 38`}
            subtitle={`Demo race: ${spellbooks.classes[classData.class].demoRace}`}
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediumIconUrl(CLASS_ICON[classData.class])} alt="" className="h-8 w-8 rounded" />
            }
          >
            {/* Keyed on class so switching classes resets the book's own
                tab/page state instead of carrying over a tab index that may
                not exist on the new class's spec tabs. */}
            <SpellbookBook key={classData.class} classId={classData.class} book={spellbooks.classes[classData.class]} />
            <ClassAbilitiesSection classId={classData.class} />
          </Collapsible>
        </div>
      )}

      <div className="mt-8">
        <RaceReferenceTable races={races} />
      </div>

      <p className="mt-4 text-[11px] text-foreground-muted/60">
        Source:{" "}
        <a
          href="https://talentsforever.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground-muted hover:underline"
        >
          talentsforever.com
        </a>
      </p>

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} title="Save build">
        <p className="text-xs text-foreground-muted">
          Saved to this browser only -- not synced across devices, and cleared if you clear site data.
        </p>
        <input
          type="text"
          value={buildName}
          onChange={(e) => setBuildName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirmSave()}
          placeholder="e.g. Arms leveling build"
          autoFocus
          className="mt-3 w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        />
        {saveError && (
          <p className="mt-2 text-xs text-red-400">
            Couldn&apos;t save -- your browser&apos;s storage may be full or unavailable.
          </p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSaveDialogOpen(false)}
            className="rounded border border-border px-3 py-1 text-xs text-foreground-muted hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={!buildName.trim()}
            className="rounded border border-accent/60 px-3 py-1 text-xs text-accent hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </Dialog>

      <Dialog open={myBuildsOpen} onClose={() => setMyBuildsOpen(false)} title="My Builds">
        <p className="text-xs text-foreground-muted">Saved to this browser only -- not synced across devices.</p>
        {savedBuilds.length === 0 ? (
          <p className="mt-3 text-sm text-foreground-muted">No saved builds yet.</p>
        ) : (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {savedBuilds.map((build) => {
              return (
                <li
                  key={build.id}
                  className="flex items-center gap-2 rounded border border-border bg-background/40 p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediumIconUrl(CLASS_ICON[build.classId])}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{build.name}</div>
                    <div className="truncate text-xs text-foreground-muted">
                      {classLabel(build.classId)} · {new Date(build.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLoadBuild(build)}
                    className="shrink-0 rounded border border-accent/60 px-2 py-1 text-xs text-accent hover:bg-surface-hover"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBuild(build.id)}
                    aria-label={`Delete ${build.name}`}
                    className="shrink-0 rounded border border-border px-2 py-1 text-xs text-foreground-muted hover:border-red-400/60 hover:text-red-400"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </main>
  );
}
