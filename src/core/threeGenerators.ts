/**
 * Book I, Chapter 6: Utilization of Three or More Generators.
 *
 * Extends binary synchronization (Ch. 2A) to three or more generators
 * drawn from one of Schillinger's "series of growth" — summation series
 * (every third value is the sum of the two before it, the same structure
 * as the Fibonacci sequence) that "all generators pertaining to one
 * family of rhythm belong to."
 *
 * Synchronizing N generators means finding their common product and
 * complementary factors (product ÷ each generator) — both unambiguous,
 * independently-verified arithmetic (2:3:5 → product 30, complementary
 * factors 15, 10, 6, matching the book's own typeset numbers exactly).
 *
 * The book states plainly: "Generators produce r, and the complementary
 * factors produce r'" — r is the theme, r' the countertheme, sharing the
 * same cycle length (the common product) so they play back together.
 * That's what `buildTheme`/`buildCountertheme` follow here. Flagged
 * honestly: the worked example's own hand-drawn figure (Figure 47), at
 * the scan quality available, appears to attach its two printed
 * duration formulas the *other* way around from that sentence — r's
 * formula reads as the complementary-factors' resultant and r''s as the
 * generators' own, not the reverse. Both duration sequences themselves
 * are independently re-derivable from first principles regardless (see
 * tests/threeGenerators.test.mjs) and check out either way; only which
 * label the book intends for which is uncertain here. Worth resolving
 * against a cleaner scan or the physical book if this matters later.
 */

import { generateResultant, type Resultant } from "./resultant.ts";

export interface GrowthSeries {
  label: string;
  values: readonly number[];
}

/** "Here are all the series that are useful for musical purposes." */
export const GROWTH_SERIES: readonly GrowthSeries[] = [
  { label: "Series I", values: [1, 2, 3, 5, 8, 13] },
  { label: "Series II", values: [1, 3, 4, 7, 11, 18] },
  { label: "Series III", values: [1, 4, 5, 9, 14, 23] },
];

export interface ThreeGeneratorCase {
  label: string;
  generators: readonly number[];
  series: string;
}

/** "The important and practical combinations of generators to be worked out." */
export const THREE_GENERATOR_CASES: readonly ThreeGeneratorCase[] = [
  { label: "2 : 3 : 5", generators: [2, 3, 5], series: "Series I" },
  { label: "3 : 5 : 8", generators: [3, 5, 8], series: "Series I" },
  { label: "3 : 4 : 7", generators: [3, 4, 7], series: "Series II" },
  { label: "4 : 5 : 9", generators: [4, 5, 9], series: "Series III" },
];

export function commonProduct(generators: readonly number[]): number {
  return generators.reduce((product, value) => product * value, 1);
}

/** The product divided by each generator — "30/2 = 15 means that 15 is a complementary factor of 2." */
export function complementaryFactors(generators: readonly number[]): number[] {
  const product = commonProduct(generators);
  return generators.map((value) => product / value);
}

/** The theme (r): the resultant of the generators themselves. */
export function buildTheme(generators: readonly number[]): Resultant {
  return generateResultant([...generators]);
}

/** The countertheme (r'): the resultant of the complementary factors — same cycle length (the common product) as the theme. */
export function buildCountertheme(generators: readonly number[]): Resultant {
  return generateResultant(complementaryFactors(generators));
}

export interface ThreeGeneratorGrouping {
  label: string;
  bars: number;
  unitsPerBar: number;
}

/** "Group by any generator or any of the complementary factors." */
export function threeGeneratorGroupings(generators: readonly number[]): ThreeGeneratorGrouping[] {
  const product = commonProduct(generators);
  const divisors = [...generators, ...complementaryFactors(generators)];
  return divisors.map((divisor) => ({
    label: `By ${divisor}`,
    bars: product / divisor,
    unitsPerBar: divisor,
  }));
}
