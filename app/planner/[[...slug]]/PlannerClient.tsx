"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { getClassTalentData, classLabel, mediumIconUrl, CLASS_ICON, type TalentTree } from "@/lib/wow-data";
import { encodeBuild, decodeBuild } from "@/lib/build-code";
import { buildAiTextSummary } from "@/lib/build-text-export";
import { totalPointsSpent, pointsAtLevel, MAX_LEVEL } from "@/lib/talent-rules";
import { buildReducer, isTextEditingTarget, type BuildState } from "@/lib/build-history";
import { getSavedBuilds, saveBuild, deleteSavedBuild, type SavedBuild } from "@/lib/saved-builds";
import ClassPicker from "@/components/planner/ClassPicker";
import PlannerControls from "@/components/planner/PlannerControls";
import ClassHero from "@/components/planner/ClassHero";
import TalentTreeGrid from "@/components/planner/TalentTreeGrid";
import TalentLegend from "@/components/planner/TalentLegend";
import CompareLegend from "@/components/planner/CompareLegend";
import Dialog from "@/components/site/Dialog";
import Collapsible from "@/components/site/Collapsible";
import SpellbookBook from "@/components/reference/SpellbookBook";
import ClassAbilitiesSection from "@/components/reference/ClassAbilitiesSection";
import { spellbooks } from "@/lib/spellbooks";

const DEFAULT_CLASS_ID = "warrior";

// Race never affects talent calculations, so it isn't app state and isn't
// part of the URL (see RaceReferenceTable below for the reference-only
// race info that still lives on this page). The build code sits directly
// after the class: /planner/<class>/<build>.
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
  // ranks plus its own undo/redo stacks, so every point change and its
  // history entry land in one state transition (see lib/build-history.ts).
  const [buildState, dispatch] = useReducer(buildReducer, null, (): BuildState => {
    const classData = getClassTalentData(initialClassId ?? DEFAULT_CLASS_ID);
    const ranks = classData && initialBuildCode ? decodeBuild(classData, initialBuildCode) : {};
    return { ranks, past: [], future: [] };
  });
  const ranks = buildState.ranks;
  // Not part of the URL/build code (talentsforever.com's own level control
  // works the same way -- it's a local planning aid, not part of the shared
  // build). Defaults to the level cap so a fresh/shared build always starts
  // with every point available.
  const [level, setLevel] = useState<number>(MAX_LEVEL);
  const [copied, setCopied] = useState(false);
  const [copiedAiText, setCopiedAiText] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [buildName, setBuildName] = useState("");
  const [myBuildsOpen, setMyBuildsOpen] = useState(false);
  const [savedBuilds, setSavedBuilds] = useState<SavedBuild[]>([]);
  const [saveError, setSaveError] = useState(false);
  // Which talent (if any) a mobile tap most recently landed on -- shows its
  // minus badge and turns a second tap into "remove" instead of "add", and
  // drives the inline tooltip's position/content.
  const [tappedTalentId, setTappedTalentId] = useState<string | null>(null);
  // Long-press-to-read: temporarily overrides tappedTalentId for the inline
  // tooltip while held, without touching the actual tap/spend state.
  const [peekTalentId, setPeekTalentId] = useState<string | null>(null);
  // The talent last focused in any tree. Keyboard input (Enter/Backspace,
  // arrows) acts on the focused talent, and this is what draws its outline.
  const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null);

  useEffect(() => {
    // The inline talent tooltip stays open through taps/point-spending and
    // is only dismissed by scrolling -- the page itself scrolls here (the
    // tree grids don't have their own overflow container), so this listens
    // on the window rather than a specific ref.
    function handleScroll() {
      setTappedTalentId(null);
      setPeekTalentId(null);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Reads localStorage, which isn't available during SSR -- state starts
    // empty (matching the server-rendered HTML) and is synced once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedBuilds(getSavedBuilds());
  }, []);

  const classData = getClassTalentData(classId);
  const maxPoints = pointsAtLevel(level);

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

  // Ctrl+Z / Ctrl+Y (Cmd on Mac) for point history. Skipped while focus is in
  // a text field, so the browser's own undo still works there.
  useEffect(() => {
    function handleHistoryKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (isTextEditingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      } else if (key === "y" || (key === "z" && e.shiftKey)) {
        e.preventDefault();
        dispatch({ type: "redo" });
      }
    }
    window.addEventListener("keydown", handleHistoryKey);
    return () => window.removeEventListener("keydown", handleHistoryKey);
  }, []);

  const handleSelectClass = useCallback((id: string) => {
    setClassId(id);
    dispatch({ type: "load", ranks: {} });
    setTappedTalentId(null);
    setPeekTalentId(null);
  }, []);

  const addPoint = useCallback(
    (talentId: string) => {
      if (!classData) return;
      const tree = classData.trees.find((t) => t.talents.some((tal) => tal.id === talentId));
      const talent = tree?.talents.find((tal) => tal.id === talentId);
      if (!tree || !talent) return;
      // Validation runs inside the reducer against the latest state, not a
      // closure over `ranks`, so rapid repeated taps (or hold-fill ticks)
      // can't overshoot the max-rank/points-left cap.
      dispatch({ type: "add", trees: classData.trees, tree, talent, maxPoints });
    },
    [classData, maxPoints]
  );

  const removePoint = useCallback(
    (talentId: string) => {
      if (!classData) return;
      const tree = classData.trees.find((t) => t.talents.some((tal) => tal.id === talentId));
      const talent = tree?.talents.find((tal) => tal.id === talentId);
      if (!tree || !talent) return;
      dispatch({ type: "remove", tree, talent });
    },
    [classData]
  );

  const resetBuild = useCallback(() => {
    dispatch({ type: "reset" });
    setTappedTalentId(null);
    setPeekTalentId(null);
  }, []);

  // Distinct from resetBuild: clears only the points spent within one tree,
  // leaving the other trees (and their tapped/peeked state) untouched.
  const resetTree = useCallback((tree: TalentTree) => {
    const treeTalentIds = new Set(tree.talents.map((t) => t.id));
    dispatch({ type: "resetTree", tree });
    setTappedTalentId((prev) => (prev && treeTalentIds.has(prev) ? null : prev));
    setPeekTalentId((prev) => (prev && treeTalentIds.has(prev) ? null : prev));
  }, []);

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

  const handleCopyAiText = useCallback(async () => {
    if (!classData) return;
    try {
      const text = buildAiTextSummary(classData, ranks, level, window.location.href);
      await navigator.clipboard.writeText(text);
      setCopiedAiText(true);
      setTimeout(() => setCopiedAiText(false), 1500);
    } catch {
      // clipboard API unavailable; nothing to fall back to without a visible text field
    }
  }, [classData, ranks, level]);

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
      dispatch({
        type: "load",
        ranks: buildClassData && build.buildCode ? decodeBuild(buildClassData, build.buildCode) : {},
      });
      setTappedTalentId(null);
      setPeekTalentId(null);
      setMyBuildsOpen(false);
    },
    []
  );

  const handleDeleteBuild = useCallback((id: string) => {
    deleteSavedBuild(id);
    setSavedBuilds(getSavedBuilds());
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-1 sm:px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h1 className="font-heading text-lg font-semibold tracking-wide text-accent">Planner</h1>
          <p className="text-xs text-foreground-muted">
            Pick a class, plan your talent build. 
          </p>
        </div>
      </div>

      <div className="mt-1 space-y-1.5">
        <ClassPicker selectedClassId={classId} onSelect={handleSelectClass} />

        <PlannerControls
          level={level}
          onLevelChange={setLevel}
          totalSpent={totalSpent}
          maxPoints={maxPoints}
          compareMode={compareMode}
          onToggleCompare={() => setCompareMode((v) => !v)}
          onReset={resetBuild}
          onCopyLink={handleCopyLink}
          copied={copied}
          onCopyAiText={handleCopyAiText}
          copiedAiText={copiedAiText}
          onOpenSaveDialog={handleOpenSaveDialog}
          onOpenMyBuilds={() => setMyBuildsOpen(true)}
          savedBuildsCount={savedBuilds.length}
        />

        {compareMode && (
          <div className="compare-legend-enter flex flex-col gap-1 rounded border border-[#9c7738]/45 bg-black/20 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
            <CompareLegend />
            <p className="text-[11px] text-foreground-muted">Classic text appears in each tooltip; removed Classic talents are listed under each tree.</p>
          </div>
        )}

        {classData && (
          <ClassHero classId={classData.class} trees={classData.trees} ranks={ranks} maxPoints={maxPoints} />
        )}

        {classData && (
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {classData.trees.map((tree) => (
              <TalentTreeGrid
                key={tree.name}
                classId={classData.class}
                tree={tree}
                ranks={ranks}
                totalSpent={totalSpent}
                maxPoints={maxPoints}
                onAdd={addPoint}
                onRemove={removePoint}
                compareMode={compareMode}
                tappedTalentId={tappedTalentId}
                onTap={setTappedTalentId}
                peekTalentId={peekTalentId}
                onPeek={setPeekTalentId}
                onResetTree={() => resetTree(tree)}
                selectedTalentId={selectedTalentId}
                onSelectTalent={setSelectedTalentId}
              />
            ))}
          </div>
        )}

        
      </div>

      {classData && (
        <div className="mt-8">
          <Collapsible
            title={`${classLabel(classData.class)} Spellbook`}
            // subtitle={`Demo race: ${spellbooks.classes[classData.class].demoRace}`}
            icon={
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediumIconUrl(CLASS_ICON[classData.class])} alt="" className="h-8 w-8 rounded" />
            }
          >
            {/* Keyed on class so switching classes resets the book's own
                tab/page state instead of carrying over a tab index that may
                not exist on the new class's spec tabs. */}
            <SpellbookBook
              key={classData.class}
              classId={classData.class}
              book={spellbooks.classes[classData.class]}
              compareMode={compareMode}
              onCompareModeChange={() => setCompareMode((value) => !value)}
            />
            <ClassAbilitiesSection classId={classData.class} />
          </Collapsible>
        </div>
      )}

      {/* <div className="mt-8">
        <RaceReferenceTable races={races} />
      </div> */}

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
          <ul className="mt-3 max-h-80 cursor-default space-y-2 overflow-y-auto">
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
