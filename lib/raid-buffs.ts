import raidBuffs from "@/data/raid-buffs.json";
import spellbooks from "@/data/spellbooks.json";
import { SPECS, type Confidence, type EffectSet, type EffectView } from "@/lib/raid-comp";
import { classLabel, getClassTalentData, mediumIconUrl } from "@/lib/wow-data";

// Server-side resolver for data/raid-buffs.json: turns each hand-curated
// effect into an EffectView with its icon and Forever tooltip text looked
// up from the spellbook/talent data, so the client never imports those
// big files. Static JSON imports only (see CLAUDE.md's standing rule).
// scripts/check-raid-buffs.js guarantees every name here resolves.

type RawSource = { classId: string; specs: "all" | string[]; spell?: string; talent?: string; confidence: Confidence; note?: string };
type RawEffect = Omit<EffectView, "icon" | "text" | "sources"> & { sources: RawSource[] };
type SpellbookSpell = { name: string; icon: string; ranks?: { description?: string }[] };
const books = (spellbooks as unknown as { classes: Record<string, { tabs: { spells: SpellbookSpell[] }[] }> }).classes;

function lookup(src: RawSource): { icon: string; text: string } {
  if (src.spell) {
    const sp = books[src.classId].tabs.flatMap((t) => t.spells).find((s) => s.name === src.spell);
    return { icon: sp?.icon ?? "inv_misc_questionmark", text: sp?.ranks?.at(-1)?.description ?? "" };
  }
  const talent = getClassTalentData(src.classId)
    ?.trees.flatMap((t) => t.talents)
    .find((t) => t.name === src.talent);
  return { icon: talent?.icon ?? "inv_misc_questionmark", text: talent?.ranks.at(-1) ?? "" };
}

export function getRaidEffects(): EffectView[] {
  return (raidBuffs.effects as RawEffect[]).map((e) => {
    const { icon, text } = lookup(e.sources[0]);
    return {
      ...e,
      icon: mediumIconUrl(icon),
      text,
      sources: e.sources.map((s) => {
        const trees = s.specs === "all" ? null : s.specs;
        return {
          classId: s.classId,
          specIndexes: SPECS.filter((sp) => sp.classId === s.classId && (!trees || trees.includes(sp.tree))).map((sp) => sp.index),
          label: trees ? trees.map((t) => `${t} ${classLabel(s.classId)}`).join(", ") : `All ${classLabel(s.classId)}s`,
          confidence: s.confidence,
          ...(s.note ? { note: s.note } : {}),
        };
      }),
    };
  });
}

export function getRaidEffectSets(): { onlyOneCounts: EffectSet[]; perCaster: EffectSet[]; build: string } {
  return {
    onlyOneCounts: raidBuffs.onlyOneCounts as EffectSet[],
    perCaster: raidBuffs.perCaster as EffectSet[],
    build: raidBuffs.build,
  };
}
