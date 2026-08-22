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
 *
 * Section A also turns out to *chain*, which was missed on first read:
 * the book's own intro paragraph (p.114) describes a recursive process --
 * "splitting the interval into a binomial, we acquire a three-unit scale
 * [interference of the binomial's 2 orderings produces a trinomial
 * resultant]... the modified forms of the binomial interval fall into
 * synchronization and produce a resultant scale with four units and three
 * intervals [the trinomial]... the modified forms of the trinomial
 * interval fall into synchronization and produce a resultant scale with
 * six units and five intervals [a quintinomial]... the modified forms of
 * the quintinomial interval fall into synchronization and produce a
 * resultant scale with ten units and nine intervals [a 9-term resultant]."
 * `circularIntervalInterference` generalizes `intervalInterferenceResultant`
 * from exactly 2 terms to any N: it unions the attack points of every
 * *circular* rotation of the term sequence (not every general permutation
 * -- verified by hand that general permutations overshoot to full
 * uniformity one stage early, while circular permutations land exactly on
 * the book's own stated term counts at every stage). Confirmed against the
 * book's own worked trinomial example (p.116): circular-interfering
 * (4,4,3) gives the quintinomial (3,1,3,1,3), matching one of the book's
 * own listed permutation rows (1+3+3+1+3) as a multiset; interfering that
 * quintinomial again gives exactly 9 terms, matching "ten units and nine
 * intervals" exactly (not 11, which unioning ALL permutations instead of
 * just the circular ones incorrectly produces).
 *
 * The resulting term-count sequence (2 -> 3 -> 5 -> 9 -> ...) is exactly
 * Book I Ch.13's own interference-group recurrence, i_n = 2*i_(n-1) - 1
 * (`interferenceGroupSizes`) -- a deep, verified cross-book consistency:
 * the same growth law governs both rhythmic interference-groups and this
 * pitch-interval interference chain.
 */

import { circularPermutations } from "./permutations.ts";

/** Unions the attack points of every circular rotation of `terms`, returning the resultant -- the general form of Section A's interference (p.114-117). */
export function circularIntervalInterference(terms: readonly number[]): number[] {
  const points = new Set<number>([0]);
  for (const rotation of circularPermutations([...terms])) {
    let cursor = 0;
    for (const value of rotation) {
      cursor += value;
      points.add(cursor);
    }
  }
  // Every rotation's cursor ends at the same total, so `sorted` already closes
  // on that total as its own last member -- no separate wrap-around step needed.
  const sorted = [...points].sort((x, y) => x - y);
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i] - sorted[i - 1]);
  return gaps;
}

/** Section A: unions the attack points of (a,b) and its reverse (b,a), returning the resultant trinomial -- the N=2 case of `circularIntervalInterference`. */
export function intervalInterferenceResultant(a: number, b: number): number[] {
  return circularIntervalInterference([a, b]);
}

/** Repeatedly applies `circularIntervalInterference`, returning every stage including the starting terms -- the book's own binomial->trinomial->quintinomial->9-term chain (p.114). */
export function intervalInterferenceChain(start: readonly number[], stages: number): number[][] {
  const chain: number[][] = [[...start]];
  let current: number[] = [...start];
  for (let i = 0; i < stages; i++) {
    current = circularIntervalInterference(current);
    chain.push(current);
  }
  return chain;
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
