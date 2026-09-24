import { useRef } from "react";
import type { TouchEvent } from "react";

// Standard tap-vs-scroll distinction, and long-press-to-peek timing --
// values match the talent tree's own touch handling (TalentNode.tsx),
// which predates this hook and was left on its own inline implementation
// rather than refactored onto this one, to avoid risking a regression on
// the planner's core interaction for a mechanical extraction. Any NEW
// touch-driven long-press-to-peek surface (item pills, etc.) should use
// this hook instead of reimplementing these same three thresholds by hand.
const TAP_MOVE_THRESHOLD_PX = 10;
const LONG_PRESS_MS = 450;

export function useLongPress({
  onLongPress,
  onTap,
  onLongPressEnd,
}: {
  // Fires once, mid-touch, after LONG_PRESS_MS with the finger staying
  // within TAP_MOVE_THRESHOLD_PX of where it started.
  onLongPress: () => void;
  // Fires on touchend for a normal tap -- one that never moved past the
  // threshold and never triggered a long-press. Left undefined when the
  // caller wants a plain tap to fall through to the browser's own default
  // action (e.g. a wrapped <Link> navigating) instead of being handled here.
  onTap?: () => void;
  // Fires on touchend when a long-press WAS showing -- releasing ends the
  // peek. Distinct from onTap so a caller can hide a tooltip instead of
  // (or in addition to) whatever a plain tap would otherwise do.
  onLongPressEnd?: () => void;
}) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const movedPastThreshold = useRef(false);

  function clearTimer() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    startPos.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    movedPastThreshold.current = false;
    fired.current = false;
    clearTimer();
    timer.current = window.setTimeout(() => {
      fired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function handleTouchMove(e: TouchEvent) {
    // Any movement cancels a pending long-press -- distance is tracked
    // separately so a real scroll (which naturally travels further than a
    // long-press-in-place would tolerate anyway) still suppresses the
    // tap/peek entirely once it lifts, even after the timer's already gone.
    clearTimer();
    const start = startPos.current;
    const touch = e.touches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX) movedPastThreshold.current = true;
  }

  function handleTouchEnd(e: TouchEvent) {
    clearTimer();
    startPos.current = null;
    if (movedPastThreshold.current) {
      // A scroll that happened to pass over the target -- don't
      // preventDefault, so the browser's own scroll/momentum handling
      // finishes undisturbed, and don't fire either callback.
      return;
    }
    if (fired.current) {
      // Releasing a long-press ends the peek and must block the browser's
      // follow-up synthetic click (which would otherwise navigate/activate
      // the target right after) -- preventDefault on touchend suppresses
      // the compatibility mouse events for this gesture entirely.
      e.preventDefault();
      onLongPressEnd?.();
      return;
    }
    onTap?.();
  }

  return { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd };
}
