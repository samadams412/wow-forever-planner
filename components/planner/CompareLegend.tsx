import type { TalentStatus } from "@/lib/wow-data";

const STATUSES: TalentStatus[] = ["new", "changed", "moved", "unchanged"];
const LEGEND_LABEL: Record<TalentStatus, string> = {
  new: "New in Forever",
  changed: "Changed (text, ranks or position)",
  moved: "Moved, same effect",
  unchanged: "Dimmed = unchanged from Classic",
};
const LEGEND_DOT: Record<TalentStatus, string> = {
  new: "bg-emerald-400",
  changed: "bg-amber-300",
  moved: "bg-sky-400",
  unchanged: "bg-foreground-muted/50",
};

export default function CompareLegend() {
  return (
    <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-xs text-foreground-muted">
      {STATUSES.map((status) => (
        <span key={status} className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${LEGEND_DOT[status]}`} />
          {LEGEND_LABEL[status]}
        </span>
      ))}
    </div>
  );
}
