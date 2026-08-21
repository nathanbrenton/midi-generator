/**
 * Book II, Chapter 4: Melodic Modulation and Variable Pitch Axes.
 *
 * Sections C (Four Forms of Axis-Relations), E (chromatic alteration), and
 * F (identical motifs) are compositional guidance -- named categories and
 * technique descriptions, not deterministic formulas -- so they're left
 * unimplemented, the same scoping choice made for the judgment-call
 * sections in Book I (Ch.13's historical commentary, Ch.14's Fermata).
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

import { circularPermutations } from "./permutations.ts";
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
