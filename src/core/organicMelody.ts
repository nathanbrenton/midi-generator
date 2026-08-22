/**
 * Book IV, Chapter 8: Use of Organic Forms in Melody.
 *
 * The chapter opens with an extensive historical/geometric discussion of
 * the Fibonacci/summation series (already implemented as `SUMMATION_SERIES`
 * in `variableVelocity.ts`, Book I Ch.14) applied to semitone intervals to
 * build "organically" growing scales -- confirmed the book's own three
 * named series match exactly: First (Fibonacci, seeds 1,2) extended to 11
 * terms gives "1,2,3,5,8,13,21,34,55,89,144" (p.330, stated directly);
 * Second (seeds 1,3) extended to 7 terms gives "1,3,4,7,11,18,29" (p.333);
 * Third (seeds 1,4) gives "1,4,5,9,14,23,37" (p.333, "37" also confirmed
 * against Figure 130's own caption, p.348).
 *
 * The chapter's genuinely new, deterministic content is its three "spiral
 * sequence" patterns for turning a summation series into a signed-interval
 * melodic motif, each precisely described in prose and confirmed against
 * the book's own figure numbers (rendered as a page image, since the OCR
 * text mangled the formula notation into noise):
 *
 *   - Pattern A ("basic spiral," p.341-343): "the first term (t1),
 *     followed by the second term (t2), the omission of the third term
 *     and the appearance of the following term (t4) with the opposite
 *     sign" -- t[i], t[i+1], -t[i+3]. Confirmed exactly against Figure
 *     120/121's own worked numbers: starting at the First series' index 3
 *     (value 5) gives 5,8,-21 (omitting 13); starting at index 4 (value 8)
 *     gives 8,13,-34 (omitting 21) -- both exact matches, "four pitch
 *     units and three intervals" as the book itself states.
 *   - Pattern B ("developed spiral," p.345-346): "the addition of three
 *     successive terms, the omission of one term, and the addition of the
 *     next term with the opposite sign" -- t[i], t[i+1], t[i+2], -t[i+4].
 *   - Pattern C ("another type," p.350-352): "the omission of two terms
 *     after the summation of three terms and the appearance of the last
 *     term with the opposite sign" -- t[i], t[i+1], t[i+2], -t[i+5].
 *
 * "Melody may start at different points of one summation series" (p.340)
 * -- `startIndex` is free, matching the book's own use of multiple
 * starting points on the same series (Figure 120's three worked groups).
 *
 * The chapter's closing list of nine further "harmonic relations" (natural
 * harmonic series, arithmetical/geometrical progressions, involution
 * series, logarithmic series, progressive additive series, prime number
 * series, arithmetical/geometrical mean, p.352) is a naming list, not
 * worked formulas of its own -- most are already implemented elsewhere in
 * this project (natural harmonic series and prime number series both
 * already exist in `variableVelocity.ts`), so nothing new is needed here.
 * Bilateral symmetry (alternating +/- sign patterns applied to a doubled
 * series, p.338-339) and range-readjustment (octave transposition of
 * individual pitch-units to compress a wide spiral into a practical
 * register, p.335) are compositional-workflow variations on top of the
 * same three patterns, not additional formulas, so aren't implemented
 * separately.
 */

/** Extends a summation series seed (First/Second/Third from `SUMMATION_SERIES`) to `count` terms via the book's own recurrence: each term is the sum of the two preceding terms. */
export function extendSummationSeries(seed: readonly number[], count: number): number[] {
  if (seed.length < 2) {
    throw new Error("seed must have at least 2 terms");
  }
  const series = [...seed];
  while (series.length < count) {
    series.push(series[series.length - 1] + series[series.length - 2]);
  }
  return series.slice(0, count);
}

/** Pattern A ("basic spiral," p.341-343): t[i], t[i+1], -t[i+3] -- omits t[i+2]. 3 intervals, 4 pitch-units. */
export function spiralSequenceBasic(series: readonly number[], startIndex: number): number[] {
  return [series[startIndex], series[startIndex + 1], -series[startIndex + 3]];
}

/** Pattern B ("developed spiral," p.345-346): t[i], t[i+1], t[i+2], -t[i+4] -- omits t[i+3]. 4 intervals, 5 pitch-units. */
export function spiralSequenceDeveloped(series: readonly number[], startIndex: number): number[] {
  return [series[startIndex], series[startIndex + 1], series[startIndex + 2], -series[startIndex + 4]];
}

/** Pattern C ("another type," p.350-352): t[i], t[i+1], t[i+2], -t[i+5] -- omits t[i+3] and t[i+4]. 4 intervals, 5 pitch-units. */
export function spiralSequenceExtended(series: readonly number[], startIndex: number): number[] {
  return [series[startIndex], series[startIndex + 1], series[startIndex + 2], -series[startIndex + 5]];
}
