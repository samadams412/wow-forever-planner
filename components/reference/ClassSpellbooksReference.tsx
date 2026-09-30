"use client";

import { useEffect, useRef, useState } from "react";
import { spellbooks, SPELLBOOK_CLASS_ORDER } from "@/lib/spellbooks";
import { getClassRacials } from "@/lib/class-racials";
import { mediumIconUrl, getRaceIconByName, CLASS_ICON, classLabel } from "@/lib/wow-data";
import Collapsible from "@/components/site/Collapsible";
import IconFan from "@/components/site/IconFan";
import SpellbookBook from "./SpellbookBook";
import ClassAbilitiesSection, { AbilityCard } from "./ClassAbilitiesSection";

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
                  <AbilityCard key={spell.name} spell={spell} />
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

function ClassSection({ classId, compareMode, onCompareModeChange, open, onToggle }: { classId: string; compareMode: boolean; onCompareModeChange: () => void; open: boolean; onToggle: () => void }) {
  const book = spellbooks.classes[classId];

  return (
    <section className="overflow-hidden rounded-lg border border-[#8a6d3b]/60 bg-[#17120c] shadow-lg shadow-black/20">
      <button type="button" onClick={onToggle} aria-expanded={open} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${open ? "bg-[#302416]" : "hover:bg-[#241b10]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediumIconUrl(CLASS_ICON[classId])} alt="" className={`h-10 w-10 rounded border ${open ? "border-[#d5b65f]" : "border-[#8a6d3b]/70"}`} />
        <span className="min-w-0 flex-1"><span className="block font-heading text-sm font-semibold tracking-wide text-accent">{classLabel(classId)}</span><span className="mt-0.5 block text-xs text-foreground-muted">{book.tabs.length} spellbook tabs · {book.tabs.reduce((n, tab) => n + tab.spells.length, 0)} abilities</span></span>
        <span className="text-accent transition-transform" style={{ transform: open ? "rotate(180deg)" : undefined }}>⌄</span>
      </button>
      <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
       <div className="min-h-0 overflow-hidden"><div className="border-t border-[#8a6d3b]/40 p-2 sm:p-4">
      <SpellbookBook classId={classId} book={book} compareMode={compareMode} onCompareModeChange={onCompareModeChange} />

      {book.notes.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-foreground-muted">
          {book.notes.map((note) => (
            <li key={note} className="flex gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent/60" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      <ClassAbilitiesSection classId={classId} />

      {book.notOpened.length > 0 && (
        <p className="mt-3 text-xs text-foreground-muted/70">
          Not opened on stream: {book.notOpened.join(", ")}.
        </p>
      )}

      <p className="mt-1 text-xs text-foreground-muted/70">Source: {spellbooks.source}</p>

      <ClassRacialsSection classId={classId} />
       </div></div>
      </div>
    </section>
  );
}

export default function ClassSpellbooksReference() {
  // Bumped to force every ClassSection (and the Collapsible inside it) to
  // remount with its default (closed) state -- simpler and more robust
  // than lifting open/close state up into each Collapsible individually.
  const [collapseAllKey, setCollapseAllKey] = useState(0);
  const [activeClass, setActiveClass] = useState<string | null>(null);
  const collapseAll = () => { setCollapseAllKey((k) => k + 1); setActiveClass(null); };
  const [compareMode, setCompareMode] = useState(false);

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
            Every trainer-taught spell for each class, every rank and level, read straight from the WoW
            Forever beta client&apos;s own files, with every rank ready to browse. Spells tagged{" "}
            <span className="font-semibold text-amber-300">Talent</span> are granted by a talent in the
            Forever talent trees, not trained normally, so they only show up in your own book once you take
            that talent.
          </p>
        </div>

      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">Choose a class</h2>
        <div className="flex items-center gap-3">
          {activeClass && <button type="button" onClick={collapseAll} className="text-xs text-foreground-muted hover:text-accent">Collapse</button>}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {SPELLBOOK_CLASS_ORDER.map((classId) => <button key={classId} type="button" onClick={() => setActiveClass((active) => active === classId ? null : classId)} aria-expanded={activeClass === classId} aria-label={`${activeClass === classId ? "Close" : "Open"} ${classLabel(classId)} spellbook`} className={`group flex flex-col items-center gap-1 rounded-md border p-2 transition-all ${activeClass === classId ? "border-[#d5b65f] bg-[#3a2b18] shadow-[0_0_14px_rgba(201,169,97,0.18)]" : "border-border bg-surface hover:border-accent/60 hover:bg-surface-hover"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediumIconUrl(CLASS_ICON[classId])} alt="" className="h-9 w-9 rounded" />
          <span className={`text-xs ${activeClass === classId ? "text-accent" : "text-foreground-muted group-hover:text-foreground"}`}>{classLabel(classId)}</span>
        </button>)}
      </div>

      {/* {!headerButtonVisible && (
        <button
          type="button"
          onClick={collapseAll}
          className="fixed bottom-5 left-5 z-20 rounded-full border border-accent/60 bg-surface px-4 py-2 text-xs font-medium text-accent shadow-lg shadow-black/40 transition-colors hover:border-accent hover:bg-surface-hover"
        >
          Collapse all
        </button>
      )} */}

      <div className="mt-3">
        {activeClass && <ClassSection key={`${activeClass}-${collapseAllKey}`} classId={activeClass} compareMode={compareMode} onCompareModeChange={() => setCompareMode((v) => !v)} open onToggle={() => setActiveClass(null)} />}
      </div>
      
    </div>
    
  );
}
