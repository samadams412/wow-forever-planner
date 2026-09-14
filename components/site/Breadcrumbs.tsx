import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
  /** Caps the segment's width and ellipsizes it -- for long guide titles. */
  truncate?: boolean;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs text-foreground-muted">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && (
              <span aria-hidden="true" className="text-foreground-muted/50">
                ›
              </span>
            )}
            {item.href && !isLast ? (
              <Link href={item.href} className="shrink-0 hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span
                title={item.truncate ? item.label : undefined}
                className={`${isLast ? "font-medium text-foreground" : ""} ${
                  item.truncate ? "max-w-[16rem] truncate sm:max-w-[24rem]" : ""
                }`}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
