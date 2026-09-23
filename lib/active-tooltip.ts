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

// Deliberately NOT a shared getSnapshot returning the raw activeId: every
// TalentNode/SpellEntry/LootItemPill on the page subscribes to this same
// store, and useSyncExternalStore only skips re-rendering a subscriber when
// ITS OWN getSnapshot return value is unchanged (Object.is) from the last
// render. A shared getSnapshot returning the bare activeId changes for
// EVERY subscriber on every claim/release (even ones whose own claimed-ness
// never changes), so every consumer's component function re-runs on every
// single hover transition -- confirmed directly: on a profession page with
// ~170 item pills, two hover transitions produced ~680 LootItemPill
// re-renders (every pill re-rendering ~4 times) before this fix. Each
// consumer instead gets its own selector closure that returns a boolean
// scoped to its own id, so React's Object.is check only lets a re-render
// through for the (at most) two subscribers whose claimed state actually
// flipped -- everyone else bails out before rendering.
export function useIsActiveTooltip(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => activeId === id,
    () => false
  );
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
