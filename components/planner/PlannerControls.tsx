import { MIN_TALENT_LEVEL, MAX_LEVEL } from "@/lib/talent-rules";

// Consolidates the level picker and the build-action row (Compare to
// Classic / Reset / Copy share link / Save build / My Builds) into one
// left-aligned block under the class tiles, instead of each sitting on
// its own separate, right-aligned row above the class hero banner.
export default function PlannerControls({
  level,
  onLevelChange,
  totalSpent,
  maxPoints,
  compareMode,
  onToggleCompare,
  onReset,
  onCopyLink,
  copied,
  onOpenSaveDialog,
  onOpenMyBuilds,
  savedBuildsCount,
}: {
  level: number;
  onLevelChange: (level: number) => void;
  totalSpent: number;
  maxPoints: number;
  compareMode: boolean;
  onToggleCompare: () => void;
  onReset: () => void;
  onCopyLink: () => void;
  copied: boolean;
  onOpenSaveDialog: () => void;
  onOpenMyBuilds: () => void;
  savedBuildsCount: number;
}) {
  const hasPoints = totalSpent > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs text-foreground-muted">
        Level
        <select
          value={level}
          onChange={(e) => onLevelChange(Number(e.target.value))}
          className="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-foreground focus:border-accent focus:outline-none"
        >
          {Array.from({ length: MAX_LEVEL - MIN_TALENT_LEVEL + 1 }, (_, i) => MAX_LEVEL - i).map((lvl) => (
            <option key={lvl} value={lvl}>
              Level {lvl}
            </option>
          ))}
        </select>
      </label>
      <span className="text-xs text-foreground-muted">
        {totalSpent} / {maxPoints} pts
      </span>
      <button
        type="button"
        onClick={onToggleCompare}
        aria-pressed={compareMode}
        className={`rounded border px-2 py-0.5 text-xs transition-colors ${
          compareMode
            ? "border-sky-400/70 bg-sky-400/10 text-sky-300"
            : "border-border text-foreground-muted hover:border-accent/60 hover:text-foreground"
        }`}
      >
        Compare to Classic
      </button>
      <button
        type="button"
        onClick={onReset}
        className="rounded border border-border px-2 py-0.5 text-xs text-foreground-muted hover:border-accent/60 hover:text-foreground"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={onCopyLink}
        disabled={!hasPoints}
        title={!hasPoints ? "Spend at least one talent point to get a share link" : undefined}
        className="rounded border border-accent/60 px-2 py-0.5 text-xs text-accent hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {copied ? "Copied!" : "Copy share link"}
      </button>
      <button
        type="button"
        onClick={onOpenSaveDialog}
        disabled={!hasPoints}
        title={!hasPoints ? "Spend at least one talent point to save a build" : undefined}
        className="rounded border border-border px-2 py-0.5 text-xs text-foreground-muted hover:border-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border"
      >
        Save build
      </button>
      <button
        type="button"
        onClick={onOpenMyBuilds}
        className="rounded border border-border px-2 py-0.5 text-xs text-foreground-muted hover:border-accent/60 hover:text-foreground"
      >
        My Builds{savedBuildsCount > 0 ? ` (${savedBuildsCount})` : ""}
      </button>
    </div>
  );
}
