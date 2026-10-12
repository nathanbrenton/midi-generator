/**
 * Book II, Chapter 2: First Group of Pitch-Scales -- "Diatonic" and Related
 * Scales (p.103-114). Group One: one root-tone, range up to 11 (Ch.1).
 *
 * "All the scales are constructed from c" -- so an N-unit scale is c plus
 * any N-1 of the 11 pitch-units above it, and there are C(11, N-1) of
 * them. The book's own counts, reproduced by `firstGroupScaleCount`: one
 * one-unit scale, eleven two-unit (its Table of Intervals c-db ... c-b),
 * 55 three-unit (its 55-entry table 1+1 ... 1+10), 165 four-unit, "462
 * seven unit scales," and "all 2,048 scales of this group" in total
 * (2^11 -- every subset of the 11 units above c).
 *
 * Each N-unit scale's melodic forms are its own units permuted -- "the
 * number of melodic forms = 6" for three units, listed as a2..f2 in
 * exactly the order Book I Ch.10 uses (a1+b1+c1, a1+c1+b1, c1+a1+b1, ...),
 * with the same "combinations by k" counts (15 x 24 = 360 ...). So
 * `melodicForms` is Book I's `higherOrderElements` at the second order,
 * not a new mechanic.
 *
 * Section E (Scales of Seven Units, p.111-113) builds the seven-unit
 * scales "of our civilization" from four-unit scales known as
 * tetrachords, "uniting two tetrachords separated by the interval 2":
 *
 *   Major (M) = 2+2+1   Minor I (m1) = 2+1+2   Minor II (m2) = 1+2+2
 *   harmonic (h) = 1+3+1 (the tetrachord "from the Mohammedan East")
 *
 * and tabulates six scales from them -- each checked against standard
 * theory: natural major M+2+M (2 2 1 2 2 2 1), harmonic major M+2+h
 * (2 2 1 2 1 3 1), melodic major M+2+m2 (2 2 1 2 1 2 2), natural minor
 * m1+2+m2 (2 1 2 2 1 2 2), harmonic minor m1+2+h (2 1 2 2 1 3 1), melodic
 * minor m1+2+M (2 1 2 2 2 2 1). The book adds that "any hybrids may be
 * used" (one form ascending, another descending) -- a choice, not a
 * formula.
 */

import { higherOrderElements } from "./higherOrderPermutations.ts";

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
  return Math.round(result);
}

/** How many N-unit scales the First Group has, built from c with a range up to 11: C(11, N-1). */
export function firstGroupScaleCount(units: number): number {
  return binomial(11, units - 1);
}

/** "All 2,048 scales of this group" -- every subset of the 11 units above c. */
export const FIRST_GROUP_TOTAL = 2 ** 11;

/** Every N-unit First Group scale as its interval sequence from c (intervals sum to at most 11). */
export function firstGroupScales(units: number): number[][] {
  const scales: number[][] = [];
  const choose = (start: number, chosen: number[]) => {
    if (chosen.length === units - 1) {
      const points = [0, ...chosen];
      scales.push(points.slice(1).map((p, i) => p - points[i]));
      return;
    }
    for (let unit = start; unit <= 11; unit++) choose(unit + 1, [...chosen, unit]);
  };
  if (units >= 1) choose(1, []);
  return scales;
}

/** Every melodic form of a scale's units, in the book's own naming order (a2, b2, ... for three units). Up to seven units (7! = 5040). */
export function melodicForms<T>(units: readonly T[]): T[][] {
  const indices = units.map((_, i) => [i]);
  return higherOrderElements(indices, 2, 5040).map((form) => form.map((i) => units[i]));
}

export type TetrachordName = "M" | "m1" | "m2" | "h";

/** The four tetrachords of Section E (p.112), as interval sequences spanning a perfect fourth (5 semitones). */
export const TETRACHORDS: Readonly<Record<TetrachordName, readonly [number, number, number]>> = {
  M: [2, 2, 1],
  m1: [2, 1, 2],
  m2: [1, 2, 2],
  h: [1, 3, 1],
};

/** Two tetrachords "separated by the interval 2": lower + 2 + upper -- seven intervals spanning the octave. */
export function tetrachordScale(lower: TetrachordName, upper: TetrachordName): number[] {
  return [...TETRACHORDS[lower], 2, ...TETRACHORDS[upper]];
}

export interface SevenUnitScale {
  family: "major" | "minor";
  form: "natural" | "harmonic" | "melodic";
  lower: TetrachordName;
  upper: TetrachordName;
}

/** The book's Table of Scales (p.113). */
export const SEVEN_UNIT_TABLE: readonly SevenUnitScale[] = [
  { family: "major", form: "natural", lower: "M", upper: "M" },
  { family: "major", form: "harmonic", lower: "M", upper: "h" },
  { family: "major", form: "melodic", lower: "M", upper: "m2" },
  { family: "minor", form: "natural", lower: "m1", upper: "m2" },
  { family: "minor", form: "harmonic", lower: "m1", upper: "h" },
  { family: "minor", form: "melodic", lower: "m1", upper: "M" },
];
