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
      className="group rounded-lg border border-border bg-surface/50 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent hover:bg-surface-hover hover:shadow-[0_4px_20px_rgba(201,169,97,0.12)]"
    >
      {icon && <div className="mb-2 transition-transform duration-300 group-hover:scale-105">{icon}</div>}
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 text-sm text-foreground-muted">{description}</p>
    </Link>
  );
}