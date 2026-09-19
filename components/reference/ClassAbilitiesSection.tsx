import { mediumIconUrl } from "@/lib/wow-data";
import { getClassAbilities } from "@/lib/class-abilities";
import type { ClassRacialSpell } from "@/lib/class-racials";
import Collapsible from "@/components/site/Collapsible";
import IconFan from "@/components/site/IconFan";

const SPELL_TAG_STYLE: Record<"new" | "changed", string> = {
  new: "border-green/50 bg-green/10 text-green",
  changed: "border-amber-400/50 bg-amber-400/10 text-amber-300",
};

const SPELL_TAG_LABEL: Record<"new" | "changed", string> = {
  new: "New",
  changed: "Changed",
};

// Generic ability card -- tag/meta/classicNote are all optional, so this
// covers both race-specific bonus spells and the plainer class_abilities
// entries (name/description/icon only) without a second implementation.
export function AbilityCard({ spell }: { spell: ClassRacialSpell }) {
  return (
    <div className="flex gap-2.5 rounded border border-border bg-background/40 p-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediumIconUrl(spell.icon)} alt="" className="h-8 w-8 shrink-0 rounded-sm" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{spell.name}</span>
          {spell.tag && (
            <span
              className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${SPELL_TAG_STYLE[spell.tag]}`}
            >
              {SPELL_TAG_LABEL[spell.tag]}
            </span>
          )}
        </div>
        {spell.meta && (
          <p className="mt-0.5 font-mono text-[11px] text-foreground-muted/70">{spell.meta}</p>
        )}
        <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-foreground-muted">{spell.description}</p>
        {spell.classicNote && (
          <p className="mt-1 max-w-[65ch] text-[11px] italic text-foreground-muted/50">{spell.classicNote}</p>
        )}
      </div>
    </div>
  );
}

// Generic per-class "new & changed abilities" section -- driven entirely
// by data/class-abilities.json, so nothing here is Warrior/Shaman-specific
// even though those two currently have the most entries.
export default function ClassAbilitiesSection({ classId }: { classId: string }) {
  const data = getClassAbilities(classId);
  if (!data || data.abilities.length === 0) return null;

  const fanIcons = data.abilities.slice(0, 3).map((a) => a.icon);

  return (
    <div className="mt-4">
      <Collapsible
        title="New & changed abilities"
        subtitle={`${data.abilities.length} inferred from talent tooltips`}
        icon={<IconFan icons={fanIcons} />}
      >
        <div className="space-y-2">
          {data.abilities.map((ability) => (
            <AbilityCard key={ability.name} spell={ability} />
          ))}
        </div>
      </Collapsible>
    </div>
  );
}
