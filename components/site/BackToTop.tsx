"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when user scrolls down 400px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      // data-cursor="hearth" hooks into your CustomCursor component to use the hearth.png asset
      data-cursor="hearth"
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/75 text-foreground shadow-lg shadow-black/40 transition-all hover:border-accent hover:bg-surface-hover hover:text-accent"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}