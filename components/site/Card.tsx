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
      className="fx-standard-hover rounded-lg border border-border bg-surface/50 p-4"
    >
      {icon && <div className="fx-standard-hover-icon mb-2">{icon}</div>}
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 text-sm text-foreground-muted">{description}</p>
    </Link>
  );
}