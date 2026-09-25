"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { mediumIconUrl, CLASS_ICON, classLabel } from "@/lib/wow-data";
import type { PatchBuild } from "@/lib/patch-notes";
import PatchNoteEntryRow from "./PatchNoteEntryRow";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// A controlled collapsible (the shared Collapsible keeps its own open state,
// which the class chips and Expand/Collapse all need to drive from outside).
function Section({
  id,
  title,
  subtitle,
  icon,
  open,
  onToggle,
  muted,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  open: boolean;
  onToggle: () => void;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <div id={id} className={`rounded-lg border border-border bg-surface ${muted ? "opacity-90" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center justify-between gap-3 p-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <div>
            <div className={`font-semibold ${muted ? "text-sm text-foreground-muted" : "text-base text-accent"}`}>
              {title}
            </div>
            {subtitle && <div className="mt-0.5 text-xs text-foreground-muted">{subtitle}</div>}
          </div>
        </div>
        <span className="shrink-0 rounded border border-accent/40 px-2 py-0.5 text-xs text-accent transition-colors group-hover:border-accent group-hover:bg-surface-hover">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}

function BuildCard({ build, isLatest }: { build: PatchBuild; isLatest: boolean }) {
  const classIds = Object.keys(build.classes).filter((c) => build.classes[c].length > 0);
  const hasBody = build.entryCount > 0 || build.other.length > 0 || (build.pendingInData?.length ?? 0) > 0;
  const [bodyOpen, setBodyOpen] = useState(isLatest);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const sectionKeys = [...classIds.map((c) => `class:${c}`), ...(build.races.length ? ["races"] : []), ...(build.other.length ? ["other"] : [])];
  const idFor = (key: string) => `b${build.build.replace(/\./g, "-")}-${key.replace(":", "-")}`;
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  function jumpTo(key: string) {
    setOpen((o) => ({ ...o, [key]: true }));
    // Wait a frame so the section's body exists before scrolling to it.
    requestAnimationFrame(() => document.getElementById(idFor(key))?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <article className={`rounded-lg border bg-surface p-4 ${isLatest ? "border-accent/40" : "border-border"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-heading text-lg font-semibold tracking-wide text-accent">Build {build.build}</h2>
          {isLatest && (
            <span className="rounded-sm border border-accent/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Latest
            </span>
          )}
        </div>
        <span className="text-xs text-foreground-muted">{formatDate(build.date)}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{build.title}</div>
      <p className="mt-1.5 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">{build.summary}</p>
      <p className="mt-2 text-xs text-foreground-muted/80">
        {build.sourceUrl && (
          <>
            Source:{" "}
            {/* Blizzard blue; a darker blue on the Light theme's white background. */}
            <a
              href={build.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#1a8cff] hover:text-[#5aa9ff] hover:underline [.light-mode_&]:text-[#0b5cbd] [.light-mode_&]:hover:text-[#08458f]"
            >
              {build.sourceLabel ?? "Blizzard forums"}
            </a>
            .{" "}
          </>
        )}
        {build.sourceNote}
      </p>

      {hasBody && (
        <button
          type="button"
          onClick={() => setBodyOpen((v) => !v)}
          aria-expanded={bodyOpen}
          className="mt-3 rounded border border-accent/40 px-2.5 py-1 text-xs text-accent transition-colors hover:border-accent hover:bg-surface-hover"
        >
          {bodyOpen ? "Hide changes" : `Show changes${build.entryCount ? ` (${build.entryCount})` : ""}`}
        </button>
      )}

      {hasBody && bodyOpen && (
        <div className="mt-4 space-y-4">
          {build.pendingInData && build.pendingInData.length > 0 && (
            <div className="rounded-lg border border-amber-300/40 bg-amber-300/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Not yet reflected in our planner data
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground-muted">
                {build.pendingInData.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {classIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {classIds.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => jumpTo(`class:${c}`)}
                  className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-foreground-muted transition-colors hover:border-accent/60 hover:text-foreground"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediumIconUrl(CLASS_ICON[c])} alt="" className="h-5 w-5 rounded" />
                  {classLabel(c)}
                  <span className="rounded-full bg-accent/20 px-1.5 py-0.5 font-semibold text-accent">
                    {build.classes[c].length}
                  </span>
                </button>
              ))}
              <span className="ml-auto flex gap-3 text-xs">
                <button
                  type="button"
                  className="text-accent hover:underline"
                  onClick={() => setOpen(Object.fromEntries(sectionKeys.filter((k) => k !== "other").map((k) => [k, true])))}
                >
                  Expand all
                </button>
                <button type="button" className="text-foreground-muted hover:underline" onClick={() => setOpen({})}>
                  Collapse all
                </button>
              </span>
            </div>
          )}

          {classIds.map((c) => (
            <Section
              key={c}
              id={idFor(`class:${c}`)}
              title={classLabel(c)}
              subtitle={`${build.classes[c].length} change${build.classes[c].length === 1 ? "" : "s"}`}
              icon={
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediumIconUrl(CLASS_ICON[c])} alt="" className="h-7 w-7 rounded" />
              }
              open={Boolean(open[`class:${c}`])}
              onToggle={() => toggle(`class:${c}`)}
            >
              <ul className="space-y-2">
                {build.classes[c].map((entry) => (
                  <PatchNoteEntryRow key={`${entry.name}-${entry.kind}`} entry={entry} idPrefix={`${build.build}:${c}`} />
                ))}
              </ul>
            </Section>
          ))}

          {build.races.length > 0 && (
            <Section
              id={idFor("races")}
              title="Race changes"
              subtitle={`${build.races.length} change${build.races.length === 1 ? "" : "s"}`}
              open={Boolean(open["races"])}
              onToggle={() => toggle("races")}
            >
              <ul className="space-y-2">
                {build.races.map((entry) => (
                  <PatchNoteEntryRow key={`${entry.race}-${entry.name}`} entry={entry} idPrefix={`${build.build}:race`} />
                ))}
              </ul>
            </Section>
          )}

          {build.other.length > 0 && (
            <Section
              id={idFor("other")}
              title="Other changes"
              subtitle="Items, quests, client features and fixes -- summarized, not the full list"
              muted
              open={Boolean(open["other"])}
              onToggle={() => toggle("other")}
            >
              <div className="space-y-4">
                {build.other.map((section) => (
                  <div key={section.heading}>
                    <h3 className="text-sm font-semibold text-foreground">{section.heading}</h3>
                    <ul className="mt-1 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground-muted">
                      {section.points.map((p) => (
                        <li key={p.text}>
                          {p.text}
                          {p.links && (
                            <span className="ml-1.5 inline-flex flex-wrap gap-x-2">
                              {p.links.map((l) => (
                                <Link key={l.href} href={l.href} className="text-accent hover:underline">
                                  {l.label}
                                </Link>
                              ))}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </article>
  );
}

export default function InGameSection({ builds, children }: { builds: PatchBuild[]; children?: ReactNode }) {
  return (
    <div className="space-y-4">
      {builds.map((b, i) => (
        <BuildCard key={b.build} build={b} isLatest={i === 0} />
      ))}
      {children}
    </div>
  );
}
