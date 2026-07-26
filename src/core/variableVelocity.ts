/**
 * Book I, Chapter 14: Rhythms of Variable Velocities -- the last chapter
 * of Book I. Section D (Fermata) is left unimplemented: the book's own
 * treatment is a set of notational judgment calls ("as a simple multiple
 * of the preceding values," transcriber's choice) rather than a single
 * deterministic formula, unlike the rest of this chapter.
 *
 * Section A/B (acceleration): a "variable velocity" rhythm is just a
 * duration sequence drawn from one of several named mathematical series
 * (the book's own list, p.90-91) -- used directly as durations for a
 * *uniform* group (Section A: "if we use the natural harmonic series and
 * start with unity, we find a practical stopping point at 8, because
 * 1+2+3+4+5+6+7+8=36"), or as successive multipliers on a *non-uniform*
 * group (Section B: "(3+1+2)+(6+2+4)+(9+3+6)+..." -- the original group
 * 3+1+2, repeated with multipliers 1, 2, 3, ...").
 *
 * Section C (Rubato): "the process of unbalancing a balanced binomial, or
 * the process of balancing an unbalanced binomial," via a "standard unit
 * of deviation" (tau): add tau to one term, subtract it from the other.
 * The book's own two examples: unbalancing Chopin's (2,2) by tau=1 gives
 * (3,1); balancing a swung (3,1) by tau=1 (in the other direction) gives
 * (2,2) -- both are the same `shiftBalance` operation, just opposite signs.
 */

export const NATURAL_HARMONIC_SERIES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The book's own three summation series (p.91) -- identical to Ch.6's GROWTH_SERIES, reproduced here as plain arrays to keep this module dependency-free. */
export const SUMMATION_SERIES: readonly (readonly number[])[] = [
  [1, 2, 3, 5, 8, 13],
  [1, 3, 4, 7, 11, 18],
  [1, 4, 5, 9, 14, 23],
];

/** "Prime Number Series" as the book lists it -- includes 1, unlike a strict mathematical prime list (p.91). */
export const PRIME_NUMBER_SERIES = [1, 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

/** Section B: repeats `group`, scaling each repetition by the next multiplier in sequence. */
export function accelerateGroup(group: readonly number[], multipliers: readonly number[]): number[] {
  return multipliers.flatMap((multiplier) => group.map((value) => value * multiplier));
}

/** Section C (Rubato): shifts `tau` units from the second term to the first -- the "standard unit of deviation." */
export function shiftBalance(x: number, y: number, tau: number): [number, number] {
  return [x + tau, y - tau];
}
