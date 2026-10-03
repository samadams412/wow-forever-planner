"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// The journal's back button. It reads ?from= on the client, so the quest page
// itself stays statically prerendered (a server searchParams read would force
// every quest page to render per request).
function BackLinkInner({ fallbackHref, fallbackLabel }: { fallbackHref: string; fallbackLabel: string }) {
  const params = useSearchParams();
  const from = params.get("from");
  const fromLabel = params.get("fromLabel");
  // Only trust an internal path -- `from` is attacker-controlled query input,
  // same guard as app/items/[itemId]/page.tsx.
  const backHref = from && from.startsWith("/") && !from.startsWith("//") ? from : fallbackHref;
  const backLabel = from && fromLabel ? fromLabel : fallbackLabel;
  return (
    <Link
      href={backHref}
      className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded border-2 border-[#3a2a12] bg-linear-to-b from-[#7a1c1c] to-[#3a0a0a] px-3 py-1 text-xs font-semibold text-[#f0c040] shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-[filter] hover:brightness-110"
    >
      &larr; {backLabel}
    </Link>
  );
}

export default function QuestBackLink(props: { fallbackHref: string; fallbackLabel: string }) {
  return (
    <Suspense
      fallback={
        <Link
          href={props.fallbackHref}
          className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded border-2 border-[#3a2a12] bg-linear-to-b from-[#7a1c1c] to-[#3a0a0a] px-3 py-1 text-xs font-semibold text-[#f0c040] shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-[filter] hover:brightness-110"
        >
          &larr; {props.fallbackLabel}
        </Link>
      }
    >
      <BackLinkInner {...props} />
    </Suspense>
  );
}
