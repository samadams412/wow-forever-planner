import { mediumIconUrl } from "@/lib/wow-data";
import { getNewAbilities, type NewAbility } from "@/lib/class-abilities";
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

const MIN_LEVEL = 1;
const MAX_LEVEL = 60;
const TICK_LEVELS = [10, 30, 60];
// Stacked icons per level on the timeline before collapsing to "+N".
const MAX_STACKED_ICONS = 3;

function levelPercent(level: number) {
  return ((level - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * 100;
}

function LevelTimeline({ abilities }: { abilities: NewAbility[] }) {
  const byLevel = new Map<number, NewAbility[]>();
  for (const a of abilities) byLevel.set(a.level, [...(byLevel.get(a.level) ?? []), a]);

  return (
    <div className="relative mx-3 mt-2 h-12">
      <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-accent/40" />
      {TICK_LEVELS.map((level) => (
        <div
          key={level}
          className="absolute top-[calc(50%+10px)] -translate-x-1/2 text-[10px] text-foreground-muted/70"
          style={{ left: `${levelPercent(level)}%` }}
        >
          {level}
        </div>
      ))}
      {[...byLevel.entries()].map(([level, group]) => (
        <div
          key={level}
          className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
          style={{ left: `${levelPercent(level)}%` }}
          title={group.map((a) => `${a.name} (level ${a.level})`).join("\n")}
        >
          {group.slice(0, MAX_STACKED_ICONS).map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={a.name}
              src={mediumIconUrl(a.icon)}
              alt=""
              className="h-6 w-6 rounded-sm border border-accent/70 bg-background"
              style={{ marginLeft: i === 0 ? 0 : -6 }}
            />
          ))}
          {group.length > MAX_STACKED_ICONS && (
            <span className="ml-1 text-[10px] font-semibold text-accent">+{group.length - MAX_STACKED_ICONS}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function NewAbilityCard({ ability }: { ability: NewAbility }) {
  return (
    <div className="flex gap-3 rounded border border-border bg-background/40 p-2.5">
      <div className="flex w-10 shrink-0 flex-col items-center rounded border border-accent/60 bg-background/70 py-1">
        <span className="text-[8px] font-semibold uppercase tracking-wider text-foreground-muted">Level</span>
        <span className="text-base font-bold leading-tight text-accent">{ability.level}</span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediumIconUrl(ability.icon)} alt="" className="h-8 w-8 shrink-0 rounded-sm" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-accent">{ability.name}</span>
          <span className="inline-block rounded border border-border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground-muted">
            {ability.tab}
          </span>
        </div>
        <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-foreground-muted">{ability.description}</p>
      </div>
    </div>
  );
}

// Per-class "New in Forever" abilities, derived from data/spellbooks.json.
// Changed-from-Classic abilities are not shown here yet (see the count in the
// PR notes -- too many to present as a second list without a clearer criterion).
export default function ClassAbilitiesSection({ classId }: { classId: string }) {
  const abilities = getNewAbilities(classId);
  if (abilities.length === 0) return null;

  const fanIcons = abilities.slice(0, 3).map((a) => a.icon);

  return (
    <div className="mt-4">
      <Collapsible
        title={`New ${classId.charAt(0).toUpperCase() + classId.slice(1)} abilities`}
        subtitle={`${abilities.length} new in Forever, compared with Classic by spell`}
        icon={<IconFan icons={fanIcons} />}
      >
        <LevelTimeline abilities={abilities} />
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {abilities.map((ability) => (
            <NewAbilityCard key={ability.name} ability={ability} />
          ))}
        </div>
      </Collapsible>
    </div>
  );
}
