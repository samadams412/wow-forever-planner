"use client";

import { STAT_LABEL, type StatKey } from "@/lib/item-stats";
import { sheetValue, type Sheet, type SheetLine } from "@/lib/gear-sheet";

// Header colors: distinct per section, at least 4.5:1 on both themes' surfaces, and kept off
// the delta red (hue 0) and green (142) that mean better/worse: gold (the site accent), teal 172,
// burnt orange 25, steel blue 212, dusty purple 266. Spell and Resistances stay muted.
const MUTED = "text-foreground-muted";
const GROUPS: { title: string; lines: SheetLine[]; always?: boolean; color?: string }[] = [
  { title: "Attributes", lines: ["str", "agi", "sta", "int", "spi"], always: true, color: "text-accent" },
  { title: "Survival", lines: ["health", "mana", "armor"], always: true, color: "text-[#3cbfae] [html.light-mode_&]:text-[#0f766e]" },
  { title: "Melee and ranged", color: "text-[#e0823d] [html.light-mode_&]:text-[#a8510f]", lines: ["ap", "rap", "critRating", "hitRating", "hasteRating", "expertiseRating", "critPct", "hitPct"] },
  { title: "Spell", lines: ["sp", "spellDmg", "heal", "holyDmg", "fireDmg", "frostDmg", "shadowDmg", "natureDmg", "arcaneDmg", "spellCritPct", "spellHitPct", "spellPen", "mp5", "hp5"] },
  { title: "Defense", color: "text-[#7fa7d6] [html.light-mode_&]:text-[#2f5f8f]", lines: ["defRating", "defSkill", "dodgeRating", "dodgePct", "parryRating", "parryPct", "blockRating", "blockPct", "blockValue"] },
  { title: "Resistances", lines: ["fireRes", "frostRes", "shadowRes", "natureRes", "arcaneRes", "allRes"] },
];
const NAMES: Partial<Record<SheetLine, string>> = {
  health: "Health", mana: "Mana", armor: "Armor", critPct: "Crit %", hitPct: "Hit %", spellCritPct: "Spell crit %",
  spellHitPct: "Spell hit %", dodgePct: "Dodge %", parryPct: "Parry %", blockPct: "Block %", defSkill: "Defense", allRes: "All Resistances",
};
const label = (l: SheetLine) => NAMES[l] ?? STAT_LABEL[l as StatKey]?.name ?? l;

function Delta({ d }: { d: number }) {
  if (!d) return null;
  return (
    <span className={`ml-1 text-xs font-semibold ${d > 0 ? "text-green-400 [html.light-mode_&]:text-green-700" : "text-red-400 [html.light-mode_&]:text-red-700"}`}>
      {d > 0 ? `+${d}` : d}
    </span>
  );
}

// `preview`: the sheet with a hovered item swapped in; each line shows the difference.
export default function StatSheet({ sheet, preview, title, note }: { sheet: Sheet; preview?: Sheet | null; title: React.ReactNode; note?: string }) {
  const shown = (l: SheetLine) => sheetValue(sheet, l) !== 0 || (preview && sheetValue(preview, l) !== 0);
  const dps = (["main", "off", "ranged"] as const).filter((s) => sheet.weaponDps[s] || preview?.weaponDps[s]);
  return (
    <section aria-label="Character stats" className="rounded-lg border border-border bg-surface p-3 text-sm">
      <div className="text-xs text-foreground-muted">{title}</div>
      {preview && <p className="mt-1 text-[11px] text-foreground-muted">Showing the change if you equip the highlighted item.</p>}
      {GROUPS.map((g) => {
        const lines = g.always ? g.lines.filter((l) => l !== "mana" || sheet.mana > 0) : g.lines.filter(shown);
        if (!lines.length) return null;
        return (
          <div key={g.title} className="mt-3">
            <h3 className={`text-[10px] font-semibold uppercase tracking-wide ${g.color ?? MUTED}`}>{g.title}</h3>
            <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
              {lines.map((l) => (
                <div key={l} className="contents">
                  <dt className="text-foreground-muted">{label(l)}</dt>
                  <dd className="text-right tabular-nums text-foreground">
                    {sheetValue(preview ?? sheet, l)}
                    {preview && <Delta d={sheetValue(preview, l) - sheetValue(sheet, l)} />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
      {dps.length > 0 && (
        <div className="mt-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#b49ad6] [html.light-mode_&]:text-[#6b4c9a]">Weapon DPS</h3>
          <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
            {dps.map((s) => {
              const now = sheet.weaponDps[s] ?? 0;
              const next = preview ? (preview.weaponDps[s] ?? 0) : now;
              return (
                <div key={s} className="contents">
                  <dt className="text-foreground-muted">{s === "main" ? "Main hand" : s === "off" ? "Off hand" : "Ranged"}</dt>
                  <dd className="text-right tabular-nums text-foreground">
                    {next}
                    {preview && <Delta d={Math.round((next - now) * 10) / 10} />}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      )}
      {note && <p className="mt-3 text-[11px] leading-snug text-foreground-muted">{note}</p>}
    </section>
  );
}
