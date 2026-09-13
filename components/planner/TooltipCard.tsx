import type { CSSProperties, ReactNode } from "react";

// Classic WoW tooltip color language: dark navy card, thin gold border,
// bold white name, grey rank line, gold-yellow type label, green effect
// text, red requirement text.

export function TooltipCard({ style, children }: { style: CSSProperties; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded border border-[#c8aa6e]/80 bg-[#0a0f1a]/95 p-3 text-left shadow-lg"
      style={style}
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
