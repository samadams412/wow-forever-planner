"use client";

import { useEffect, useRef, useState } from "react";
import { spellbooks, SPELLBOOK_CLASS_ORDER } from "@/lib/spellbooks";
import { getClassRacials, type ClassRacialSpell } from "@/lib/class-racials";
import { mediumIconUrl, getRaceIconByName, CLASS_ICON, classLabel } from "@/lib/wow-data";
import Collapsible from "@/components/site/Collapsible";
import IconFan from "@/components/site/IconFan";
import SpellbookBook from "./SpellbookBook";

const SPELL_TAG_STYLE: Record<"new" | "changed", string> = {
  new: "border-green/50 bg-green/10 text-green",
  changed: "border-amber-400/50 bg-amber-400/10 text-amber-300",
};

const SPELL_TAG_LABEL: Record<"new" | "changed", string> = {
  new: "New",
  changed: "Changed",
};

function ClassRacialSpellCard({ spell }: { spell: ClassRacialSpell }) {
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

// Generic per-class "race-specific bonus spells" section -- driven entirely
// by data/class-racials.json, so adding another class there is enough to
// get this section for free; nothing here is Priest-specific.
function ClassRacialsSection({ classId }: { classId: string }) {
  const data = getClassRacials(classId);
  if (!data) return null;

  // Representative summary icon: first spell of each of the first 3 races.
  // Generic on purpose -- works for any class's data without special-casing.
  const fanIcons = Object.values(data.races)
    .slice(0, 3)
    .map((spells) => spells[0].icon);

  return (
    <div className="mt-4">
      <Collapsible
        title="Race-specific bonus spells"
        subtitle={data.note}
        icon={<IconFan icons={fanIcons} />}
      >
        <div className="space-y-3">
          {Object.entries(data.races).map(([race, spells]) => (
            <div key={race}>
              <div className="flex items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediumIconUrl(getRaceIconByName(race))} alt="" className="h-5 w-5 shrink-0 rounded-full" />
                <h5 className="text-xs font-semibold uppercase tracking-wide text-accent">{race}</h5>
              </div>
              <div className="mt-1.5 space-y-2">
                {spells.map((spell) => (
                  <ClassRacialSpellCard key={spell.name} spell={spell} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-foreground-muted/70">Source: {data.source}</p>
      </Collapsible>
    </div>
  );
}

function ClassSection({ classId }: { classId: string }) {
  const book = spellbooks.classes[classId];

  return (
    <Collapsible
      title={`${classLabel(classId)} spellbook at level 38`}
      subtitle={`Demo race: ${book.demoRace}`}
      icon={
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediumIconUrl(CLASS_ICON[classId])} alt="" className="h-8 w-8 rounded" />
      }
    >
      <SpellbookBook classId={classId} book={book} />

      {book.notes.length > 0 && (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
          {book.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {book.notOpened.length > 0 && (
        <p className="mt-3 text-xs text-foreground-muted/70">
          Not opened on stream: {book.notOpened.join(", ")}.
        </p>
      )}

      <p className="mt-1 text-xs text-foreground-muted/70">Source: {spellbooks.source}</p>

      <ClassRacialsSection classId={classId} />
    </Collapsible>
  );
}

export default function ClassSpellbooksReference() {
  // Bumped to force every ClassSection (and the Collapsible inside it) to
  // remount with its default (closed) state -- simpler and more robust
  // than lifting open/close state up into each Collapsible individually.
  const [collapseAllKey, setCollapseAllKey] = useState(0);
  const collapseAll = () => setCollapseAllKey((k) => k + 1);

  // The header's own "Collapse all" button scrolls out of view on a long
  // page of expanded spellbooks -- once that happens, a floating copy
  // takes over so the action stays reachable without scrolling back up.
  const [headerButtonVisible, setHeaderButtonVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setHeaderButtonVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div ref={headerRef} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Class Spellbooks</h1>
          <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
            Every trainer-taught spell a level 38 character had in the BlizzCon 2026 demo, read frame by
            frame from stream footage, one collapsible section per class. Spells tagged{" "}
            <span className="font-semibold text-amber-300">Talent</span> are in the Forever talent trees --
            they appear here only because that demo character had the talent, not because they&apos;re
            baseline.
          </p>
        </div>
        <button
          type="button"
          onClick={collapseAll}
          className="shrink-0 rounded border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:border-accent hover:bg-surface-hover"
        >
          Collapse all
        </button>
      </div>

      {!headerButtonVisible && (
        <button
          type="button"
          onClick={collapseAll}
          className="fixed bottom-5 right-5 z-20 rounded-full border border-accent/60 bg-surface px-4 py-2 text-xs font-medium text-accent shadow-lg shadow-black/40 transition-colors hover:border-accent hover:bg-surface-hover"
        >
          Collapse all
        </button>
      )}

      <div className="mt-5 space-y-3">
        {SPELLBOOK_CLASS_ORDER.map((classId) => (
          <ClassSection key={`${classId}-${collapseAllKey}`} classId={classId} />
        ))}
      </div>
    </div>
  );
}
