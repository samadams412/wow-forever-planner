import Link from "next/link";
import { getAllProfessionSummaries } from "@/lib/profession-recipes";
import { PROFESSION_ICON } from "@/lib/profession-icons";
import { mediumIconUrl } from "@/lib/wow-data";

// A row of pill links to all 8 crafting professions, shown at the bottom of
// every individual profession page (crafting and gathering alike) so a
// visitor can jump straight to another profession without going back up to
// the /reference/professions index. Same pill shape as the index page's own
// cards, just compact enough for a single row.
export default function ProfessionCrossLinks({ activeId }: { activeId: string }) {
  const professions = getAllProfessionSummaries();

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Other professions</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {professions.map((profession) =>
          profession.id === activeId ? (
            <span
              key={profession.id}
              className="flex items-center gap-2 rounded-lg border border-accent/60 bg-accent/10 px-3 py-1.5 text-sm text-accent"
            >
              {PROFESSION_ICON[profession.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediumIconUrl(PROFESSION_ICON[profession.id])}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded border border-border/50"
                />
              )}
              {profession.name}
            </span>
          ) : (
            <Link
              key={profession.id}
              href={`/reference/professions/${profession.id}`}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-hover"
            >
              {PROFESSION_ICON[profession.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediumIconUrl(PROFESSION_ICON[profession.id])}
                  alt=""
                  className="h-5 w-5 shrink-0 rounded border border-border/50"
                />
              )}
              {profession.name}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
