"use client";

import { useRef, type ReactNode } from "react";

// "?" help for the raid comp planner. A native <dialog> rather than the house
// Dialog because Dialog unmounts when closed: the how-to text is the page's
// SEO copy and must stay in the prerendered HTML, so it's always in the DOM
// and only shown (top layer, focus trap, Escape) by showModal().
export default function HowToUse({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label="How to use the raid comp planner"
        aria-haspopup="dialog"
        title="How to use"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold text-foreground-muted hover:border-accent/60 hover:text-foreground"
      >
        ?
      </button>
      <dialog
        ref={ref}
        aria-labelledby="raid-comp-how-to"
        // A click on the backdrop lands on the <dialog> itself, not its contents.
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-accent/40 bg-surface p-0 text-foreground shadow-lg backdrop:bg-black/60"
      >
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="raid-comp-how-to" className="font-heading text-base font-semibold text-accent">
              How to use the raid comp planner
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Close"
              className="rounded text-foreground-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-foreground-muted">{children}</div>
        </div>
      </dialog>
    </>
  );
}
