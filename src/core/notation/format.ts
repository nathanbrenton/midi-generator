/**
 * Formatting helpers that print values in Schillinger's own written
 * notation -- subscripted symbols (r₃÷₂, a₂), underlined fractioned
 * resultants (r̲₃÷₂), primes (r′), sums (2+1+1+2), and his repetition
 * shorthand k(n) ("2(3)": two 3's). Shared by every book's notation module.
 */

const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
};

/** Subscripts every digit and sign; characters with no subscript form (like ÷) are kept as-is. */
export function subscript(text: string): string {
  return [...text].map((ch) => SUBSCRIPT[ch] ?? ch).join("");
}

/** Underlines text with combining low lines -- the book's mark for a fractioned resultant (r̲). */
export function underline(text: string): string {
  return [...text].map((ch) => `${ch}̲`).join("");
}

/** Appends primes: prime("r") = "r′", prime("T", 2) = "T″". */
export function prime(symbol: string, count = 1): string {
  return symbol + ["", "′", "″", "‴"][Math.min(count, 3)];
}

/** A group written as a sum: [2,1,1,2] -> "2+1+1+2". */
export function formatSum(values: readonly number[]): string {
  return values.join("+");
}

/** The book's repetition shorthand: formatRepeat(2, 3) -> "2(3)"; formatRepeat(2, [2,3,3]) -> "2(2+3+3)". */
export function formatRepeat(count: number, group: number | readonly number[]): string {
  return `${count}(${typeof group === "number" ? group : formatSum(group)})`;
}

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
};

/** Superscripts every digit and sign: superscript("12") = "¹²". */
export function superscript(text: string): string {
  return [...text].map((ch) => SUPERSCRIPT[ch] ?? ch).join("");
}

/** The book's root notation for a symmetric system: formatRoot(2) = "√2", formatRoot(3) = "∛2", formatRoot(12) = "¹²√2". */
export function formatRoot(index: number, radicand: number | string = 2): string {
  if (index === 2) return `√${radicand}`;
  if (index === 3) return `∛${radicand}`;
  if (index === 4) return `∜${radicand}`;
  return `${superscript(String(index))}√${radicand}`;
}
