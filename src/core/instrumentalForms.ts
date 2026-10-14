/**
 * Book VIII: Instrumental Forms (p.883-1055).
 *
 * "The main technical characteristic of the instrumental... form is that
 * it emphasizes the development of quantities (multiplication)... of
 * attacks from the original attack" -- all forms of arpeggio. Nomenclature
 * (p.883): Σ a score of instrumental strata, S a stratum, p a part, a an
 * attack; p = a, 2a, ... na; S = p, 2p, ... np; Σ = S, 2S, ... nS. The parts
 * of a stratum are named a, b, c, d (p_I = a, p_II = b, ...).
 *
 * Ch.3-5's tables count the forms of A attacks shared among the parts of
 * S = 2p, 3p, 4p: each "form of distribution of coefficients" (A split
 * into one positive coefficient per part, 2a + b + c ...) in every
 * order of the parts, with A!/(k1! k2! ...) general permutations each, or
 * A circular ones (`distributions`). Summed, the general forms are every
 * way of assigning A attacks to the parts using each at least once --
 * 2^A - 2 for two parts, 3^A - 3·2^A + 3 for three -- and the circular
 * forms A·C(A-1, parts-1) (`attackFormCounts`). The book's tables agree
 * everywhere except four of its own sums, checked on the page: for three
 * parts and 12 attacks it prints 5544 x 6 = 32,264 (33,264) and 1386 x 6 =
 * 8316 (12!/2!4!6! is 13,860), so its total 443,312 should be 519,156;
 * for four parts and 12 attacks its summands are right but add to
 * 14,676,024, not the printed 14,646,024, and its circular ones to 1980,
 * not 1960.
 *
 * Ch.4: in S = 3p "one attack to a combination of two simultaneous parts"
 * makes elements of the second order, b/a, c/a, c/b (p.928).
 *
 * Ch.6, composing strata (p.1003-1011): strata doubling one harmonic
 * stratum must be in identical octave positions; "there must never be an
 * open position above a close"; couplings go outward -- above a melody,
 * below a bass -- and neither may cross the adjacent assemblage
 * (`strataAllowed`, `outwardCouplings`).
 */

import { generalPermutationsOf } from "./permutations.ts";

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
const choose = (n: number, k: number): number => (k < 0 || k > n ? 0 : factorial(n) / (factorial(k) * factorial(n - k)));

/** Every split of `attacks` into `parts` positive coefficients, in every order (2a + b + c, a + 2b + c, ...). */
export function coefficientSplits(attacks: number, parts: number): number[][] {
  if (parts === 1) return attacks >= 1 ? [[attacks]] : [];
  const out: number[][] = [];
  for (let first = 1; first <= attacks - parts + 1; first++) {
    for (const rest of coefficientSplits(attacks - first, parts - 1)) out.push([first, ...rest]);
  }
  return out;
}

/** A!/(k1! k2! ...): the general permutations of one split. */
export function multinomial(coefficients: readonly number[]): number {
  return coefficients.reduce((acc, k) => acc / factorial(k), factorial(coefficients.reduce((a, b) => a + b, 0)));
}

/** The book's forms of distribution: each unordered split with its orders, general and circular permutations (Ch.3-5). */
export function distributions(attacks: number, parts: number): { form: number[]; orders: number; general: number; circular: number }[] {
  const byForm = new Map<string, number[][]>();
  for (const split of coefficientSplits(attacks, parts)) {
    const key = [...split].sort((a, b) => a - b).join("+");
    byForm.set(key, [...(byForm.get(key) ?? []), split]);
  }
  return [...byForm.entries()].map(([key, splits]) => ({
    form: key.split("+").map(Number),
    orders: splits.length,
    general: multinomial(splits[0]) * splits.length,
    circular: attacks * splits.length,
  }));
}

/** Totals of a table: general = surjections of A attacks onto the parts; circular = A·C(A-1, parts-1). */
export function attackFormCounts(attacks: number, parts: number): { general: number; circular: number } {
  let general = 0;
  for (let k = 0; k <= parts; k++) general += (k % 2 === 0 ? 1 : -1) * choose(parts, k) * (parts - k) ** attacks;
  return { general, circular: attacks * choose(attacks - 1, parts - 1) };
}

const LETTERS = ["a", "b", "c", "d", "e", "f"];

/** The sequences of one split: every distinct order (general), or the rotations of the grouped form (circular). */
export function splitSequences(coefficients: readonly number[], circular = false): string[] {
  const grouped = coefficients.flatMap((k, i) => Array.from({ length: k }, () => LETTERS[i]));
  if (circular) return grouped.map((_, r) => [...grouped.slice(r), ...grouped.slice(0, r)].join(""));
  return [...new Set(generalPermutationsOf(grouped).map((p) => p.join("")))];
}

/** Elements of the second order in S = 3p: one attack to two simultaneous parts -- b/a, c/a, c/b (p.928). */
export function secondOrderElements(parts = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < parts; i++) for (let j = i + 1; j < parts; j++) out.push(`${LETTERS[j]}/${LETTERS[i]}`);
  return out;
}

/**
 * Plays a sequence of part letters on a chord (pitches from the lowest
 * part, a, upward): one attack per letter, `unit` long. "bc"-style
 * elements of the second order sound two parts at once.
 */
export function arpeggiate(chord: readonly number[], sequence: readonly string[], unit = 0.5): { midiNote: number; startUnits: number; durationUnits: number }[] {
  return sequence.flatMap((element, i) =>
    [...element.replace("/", "")].map((letter) => ({ midiNote: chord[LETTERS.indexOf(letter)], startUnits: i * unit, durationUnits: unit * 0.95 })),
  );
}

/** "There must never be an open position above a close" (p.1006): the strata's positions from the bottom up. */
export function strataAllowed(positions: readonly ("open" | "close")[]): boolean {
  return positions.every((p, i) => i === 0 || !(p === "open" && positions[i - 1] === "close"));
}

/** Couplings "always constructed in the outward direction": above a melody, below a bass (p.1010). */
export function outwardCouplings(pitch: number, intervals: readonly number[], role: "melody" | "bass"): number[] {
  return intervals.map((i) => (role === "melody" ? pitch + i : pitch - i));
}
