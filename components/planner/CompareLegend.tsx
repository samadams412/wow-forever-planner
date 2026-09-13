import type { TalentStatus } from "@/lib/wow-data";
import { STATUS_LABEL, STATUS_DOT_CLASS } from "@/lib/talent-status";

const STATUSES: TalentStatus[] = ["new", "changed", "moved", "unchanged"];

export default function CompareLegend() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-foreground-muted">
      {STATUSES.map((status) => (
        <span key={status} className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[status]}`} />
          {STATUS_LABEL[status]}
        </span>
      ))}
    </div>
  );
}
