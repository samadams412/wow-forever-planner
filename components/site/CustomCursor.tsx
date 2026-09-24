"use client";

import { useEffect, useRef } from "react";

// Must match the hotspot used for the native `cursor: url(...) 6 4` fallback
// in globals.css, so the swap between native and custom cursor is seamless.
const HOTSPOT_X = 6;
const HOTSPOT_Y = 4;

const ACTIVE_SELECTOR = "a, button:not(:disabled), [role='button'], summary";
// TalentNode/ClassPicker mark locked/unselectable buttons with this class
// rather than the native `disabled` attribute (they stay clickable so
// shift-click-to-remove etc. still works), so both need checking here.
const DISABLED_SELECTOR = "button:disabled, [aria-disabled='true'], .cursor-not-allowed";
// Elements whose native cursor should win outright rather than being
// replaced by the gauntlet overlay: real text-entry controls (their
// browser-drawn text-beam comes from Tailwind Preflight/the UA stylesheet,
// not something this component can see or intercept), plus anything
// explicitly marked with a plain cursor-pointer/cursor-text/cursor-default
// utility. Tailwind v4 puts the html.js-custom-cursor cursor:none rules
// below in @layer base specifically so a utility class like
// disabled:cursor-not-allowed can still beat them (see that rule's own
// comment) -- but that same layer ordering means ANY cursor-* utility on
// an element beats cursor:none, not just the disabled one. Rather than
// hunt down and strip cursor-pointer/cursor-default off every element that
// happens to carry one (DungeonsTimeline's dungeon buttons, LootItemPill,
// LegacyPerkNode, the spellbook's checkbox label, ItemsSearchInput's plain
// <input>, ...), hiding the JS overlay here whenever the native cursor is
// already going to show through is the one fix that covers all of them
// (present and future) instead of patching each call site.
const NATIVE_CURSOR_SELECTOR = "input, textarea, select, [contenteditable], .cursor-pointer, .cursor-text, .cursor-default";

type CursorState = "default" | "active" | "hearth" | "gear" | "hidden";

function resolveState(target: Element): CursorState {
  // Elements can opt into a specific themed cursor via data-cursor
  // (e.g. the nav home link uses "hearth", locked talents use "gear").
  const tagged = target.closest("[data-cursor]");
  if (tagged) return tagged.getAttribute("data-cursor") as CursorState;

  // Find the NEAREST ancestor (or self) matching any of the three
  // remaining categories in one combined closest() call, then classify
  // that specific element -- rather than three independent closest()
  // calls checked in a fixed priority order, which would let an outer
  // cursor-default/cursor-pointer wrapper's category win even when a
  // closer, more specific descendant (e.g. the real <a> LootItemPill
  // renders around a linked item's name, inside its own cursor-default
  // pill) is what's actually under the pointer.
  const match = target.closest(`${DISABLED_SELECTOR}, ${NATIVE_CURSOR_SELECTOR}, ${ACTIVE_SELECTOR}`);
  if (!match) return "default";
  if (match.matches(DISABLED_SELECTOR)) return "hidden";
  if (match.matches(NATIVE_CURSOR_SELECTOR)) return "hidden";
  return "active";
}

export default function CustomCursor() {
  const posRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    document.documentElement.classList.add("js-custom-cursor");

    function onMove(e: MouseEvent) {
      const el = posRef.current;
      if (!el) return;
      el.style.transform = `translate3d(${e.clientX - HOTSPOT_X}px, ${e.clientY - HOTSPOT_Y}px, 0)`;
      el.style.opacity = "1";

      // Determine hover state from the real hit-test target rather than a
      // separate mouseover listener -- some synthetic/automated input paths
      // dispatch mousemove without a matching mouseover.
      const state = resolveState(e.target as Element);
      el.classList.toggle("cursor-hidden", state === "hidden");
      tiltRef.current?.setAttribute("data-state", state);
    }

    function onLeaveWindow() {
      posRef.current?.style.setProperty("opacity", "0");
    }

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeaveWindow);

    return () => {
      document.documentElement.classList.remove("js-custom-cursor");
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
    };
  }, []);

  return (
    <div ref={posRef} aria-hidden="true" className="wow-cursor pointer-events-none fixed left-0 top-0 z-[9999] opacity-0">
      <div ref={tiltRef} className="wow-cursor-tilt" data-state="default" style={{ transformOrigin: `${HOTSPOT_X}px ${HOTSPOT_Y}px` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cursors/gauntlet.png" alt="" draggable={false} className="cursor-img-default h-8 w-8 select-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cursors/gauntlet-active.png" alt="" draggable={false} className="cursor-img-active h-8 w-8 select-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cursors/hearth.png" alt="" draggable={false} className="cursor-img-hearth h-8 w-8 select-none" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cursors/gear.png" alt="" draggable={false} className="cursor-img-gear h-8 w-8 select-none" />
      </div>
    </div>
  );
}
