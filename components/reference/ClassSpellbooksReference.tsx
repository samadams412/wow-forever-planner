import { spellbooks, SPELLBOOK_CLASS_ORDER, type SpellbookEntry } from "@/lib/spellbooks";
import { mediumIconUrl, CLASS_ICON, CLASS_COLOR } from "@/lib/wow-data";
import Collapsible from "@/components/site/Collapsible";

function classLabel(classId: string): string {
  return classId.charAt(0).toUpperCase() + classId.slice(1);
}

function SpellPill({ spell }: { spell: SpellbookEntry }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs ${
        spell.talent ? "border-amber-400/50 bg-amber-400/10" : "border-border bg-background/40"
      }`}
    >
      <span className="text-foreground">{spell.name}</span>
      {spell.rank !== undefined && <span className="text-foreground-muted">Rank {spell.rank}</span>}
      {spell.passive && <span className="text-foreground-muted">Passive</span>}
      {spell.tag && <span className="text-foreground-muted">{spell.tag}</span>}
      {spell.talent && <span className="font-semibold uppercase tracking-wide text-amber-300">Talent</span>}
    </span>
  );
}

function NewAbilityCard({ ability }: { ability: { name: string; status: string; note: string } }) {
  const confirmed = ability.status === "confirmed";
  return (
    <div className="rounded border border-border bg-background/40 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">{ability.name}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            confirmed ? "bg-green-400/15 text-green-400" : "bg-foreground-muted/15 text-foreground-muted"
          }`}
        >
          {confirmed ? "Confirmed" : "Unconfirmed"}
        </span>
      </div>
      <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-foreground-muted">{ability.note}</p>
    </div>
  );
}

function ClassSection({ classId }: { classId: string }) {
  const book = spellbooks.classes[classId];
  const color = CLASS_COLOR[classId] ?? "var(--accent)";

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {book.tabs.map((tab) => (
          <div key={tab.name}>
            <h4
              className="mb-1.5 font-heading text-xs font-semibold uppercase tracking-wide"
              style={{ color }}
            >
              {tab.name}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {tab.spells.map((spell) => (
                <SpellPill key={spell.name} spell={spell} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {book.notOpened.length > 0 && (
        <p className="mt-3 text-xs text-foreground-muted/70">
          Not opened on stream: {book.notOpened.join(", ")}.
        </p>
      )}

      <p className="mt-1 text-xs text-foreground-muted/70">Source: {spellbooks.source}</p>

      {book.newAbilities.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <h4 className="font-heading text-sm font-semibold tracking-wide text-foreground">
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
