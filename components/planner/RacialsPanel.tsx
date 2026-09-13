import type { Race, Racial } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import ConfidenceBadge from "./ConfidenceBadge";

export default function RacialsPanel({ race, racials }: { race: Race; racials: Racial[] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        {race.name} racials
      </h2>
      {race.notes && (
        <p className="mt-1 text-xs text-foreground-muted/80">{race.notes}</p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {racials.map((r) => (
          <div key={r.name} className="rounded-lg border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{r.name}</span>
              <ConfidenceBadge confidence={r.confidence} />
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wide text-foreground-muted">
              {r.type}
            </div>
            <p className="mt-1 text-sm text-foreground-muted">
              {formatTooltipText(r.description)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
