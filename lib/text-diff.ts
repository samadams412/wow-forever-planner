// Minimal word-level LCS diff -- no dependency pulled in for what's a
// handful-of-words comparison. Used to render the spellbook tooltip's
// "Changed from Classic" section: the classic line strikes through words
// that only appear in the classic text, the Forever line highlights words
// that only appear in the Forever text, and shared wording (usually most
// of the sentence) renders plain in both.

export type DiffToken = { text: string; op: "equal" | "remove" | "add" };

function splitWords(text: string): string[] {
  // Keeps whitespace as its own tokens so spacing survives the diff and
  // rejoin, but empty leading/trailing splits are dropped.
  return text.split(/(\s+)/).filter((s) => s.length > 0);
}

export function diffWords(oldText: string, newText: string): DiffToken[] {
  const a = splitWords(oldText);
  const b = splitWords(newText);
  const n = a.length;
  const m = b.length;

  // dp[i][j] = length of the LCS of a[i:] and b[j:].
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      tokens.push({ text: a[i], op: "equal" });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ text: a[i], op: "remove" });
      i++;
    } else {
      tokens.push({ text: b[j], op: "add" });
      j++;
    }
  }
  while (i < n) {
    tokens.push({ text: a[i], op: "remove" });
    i++;
  }
  while (j < m) {
    tokens.push({ text: b[j], op: "add" });
    j++;
  }
  return tokens;
}
