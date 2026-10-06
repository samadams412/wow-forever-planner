import BossPortrait from "@/components/reference/BossPortrait";
import LootItemPill from "@/components/reference/LootItemPill";
import type { LootBoss } from "@/lib/dungeon-loot";
import { formatBossLevel } from "@/lib/dungeon-roster";

const KIND_LABEL: Partial<Record<LootBoss["kind"], string>> = {
  trash: "Trash",
  rare: "Rare Spawn",
  object: "Object",
  quest: "Quest NPC",
};

// Shared boss card -- owns all boss display logic (portrait, trigger,
// abilities, loot) so the full loot table page and DungeonInlinePanel's
// compact popup render identically instead of each maintaining their own
// copy. Every optional field (trigger, abilities, items) degrades
// gracefully via `?.`/length checks: boss data comes from two independently
// reconciled sources (foreverchanges + wowtbc fallback, see
// data/dungeons/*.json) and not every dungeon has every field populated.
export default function BossCard({
  boss,
  dungeonId,
  anchorId,
  compact = false,
  bare = false,
}: {
  boss: LootBoss;
  dungeonId: string;
  anchorId?: string;
  // Tighter padding/type scale for the DungeonInlinePanel popup, where
  // space is at a premium -- same content, smaller chrome.
  compact?: boolean;
  // Skip the card's own border/background/padding -- for embedding inside
  // a container that already provides that chrome (DungeonInlinePanel's
  // detail pane).
  bare?: boolean;
}) {
  const kindLabel = KIND_LABEL[boss.kind];
  const hasItems = boss.items.length > 0;
  return (
    <div
      id={anchorId}
      className={bare ? "" : `scroll-mt-20 rounded-lg border border-border bg-surface ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center gap-2.5">
        <BossPortrait src={boss.portraitUrl} alt="" size={compact ? 28 : undefined} />
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className={`font-heading font-semibold text-accent ${compact ? "text-xs uppercase tracking-wide" : "text-base"}`}>
            {boss.name}
          </h3>
          {formatBossLevel(boss.level) !== null && (
            <span className="text-[11px] text-foreground-muted">Level {formatBossLevel(boss.level)}</span>
          )}
          {kindLabel && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground-muted bg-foreground-muted/10">
              {kindLabel}
            </span>
          )}
        </div>
      </div>

      {boss.trigger && (
        <p className="mt-2 rounded border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-xs leading-relaxed text-foreground-muted">
          {boss.trigger.flag && <span className="mr-1 font-semibold uppercase tracking-wide text-accent">{boss.trigger.flag}:</span>}
          {boss.trigger.text}
        </p>
      )}

      {boss.abilities?.length > 0 && (
        <div className="mt-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Abilities</h4>
          <ul className="mt-1 flex flex-col gap-1">
            {boss.abilities.map((ability, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] leading-snug">
                {/* eslint-disable-next-line @next/next/no-img-element -- small hotlinked spell icon, same discipline as LootItemPill */}
                <img src={`https://foreverchanges.pro${ability.icon}`} alt="" width={16} height={16} className="mt-0.5 h-4 w-4 shrink-0 rounded" />
                <span>
                  {ability.name && <strong className="text-foreground">{ability.name}</strong>}
                  {ability.flags?.length > 0 && (
                    <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wide text-foreground-muted">
                      {ability.flags.join(" · ")}
                    </span>
                  )}
                  <span className="block text-foreground-muted">{ability.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasItems && (
        <div className="mt-2">
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Loot</h4>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {boss.items.map((item, i) => (
              <LootItemPill key={`${item.name}-${i}`} item={item} tooltipId={`${dungeonId}:${boss.name}:${i}`} showSlotType={!compact} />
            ))}
          </div>
        </div>
      )}
      {!hasItems && !compact && <p className="mt-2 text-xs text-foreground-muted">No loot recorded for {boss.name} yet.</p>}
    </div>
  );
}
