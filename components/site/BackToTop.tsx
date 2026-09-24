"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";

// Mobile complaint this was tuned against: the button used to appear after
// just 400px and stay fully opaque the whole time you scrolled, so it sat
// on top of content (and competed with real tap targets) for most of a
// long page's read. Two changes address that without removing the button:
// a much larger threshold (it should only show up once "back to top" is
// actually a useful shortcut, not near the top of the page), and hiding it
// while a scroll is actively in progress -- it only settles back in once
// scrolling has stopped for a moment, the same "wait for scroll to settle"
// pattern iOS/Android system UI uses for their own scroll-linked chrome.
const SHOW_THRESHOLD_PX = 800;
const SETTLE_DELAY_MS = 400;

export default function BackToTop() {
  const [pastThreshold, setPastThreshold] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const settleTimer = useRef<number | null>(null);

  useEffect(() => {
    function handleScroll() {
      setPastThreshold(window.scrollY > SHOW_THRESHOLD_PX);
      setScrolling(true);
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
      settleTimer.current = window.setTimeout(() => setScrolling(false), SETTLE_DELAY_MS);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!pastThreshold) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      // data-cursor="hearth" hooks into your CustomCursor component to use the hearth.png asset
      data-cursor="hearth"
      // Shrinks and fades (but stays clickable -- opacity, not visibility)
      // while a scroll is actively happening, so it isn't sitting full-size
      // over content or fighting the finger mid-swipe; settles back to full
      // size and opacity once scrolling pauses.
      className={`fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-lg border border-border bg-surface/75 text-foreground shadow-lg shadow-black/40 transition-all duration-300 hover:border-accent hover:bg-surface-hover hover:text-accent ${
        scrolling ? "h-8 w-8 opacity-40" : "h-10 w-10 opacity-100"
      }`}
    >
      <ArrowUp className={scrolling ? "h-4 w-4" : "h-5 w-5"} />
    </button>
  );
}