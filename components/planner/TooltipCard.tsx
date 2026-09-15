import type { CSSProperties, ReactNode } from "react";
import type { TalentStatus } from "@/lib/wow-data";
import { STATUS_LABEL, STATUS_TEXT_CLASS } from "@/lib/talent-status";

// Classic WoW tooltip color language: dark navy card, thin gold border,
// bold white name, grey rank line, gold-yellow type label, green effect
// text, red requirement text.

export function TooltipCard({
  style,
  children,
  // Talent tooltips stay pointer-events-none so a tap on a mobile tooltip
  // passes straight through to the talent grid underneath it. Spellbook
  // tooltips opt into `interactive` instead, since a tooltip taller than
  // the book needs to be hoverable and scrollable to be usable at all.
  interactive,
  onMouseEnter,
  onMouseLeave,
}: {
  style: CSSProperties;
  children: ReactNode;
  interactive?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      className={`fixed z-50 rounded border border-[#c8aa6e]/80 bg-[#0a0f1a]/95 p-3 text-left shadow-lg ${
        interactive ? "pointer-events-auto" : "pointer-events-none"
      }`}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

export function TooltipName({ children }: { children: ReactNode }) {
  return <div className="text-base font-bold text-white">{children}</div>;
}

export function TooltipRank({ children }: { children: ReactNode }) {
  return <div className="text-xs text-gray-400">{children}</div>;
}

export function TooltipType({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[#ffd100]">{children}</div>
  );
}

export function TooltipDescription({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <p className={`mt-1.5 max-w-[60ch] text-sm leading-relaxed ${muted ? "text-[#1eff00]/55" : "text-[#1eff00]"}`}>
      {children}
    </p>
  );
}

export function TooltipRequirement({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-[#ff4040]">{children}</p>;
}

// A cost/range/cast-time/cooldown row, e.g. ["15 Rage", "Melee Range"] --
// mirrors the two-column stat lines under a spell's name in-game.
export function TooltipStatLine({ left, right }: { left: string; right: string }) {
  return (
    <div className="mt-0.5 flex justify-between gap-3 text-xs text-gray-300">
      <span>{left}</span>
      {right && <span>{right}</span>}
    </div>
  );
}

export function TooltipSourceNote({ confirmed, source }: { confirmed: boolean; source?: string }) {
  return confirmed ? (
    <p className="mt-1.5 text-[10px] font-semibold text-[#1eff00]">
      Read from demo footage{source ? ` — ${source}` : ""}
    </p>
  ) : (
    <p className="mt-1.5 text-[10px] text-gray-500">Classic-era text — Forever may differ</p>
  );
}

export function TooltipClassicNote({
  status,
  position,
  children,
}: {
  status: TalentStatus;
  position?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-2 border-t border-[#c8aa6e]/30 pt-1.5">
      <div className={`text-xs font-semibold uppercase tracking-wide ${STATUS_TEXT_CLASS[status]}`}>
        {STATUS_LABEL[status]} since Classic
        {position ? ` — was ${position}` : ""}
      </div>
      {children && <p className="mt-1 max-w-[60ch] text-xs leading-relaxed text-gray-400">{children}</p>}
    </div>
  );
}
