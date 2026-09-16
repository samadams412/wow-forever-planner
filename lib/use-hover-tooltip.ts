import { useRef, useState, type RefObject } from "react";

// Matches Tailwind's `sm` breakpoint, which is what the rest of the site
// (mobile talent tree, SpellbookBook's own layout) already treats as the
// mobile/desktop line.
const MOBILE_BREAKPOINT_PX = 640;

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
  }
) {
  const ownRef = useRef<T>(null);
  const ref = sharedRef ?? ownRef;
  const [pos, setPos] = useState<{ top: number; left: number; width?: number } | null>(null);

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

  const hide = () => setPos(null);

  return { ref, pos, show, hide };
}
