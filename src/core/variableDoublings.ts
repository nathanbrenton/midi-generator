/**
 * Book V, Chapter 6: Variable Doublings in Harmony.
 *
 * "Harmony... may be given a self-sufficient character by means of
 * variable doublings" -- with the root always held in the bass, one of the
 * chord's three functions (root/third/fifth) is additionally doubled among
 * the upper three voices. The book's own comparative table (p.401,
 * confirmed by rendering the page -- the OCR text alone reproduced it
 * correctly, cross-checked against the actual scan): S(5)(1) puts all
 * three distinct functions in the upper voices (1,3,5); S(5)(3) doubles
 * the third instead, so the root disappears from the upper voices entirely
 * (3,3,5); S(5)(5) doubles the fifth (3,5,5).
 *
 * "In cases S(5)(3) and S(5)(5), only three positions are possible for
 * each case" -- this is, once again, `generalPermutations` (Book I Ch.9)
 * applied to the upper-voice function list: a multiset with one repeated
 * pair gives 3!/2!=3 distinct orderings, confirmed by hand
 * (`generalPermutations([3,3,5]).length === 3`,
 * `generalPermutations([3,5,5]).length === 3`) before writing any of this.
 * S(5)(1)'s upper voices are all distinct, so it gets the full 3!=6 --
 * unstated in the book's prose but directly visible as six columns in the
 * page's own Figure 57, and the same combinatorial primitive explains it.
 *
 * Honest scope note: Figure 57 itself also draws a *specific* registral
 * spacing for each of those positions (including "black note" variants
 * where a doubled tone is played in unison rather than an octave apart,
 * and a clockwise/counterclockwise split for S(5)(1)'s six positions) --
 * that level of voice-leading/register detail did not resolve unambiguously
 * even after rendering the page at high resolution, so it is NOT
 * reproduced here. `buildDoublingVoicing` below stacks each position's
 * functions upward from the bass in plain close position instead -- a
 * reasonable, function-correct voicing, but a straightforward
 * implementation choice of this project's own, not a transcription of
 * Figure 57's specific registers. Figures 68-69 (the C3/C5/C7 transition
 * tables between different doubling forms) are likewise not built, for the
 * same reason -- worth revisiting if a cleaner scan becomes available.
 */

import { generalPermutations } from "./permutations.ts";

export type DoubledFunction = 1 | 3 | 5;

export const DOUBLED_FUNCTIONS: readonly DoubledFunction[] = [1, 3, 5];

/** The upper-three-voices' function content for each doubling form (p.401). */
export const VARIABLE_DOUBLING_FORMS: Readonly<Record<DoubledFunction, { label: string; upperVoiceFunctions: readonly DoubledFunction[] }>> = {
  1: { label: "S(5)①", upperVoiceFunctions: [1, 3, 5] },
  3: { label: "S(5)③", upperVoiceFunctions: [3, 3, 5] },
  5: { label: "S(5)⑤", upperVoiceFunctions: [3, 5, 5] },
};

/** Every distinct ordering of the upper three voices' functions for a doubling form. */
export function doublingPositions(doubledFunction: DoubledFunction): DoubledFunction[][] {
  return generalPermutations(VARIABLE_DOUBLING_FORMS[doubledFunction].upperVoiceFunctions) as DoubledFunction[][];
}

/** How many distinct positions a doubling form has -- 6 for S(5)(1), 3 for S(5)(3)/S(5)(5) (p.401). */
export function positionCount(doubledFunction: DoubledFunction): number {
  return doublingPositions(doubledFunction).length;
}

export interface TriadIntervals {
  /** Semitones from the root to the third. */
  third: number;
  /** Semitones from the root to the fifth. */
  fifth: number;
}

/**
 * Builds the four MIDI notes (bass + 3 upper voices) for one position of a
 * doubling form: the root stays in the bass, and the upper three voices are
 * stacked upward in plain close position in the order the position gives.
 * See the module docstring -- this register choice is this project's own,
 * not a reproduction of Figure 57's specific spacings.
 */
export function buildDoublingVoicing(
  position: readonly DoubledFunction[],
  rootMidiNote: number,
  intervals: TriadIntervals,
): { bass: number; upper: number[] } {
  const offsetForFunction: Record<DoubledFunction, number> = { 1: 0, 3: intervals.third, 5: intervals.fifth };

  let previous = rootMidiNote;
  const upper = position.map((fn) => {
    let note = rootMidiNote + 12 + offsetForFunction[fn];
    while (note <= previous) note += 12;
    previous = note;
    return note;
  });

  return { bass: rootMidiNote, upper };
}
