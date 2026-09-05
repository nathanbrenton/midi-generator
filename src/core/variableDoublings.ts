/**
 * Book V, Chapter 6: Variable Doublings in Harmony, and Chapter 7:
 * Inversions of the S(5) Chord.
 *
 * Ch.6: "Harmony... may be given a self-sufficient character by means of
 * variable doublings" -- with the root held in the bass, one of the
 * chord's three functions (root/third/fifth) is additionally doubled among
 * the upper three voices. The book's own comparative table (p.401,
 * confirmed by rendering the page): S(5)(1) puts all three distinct
 * functions in the upper voices (1,3,5); S(5)(3) doubles the third
 * instead, so the root disappears from the upper voices entirely (3,3,5);
 * S(5)(5) doubles the fifth (3,5,5).
 *
 * Ch.7: S(6) is the first inversion -- "the only condition under which
 * S(5) becomes an S(6) is when the third (3) appears in the bass" (p.406).
 * Doubling notation carries over unchanged (S(6)(1)/(3)/(5) still name
 * *which function is doubled in the full 4-voice chord*), but because the
 * bass is now fixed at 3 instead of 1, the upper-voice content is
 * different: it's always "the full 4-function multiset {1,3,5,doubled}
 * minus one instance of whatever sits in the bass." Confirmed by hand
 * against the book's own two claims on the same page (p.406-407) before
 * writing any of this: "S(6)(1) is identical with S(5) positions, except
 * that the bass has constant 3" (i.e. S(6)(1) is literally S(5)(1)'s own
 * four pitches -- {1,1,3,5} -- with a 3 moved into the bass instead of a
 * 1), and "S(6)(1) and S(6)(5) positions are systematized through [three
 * characteristics: the doubled function appears above / surrounds / below
 * the remaining function]" -- exactly the three-position
 * repeated-pair case again. Working through `upperVoiceFunctions` for
 * every (doubled, bass) combination confirms this completely: bass=1
 * reproduces Ch.6's table exactly (1->6 positions, 3->3, 5->3); bass=3
 * flips which forms land in the 6-position/3-position buckets (1->3, 3->6,
 * 5->3) -- matching the book's S(6)(3) getting the six-column
 * clockwise/counterclockwise layout (Figure 67) while S(6)(1)/S(6)(5) get
 * the three-position "above/surrounds/below" naming, the opposite pairing
 * from Ch.6's S(5) forms.
 *
 * Honest scope note: both chapters' figures also draw *specific* registral
 * spacings for each position (including "black note" unison-vs-octave
 * variants and the clockwise/counterclockwise split itself) that did not
 * resolve unambiguously even after rendering the pages at high resolution
 * -- not reproduced here. `buildDoublingVoicing` stacks each position's
 * functions upward from the bass in plain close position instead, a
 * reasonable, function-correct voicing, but a straightforward
 * implementation choice of this project's own, not a transcription of
 * either chapter's specific figure. Ch.6's Figures 68-69 and Ch.7's own
 * Figures 68-69 (both sets of C3/C5/C7 transformation tables between
 * doubling/inversion forms) are likewise not built, for the same reason --
 * worth revisiting if cleaner scans become available. Ch.7's Figures 77-78
 * (diatonic doubling preference tables) and its Section B (continuity
 * forms built from growth series) are compositional/stylistic guidance,
 * not deterministic formulas, and are documented in README only.
 */

import { generalPermutations } from "./permutations.ts";

export type ChordFunction = 1 | 3 | 5;
export type DoubledFunction = ChordFunction;

/** Which function sits in the bass: 1 = root position S(5) (Ch.6), 3 = first inversion S(6) (Ch.7). */
export type BassFunction = 1 | 3;

export const DOUBLED_FUNCTIONS: readonly DoubledFunction[] = [1, 3, 5];

export interface DoublingForm {
  label: string;
  bassFunction: BassFunction;
  upperVoiceFunctions: readonly ChordFunction[];
}

/** The full 4-voice chord (root, third, fifth, plus one extra `doubledFunction`), minus whatever sits in the bass. */
export function upperVoiceFunctions(doubledFunction: DoubledFunction, bassFunction: BassFunction): ChordFunction[] {
  const full: ChordFunction[] = [1, 3, 5, doubledFunction];
  full.splice(full.indexOf(bassFunction), 1);
  return full.sort((a, b) => a - b);
}

function buildForms(bassFunction: BassFunction, labelFor: (fn: DoubledFunction) => string): Record<DoubledFunction, DoublingForm> {
  const forms = {} as Record<DoubledFunction, DoublingForm>;
  for (const doubled of DOUBLED_FUNCTIONS) {
    forms[doubled] = { label: labelFor(doubled), bassFunction, upperVoiceFunctions: upperVoiceFunctions(doubled, bassFunction) };
  }
  return forms;
}

/** Ch.6 (p.401): root position, S(5)①/③/⑤. */
export const VARIABLE_DOUBLING_FORMS: Readonly<Record<DoubledFunction, DoublingForm>> = buildForms(1, (fn) => `S(5)${fn === 1 ? "①" : fn === 3 ? "③" : "⑤"}`);

/** Ch.7 (p.406-407): first inversion, S(6)①/③/⑤ -- the third stays in the bass. */
export const INVERSION_DOUBLING_FORMS: Readonly<Record<DoubledFunction, DoublingForm>> = buildForms(3, (fn) => `S(6)${fn === 1 ? "①" : fn === 3 ? "③" : "⑤"}`);

/** Every distinct ordering of a doubling form's upper three voices. */
export function doublingPositions(form: DoublingForm): ChordFunction[][] {
  return generalPermutations(form.upperVoiceFunctions) as ChordFunction[][];
}

/** How many distinct positions a doubling form has -- 6 when its three upper functions are distinct, 3 when one is repeated. */
export function positionCount(form: DoublingForm): number {
  return doublingPositions(form).length;
}

export interface TriadIntervals {
  /** Semitones from the root to the third. */
  third: number;
  /** Semitones from the root to the fifth. */
  fifth: number;
}

/**
 * Builds the four MIDI notes (bass + 3 upper voices) for one position of a
 * doubling form: the form's own `bassFunction` (root for S(5), third for
 * S(6)) stays in the bass, and the upper three voices are stacked upward
 * in plain close position in the order the position gives. See the module
 * docstring -- this register choice is this project's own, not a
 * reproduction of either chapter's specific figure.
 */
export function buildDoublingVoicing(
  form: DoublingForm,
  position: readonly ChordFunction[],
  rootMidiNote: number,
  intervals: TriadIntervals,
): { bass: number; upper: number[] } {
  const offsetForFunction: Record<ChordFunction, number> = { 1: 0, 3: intervals.third, 5: intervals.fifth };
  const bass = rootMidiNote + offsetForFunction[form.bassFunction];

  let previous = bass;
  const upper = position.map((fn) => {
    let note = rootMidiNote + 12 + offsetForFunction[fn];
    while (note <= previous) note += 12;
    previous = note;
    return note;
  });

  return { bass, upper };
}
