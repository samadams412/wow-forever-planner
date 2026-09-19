import { useSyncExternalStore } from "react";

// Enforces a hard single-open-tooltip invariant across the whole app, at
// the state level rather than relying on each tooltip's own mouseenter/
// mouseleave (or focus/blur) pair to self-manage correctly. That per-node
// lifecycle isn't reliable on its own: alt-tabbing away mid-hover without
// moving the mouse, then returning and hovering a different talent, can
// desync a mouseenter/mouseleave pair (the browser doesn't guarantee
// mouseleave fires for the original element across a window blur/focus
// cycle) and leave the original tooltip's local "open" state stuck true
// forever, with no way for it to know a different tooltip opened.
//
// A plain module-level store (not React state) so any component can claim
// or release ownership without needing a shared ancestor to lift state
// into -- every TalentNode/SpellEntry is a sibling many levels deep, and
// threading this through every intermediate component would be its own
// source of bugs.
let activeId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function claimActiveTooltip(id: string) {
  if (activeId !== id) {
    activeId = id;
    notify();
  }
}

// Only clears if `id` is still the current owner -- a stale hide() call
// from a tooltip that already lost the claim (e.g. it was force-closed by
// a different tooltip opening) must not clobber whatever opened after it.
export function releaseActiveTooltip(id: string) {
  if (activeId === id) {
    activeId = null;
    notify();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return activeId;
}

function getServerSnapshot() {
  return null;
}

export function useIsActiveTooltip(id: string): boolean {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return current === id;
}

// Defensive measure against exactly the defocus scenario above: if the
// window itself loses focus while a tooltip is open, close it outright
// rather than trust the eventual mouseleave/blur on the trigger element.
// Module-level, not a React effect -- this should exist for as long as the
// app is loaded, not per-component-mount.
if (typeof window !== "undefined") {
  window.addEventListener("blur", () => {
    if (activeId !== null) {
      activeId = null;
      notify();
    }
  });
}
