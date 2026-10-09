import Link from "next/link";
import type { ReactNode } from "react";

// Wraps a profession's leveling view. Verified paths render untouched. For
// everything else the data stays on the page, but grayed out, made inert
// (no focus, no clicks, hidden from assistive tech), and covered by caution
// tape plus an explanatory card. The data is not removed, so the layout and
// the numbers stay visible for review.
const TAPE_BAND = {
  background:
    "repeating-linear-gradient(-45deg, #facc15 0 18px, #0a0a0a 18px 36px)",
} as const;

function TapeBand({ position }: { position: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-auto absolute left-[-10%] right-[-10%] flex items-center justify-center py-2 shadow-lg ${position}`}
      style={{ ...TAPE_BAND, transform: "rotate(-6deg)" }}
    >
      <span className="rounded bg-[#0a0a0a] px-3 py-0.5 font-heading text-xs font-bold uppercase tracking-[0.25em] text-[#facc15]">
        Under construction
      </span>
    </div>
  );
}

export default function LevelingUnderConstruction({
  verified,
  name,
  children,
}: {
  verified: boolean;
  name: string;
  children: ReactNode;
}) {
  if (verified) return <>{children}</>;

  return (
    <div className="mt-4">
      <div className="mb-4 max-w-[70ch] rounded-lg border border-accent/40 bg-surface p-4">
        <p className="font-medium text-foreground">The Leveling 1 to 300 path for {name} isn&apos;t verified yet.</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
          It&apos;s shown below so it can be reviewed, but it&apos;s withheld rather than published as final: the steps and
          numbers haven&apos;t been tested in the beta. Want to help check it?{" "}
          <Link href="/contact" className="text-accent hover:underline">
            Send feedback &rarr;
          </Link>
        </p>
      </div>

      <div className="relative overflow-hidden rounded-lg">
        <div
          inert
          className="pointer-events-none select-none opacity-40 grayscale"
        >
          {children}
        </div>
        <div className="pointer-events-auto absolute inset-0 cursor-not-allowed bg-background/40" aria-hidden />
        <TapeBand position="top-[18%]" />
        <TapeBand position="top-[70%]" />
      </div>
    </div>
  );
}
