/**
 * Book II, Chapter 4: Melodic Modulation and Variable Pitch Axes.
 *
 * Section C (Four Forms of Axis-Relations) was originally scoped out
 * entirely as compositional guidance -- correct for its four qualitative
 * categories (U-U, U-P, P-U, P-P) and for the "common tones/chromatic
 * alteration/identical motifs" transition techniques (those really are
 * judgment calls, no formula). But a closer re-read turned up two clean,
 * missed formulas hiding in the U-U worked example (p.125-128):
 *
 *   - "The number of axis-relations between a melody and harmony equals
 *     the number of derivative scales (from one d0, including d0). Any
 *     five-unit scale offers 25 axis-relations... any seven-unit scale
 *     offers 49" -- i.e. axisRelationCount(N) = N^2 (an N-unit scale has N
 *     possible melody P.A. positions times N possible harmony key-axis
 *     positions). Confirmed exactly: 5^2=25, 7^2=49.
 *   - "These five different axes [the displacement scales d0..d4, each
 *     transposed to a common tonic] become elements of continuity. Five
 *     elements produce 120 permutations. Any of these 120 forms may be
 *     used" -- i.e. permuting the N *already-transposed* scales from
 *     `modalRotationsAtTonic` into a longer melodic continuity, via the
 *     same general-permutations machinery as Book I Ch.9 (5!=120,
 *     confirmed exactly). The book's own Figure 20 shows one such
 *     arrangement (d3-d2-d1-d4-d0) as a worked example.
 *
 * A nice cross-chapter confirmation found alongside these: "by varying the
 * key signatures... we can multiply the number of possible compositions
 * by 330, the number of all five-unit scales" is exactly
 * `compositionCount(12, 5)` from Book II Ch.7's `symmetricScales.ts`
 * (dividing the 12-semitone octave into 5 ordered parts) = C(11,4) = 330 --
 * a function built later in this project than this chapter, never
 * connected back until now.
 *
 * Sections E (chromatic alteration) and F (identical motifs) really are
 * compositional guidance -- re-read in full and confirmed to describe a
 * creative *process* (find non-common units, insert a passing tone; pick
 * a motif, adapt it to the new key) rather than a deterministic formula
 * with a checkable numeric output, unlike Section C's worked example.
 *
 * Section A (Primary Axis): "the P.A. of a melody is defined as the
 * maximum of an occurrence of a given pitch-unit within any portion of a
 * melody" (p.125) -- concretely, the pitch-unit with the greatest total
 * *summed duration*, not merely the most frequent attack. The book's own
 * example (Figure 18): "Unit a, whose durations sum up to 7, forms the
 * P.A. of this melody."
 *
 * Section B (Unitonal-Polymodal modulation, p.127): transposing a scale's
 * own displacement scales (Ch.3's d0,d1,d2,... -- circular permutations of
 * its interval sequence) to a *common* tonic, rather than letting each one
 * start on its own naturally-rotated root. The book's own worked example
 * (c-d-e-g-a, intervals [2,2,3,2,3]) transposes d1 (rotated intervals
 * [2,3,2,3,2]) to the tonic c and gets "c-d-f-g-bb" -- confirmed exactly
 * by hand before writing any code, along with d2-d4. This needs no new
 * combinatorial math: it's `circularPermutations` (Ch.9) feeding straight
 * into `intervalsToMidiNotes` (Ch.3), just composed for a new purpose.
 *
 * Section D (Modulating through Common Units, p.129): "the best
 * modulations are to keys whose root is identical with one of the
 * pitch-units of the original scale" -- i.e. transpose the *original*
 * (un-rotated) interval sequence to start on each of the scale's own
 * other degrees. The book's own example: c-d-e-g-a (intervals [2,2,3,2])
 * transposed to root d gives "d-e-f#-a-b" -- confirmed exactly by hand.
 * Also needs no new math: `intervalsToMidiNotes` applied to a different
 * root already does exactly this.
 */

import { circularPermutations, generalPermutationsOf } from "./permutations.ts";
import { intervalsToMidiNotes } from "./pitchScaleEvolution.ts";

export interface PrimaryAxisResult {
  midiNote: number;
  totalDuration: number;
}

/** The pitch-unit with the greatest total summed duration in a melody -- Schillinger's "Primary Axis" (p.125). */
export function findPrimaryAxis(
  notes: readonly { midiNote: number; durationUnits: number }[],
): PrimaryAxisResult | null {
  if (notes.length === 0) return null;

  const totals = new Map<number, number>();
  for (const note of notes) {
    totals.set(note.midiNote, (totals.get(note.midiNote) ?? 0) + note.durationUnits);
  }

  let best: PrimaryAxisResult | null = null;
  for (const [midiNote, totalDuration] of totals) {
    if (!best || totalDuration > best.totalDuration) {
      best = { midiNote, totalDuration };
    }
  }
  return best;
}

/**
 * Every displacement scale of `intervals` (its own circular rotations, one
 * per pitch-unit), each transposed to the same fixed `tonic` rather than
 * left on its own naturally-rotated root -- Ch.4 Section B's "transposition
 * of these scales to the tonic."
 */
export function modalRotationsAtTonic(intervals: readonly number[], tonic: number): number[][] {
  return circularPermutations([...intervals]).map((rotation) => intervalsToMidiNotes(tonic, rotation));
}

/** The number of melody/harmony axis-relations for an N-unit scale: N possible melody P.A. positions x N possible harmony key-axis positions (p.125). */
export function axisRelationCount(unitsPerScale: number): number {
  return unitsPerScale * unitsPerScale;
}

/**
 * Every ordering of `transposedScales` (e.g. `modalRotationsAtTonic`'s own
 * output) as elements of one melodic continuity -- N! total arrangements,
 * "five elements produce 120 permutations" (p.128). Each result row is one
 * arrangement of the N scales in sequence; concatenate a row to get the
 * actual continuity melody.
 */
export function axialContinuityPermutations(transposedScales: readonly number[][]): number[][][] {
  return generalPermutationsOf(transposedScales);
}
