"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { LazyMotion, MotionConfig, domAnimation, m, useReducedMotion } from "motion/react";
import CornerBracket from "@/components/site/CornerBracket";
import type { WrappedClassId, WrappedEdition } from "@/lib/beta-wrapped";
import { EASE, WrappedSlideView, type WrappedClasses } from "./WrappedSlides";

const SWIPE_PX = 40;
const DURATION = 0.42;

// Directional, like Stories: going forward, the old slide is pushed back
// (shrinks and dims) while the new one slides in from the right; going back,
// the previous slide slides in from the left over the current one.
const slideVariants = {
  active: { x: "0%", scale: 1, opacity: 1, zIndex: 2 },
  past: (dir: number) => (dir > 0 ? { x: "-12%", scale: 0.94, opacity: 0, zIndex: 1 } : { x: "-100%", scale: 1, opacity: 0, zIndex: 1 }),
  future: (dir: number) => (dir > 0 ? { x: "100%", scale: 1, opacity: 0, zIndex: 1 } : { x: "12%", scale: 0.94, opacity: 0, zIndex: 1 }),
};

// Story-mode shell: segmented progress bar, tap zones (left third back, rest
// forward, like Instagram Stories), horizontal swipe, arrow keys. Every slide
// is rendered so the whole recap is in the prerendered HTML; inactive slides
// are inert. Full-screen overlay below `sm`, a phone-shaped card above it.
export default function WrappedStory({ edition, classes }: { edition: WrappedEdition; classes: WrappedClasses }) {
  const { slides } = edition;
  const [{ index, dir }, setNav] = useState({ index: 0, dir: 1 });
  const [press, setPress] = useState<"back" | "forward" | null>(null);
  const [shareLabel, setShareLabel] = useState("Share this recap");
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const clamp = useCallback((n: number) => Math.max(0, Math.min(slides.length - 1, n)), [slides.length]);
  const go = useCallback((n: number) => setNav((s) => ({ index: clamp(n), dir: n >= s.index ? 1 : -1 })), [clamp]);
  // Functional update, so fast or held arrow keys never read a stale index.
  const step = useCallback((delta: number) => setNav((s) => ({ index: clamp(s.index + delta), dir: delta })), [clamp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") step(1);
      else if (e.key === "ArrowLeft" || e.key === "PageUp") step(-1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(slides.length - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step, slides.length]);

  // The phone layout is a fixed overlay; stop the page behind it from scrolling.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => (document.documentElement.style.overflow = mq.matches ? "hidden" : "");
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      document.documentElement.style.overflow = "";
    };
  }, []);

  const sideOf = (clientX: number) => {
    const rect = cardRef.current!.getBoundingClientRect();
    return clientX - rect.left < rect.width / 3 ? "back" : "forward";
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY };
    if (e.button === 0 && !(e.target as HTMLElement).closest("a, button")) setPress(sideOf(e.clientX));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointer.current;
    pointer.current = null;
    setPress(null);
    if (!start || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("a, button")) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) return step(dx < 0 ? 1 : -1);
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return; // a scroll or a drag, not a tap
    step(sideOf(e.clientX) === "back" ? -1 : 1);
  };

  const jumpToClass = (classId: WrappedClassId) =>
    go(slides.findIndex((s) => s.kind === "class" && s.classId === classId));

  const share = async () => {
    const url = window.location.origin + window.location.pathname;
    try {
      if (navigator.share) return await navigator.share({ title: `${edition.title} | Forevercraft`, url });
      await navigator.clipboard.writeText(url);
      setShareLabel("Link copied");
    } catch {
      // Share sheet dismissed, or clipboard blocked: nothing to undo.
    }
  };

  const transition = { duration: reduce ? 0.12 : DURATION, ease: EASE };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={transition}>
        <div className="fixed inset-0 z-[60] bg-background sm:static sm:z-auto sm:flex sm:flex-col sm:items-center sm:px-4 sm:py-8">
          <m.div
            ref={cardRef}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointer.current = null;
              setPress(null);
            }}
            onPointerLeave={() => setPress(null)}
            animate={{ scale: press && !reduce ? 0.985 : 1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative h-dvh w-full touch-pan-y select-none bg-surface sm:aspect-[9/16] sm:h-[min(820px,calc(100dvh-10rem))] sm:w-auto sm:border sm:border-border"
            role="region"
            aria-roledescription="carousel"
            aria-label={edition.title}
          >
            <div className="hidden sm:contents">
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
            </div>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-x-4 top-3 z-20 flex gap-1" aria-hidden="true">
                {slides.map((_, i) => (
                  <div key={i} className="h-[3px] flex-1 overflow-hidden bg-foreground-muted/25">
                    <m.div
                      className="h-full origin-left bg-accent"
                      initial={false}
                      animate={{ scaleX: i <= index ? 1 : 0 }}
                      transition={transition}
                    />
                  </div>
                ))}
              </div>
              <p className="sr-only" aria-live="polite">
                Slide {index + 1} of {slides.length}
              </p>
              <Link
                href="/"
                aria-label="Close"
                className="absolute right-2 top-6 z-20 p-2 text-foreground-muted hover:text-foreground sm:hidden"
              >
                <X className="h-5 w-5" />
              </Link>

              {/* Press feedback: a faint wash on the side about to be used. */}
              <m.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 z-10 w-1/3"
                style={{
                  left: press === "back" ? 0 : undefined,
                  right: press === "forward" ? 0 : undefined,
                  background: `linear-gradient(to ${press === "back" ? "right" : "left"}, color-mix(in srgb, var(--gold) 14%, transparent), transparent)`,
                }}
                initial={false}
                animate={{ opacity: press ? 1 : 0 }}
                transition={{ duration: 0.12 }}
              />

              {slides.map((slide, i) => {
                const state = i === index ? "active" : i < index ? "past" : "future";
                return (
                  <m.section
                    key={i}
                    inert={i !== index}
                    aria-hidden={i !== index}
                    aria-label={`${i + 1} of ${slides.length}`}
                    custom={dir}
                    variants={slideVariants}
                    initial={false}
                    animate={state}
                    transition={transition}
                    className="absolute inset-0 isolate overflow-y-auto overscroll-contain bg-surface px-6 pb-10 pt-12"
                  >
                    <WrappedSlideView
                      slide={slide}
                      index={i}
                      active={i === index}
                      near={Math.abs(i - index) <= 1}
                      classes={classes}
                      onJump={jumpToClass}
                      onShare={share}
                      shareLabel={shareLabel}
                    />
                  </m.section>
                );
              })}
            </div>
          </m.div>
          <p className="mt-4 hidden text-xs text-foreground-muted sm:block">
            <span className="font-semibold tabular-nums text-foreground">{index + 1}</span> / {slides.length} · click the
            right of the card or press → to continue, ← to go back
          </p>
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
