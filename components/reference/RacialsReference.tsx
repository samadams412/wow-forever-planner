"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { getClassRacials, type ClassRacialSpell } from "@/lib/class-racials";
import { getRacialsForRace, mediumIconUrl, races, type Race, type Racial } from "@/lib/wow-data";

type AbilityRef = { raceId: string; name: string };
type AbilityContent = { name: string; icon: string; description: string; meta?: string; type?: Racial["type"] };
type TooltipState = { ability: AbilityContent; x: number; y: number } | null;
type DetailState = { ability: Racial | ClassRacialSpell; race: Race; priest: boolean } | null;

const PRIEST_SPELL_POWER: Record<string, string> = {
  // Coefficients copied from data/sources/talentsforever/talentsforever-2026-09-24.json.
  "Divine Grace": "42.9% of spell power (heal)",
  Chastise: "14.3% of spell power (direct)",
  "Desperate Prayer": "42.9% of spell power (heal)",
  Starshards: "16.7% of spell power (per tick)",
};

const RACE_ORDER: Record<string, string[]> = {
  Horde: ["orc", "undead", "tauren", "troll", "skyborne-horde"],
  Alliance: ["human", "dwarf", "night-elf", "gnome", "skyborne-alliance"],
};
const FACTIONS = [
  { name: "Horde", heading: "text-red-400", header: "from-red-950/70 to-surface", border: "hover:border-red-500/60" },
  { name: "Alliance", heading: "text-blue-400", header: "from-blue-950/70 to-surface", border: "hover:border-blue-400/60" },
] as const;

function cooldown(description: string) {
  return description.match(/\b(\d+\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hour|hr))\s+cooldown\b/i)?.[1] ?? null;
}

function castType(description: string, type: Racial["type"]) {
  if (type === "passive") return "Passive";
  if (/\binstant\b/i.test(description)) return "Instant";
  const cast = description.match(/\b(\d+(?:\.\d+)?\s*(?:sec(?:ond)?s?|min(?:ute)?s?))\s+cast\b/i);
  if (cast) return `Timed cast · ${cast[1]}`;
  if (/\bchanneled\b/i.test(description)) return "Channeled";
  return "Passive";
}

function tooltipSubtitle(ability: AbilityContent) {
  if (ability.meta) return ability.meta;
  const type = ability.type ?? "active";
  if (type === "passive") return "Racial · Passive";
  const cd = cooldown(ability.description);
  return `Racial · ${castType(ability.description, type)}${cd ? ` · ${cd} cooldown` : ""}`;
}

function tooltipDescription(ability: AbilityContent) {
  const description = ability.description;
  if (ability.meta || ability.type !== "active") return description;

  const sentence = description.match(/^(.+?)\.\s+([A-Z][\s\S]*)$/);
  const preamble = sentence?.[1] ?? description;
  const remainder = sentence?.[2] ?? "";
  const redundantMeta = /^(?:instant|\d+(?:\.\d+)?\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hour|hr)\s+(?:cast|cooldown))$/i;
  const remaining = preamble.split(/,\s*/).filter((part) => !redundantMeta.test(part.trim()));
  if (remaining.length === preamble.split(/,\s*/).length) return description;
  return [remaining.join(", ").trim(), remainder].filter(Boolean).join(remaining.length && remainder ? ". " : "");
}

function Icon({ name, className, alt = "" }: { name: string; className: string; alt?: string }) {
  // The catalog uses Blizzard icon slugs; the site already uses Wowhead's icon CDN.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={mediumIconUrl(name)} alt={alt} className={className} loading="lazy" />;
}

function AbilityDetails({ ability, race, priest, onClose }: { ability: Racial | ClassRacialSpell; race: Race; priest: boolean; onClose: () => void }) {
  const description = ability.description;
  const meta = priest ? (ability as ClassRacialSpell).meta ?? "" : "";
  const cd = priest ? meta.match(/\b(\d+\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hour|hr))\s+cooldown\b/i)?.[1] ?? null : (ability as Racial).type === "active" ? cooldown(description) : null;
  const range = meta.match(/\b(\d+\s*yd range)\b/i)?.[1] ?? null;
  const cast = meta.match(/\b(Instant|\d+(?:\.\d+)?\s*(?:sec(?:ond)?s?|min(?:ute)?s?) cast|Channeled)\b/i)?.[1] ?? (priest ? null : castType(description, (ability as Racial).type));
  const growth = priest ? PRIEST_SPELL_POWER[ability.name] : null;
  return (
    <section className="relative col-span-full rounded-md border border-accent/50 bg-surface p-4 shadow-[0_8px_24px_rgba(0,0,0,.18)] animate-in fade-in slide-in-from-top-1">
      <span className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-accent/50 bg-surface" />
      <button onClick={onClose} aria-label="Close racial details" className="absolute right-3 top-3 rounded p-1.5 text-foreground-muted hover:bg-surface-hover hover:text-foreground"><X size={16} /></button>
      <div className="flex items-center gap-3 pr-8">
        <Icon name={ability.icon} className="h-10 w-10 rounded border border-accent/50" />
        <div>
          <h3 className="font-heading text-lg font-bold uppercase tracking-wide text-accent">{ability.name}</h3>
          <p className="text-xs text-foreground-muted">{priest ? `Only ${race.name} Priests learn it` : `${race.name} racial · ${cast}`}</p>
        </div>
      </div>
      {!priest && cd && <div className="mt-2"><MetaBadge label="Cooldown" value={cd} /></div>}
      {priest && <div className="mt-3 flex flex-wrap gap-1.5">
        {range && <MetaBadge label="Range" value={range} />}
        {cast && <MetaBadge label="Cast" value={cast} />}
        {cd && <MetaBadge label="Cooldown" value={cd} />}
      </div>}
      <p className="mt-3 text-sm leading-relaxed text-foreground">{description}</p>
      {(ability as Racial).note && <p className="mt-2 text-xs leading-relaxed text-foreground-muted">{(ability as Racial).note}</p>}
      {growth && <div className="mt-3 border-t border-border/70 pt-2 text-xs"><span className="text-foreground-muted">Grows with</span><p className="mt-0.5 font-semibold text-foreground">{growth}</p></div>}
    </section>
  );
}

function MetaBadge({ label, value }: { label: string; value: string }) {
  return <div className="min-w-16 rounded border border-border bg-surface-hover/60 px-2 py-1"><p className="text-[9px] uppercase tracking-wide text-foreground-muted">{label}</p><p className="text-xs font-bold text-accent">{value}</p></div>;
}

function RaceCard({ race, factionStyle, openAbility, onAbilityClick, onPriestClick, setTooltip, priestOpen, setPriestOpen }: {
  race: Race; factionStyle: (typeof FACTIONS)[number]; openAbility: AbilityRef | null;
  onAbilityClick: (ref: AbilityRef, ability: Racial) => void;
  onPriestClick: (ref: AbilityRef, ability: ClassRacialSpell) => void;
  setTooltip: (tooltip: TooltipState) => void;
  priestOpen: boolean; setPriestOpen: (raceId: string | null) => void;
}) {
  const abilities = getRacialsForRace(race.id);
  const classRacials = race.allowedClasses.includes("priest") ? getClassRacials("priest")?.races[race.name] : undefined;
  return (
    <article className={`min-w-0 overflow-hidden rounded-sm border border-border bg-surface ${factionStyle.border} transition-colors`}>
      <header className={`flex min-h-[68px] items-center gap-2 border-b border-border bg-gradient-to-b ${factionStyle.header} px-2.5 py-2`}>
        <Icon name={race.icon} alt={`${race.name} crest`} className="h-12 w-12 shrink-0 rounded-full border-2 border-accent/80 bg-black object-cover shadow-[0_0_0_2px_rgba(0,0,0,.65)]" />
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-bold uppercase leading-tight tracking-wide text-accent">{race.id.startsWith("skyborne") ? "Skyborne" : race.name}</h3>
          {race.id.startsWith("skyborne") && <p className="mt-0.5 text-[10px] leading-tight text-foreground-muted">{race.id.endsWith("horde") ? "Windshaper" : "High Order"}</p>}
        </div>
      </header>
      <ul className="px-2 py-1">
        {abilities.map((ability) => {
          const active = openAbility?.raceId === race.id && openAbility.name === ability.name;
          const cd = ability.type === "active" ? cooldown(ability.description) : null;
          return <li key={ability.name} className="border-b border-border/60 last:border-0">
            <button type="button" onClick={() => onAbilityClick({ raceId: race.id, name: ability.name }, ability)}
              onMouseEnter={(event) => setTooltip({ ability, x: event.clientX, y: event.clientY })} onMouseMove={(event) => setTooltip({ ability, x: event.clientX, y: event.clientY })} onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setTooltip({ ability, x: rect.left + rect.width / 2, y: rect.bottom }); }} onBlur={() => setTooltip(null)}
              aria-expanded={active} className={`group flex min-h-[39px] w-full items-center gap-2 px-0.5 py-1 text-left transition-colors hover:bg-surface-hover ${active ? "text-accent" : "text-foreground"}`}>
              <Icon name={ability.icon} className={`h-7 w-7 shrink-0 rounded-sm border ${active ? "border-accent" : "border-white/15"}`} />
              <span className="min-w-0 flex-1 text-[11px] font-semibold leading-tight">{ability.name}</span>
              {cd && <span className="shrink-0 rounded border border-accent/50 bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-accent">{cd}</span>}
            </button>
          </li>;
        })}
      </ul>
      {classRacials?.length ? <div className="border-t border-accent/30 bg-accent/5">
        <button type="button" onClick={() => setPriestOpen(priestOpen ? null : race.id)} aria-expanded={priestOpen} className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left font-sans text-[10px] font-semibold uppercase tracking-wide text-foreground hover:bg-accent/10">
          <Icon name="spell_holy_powerwordshield" className="h-4 w-4 rounded-sm" /> <span className="min-w-0 flex-1">{race.name} priest racials</span><span className="rounded-full border border-accent/30 px-1.5 text-[9px]">{classRacials.length}</span><ChevronDown size={13} className={`transition-transform ${priestOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`grid transition-[grid-template-rows] duration-300 ${priestOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}><div className="overflow-hidden">
          {classRacials.map((spell) => {
            const active = openAbility?.raceId === race.id && openAbility.name === spell.name;
            const cd = spell.meta?.match(/\b(\d+\s*(?:sec(?:ond)?s?|min(?:ute)?s?|hour|hr))\s+cooldown\b/i)?.[1];
            return <button key={spell.name} type="button" onClick={() => onPriestClick({ raceId: race.id, name: spell.name }, spell)}
              onMouseEnter={(event) => setTooltip({ ability: spell, x: event.clientX, y: event.clientY })} onMouseMove={(event) => setTooltip({ ability: spell, x: event.clientX, y: event.clientY })} onMouseLeave={() => setTooltip(null)}
              onFocus={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setTooltip({ ability: spell, x: rect.left + rect.width / 2, y: rect.bottom }); }} onBlur={() => setTooltip(null)}
              aria-expanded={active} className={`flex min-h-[39px] w-full items-center gap-2 border-t border-border/60 px-2 py-1.5 text-left transition-colors hover:bg-surface-hover ${active ? "bg-accent/10 text-accent" : "text-foreground"}`}>
              <Icon name={spell.icon} className={`h-7 w-7 shrink-0 rounded-sm border ${active ? "border-accent" : "border-border"}`} /><span className="min-w-0 flex-1 text-[11px] font-semibold leading-tight">{spell.name}</span>{cd && <span className="shrink-0 rounded border border-accent/50 bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none text-accent">{cd}</span>}
            </button>;
          })}
        </div></div>
      </div> : null}
    </article>
  );
}

export default function RacialsReference() {
  const [openAbility, setOpenAbility] = useState<AbilityRef | null>(null);
  const [detail, setDetail] = useState<DetailState>(null);
  const [activeTooltip, setActiveTooltip] = useState<TooltipState>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ left: 12, top: 12 });
  const [openPriest, setOpenPriest] = useState<string | null>(null);
  const orderedRaces = (faction: "Horde" | "Alliance") => RACE_ORDER[faction].map((id) => races.find((race) => race.id === id)).filter((race): race is Race => Boolean(race));

  useLayoutEffect(() => {
    if (!activeTooltip || !tooltipRef.current) return;
    const reposition = () => {
      if (!tooltipRef.current) return;
      const { width, height } = tooltipRef.current.getBoundingClientRect();
      const margin = 12;
      let left = activeTooltip.x + 16;
      let top = activeTooltip.y + 16;
      if (left + width > window.innerWidth - margin) left = activeTooltip.x - width - 16;
      if (top + height > window.innerHeight - margin) top = activeTooltip.y - height - 16;
      left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
      setTooltipPosition((current) => current.left === left && current.top === top ? current : { left, top });
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [activeTooltip]);

  return <div className="mt-5">
    <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] text-foreground-muted"><span className="rounded border border-accent/50 bg-accent/15 px-1.5 py-0.5 font-bold uppercase text-accent">2 min</span><span>is the cooldown. Select a racial for full details.</span><span className="ml-auto hidden sm:inline">Hover an ability to preview</span></div>
    {FACTIONS.map((factionStyle) => {
      const faction = factionStyle.name;
      const factionRaces = orderedRaces(faction);
      return <section key={faction} className="mb-5">
        <h2 className={`mb-1.5 border-b border-border pb-1 font-heading text-[11px] font-bold uppercase tracking-[.14em] ${factionStyle.heading}`}>{faction}</h2>
        <div className="grid grid-cols-2 items-stretch gap-2 lg:grid-cols-5">
          {factionRaces.map((race) => <RaceCard key={race.id} race={race} factionStyle={factionStyle} openAbility={openAbility} onAbilityClick={(ref, ability) => {
            const isOpen = openAbility?.raceId === ref.raceId && openAbility.name === ref.name;
            setOpenAbility(isOpen ? null : ref); setDetail(isOpen ? null : { ability, race, priest: false }); setActiveTooltip(null);
          }} onPriestClick={(ref, ability) => {
            const isOpen = openAbility?.raceId === ref.raceId && openAbility.name === ref.name;
            setOpenAbility(isOpen ? null : ref); setDetail(isOpen ? null : { ability, race, priest: true }); setActiveTooltip(null);
          }} setTooltip={setActiveTooltip} priestOpen={openPriest === race.id} setPriestOpen={setOpenPriest} />)}
          {detail && factionRaces.some((race) => race.id === detail.race.id) && <AbilityDetails ability={detail.ability} race={detail.race} priest={detail.priest} onClose={() => { setOpenAbility(null); setDetail(null); }} />}
        </div>
      </section>;
    })}
    {activeTooltip && <div ref={tooltipRef} role="tooltip" className="pointer-events-none fixed z-50 max-h-[calc(100vh-1.5rem)] w-[min(19rem,calc(100vw-1.5rem))] overflow-y-auto rounded border border-accent/50 bg-[#100f0de8] p-2.5 text-white shadow-xl backdrop-blur-sm" style={{ left: tooltipPosition.left, top: tooltipPosition.top }}>
      <div className="flex items-center gap-2"><Icon name={activeTooltip.ability.icon} className="h-8 w-8 shrink-0 rounded-sm border border-white/20" /><div className="min-w-0"><p className="font-heading text-sm font-bold uppercase leading-tight text-accent">{activeTooltip.ability.name}</p><p className="mt-0.5 text-[10px] leading-tight text-[#b9b3a7]">{tooltipSubtitle(activeTooltip.ability)}</p></div></div>
      <div className="my-2 border-t border-white/15" />
      <p className="text-xs leading-relaxed text-accent">{tooltipDescription(activeTooltip.ability)}</p>{PRIEST_SPELL_POWER[activeTooltip.ability.name] && <p className="mt-1.5 text-[10px] text-[#b9b3a7]">Grows with <span className="font-semibold text-white">{PRIEST_SPELL_POWER[activeTooltip.ability.name]}</span></p>}<p className="mt-1.5 border-t border-white/10 pt-1 text-[10px] text-[#b9b3a7]">Click to read more</p>
    </div>}
  </div>;
}
