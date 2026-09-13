import Link from "next/link";
import type { ReactNode } from "react";

export default function Card({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-surface p-4 transition-colors hover:border-accent hover:bg-surface-hover"
    >
      {icon && <div className="mb-2">{icon}</div>}
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 text-sm text-foreground-muted">{description}</p>
    </Link>
  );
}
