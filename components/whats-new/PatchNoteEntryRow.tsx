"use client";

import { NOTE_KIND_BADGE_CLASS, NOTE_KIND_LABEL } from "@/lib/whats-new-style";
import type { NoteEntry } from "@/lib/patch-notes";
import PatchChangeDiff from "./PatchChangeDiff";
import PatchNoteRef from "./PatchNoteRef";

// One line of a build's patch notes: the linked talent/spell (or plain name
// when our data doesn't track it), what kind of change it is, a plain-language
// summary, any before -> after values, and Blizzard's developer note.
export default function PatchNoteEntryRow({ entry, idPrefix }: { entry: NoteEntry; idPrefix: string }) {
  const label = entry.label ?? entry.name;
  const caption = [entry.race, entry.spec].filter(Boolean).join(" · ");

  return (
    <li className="rounded-md border border-border/60 bg-background/30 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {entry.ref ? (
          <PatchNoteRef refData={entry.ref} label={label} tooltipId={`${idPrefix}:${entry.name}`} />
        ) : (
          <span className="rounded border border-border/60 px-1.5 py-1 text-sm font-medium text-foreground">
            {label}
          </span>
        )}
        <span
          className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${NOTE_KIND_BADGE_CLASS[entry.kind]}`}
        >
          {NOTE_KIND_LABEL[entry.kind]}
        </span>
        {entry.oldName && <span className="text-xs text-foreground-muted">was {entry.oldName}</span>}
        {caption && <span className="text-xs text-foreground-muted/70">{caption}</span>}
      </div>

      <p className="mt-1.5 text-sm leading-relaxed text-foreground-muted">{entry.text}</p>

      {entry.changes && entry.changes.length > 0 && <PatchChangeDiff changes={entry.changes} />}

      {entry.devNote && (
        <blockquote className="mt-2 border-l-2 border-accent/50 pl-2.5 text-xs italic leading-relaxed text-foreground-muted/90">
          <span className="not-italic font-semibold uppercase tracking-wide text-accent/80">
            Developers&apos; note:{" "}
          </span>
          {entry.devNote}
        </blockquote>
      )}
    </li>
  );
}
