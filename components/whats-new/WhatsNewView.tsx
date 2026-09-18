"use client";

import { useState } from "react";
import { mediumIconUrl, CLASS_ICON, classLabel } from "@/lib/wow-data";
import type { DiffSummary } from "@/lib/whats-new";
import { CHANGE_KIND_TEXT_CLASS } from "@/lib/whats-new-style";
import ChangeBreakdownBar from "./ChangeBreakdownBar";
import Collapsible from "@/components/site/Collapsible";

function ClassChangeList({ summary }: { summary: DiffSummary }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {summary.byClass.map((cls) => (
          <span
            key={cls.classId}
            className="flex items-center gap-1.5 rounded border border-border bg-background/40 px-2 py-1 text-xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediumIconUrl(CLASS_ICON[cls.classId])} alt="" className="h-5 w-5 rounded" />
            <span className="text-foreground">{classLabel(cls.classId)}</span>
            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 font-semibold text-accent">{cls.total}</span>
          </span>
        ))}
      </div>

      {summary.byClass.length === 0 ? (
        <p className="text-sm text-foreground-muted">No talent changes recorded for this sync.</p>
      ) : (
        <div className="space-y-4">
          {summary.byClass.map((cls) => (
            <div key={cls.classId}>
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediumIconUrl(CLASS_ICON[cls.classId])} alt="" className="h-6 w-6 rounded" />
                <h3 className="font-heading text-sm font-semibold tracking-wide text-accent">
                  {classLabel(cls.classId)}
                </h3>
              </div>
              <ul className="mt-1.5 space-y-1 pl-1 text-sm">
                {cls.entries.map((entry) => (
                  <li key={`${entry.treeName}-${entry.name}-${entry.kind}`} className="text-foreground-muted">
                    <span className="font-medium text-foreground">{entry.name}</span>{" "}
                    <span className={CHANGE_KIND_TEXT_CLASS[entry.kind]}>{entry.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// "Pick a class" row (talentsforever's own pattern, per the task): every
// class that appears in this diff gets an icon + badge count; selecting one
// scrolls the plain-language detail list for just that class into view
// below, instead of showing every class's list at once.
function ClassPickerRow({
  summary,
  selected,
  onSelect,
}: {
  summary: DiffSummary;
  selected: string | null;
  onSelect: (classId: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {summary.byClass.map((cls) => (
        <button
          key={cls.classId}
          type="button"
          onClick={() => onSelect(selected === cls.classId ? null : cls.classId)}
          className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
            selected === cls.classId
              ? "border-accent bg-surface-hover text-foreground"
              : "border-border text-foreground-muted hover:border-accent/60 hover:text-foreground"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediumIconUrl(CLASS_ICON[cls.classId])} alt="" className="h-5 w-5 rounded" />
          {classLabel(cls.classId)}
          <span className="rounded-full bg-accent/20 px-1.5 py-0.5 font-semibold text-accent">{cls.total}</span>
        </button>
      ))}
    </div>
  );
}

function SelectedClassDetail({ summary, classId }: { summary: DiffSummary; classId: string }) {
  const cls = summary.byClass.find((c) => c.classId === classId);
  if (!cls) return null;

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/40 p-3">
      <ul className="space-y-1 text-sm">
        {cls.entries.map((entry) => (
          <li key={`${entry.treeName}-${entry.name}-${entry.kind}`} className="text-foreground-muted">
            <span className="font-medium text-foreground">{entry.name}</span>{" "}
            <span className={CHANGE_KIND_TEXT_CLASS[entry.kind]}>{entry.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function WhatsNewView({ latest, history }: { latest: DiffSummary; history: DiffSummary[] }) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-accent/40 bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-wide text-accent">Latest sync</h2>
          <span className="text-xs text-foreground-muted">
            {latest.oldLabel} → {latest.newLabel}
          </span>
        </div>

        <div className="mt-3">
          <ChangeBreakdownBar totals={latest.totals} otherSubstantiveChanges={latest.otherSubstantiveChanges} />
        </div>

        {latest.byClass.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
              Pick a class
            </p>
            <ClassPickerRow summary={latest} selected={selectedClass} onSelect={setSelectedClass} />
            {selectedClass && <SelectedClassDetail summary={latest} classId={selectedClass} />}
          </div>
        )}

        <p className="mt-4 text-[11px] text-foreground-muted/60">
          Counts cover talents added, removed, moved, or with a prerequisite change. Tooltip
          wording/precision-only updates (e.g. a talent&apos;s text getting confirmed against the beta client)
          aren&apos;t counted separately here -- see the full diff for those.
        </p>
      </section>

      <Collapsible title="Every change, line by line" subtitle="All classes in the latest sync, ungrouped">
        <ClassChangeList summary={latest} />
      </Collapsible>

      {history.length > 0 && (
        <section>
          <h2 className="font-heading text-base font-semibold tracking-wide text-accent">Earlier syncs</h2>
          <p className="mt-1 text-xs text-foreground-muted">
            Real history, not placeholder data -- back to the first pull this diff tooling was run
            against ({history[0].oldLabel}).
          </p>
          <div className="mt-3 space-y-3">
            {[...history].reverse().map((summary) => (
              <Collapsible
                key={`${summary.oldLabel}_${summary.newLabel}`}
                title={`${summary.oldLabel} → ${summary.newLabel}`}
                subtitle={`${summary.totals.total} talent changes`}
              >
                <ChangeBreakdownBar totals={summary.totals} otherSubstantiveChanges={summary.otherSubstantiveChanges} />
                <div className="mt-4">
                  <ClassChangeList summary={summary} />
                </div>
              </Collapsible>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
