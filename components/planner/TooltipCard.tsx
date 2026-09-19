import type { CSSProperties, ReactNode } from "react";
import type { TalentStatus } from "@/lib/wow-data";
import { STATUS_LABEL, STATUS_TEXT_CLASS } from "@/lib/talent-status";
import { diffWords } from "@/lib/text-diff";
import { iconUrl } from "@/lib/wow-data";
import type { DescriptionSegment, LinkedSpell } from "@/lib/talent-spell-links";

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
  return <div className="text-base font-bold tracking-wide text-white">{children}</div>;
}

export function TooltipRank({ children }: { children: ReactNode }) {
  return <div className="text-xs text-gray-400">{children}</div>;
}

// A spell's "Learned at level N" line -- sits right after the cost/range
// stat lines, same position talentsforever.com's own spell tooltip uses.
// Spellbook-only: talents don't carry a level requirement in our data model
// the way trainer spells do (SpellTooltip.levelReq, ~30% of spells).
export function TooltipLevelReq({ children }: { children: ReactNode }) {
  return <div className="mt-0.5 text-[11px] text-gray-500">{children}</div>;
}

export function TooltipType({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-[#ffd100]">{children}</div>
  );
}

export function TooltipDescription({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-[#1eff00]">{children}</p>;
}

// Same description styling as TooltipDescription, but for text already
// split into segments (splitTextWithLinks) -- a segment naming another
// spell/talent this one modifies renders as a white, underlined inline
// highlight within the green effect text, matching talentsforever.com's
// treatment of the same information (see the Ctrl-hold study in this
// project's session notes) without copying their cream/white base text
// color, which would clash with this site's classic-tooltip green.
export function TooltipDescriptionWithLinks({ segments }: { segments: DescriptionSegment[] }) {
  return (
    <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-[#1eff00]">
      {segments.map((seg, i) =>
        seg.linked ? (
          <span key={i} className="font-semibold text-white underline decoration-2 underline-offset-2">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

// The "Hold Ctrl to explain N names" prompt line -- shown under a
// description that has 1+ linked spells, only on desktop (no Ctrl key on
// touch). Not rendered at all while Ctrl is already held, since the cards
// it's promising are showing right below it at that point.
export function TooltipCtrlPrompt({ count }: { count: number }) {
  return (
    <p className="mt-1 text-[11px] text-gray-500">
      Hold Ctrl to explain {count} name{count === 1 ? "" : "s"}
    </p>
  );
}

// One expanded linked-spell/talent card, shown while Ctrl is held. Icon +
// name + source line reuse the tooltip's existing name/rank color language;
// the description is a muted gray rather than this tooltip's own bright
// green effect text, so the hierarchy stays clear: green is always "what
// this talent itself does," gray is "background on a spell it mentions."
export function TooltipLinkedSpell({ entry }: { entry: LinkedSpell }) {
  return (
    <div className="mt-1.5 flex gap-2 border-t border-[#c8aa6e]/20 pt-1.5">
      {entry.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl(entry.icon)} alt="" className="h-7 w-7 shrink-0 rounded-sm" />
      )}
      <div className="min-w-0">
        <div className="text-xs leading-tight">
          <span className="font-semibold text-white">{entry.name}</span>{" "}
          <span className="text-[#c8aa6e]">{entry.source}</span>
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{entry.description}</p>
      </div>
    </div>
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

// Full Classic-vs-Forever text diff for a spellbook tooltip -- distinct
// from TooltipClassicNote (the talent tree's flatter "status + note" line)
// because the reference design for this one calls for an actual word-level
// diff: the Classic line strikes through words only Classic has, the
// Forever line highlights words only Forever has, shared wording stays
// plain in both. Only rendered when classicStatus is "changed" (nothing to
// diff for "same"/"new").
export function TooltipClassicDiff({ classicText, foreverText }: { classicText: string; foreverText: string }) {
  const tokens = diffWords(classicText, foreverText);
  return (
    <div className="mt-2 border-t border-[#c8aa6e]/30 pt-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#c8aa6e]">Changed from Classic</div>
      <p className="mt-1 max-w-[60ch] text-[11px] leading-relaxed">
        <span className="mr-1 font-semibold text-[#ff6b6b]">Classic:</span>
        {tokens
          .filter((t) => t.op !== "add")
          .map((t, i) =>
            t.op === "remove" ? (
              <del key={i} className="text-[#ff6b6b]/80 decoration-[#ff6b6b]/80">
                {t.text}
              </del>
            ) : (
              <span key={i} className="text-gray-400">
                {t.text}
              </span>
            )
          )}
      </p>
      <p className="mt-1 max-w-[60ch] text-[11px] leading-relaxed">
        <span className="mr-1 font-semibold text-[#ffd100]">Forever:</span>
        {tokens
          .filter((t) => t.op !== "remove")
          .map((t, i) =>
            t.op === "add" ? (
              <mark key={i} className="rounded-sm bg-[#ffd100]/25 text-[#ffd100]">
                {t.text}
              </mark>
            ) : (
              <span key={i} className="text-gray-400">
                {t.text}
              </span>
            )
          )}
      </p>
    </div>
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
