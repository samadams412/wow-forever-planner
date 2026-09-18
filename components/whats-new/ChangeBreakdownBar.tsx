import type { DiffSummary } from "@/lib/whats-new";
import { CHANGE_KIND_ORDER, CHANGE_KIND_LABEL, CHANGE_KIND_BAR_CLASS, CHANGE_KIND_DOT_CLASS } from "@/lib/whats-new-style";

// Stacked-segment breakdown of one diff's four change categories. Thin bar,
// rounded ends, a 2px surface gap between segments (per the site's usual
// mark spacing) -- segments with 0 count are simply omitted rather than
// rendered as a zero-width sliver.
export default function ChangeBreakdownBar({
  totals,
  otherSubstantiveChanges = 0,
}: {
  totals: DiffSummary["totals"];
  otherSubstantiveChanges?: number;
}) {
  if (totals.total === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No talents added, removed, or moved, and no prerequisite changes in this sync.
        {otherSubstantiveChanges > 0 &&
          ` (${otherSubstantiveChanges} talent${otherSubstantiveChanges === 1 ? "" : "s"} had other data updates -- wording/tuning/icon changes, not a gameplay change.)`}
      </p>
    );
  }

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-background/60">
        {CHANGE_KIND_ORDER.map((kind) => {
          const count = totals[kind];
          if (count === 0) return null;
          const pct = (count / totals.total) * 100;
          return (
            <div
              key={kind}
              className={`h-full ${CHANGE_KIND_BAR_CLASS[kind]}`}
              style={{ width: `${pct}%`, marginRight: 2 }}
              title={`${CHANGE_KIND_LABEL[kind]}: ${count}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-muted">
        <span className="font-semibold text-foreground">{totals.total} total talent changes</span>
        {CHANGE_KIND_ORDER.map((kind) => (
          <span key={kind} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${CHANGE_KIND_DOT_CLASS[kind]}`} />
            {CHANGE_KIND_LABEL[kind]} ({totals[kind]})
          </span>
        ))}
      </div>
      {otherSubstantiveChanges > 0 && (
        <p className="mt-1.5 text-[11px] text-foreground-muted/70">
          Plus {otherSubstantiveChanges} other talent data update{otherSubstantiveChanges === 1 ? "" : "s"} this
          sync (wording/tuning/icon changes, not counted above).
        </p>
      )}
    </div>
  );
}
