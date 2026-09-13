"use client";

import { useState, type ReactNode } from "react";

export default function Collapsible({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <div className="text-base font-semibold text-accent">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-foreground-muted">{subtitle}</div>}
          </div>
        </div>
        <span className="shrink-0 rounded border border-border px-2 py-0.5 text-xs text-foreground-muted">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}
