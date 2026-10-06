// Reads the formatted XP and money strings on a dungeon quest back into
// numbers, so they can render as RewardPill / MoneyRewardRow icon pills.
//
// Null means "can't show this as a pill" -- the caller falls back to the
// original text, so no reward is ever dropped or silently reworded. In
// particular a Classic-only XP value ("999 XP in Classic") is null: a pill
// would present a Classic number as this Forever quest's reward.
//
// Client-safe (no fs/path).

// "3,500 XP" -> 3500; "9,999 XP in the Forever beta, 999 in Classic" -> 9999
// (the Forever value leads). A string with no Forever value -> null.
export function parseExperience(text: string | null): number | null {
  if (!text) return null;
  if (/in Classic/.test(text) && !/Forever beta/.test(text)) return null;
  const m = text.match(/^([\d,]+)\s*XP/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// "1g 30s" -> 10000 + 3000 = 13000 copper; "60s" -> 6000; "45c" -> 45.
// Any other shape -> null.
export function parseMoneyCopper(text: string | null): number | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!/^(\d+g\s*)?(\d+s\s*)?(\d+c)?$/.test(trimmed) || trimmed === "") return null;
  const g = Number(trimmed.match(/(\d+)g/)?.[1] ?? 0);
  const s = Number(trimmed.match(/(\d+)s/)?.[1] ?? 0);
  const c = Number(trimmed.match(/(\d+)c/)?.[1] ?? 0);
  return g * 10000 + s * 100 + c;
}
