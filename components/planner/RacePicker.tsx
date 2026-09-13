import type { Race } from "@/lib/wow-data";

export default function RacePicker({
  races,
  selectedRaceId,
  onSelect,
}: {
  races: Race[];
  selectedRaceId: string | null;
  onSelect: (raceId: string) => void;
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        1. Choose your race
      </h2>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {races.map((race) => {
          const selected = race.id === selectedRaceId;
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => onSelect(race.id)}
              className={`rounded border px-2 py-1 text-sm transition-colors ${
                selected
                  ? "border-accent bg-surface-hover"
                  : "border-border bg-surface hover:border-accent/60 hover:bg-surface-hover"
              }`}
            >
              <span className="font-medium text-foreground">{race.name}</span>{" "}
              <span className="text-xs text-foreground-muted">{race.faction}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
