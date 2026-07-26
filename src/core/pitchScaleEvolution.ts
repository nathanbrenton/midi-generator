/**
 * Book II, Chapter 3: Evolution of Pitch-Scale Styles.
 *
 * "PITCH-SCALES, like time-scales (rhythms), are subject to serial
 * development" -- this chapter turns out to reuse Book I's own rhythm
 * machinery almost entirely, just applied to pitch intervals instead of
 * durations. Section E (Historical Development of Scales) is pure
 * musicological commentary with no formula, so it's left unimplemented,
 * same as the historical sections skipped in Book I.
 *
 * Section A (relating scales through interval identity): splitting a
 * two-unit scale's interval into a binomial (a,b) and synchronizing it
 * with its own reverse (b,a) -- taking the union of both orderings' own
 * attack points -- produces a resultant trinomial. This is *exactly*
 * Book I's interference-of-periodicities operation (Ch. 2A), just applied
 * to two arbitrary duration sequences sharing a total instead of two
 * uniform generators. Confirmed against the book's own two examples
 * (p.115): 5=3+2 (and its reverse 2+3) resolves to 2+1+2; 5=4+1 (and 1+4)
 * resolves to 1+3+1. The book then lists every permutation of that
 * resultant as "one family" -- which is exactly Ch.9's
 * `generalPermutations`, so no new code is needed for that step (see
 * `permutations.ts`).
 *
 * Section B (relating scales through pitch-unit identity) is the circular
 * permutations of a scale's own interval sequence (its "displacement
 * scales," d0, d1, d2, ...) -- exactly Ch.9's `circularPermutations`
 * again, confirmed against the book's own c-d-e-g-a example (p.116-117):
 * rotating the 5-interval sequence [2,2,3,2,3] by one position gives
 * [2,3,2,3,2], matching the book's own d1 exactly.
 *
 * Sections C/D (evolving scales by summation or selection) are both
 * sliding windows over the interval sequence -- C sums each window in
 * place (collapsing it to one interval, keeping the rest of the sequence
 * intact around it), D just selects the window itself. Confirmed against
 * the book's own six-interval example (p.119-120, 2,2,1,2,2,1): every
 * window-size-2 merge (5 positions) and every window-size-5 selection (2
 * positions) match the book's own listed rows exactly.
 */

/** Section A: unions the attack points of (a,b) and its reverse (b,a), returning the resultant trinomial. */
export function intervalInterferenceResultant(a: number, b: number): number[] {
  const total = a + b;
  const points = new Set<number>([0, a, b]);
  const sorted = [...points].sort((x, y) => x - y);
  return sorted.map((point, i) => (i + 1 < sorted.length ? sorted[i + 1] : total) - point);
}

/** Section C: every way of summing a contiguous window of `windowSize` intervals into one, keeping the rest of the sequence unchanged. */
export function slidingWindowMerge(intervals: readonly number[], windowSize: number): number[][] {
  if (windowSize < 1 || windowSize > intervals.length) {
    throw new Error(`windowSize must be between 1 and ${intervals.length}`);
  }
  const results: number[][] = [];
  for (let start = 0; start + windowSize <= intervals.length; start++) {
    const merged = intervals.slice(start, start + windowSize).reduce((sum, v) => sum + v, 0);
    results.push([...intervals.slice(0, start), merged, ...intervals.slice(start + windowSize)]);
  }
  return results;
}

/** Section D: every contiguous window of `windowSize` intervals, selected as-is. */
export function slidingWindowSelect(intervals: readonly number[], windowSize: number): number[][] {
  if (windowSize < 1 || windowSize > intervals.length) {
    throw new Error(`windowSize must be between 1 and ${intervals.length}`);
  }
  const results: number[][] = [];
  for (let start = 0; start + windowSize <= intervals.length; start++) {
    results.push(intervals.slice(start, start + windowSize));
  }
  return results;
}

/** Converts an interval sequence into the MIDI notes it spells, starting at `root` -- N intervals produce N+1 notes. */
export function intervalsToMidiNotes(root: number, intervals: readonly number[]): number[] {
  const notes = [root];
  let cursor = root;
  for (const interval of intervals) {
    cursor += interval;
    notes.push(cursor);
  }
  return notes;
}
