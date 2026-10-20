import ConfidenceBadge from "@/components/planner/ConfidenceBadge";
import type { EffectCoverage, EffectView } from "@/lib/raid-comp";

// Coverage list for the raid comp planner. Each effect is a native
// <details> row (tap or click to expand), not a hover tooltip: hover
// doesn't exist on touch, and the site's TooltipCard pulls lib/wow-data
// into the client bundle. Stacking rules live in StackingRules, beside it.

const SECTIONS: { title: string; match: (e: EffectView) => boolean }[] = [
  { title: "Raid buffs", match: (e) => e.scope === "raid" },
  { title: "Group buffs", match: (e) => e.scope === "group" },
  { title: "Single-target buffs", match: (e) => e.scope === "target" },
  { title: "Debuffs", match: (e) => e.scope === "enemy" },
];

export default function CoveragePanel({
  effects,
  coverage,
  build,
}: {
  effects: EffectView[];
  coverage: Record<string, EffectCoverage>;
  build: string;
}) {
  return (
    <section aria-label="Buff and debuff coverage" className="flex flex-col gap-3 rounded-lg border border-border bg-surface/50 p-2">
      {SECTIONS.map(({ title, match }) => {
        const list = effects.filter(match);
        const coveredCount = list.filter((e) => coverage[e.id].covered).length;
        return (
          <div key={title}>
            <h2 className="mb-1 flex items-baseline justify-between px-1 text-sm font-medium text-foreground">
              {title}
              <span className="text-xs font-normal text-foreground-muted">
                {coveredCount} / {list.length}
              </span>
            </h2>
            <ul className="flex flex-col gap-0.5">
              {list.map((e) => (
                <EffectRow key={e.id} effect={e} cov={coverage[e.id]} />
              ))}
            </ul>
          </div>
        );
      })}

      <p className="px-1 text-[11px] leading-snug text-foreground-muted">
        Based on spec, not talents or pets: a spec counts if it can provide the effect. Spell text from beta build {build}.
      </p>
    </section>
  );
}

function EffectRow({ effect: e, cov }: { effect: EffectView; cov: EffectCoverage }) {
  return (
    <li>
      <details className="rounded">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded px-1 py-0.5 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
          <span className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.icon} alt="" className={`h-6 w-6 rounded-sm ${cov.covered ? "" : "opacity-35 grayscale"}`} />
            {cov.providers.length > 0 && (
              // How many roster players can provide it: a quick read on
              // redundancy (or a single point of failure) without warnings.
              <span
                className="absolute -bottom-1 -right-1.5 min-w-4 rounded-full border border-background bg-accent px-0.5 text-center text-[9px] font-semibold leading-3.5 text-background"
                title={`${cov.providers.length} in this roster can provide it`}
              >
                {cov.providers.length}
                <span className="sr-only"> sources</span>
              </span>
            )}
          </span>
          <span className={`min-w-0 flex-1 truncate text-xs ${cov.covered ? "text-foreground" : "text-foreground-muted"}`}>{e.name}</span>
          {cov.groups.length > 0 && (
            <span className="shrink-0 text-[10px] text-foreground-muted">{cov.groups.map((g) => `G${g + 1}`).join(" ")}</span>
          )}
          <span className={`w-4 shrink-0 text-center text-xs ${cov.covered ? "text-accent" : "text-foreground-muted/50"}`}>
            {cov.covered ? "✓" : "–"}
            <span className="sr-only">{cov.covered ? " covered" : " not covered"}</span>
          </span>
        </summary>
        <div className="mb-1 ml-9 mr-1 flex flex-col gap-1 text-xs text-foreground-muted">
          <p className="text-foreground">{e.summary}</p>
          {cov.providers.length > 0 && (
            <p>
              {cov.providers.length} player{cov.providers.length === 1 ? "" : "s"} in this roster can provide it.
            </p>
          )}
          {e.raidSpell && <p>Raid-wide version: {e.raidSpell}.</p>}
          {e.text && <p className="italic">“{e.text}”</p>}
          {e.note && <p>{e.note}</p>}
          <ul className="flex flex-col gap-0.5">
            {e.sources.map((s) => (
              <li key={s.label} className="flex flex-wrap items-center gap-1.5">
                <span className="text-foreground">{s.label}</span>
                <ConfidenceBadge confidence={s.confidence} />
                {s.note && <span>{s.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      </details>
    </li>
  );
}
