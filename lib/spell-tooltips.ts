import spellTooltipsData from "@/data/spell-tooltips.json";
import { classLabel } from "@/lib/wow-data";

export type SpellTooltip = {
  lines: [string, string][];
  description: string;
  confirmed: boolean;
  source?: string;
  levelReq?: string;
  // Only present for spells whose Forever text actually differs from
  // Classic's (talentsforever's own "cs" status flag -- "changed" vs
  // "same"/"new"). Powers the tooltip's "Changed from Classic" diff.
  classicDescription?: string;
  classicStatus?: "changed" | "same" | "new";
};

type RawSpellTooltip = {
  lines: string[][];
  description: string;
  confirmed: boolean;
  source?: string;
  levelReq?: string;
  classicDescription?: string;
  classicStatus?: "changed" | "same" | "new";
};

const SPELL_TOOLTIPS = spellTooltipsData as unknown as Record<string, RawSpellTooltip>;

export function getSpellTooltip(classId: string, spellName: string): SpellTooltip | undefined {
  const raw = SPELL_TOOLTIPS[`${classLabel(classId)}|${spellName}`];
  if (!raw) return undefined;
  return { ...raw, lines: raw.lines.map(([left, right]) => [left, right ?? ""]) };
}
