/**
 * Talent/racial description text can contain a grammar placeholder for
 * words that pluralize based on the number immediately before them, e.g.
 * "by 1 Rage <!--plural:point-->." Storing the marker instead of a fully
 * resolved word means the same rank text doesn't have to be hand-written
 * per rank just to get "point" vs "points" right, and the same numeric
 * value elsewhere in the string is untouched.
 *
 * Forms:
 *   <!--plural:word-->          -> "word" or "word" + "s"
 *   <!--plural:word|words-->    -> "word" (singular) or "words" (irregular plural)
 *
 * The resolver looks at the nearest number before the marker in the same
 * string to decide singular vs. plural (1 -> singular, anything else -> plural).
 */

const PLURAL_MARKER = /<!--plural:([^|>]+?)(?:\|([^>]+?))?-->/g;
const LAST_NUMBER = /(-?\d+(?:\.\d+)?)(?!.*-?\d)/;

export function formatTooltipText(text: string): string {
  return text.replace(PLURAL_MARKER, (match, singular, plural, offset) => {
    const before = text.slice(0, offset);
    const numberMatch = before.match(LAST_NUMBER);
    const n = numberMatch ? Number(numberMatch[1]) : NaN;
    return n === 1 ? singular : plural ?? `${singular}s`;
  });
}
