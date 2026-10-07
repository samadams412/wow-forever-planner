import Link from "next/link";
import { mediumIconUrl } from "@/lib/wow-data";

// Quick-glance marker on the Professions listing for a profession whose
// Leveling 1 to 300 path isn't verified yet (see lib/profession-leveling-status.ts).
// The profession page itself shows the leveling data under the overlay in
// LevelingUnderConstruction instead. Not a
// link to the guide: the title and note go to the feedback page, and a
// separate "Browse" link keeps the profession's own page reachable. A card
// can't hold two anchors, so the two links are siblings inside a plain div.
export default function InTheWorksCard({
  id,
  name,
  detail,
  iconId,
  browseLabel,
}: {
  id: string;
  name: string;
  detail?: string;
  iconId: string | undefined;
  browseLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-surface/50 p-4">
      <div className="flex items-center gap-4">
        {iconId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediumIconUrl(iconId)}
            alt=""
            className="h-10 w-10 shrink-0 rounded border border-border/50 opacity-60"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium text-foreground">{name}</h2>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
              In the works
            </span>
          </div>
          {detail && <p className="mt-0.5 text-xs text-foreground-muted">{detail}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
        <Link href="/contact" className="text-foreground-muted transition-colors hover:text-accent">
          Leveling 1 to 300 guide coming soon. Send feedback &rarr;
        </Link>
        <Link href={`/reference/professions/${id}`} className="text-accent hover:underline">
          {browseLabel} &rarr;
        </Link>
      </div>
    </div>
  );
}
