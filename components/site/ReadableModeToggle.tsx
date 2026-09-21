"use client";

import { useEffect, useState } from "react";
import { READABLE_MODE_CLASS, setStoredReadableMode } from "@/lib/readable-mode";

// Deliberately plain: a small text link, not a switch/pill/icon button that
// would read as a feature callout -- this is a preference for people who
// need it, not something the site is pushing.
export default function ReadableModeToggle() {
  // Starts false to match the server-rendered markup, then corrected from
  // the actual <html> class in the effect below -- that class was already
  // set synchronously by the blocking init script in the root layout
  // (before hydration) if the preference was on, so this reads the DOM
  // rather than localStorage again to stay in sync with whatever actually
  // ended up applied.
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(document.documentElement.classList.contains(READABLE_MODE_CLASS));
  }, []);

  function toggle() {
    const next = !enabled;
    document.documentElement.classList.toggle(READABLE_MODE_CLASS, next);
    setStoredReadableMode(next);
    setEnabled(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className="text-foreground-muted/70 underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground-muted"
    >
      {enabled ? "Standard mode" : "Readable mode"}
    </button>
  );
}
