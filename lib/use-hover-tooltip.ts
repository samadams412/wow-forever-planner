import { useEffect, useRef, useState, type RefObject } from "react";

// Matches Tailwind's `sm` breakpoint, which is what the rest of the site
// (mobile talent tree, SpellbookBook's own layout) already treats as the
// mobile/desktop line.
const MOBILE_BREAKPOINT_PX = 640;
const EDGE_GAP = 8;
const TRIGGER_GAP = 6;

export function useHoverTooltip<T extends HTMLElement>(
  width: number,
  placement: "below" | "left" | "right" = "below",
  estimatedHeight = 220,
  // Pass an existing ref to position off of it (e.g. sharing one button
  // between a desktop hover tooltip and a mobile tap tooltip) instead of
  // creating a new one.
  sharedRef?: RefObject<T | null>,
  options?: {
    // Below the mobile breakpoint, ignore `placement` entirely and anchor
    // the tooltip to the bottom of the viewport instead -- there's no
    // "beside the trigger" room to work with on a narrow screen.
    mobileBottomSheet?: boolean;
    // Share one tooltip element's ref across multiple useHoverTooltip
    // instances that render into the same portal node (TalentNode has a
    // separate hook call for desktop hover vs. mobile tap/peek, but only
    // ever renders one <TooltipCard> at a time) -- without this, each call
    // would create its own ref and only one could ever observe the real
    // element that's actually mounted.
    sharedTooltipRef?: RefObject<HTMLDivElement | null>;
  }
) {
  const ownRef = useRef<T>(null);
  const ref = sharedRef ?? ownRef;
  const ownTooltipRef = useRef<HTMLDivElement>(null);
  const tooltipRef = options?.sharedTooltipRef ?? ownTooltipRef;
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null);

  // Corrects `pos` against the tooltip's ACTUAL rendered box once it exists
  // in the DOM -- show()'s own placement is just a same-frame estimate (using
  // `estimatedHeight`) so there's something reasonable to paint before the
  // real element has ever been measured. Also flips the tooltip to the
  // opposite side when the preferred side doesn't have room, rather than
  // only ever clamping it (which can leave it overlapping the trigger or,
  // for "below", running off the bottom of the screen). Re-run by a
  // ResizeObserver too, so a tooltip that grows after it's already open
  // (the talent tooltip's Ctrl-held expanded state) gets re-clamped without
  // this hook needing to know why the content changed size.
  function recompute() {
    if (options?.mobileBottomSheet && window.innerWidth < MOBILE_BREAKPOINT_PX) return;
    const rect = ref.current?.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    if (!rect || !tooltipEl) return;

    const w = tooltipEl.offsetWidth || width;
    const h = tooltipEl.offsetHeight || estimatedHeight;
    const maxLeft = Math.max(EDGE_GAP, window.innerWidth - w - EDGE_GAP);
    const maxTop = Math.max(EDGE_GAP, window.innerHeight - h - EDGE_GAP);

    if (placement === "left" || placement === "right") {
      let left: number;
      if (placement === "left") {
        left = rect.left - w - EDGE_GAP;
        if (left < EDGE_GAP) {
          // Not enough room on the left -- flip to the right of the trigger.
          const flipped = rect.right + EDGE_GAP;
          left = flipped <= maxLeft ? flipped : maxLeft;
        }
      } else {
        left = rect.right + EDGE_GAP;
        if (left > maxLeft) {
          // Not enough room on the right -- flip to the left of the trigger.
          const flipped = rect.left - w - EDGE_GAP;
          left = flipped >= EDGE_GAP ? flipped : EDGE_GAP;
        }
      }
      left = Math.min(Math.max(left, EDGE_GAP), maxLeft);
      const top = Math.min(Math.max(rect.top, EDGE_GAP), maxTop);
      setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { ...prev, top, left }));
      return;
    }

    // "below" -- flip above the trigger if there isn't room beneath it.
    let top = rect.bottom + TRIGGER_GAP;
    if (top + h > window.innerHeight - EDGE_GAP) {
      const above = rect.top - h - TRIGGER_GAP;
      top = above >= EDGE_GAP ? above : maxTop;
    }
    const left = Math.min(Math.max(rect.left + rect.width / 2 - w / 2, EDGE_GAP), maxLeft);
    setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { ...prev, top, left }));
  }

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    if (options?.mobileBottomSheet && window.innerWidth < MOBILE_BREAKPOINT_PX) {
      const sheetWidth = window.innerWidth - 16;
      const top = Math.max(8, window.innerHeight - estimatedHeight - 8);
      setPos({ top, left: 8, width: sheetWidth });
      return;
    }

    if (placement === "left") {
      const left = Math.max(rect.left - width - 8, 8);
      const top = Math.min(Math.max(rect.top, 8), Math.max(8, window.innerHeight - estimatedHeight - 8));
      setPos({ top, left });
      return;
    }

    if (placement === "right") {
      const left = Math.min(rect.right + 8, window.innerWidth - width - 8);
      const top = Math.min(Math.max(rect.top, 8), Math.max(8, window.innerHeight - estimatedHeight - 8));
      setPos({ top, left });
      return;
    }

    const left = Math.min(
      Math.max(rect.left + rect.width / 2 - width / 2, 8),
      window.innerWidth - width - 8
    );
    const top = Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - estimatedHeight - 8));
    setPos({ top, left });
  };

  // Runs once the estimate-based `pos` above has actually put a
  // <TooltipCard> in the DOM (this effect fires after that commit), then
  // stays subscribed to size changes for as long as the tooltip is open.
  useEffect(() => {
    if (!pos) return;
    recompute();
    const el = tooltipRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => recompute());
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos !== null]);

  const hide = () => setPos(null);

  return { ref, tooltipRef, pos, show, hide };
}
