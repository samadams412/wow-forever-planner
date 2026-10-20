import { CLASS_TEXT_SHADOW } from "@/lib/class-text";
import type { EffectCoverage, EffectSet, EffectView, PerCasterShortfall } from "@/lib/raid-comp";

// Stacking rules for the raid comp planner, kept out of CoveragePanel so a
// growing rule list never pushes the buff coverage down. Two kinds:
// caster limits (one Blessing/Aura/totem per caster, from the roster) and
// "only one counts" sets (debuffs/buffs that don't stack with each other).

export default function StackingRules({
  effects,
  coverage,
  shortfalls,
  onlyOneCounts,
  classes,
}: {
  effects: EffectView[];
  coverage: Record<string, EffectCoverage>;
  shortfalls: PerCasterShortfall[];
  onlyOneCounts: EffectSet[];
  /** classId -> display name + CLASS_COLOR, resolved on the server (SpecView). */
  classes: Record<string, { name: string; color: string }>;
}) {
  const ClassName = ({ classId, suffix = "" }: { classId: string; suffix?: string }) => (
    <span className="font-medium" style={{ color: classes[classId]?.color, textShadow: CLASS_TEXT_SHADOW }}>
      {classes[classId]?.name ?? classId}
      {suffix}
    </span>
  );

  return (
    <section aria-label="Stacking rules" className="flex flex-col gap-3 rounded-lg border border-border bg-surface/50 p-2">
      <h2 className="px-1 text-sm font-medium text-foreground">Stacking rules</h2>

      {shortfalls.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Caster limits">
          {shortfalls.map((s) => (
            <li key={`${s.setId}-${s.group}`} className="rounded border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-foreground">
              {s.group !== null && <span className="text-foreground-muted">Group {s.group + 1}: </span>}
              {s.casters} <ClassName classId={s.classId} suffix={s.casters > 1 ? "s" : ""} /> for {s.effects} {s.label}. Each{" "}
              <ClassName classId={s.classId} /> can only provide one at a time.
              {s.confidence === "estimated" && <span className="text-foreground-muted"> (one-at-a-time rule estimated)</span>}
            </li>
          ))}
        </ul>
      )}

      <ul className="flex flex-col gap-1.5" aria-label="Only one counts">
        {onlyOneCounts.map((set) => {
          const members = effects.filter((e) => e.onlyOneCounts === set.id);
          const coveredCount = members.filter((m) => coverage[m.id].covered).length;
          return (
            <li key={set.id} className="rounded border border-border/70 px-2 py-1.5 text-xs">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-medium text-foreground">{set.label}</span>
                <span className="text-[10px] uppercase tracking-wide text-foreground-muted">
                  only one counts{set.confidence === "estimated" ? " (estimated)" : ""}
                </span>
              </div>
              <ul className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                {members.map((m) => (
                  <li key={m.id} className={coverage[m.id].covered ? "text-foreground" : "text-foreground-muted/70"}>
                    {m.name}{" "}
                    <span className="text-foreground-muted">(</span>
                    {[...new Set(m.sources.map((src) => src.classId))].map((classId, i) => (
                      <span key={classId}>
                        {i > 0 && ", "}
                        {/* Hunter pet abilities (Dust Cloud, Demoralizing Screech) need a specific pet family. */}
                        <ClassName classId={classId} suffix={m.perCaster === "hunter-pets" ? " pet" : ""} />
                      </span>
                    ))}
                    <span className="text-foreground-muted">)</span>
                  </li>
                ))}
              </ul>
              {coveredCount > 1 && <p className="mt-0.5 text-foreground-muted">Your roster has {coveredCount}; only one applies at a time.</p>}
              <p className="mt-0.5 text-[11px] leading-snug text-foreground-muted">{set.note}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
