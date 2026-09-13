import type { Race, Racial } from "@/lib/wow-data";
import { mediumIconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";

export default function RacialsPanel({ race, racials }: { race: Race; racials: Racial[] }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        {race.name} racials
      </h2>
      <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {racials.map((r) => (
          <div key={r.name} className="flex gap-2 rounded border border-border bg-surface px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediumIconUrl(r.icon)} alt="" className="h-8 w-8 shrink-0 rounded-sm" />
            <div>
              <span className="text-sm font-medium text-foreground">
                {r.name} <span className="text-[10px] uppercase text-foreground-muted">{r.type}</span>
              </span>
              <p className="text-xs text-foreground-muted">{formatTooltipText(r.description)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
