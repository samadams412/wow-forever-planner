import type { Race, Racial } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import ConfidenceBadge from "./ConfidenceBadge";

export default function RacialsPanel({ race, racials }: { race: Race; racials: Racial[] }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        {race.name} racials
      </h2>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {racials.map((r) => (
          <div key={r.name} className="rounded border border-border bg-surface px-2 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                {r.name} <span className="text-[10px] uppercase text-foreground-muted">{r.type}</span>
              </span>
              <ConfidenceBadge confidence={r.confidence} />
            </div>
            <p className="text-xs text-foreground-muted">{formatTooltipText(r.description)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
