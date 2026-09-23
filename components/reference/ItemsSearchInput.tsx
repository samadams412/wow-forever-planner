"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Debounced text input that drives the ?q= search param -- kept as a tiny
// client component so the ~21k-item catalog itself never has to ship to
// the browser just to support typing into a box. Every keystroke updates
// the URL (via router.replace, no history entry per keystroke) after a
// short pause, which re-renders the server-side ItemsTable with the new
// filter. Resets to page 1 whenever the query text actually changes.
export default function ItemsSearchInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setValue(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) params.set("q", next.trim());
      else params.delete("q");
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Search item names..."
      className="w-full max-w-xs rounded border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none"
    />
  );
}
