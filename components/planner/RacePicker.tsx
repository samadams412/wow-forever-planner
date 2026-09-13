import type { Race } from "@/lib/wow-data";
import { mediumIconUrl } from "@/lib/wow-data";

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
      <div className="mt-1 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {races.map((race) => {
          const selected = race.id === selectedRaceId;
          return (
            <button
              key={race.id}
              type="button"
              onClick={() => onSelect(race.id)}
              className={`flex w-full flex-col items-center gap-0.5 rounded border p-1 transition-colors ${
                selected
                  ? "border-accent bg-surface-hover"
                  : "border-border bg-surface hover:border-accent/60 hover:bg-surface-hover"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediumIconUrl(race.icon)} alt="" className="h-7 w-7 rounded-sm" />
              <span className="text-center text-[10px] leading-tight text-foreground">
                {race.name}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
