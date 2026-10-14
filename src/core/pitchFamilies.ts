/**
 * Book X: Evolution of Pitch-Families (Style) (p.1253-1271).
 *
 * "The factors determining that certain groups of intonation belong to one
 * family are: (1) the identity of pitch-units, and (2) the identity of
 * intervals." The book carries one incomplete scale through every technique
 * of Books II-IX so that the result stays "true to style."
 *
 * Ch.1 (Figure 1) works on the primitive d0 = c d f. The stylized primitive
 * comes from four kinds of derivative scale:
 *   (1) permutations of the pitch-units: d f c, f c d (`pitchUnitPermutations`);
 *   (2) the same moved to one axis: c eb bb, c g a (`toAxis`);
 *   (3) permutations of the intervals: 2 + 3 becomes 3 + 2, c eb f
 *       (`intervalPermutations`);
 *   (4) the original intervals moved onto its own pitch-units: d e g, f g bb
 *       (`intervalTranspositions`).
 * The modernized primitive is a symmetric scale whose interval of symmetry is
 * the span of the original: c d f | f g bb | bb c eb | eb f ab
 * (`modernizedScale`).
 *
 * Ch.2 harmonizes the "fundamental Balinese scale" E0 = c db eb g ab
 * (`BALINESE`). The harmony scale is its first tonal expansion E1 = c eb ab
 * db g. Σ(E1) on each degree stacks every unit (`sigmaE1`), and diads,
 * triads and tetrads are its partial forms. In a scale "which [does] not
 * contain all 7 musical names" the cycles are numbered:
 *   - C1 is the harmony scale itself, read downward;
 *   - C2 is its first tonal expansion;
 *   - C3 is its second tonal expansion.
 * So Ck steps 2k degrees down. That gives I IV II V III, I II III IV V and
 * I V IV III II in five units (Figure 4), and Book V's C3/C5/C7 in seven
 * (`cycleStep`). Cadences are "formed by tones adjacent to the tonics":
 *   - initial: I and the chord after it;
 *   - final: I and the chord before it;
 *   - compound: both (`cadences`).
 * Type II (diatonic-symmetric) progressions move each Σ to the c-axis
 * (`sigmaOnAxis`). Type III moves one Σ by a symmetric root progression
 * (∜2, "justified by the relationship c - eb").
 *
 * Strata harmony (Figure 10) splits Σ(E1) into strata of 1, 2 and 2 parts
 * (a const.; b, c; d, e). The roots descend by Σ's own first two intervals,
 * 3 + 5, through c a e c# g# f c (`strataRoots`, `stratifySigma`). The
 * book labels this "8 + 5", but the printed roots move 3 and 5 semitones,
 * which are Σ's c-eb and eb-ab. A compound sigma doubles the whole at a
 * symmetric interval (√2 in Figure 14).
 *
 * Melodic figuration (Figures 11-12): "pitch-units, which are not present
 * in the original scale, become potential leading units." These come from
 * the derivative scales moved to one axis (`potentialAuxiliaries`):
 *   - From the pitch-unit permutations the union is d e f f# a bb b. The
 *     book prints six of these and leaves out a, although a appears in its
 *     own d2 (c e f a bb). Its fifth derivative is labeled d5 for d4.
 *   - From the interval permutations (1 2 4 1 rotated) the union is d e f
 *     f#, exactly as printed.
 *
 * Ch.3: when harmony has n functions, melody may have n + 1. The added
 * function is the next one up the expansion, d over a, b, c
 * (`melodizingFunctions`).
 */

import { intervalCellScale, midiNoteForDegree } from "./scales.ts";

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const intervalsOf = (pcs: readonly number[]) => pcs.slice(1).map((p, i) => p - pcs[i]);

/** The fundamental Balinese scale of Book X: c db eb g ab. */
export const BALINESE: readonly number[] = [0, 1, 3, 7, 8];
/** Figure 1's original primitive: c d f. */
export const PRIMITIVE: readonly number[] = [0, 2, 5];

/** The scale's pitch-units in every rotation, as ascending pitches from each unit: d0, d1, d2 ... */
export function pitchUnitPermutations(pcs: readonly number[]): number[][] {
  return pcs.map((_, r) => [...pcs.slice(r), ...pcs.slice(0, r).map((p) => p + 12)]);
}

/** A scale moved to start on c (0). */
export function toAxis(scale: readonly number[], axis = 0): number[] {
  return scale.map((p) => p - scale[0] + axis);
}

/** Circular permutations of the scale's own intervals inside its span, from c: 2 + 3 gives 3 + 2. */
export function intervalPermutations(pcs: readonly number[]): number[][] {
  const intervals = intervalsOf(pcs);
  return intervals.map((_, r) => {
    const rotated = [...intervals.slice(r), ...intervals.slice(0, r)];
    return rotated.reduce<number[]>((acc, i) => [...acc, acc[acc.length - 1] + i], [0]);
  });
}

/** The original intervals moved onto each of the scale's own pitch-units: c d f, d e g, f g bb. */
export function intervalTranspositions(pcs: readonly number[]): number[][] {
  return pcs.map((start) => pcs.map((p) => p - pcs[0] + start));
}

/** The modernized primitive: the scale repeated at the interval between its extreme units. */
export function modernizedScale(pcs: readonly number[], sections: number): number[] {
  const span = pcs[pcs.length - 1] - pcs[0];
  const out: number[] = [];
  for (let s = 0; s < sections; s++) for (const p of pcs) if (s === 0 || p !== pcs[0]) out.push(p + s * span);
  return out;
}

/** The scale as an interval cell over the octave, for degree arithmetic. */
export function scaleOf(pcs: readonly number[]) {
  return intervalCellScale([...intervalsOf(pcs), 12 - (pcs[pcs.length - 1] - pcs[0])]);
}

/** Σ(E1) on a degree: every unit of the scale stacked by the first tonal expansion. */
export function sigmaE1(pcs: readonly number[], degree: number, tonic = 60): number[] {
  const scale = scaleOf(pcs);
  return pcs.map((_, k) => midiNoteForDegree(scale, tonic, degree + 2 * k));
}

/** Each Σ(E1) moved to the c-axis: the chart for Type II progressions. */
export function sigmaOnAxis(pcs: readonly number[]): number[][] {
  return pcs.map((_, d) => toAxis(sigmaE1(pcs, d)));
}

/** Ck in an n-unit scale: the harmony scale E1 read downward, then its tonal expansions -- 2k degrees down. */
export function cycleStep(k: number, units: number): number {
  return -((2 * k) % units);
}

/** The degrees of Ck from I back to I (0-based). */
export function cycleDegrees(k: number, units: number): number[] {
  const step = cycleStep(k, units);
  const out = [0];
  do out.push((((out[out.length - 1] + step) % units) + units) % units);
  while (out[out.length - 1] !== 0);
  return out;
}

/** Cadences "formed by tones adjacent to the tonics" in the cycle: initial, final, compound. */
export function cadences(k: number, units: number): { initial: number[]; final: number[]; compound: number[] } {
  const cycle = cycleDegrees(k, units);
  const next = cycle[1];
  const prev = cycle[cycle.length - 2];
  return { initial: [0, next, 0], final: [0, prev, 0], compound: [0, next, prev, 0] };
}

/** Root progression descending by alternating intervals until it returns to its pitch class: 3 + 5 gives c a e c# g# f c. */
export function strataRoots(intervals: readonly number[], start = 0): number[] {
  const out = [start];
  let k = 0;
  do {
    out.push(out[out.length - 1] - intervals[k % intervals.length]);
    k++;
  } while (mod12(out[out.length - 1]) !== mod12(start) || k % intervals.length !== 0);
  return out;
}

/** Splits a Σ into strata of the given part counts, from the bottom (Figure 10: 1, 2, 2). */
export function stratifySigma(sigma: readonly number[], sizes: readonly number[]): number[][] {
  let at = 0;
  return sizes.map((n) => sigma.slice(at, (at += n)));
}

/** Pitch-units absent from the scale but present in its derivatives on one axis: potential leading units. */
export function potentialAuxiliaries(pcs: readonly number[], derivatives: readonly (readonly number[])[]): number[] {
  const own = new Set(pcs.map(mod12));
  const found = new Set(derivatives.flat().map(mod12).filter((p) => !own.has(p)));
  return [...found].sort((a, b) => a - b);
}

/** Ch.3: harmony of n functions melodized with n + 1 -- a, b, c gives a, b, c, d. */
export function melodizingFunctions(harmonyFunctions: number): string[] {
  return Array.from({ length: harmonyFunctions + 1 }, (_, i) => "abcdefg"[i]);
}
