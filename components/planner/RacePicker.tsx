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
      <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        1. Choose your race
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {races.map((race) => {
          const selected = race.id === selectedRaceId;
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => onSelect(race.id)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                selected
                  ? "border-accent bg-surface-hover"
                  : "border-border bg-surface hover:border-accent/60 hover:bg-surface-hover"
              }`}
            >
              <div className="font-medium text-foreground">{race.name}</div>
              <div className="text-xs text-foreground-muted">{race.faction}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
