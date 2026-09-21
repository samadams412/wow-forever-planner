"use client";

import { useEffect, useState } from "react";
import { LIGHT_MODE_CLASS, setStoredLightMode } from "@/lib/mode-toggle";

// Deliberately plain: a small text link, not a switch/pill/icon button that
// would read as a feature callout -- this is a preference for people who
// need it, not something the site is pushing. Label shows the mode a click
// would switch TO ("Light mode" while Themed, "Themed mode" while Light).
export default function ModeToggle() {
  // Starts false to match the server-rendered markup, then corrected from
  // the actual <html> class in the effect below -- that class was already
  // set synchronously by the blocking init script in the root layout
  // (before hydration) if the preference was on, so this reads the DOM
  // rather than localStorage again to stay in sync with whatever actually
  // ended up applied.
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLightMode(document.documentElement.classList.contains(LIGHT_MODE_CLASS));
  }, []);

  function toggle() {
    const next = !lightMode;
    document.documentElement.classList.toggle(LIGHT_MODE_CLASS, next);
    setStoredLightMode(next);
    setLightMode(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={lightMode}
      className="text-foreground-muted/70 underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground-muted"
    >
      {lightMode ? "Themed mode" : "Light mode"}
    </button>
  );
}
