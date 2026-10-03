"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// The item page's back link. It reads ?from= on the client, so app/items/[itemId]
// has no searchParams prop and isn't forced to render per request -- without
// that, every item view would cost a serverless invocation instead of being
// served from the cache after its first render.
const LINK_CLASS =
  "mt-4 inline-flex items-center rounded border border-border px-3 py-2 text-sm text-accent transition-colors hover:border-accent hover:bg-surface-hover hover:underline";

function BackLinkInner({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  const params = useSearchParams();
  const from = params.get("from");
  const fromLabel = params.get("fromLabel");
  // Only trust an internal path -- `from` is attacker-controlled query input,
  // so an absolute/external URL here is never followed.
  const backHref = from && from.startsWith("/") && !from.startsWith("//") ? from : fallbackHref;
  const backLabel = from && fromLabel ? fromLabel : fallbackLabel;
  return (
    <Link href={backHref} className={LINK_CLASS}>
      &larr; Back to {backLabel}
    </Link>
  );
}

export default function ItemBackLink(props: { fallbackHref: string; fallbackLabel: string }) {
  return (
    <Suspense
      fallback={
        <Link href={props.fallbackHref} className={LINK_CLASS}>
          &larr; Back to {props.fallbackLabel}
        </Link>
      }
    >
      <BackLinkInner {...props} />
    </Suspense>
  );
}
