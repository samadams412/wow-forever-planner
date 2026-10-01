"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function ProfessionRecipeSearchInput({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
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
      // Live URL at fire time, not useSearchParams(): this input also renders in the
      // page's Suspense fallback, where that hook would force a CSR bailout.
      const params = new URLSearchParams(window.location.search);
      if (next.trim()) params.set("q", next.trim());
      else params.delete("q");
      params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 300);
  }

  return (
    <input
      type="search"
      value={value}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Search recipe names…"
      aria-label="Search recipes"
      className="w-full max-w-xs rounded border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent focus:outline-none"
    />
  );
}
