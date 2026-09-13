import { createPortal } from "react-dom";
import type { Race } from "@/lib/wow-data";
import { mediumIconUrl, getRacialsForRace } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { TooltipCard, TooltipType, TooltipDescription } from "./TooltipCard";

const POPOVER_WIDTH = 280;

function RaceRow({
  race,
  selected,
  onSelect,
}: {
  race: Race;
  selected: boolean;
  onSelect: () => void;
}) {
  const racials = getRacialsForRace(race.id);
  const { ref, pos, show, hide } = useHoverTooltip<HTMLButtonElement>(
    POPOVER_WIDTH,
    "right",
    racials.length * 92 + 56
  );

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={onSelect}
        className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors ${
          selected
            ? "border-accent bg-surface-hover"
            : "border-border bg-surface hover:border-accent/60 hover:bg-surface-hover"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(race.icon)} alt="" className="h-6 w-6 shrink-0 rounded-sm" />
        <span className="text-xs leading-tight text-foreground">{race.name}</span>
      </button>

      {pos &&
        createPortal(
          <TooltipCard style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}>
            <div className="text-sm font-bold text-white">{race.name} racials</div>
            <div className="mt-2 max-h-[70vh] space-y-2.5 overflow-y-auto">
              {racials.map((r) => (
                <div key={r.name}>
                  <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediumIconUrl(r.icon)} alt="" className="h-5 w-5 rounded-sm" />
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                  </div>
                  <TooltipType>{r.type}</TooltipType>
                  <TooltipDescription>{formatTooltipText(r.description)}</TooltipDescription>
                </div>
              ))}
            </div>
          </TooltipCard>,
          document.body
        )}
    </>
  );
}

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
    <section className="flex w-full shrink-0 flex-col gap-1 sm:w-40">
      <h2 className="font-heading text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        Eligible Races
      </h2>
      <div className="flex flex-col gap-1">
        {races.map((race) => (
          <RaceRow
            key={race.id}
            race={race}
            selected={race.id === selectedRaceId}
            onSelect={() => onSelect(race.id)}
          />
        ))}
      </div>
    </section>
  );
}
