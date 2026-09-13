import type { Race } from "@/lib/wow-data";
import { getRacialsForRace } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";

function classLabel(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

function RaceBlock({ race }: { race: Race }) {
  const racials = getRacialsForRace(race.id);
  return (
    <div className="rounded border border-border bg-surface p-2">
      <div className="font-medium text-foreground">{race.name}</div>
      <div className="text-[11px] text-foreground-muted">
        {race.allowedClasses.map(classLabel).join(", ")}
      </div>
      <ul className="mt-1.5 space-y-1">
        {racials.map((r) => (
          <li key={r.name} className="text-xs text-foreground-muted">
            <span className="font-semibold text-foreground">{r.name}:</span>{" "}
            {formatTooltipText(r.description)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RaceReferenceTable({ races }: { races: Race[] }) {
  const horde = races.filter((r) => r.faction === "Horde");
  const alliance = races.filter((r) => r.faction === "Alliance");

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Race reference
      </h2>
      <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted/70">
            Horde
          </h3>
          {horde.map((r) => (
            <RaceBlock key={r.id} race={r} />
          ))}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted/70">
            Alliance
          </h3>
          {alliance.map((r) => (
            <RaceBlock key={r.id} race={r} />
          ))}
        </div>
      </div>
    </section>
  );
}
