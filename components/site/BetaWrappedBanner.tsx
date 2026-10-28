"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "forevercraft:beta-wrapped-banner-dismissed";

// Release-notes bar for /beta-wrapped, homepage only. Absolutely positioned
// over the top of the hero, so it appearing after the localStorage read (it
// can't render on the server) never shifts the layout.
export default function BetaWrappedBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Storage blocked: show it, it just won't stay dismissed.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only storage after mount
    if (!dismissed) setShow(true);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Same as above.
    }
  };

  return (
    <div className="absolute inset-x-0 top-0 z-10 border-b border-accent/40 bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm">
        <span className="hidden font-heading text-xs font-bold tracking-wide text-accent sm:inline">New</span>
        <Link href="/beta-wrapped" className="min-w-0 flex-1 text-foreground hover:text-accent">
          <span className="font-semibold text-accent">Beta Wrapped:</span> six weeks of beta changes, one tap at a time →
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 p-1 text-foreground-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
