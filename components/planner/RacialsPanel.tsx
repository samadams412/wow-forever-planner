import { createPortal } from "react-dom";
import type { Race, Racial } from "@/lib/wow-data";
import { mediumIconUrl } from "@/lib/wow-data";
import { formatTooltipText } from "@/lib/tooltip";
import { useHoverTooltip } from "@/lib/use-hover-tooltip";
import { TooltipCard, TooltipName, TooltipType, TooltipDescription } from "./TooltipCard";

const TOOLTIP_WIDTH = 260;

function RacialTile({ racial }: { racial: Racial }) {
  const { ref, pos, show, hide } = useHoverTooltip<HTMLButtonElement>(TOOLTIP_WIDTH);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="flex w-full flex-col items-center gap-0.5 rounded border border-border bg-surface p-1 hover:border-accent/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(racial.icon)} alt="" className="h-7 w-7 rounded-sm" />
        <span className="text-center text-[10px] leading-tight text-foreground">{racial.name}</span>
      </button>

      {pos &&
        createPortal(
          <TooltipCard style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}>
            <TooltipName>{racial.name}</TooltipName>
            <TooltipType>{racial.type}</TooltipType>
            <TooltipDescription>{formatTooltipText(racial.description)}</TooltipDescription>
          </TooltipCard>,
          document.body
        )}
    </>
  );
}

export default function RacialsPanel({ race, racials }: { race: Race; racials: Racial[] }) {
  return (
    <section>
      <h2 className="font-heading text-xs font-semibold uppercase tracking-wide text-foreground-muted">
        {race.name} racials
      </h2>
      <div className="mt-1 grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {racials.map((r) => (
          <RacialTile key={r.name} racial={r} />
        ))}
      </div>
    </section>
  );
}
