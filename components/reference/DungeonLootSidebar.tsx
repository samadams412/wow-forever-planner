import DungeonJumpNav, { type JumpNavEntry } from "@/components/reference/DungeonJumpNav";
import DungeonMapPanel from "@/components/reference/DungeonMapPanel";
import type { DungeonMapMarker } from "@/components/reference/DungeonMapLegend";

export default function DungeonLootSidebar({
  levelMin,
  levelMax,
  zone,
  bossCount,
  itemCount,
  jumpNavEntries,
  mapImage,
  mapLegend,
  dungeonName,
  authorNotes,
}: {
  levelMin: number;
  levelMax: number;
  zone?: string;
  bossCount: number;
  itemCount: number;
  jumpNavEntries: JumpNavEntry[];
  mapImage: string | null;
  mapLegend?: DungeonMapMarker[] | null;
  dungeonName: string;
  authorNotes?: string | null;
}) {
  return (
    <aside className="w-full shrink-0 md:w-80 md:sticky md:top-4 md:self-start">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Quick stats</h2>
          <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 rounded border border-border p-2 text-sm">
            <dt className="text-foreground-muted">Level range</dt>
            <dd className="text-right">
              {levelMin}-{levelMax}
            </dd>
            {zone && (
              <>
                <dt className="text-foreground-muted">Location</dt>
                <dd className="text-right">{zone}</dd>
              </>
            )}
            <dt className="text-foreground-muted">Bosses</dt>
            <dd className="text-right">{bossCount}</dd>
            <dt className="text-foreground-muted">Items</dt>
            <dd className="text-right">{itemCount}</dd>
          </dl>
        </div>

        <DungeonJumpNav entries={jumpNavEntries} />

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Dungeon map</h2>
          <div className="mt-1">
            {mapImage ? (
              <DungeonMapPanel src={mapImage} alt={`${dungeonName} map`} legend={mapLegend ?? undefined} />
            ) : (
              <div className="flex h-56 w-full items-center justify-center rounded border border-dashed border-border text-xs text-foreground-muted">
                Map coming soon
              </div>
            )}
          </div>
        </div>

        {authorNotes && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Notes</h2>
            <div className="mt-1 flex flex-col gap-2 rounded border border-border bg-surface p-2.5 text-sm leading-relaxed text-foreground-muted">
              {authorNotes.split(/\n\s*\n/).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
