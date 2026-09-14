import { spellbooks, SPELLBOOK_CLASS_ORDER, type NewAbility } from "@/lib/spellbooks";
import { mediumIconUrl, CLASS_ICON, classLabel } from "@/lib/wow-data";
import Collapsible from "@/components/site/Collapsible";
import GoldRule from "@/components/site/GoldRule";
import SpellbookBook from "./SpellbookBook";

function NewAbilityCard({ ability }: { ability: NewAbility }) {
  const confirmed = ability.status === "confirmed";
  return (
    <div className="flex gap-2.5 rounded border border-border bg-background/40 p-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediumIconUrl(ability.icon)} alt="" className="h-8 w-8 shrink-0 rounded-sm" />
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{ability.name}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              confirmed ? "bg-green/15 text-green" : "bg-foreground-muted/15 text-foreground-muted"
            }`}
          >
            {confirmed ? "Confirmed" : "Unconfirmed"}
          </span>
        </div>
        <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-foreground-muted">{ability.note}</p>
      </div>
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
      {book.notes.length > 0 && (
        <ul className="mb-3 list-disc space-y-1 pl-4 text-xs leading-relaxed text-foreground-muted">
          {book.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <SpellbookBook classId={classId} book={book} />

      {book.notOpened.length > 0 && (
        <p className="mt-3 text-xs text-foreground-muted/70">
          Not opened on stream: {book.notOpened.join(", ")}.
        </p>
      )}

      <p className="mt-1 text-xs text-foreground-muted/70">Source: {spellbooks.source}</p>

      {book.newAbilities.length > 0 && (
        <div className="mt-4">
          <GoldRule className="mb-3" />
          <h4 className="text-sm font-semibold text-foreground">
            New {classLabel(classId)} abilities
          </h4>
          <p className="mt-0.5 max-w-[65ch] text-xs leading-relaxed text-foreground-muted">
            Baseline spells the Forever talent tooltips mention that are not in Classic. Some are
            directly observed in the level 38 spellbook above (confirmed); others are still only
            inferred from talent text until a higher-authority source or a beta patch confirms them.
          </p>
          <div className="mt-2 space-y-2">
            {book.newAbilities.map((ability) => (
              <NewAbilityCard key={ability.name} ability={ability} />
            ))}
          </div>
        </div>
      )}
    </Collapsible>
  );
}

export default function ClassSpellbooksReference() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-wide text-accent">Class Spellbooks</h1>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-foreground-muted">
        Every trainer-taught spell a level 38 character had in the BlizzCon 2026 demo, read frame by
        frame from stream footage, one collapsible section per class. Spells tagged{" "}
        <span className="font-semibold text-amber-300">Talent</span> are in the Forever talent trees --
        they appear here only because that demo character had the talent, not because they&apos;re
        baseline.
      </p>

      <div className="mt-5 space-y-3">
        {SPELLBOOK_CLASS_ORDER.map((classId) => (
          <ClassSection key={classId} classId={classId} />
        ))}
      </div>
    </div>
  );
}
