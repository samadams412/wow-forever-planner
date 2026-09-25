"use client";

import { useSyncExternalStore, type ReactNode } from "react";

type TabId = "game" | "site";

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readTab(): TabId {
  return window.location.hash === "#site" ? "site" : "game";
}

// Two top-level sections. Both panels are rendered by the server page and
// passed in, so the tab switch is only a show/hide (no data fetching); the
// active tab mirrors into the URL hash (#site) so a section can be linked.
export default function WhatsNewTabs({ inGame, onSite }: { inGame: ReactNode; onSite: ReactNode }) {
  // The URL hash is the source of truth, read through useSyncExternalStore
  // so the server render (no hash) and first client render agree on "game".
  const tab = useSyncExternalStore(subscribeToHash, readTab, () => "game" as TabId);

  function select(next: TabId) {
    window.history.replaceState(null, "", next === "site" ? "#site" : window.location.pathname);
    window.dispatchEvent(new Event("hashchange"));
  }

  const tabClass = (active: boolean) =>
    `rounded-t border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
      active
        ? "border-accent text-accent"
        : "border-transparent text-foreground-muted hover:text-foreground"
    }`;

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-border">
        <button type="button" role="tab" aria-selected={tab === "game"} className={tabClass(tab === "game")} onClick={() => select("game")}>
          In Game
        </button>
        <button type="button" role="tab" aria-selected={tab === "site"} className={tabClass(tab === "site")} onClick={() => select("site")}>
          On the Site
        </button>
      </div>
      <div className="mt-4" role="tabpanel">
        {tab === "game" ? inGame : onSite}
      </div>
    </div>
  );
}
