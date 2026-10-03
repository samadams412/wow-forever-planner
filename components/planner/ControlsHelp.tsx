"use client";

import { useEffect, type ReactNode } from "react";

// Each row pairs the mouse input (left) with its keyboard equivalent (right
// keys) where one exists. Kept as data so the list is easy to keep accurate
// when a control changes.
const ROWS: { keys: string[]; action: ReactNode }[] = [
  { keys: ["Click", "Enter"], action: "Add a point (Enter on the focused talent)" },
  { keys: ["Right-click", "Shift + click", "Backspace"], action: "Take a point back" },
  { keys: ["Hold click"], action: "Fill an unlocked talent. Stops at max rank or when points run out. Does nothing on a locked talent" },
  { keys: ["Arrows"], action: "Move between talents in the same tree" },
  { keys: ["Ctrl+Z", "Ctrl+Y"], action: "Undo / redo point changes" },
  { keys: ["Hold Ctrl"], action: "While hovering a talent, show its linked spell details" },
];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}

// Non-blocking panel, not a backdrop dialog: it sits in the bottom-right
// corner so the talent trees stay visible and clickable while it's open.
export default function ControlsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Planner controls"
      className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-accent/40 bg-surface p-4 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3 border-b border-accent/30 pb-2">
        <h2 className="font-heading text-sm font-semibold tracking-wide text-accent">Controls</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close controls"
          className="text-foreground-muted hover:text-foreground"
        >
          ✕
        </button>
      </div>
      <ul className="mt-3 space-y-2.5">
        {ROWS.map((row, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex w-36 shrink-0 flex-wrap gap-1">
              {row.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
            <span className="text-xs leading-snug text-foreground-muted">{row.action}</span>
          </li>
        ))}
        <li className="flex items-start gap-3">
          <span className="flex w-36 shrink-0 flex-wrap gap-1">
            <Kbd>?</Kbd>
          </span>
          <span className="text-xs leading-snug text-foreground-muted">This list</span>
        </li>
      </ul>
    </div>
  );
}
