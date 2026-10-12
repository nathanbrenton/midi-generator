/**
 * Book I (Theory of Rhythm) in Schillinger's own symbols.
 *
 *   import * as R from "./notation/rhythm.ts";
 *   R.r(3, 2)            // [2,1,1,2]          r₃÷₂
 *   R.rFractioned(3, 2)  // [2,1,1,1,1,1,2]    r̲₃÷₂
 *   R.B(3, 2)            // r̲ + r + a(a−b)
 *
 * A vocabulary layer only: every function delegates to the module that
 * implements and tests the mechanic, so the two can't drift apart. The
 * table maps each symbol to its source:
 *
 *   Ch.1  a·t1 + a·t2 + ...      periodicity(a, n)
 *   Ch.2  a÷b                    formatInterference(...)
 *         c.p., c.d.             cp(...), cd
 *         complementary factors  complementaryFactors(...), generatorGroups(...) -> "2(3)"
 *         r₍a÷b₎                 r(...), rLabel(...)
 *         T = r₍a÷1₎             T(a)
 *   Ch.3  ab/ab = T, ab/a = bT, ab/b = aT        groupings(a, b)
 *   Ch.4  r̲₍a÷b₎, N_b = a − b + 1, a²/b = Q      rFractioned, rFractionedLabel, Nb, fractionedGroupings
 *   Ch.5  B, B₍a>mb₎, E, C                       B(a, b), m(a, b), E(a, b), C(a, b)
 *   Ch.6  r, r′ (theme, countertheme)            r(...), rPrime(...), GROWTH_SERIES
 *   Ch.7  places vs. terms                       instrumentalSync(terms, places)
 *   Ch.10 a₁, b₁ ... a₂ = a₁ + b₁ ...            elementLabel(index, order), higherOrder(seeds, order)
 *   Ch.12 (a+b)² = a² + ab + ab + b², S          distributivePower(terms, n), S(terms, n)
 *   Ch.13 iₙ = 2iₙ₋₁ − 1, determinant            i(n), determinant(x, y)
 *   Ch.14 τ (rubato)                             rubato(x, y, τ)
 */

import { generateResultant } from "../resultant.ts";
import { computeGroupings } from "../grouping.ts";
import { generateFractionedResultant, computeFractionedGroupings } from "../fractioning.ts";
import { buildBalance, buildExpansion, buildContraction } from "../groupsByPairs.ts";
import { commonProduct, complementaryFactors as complementaryFactorsOf, buildCountertheme, GROWTH_SERIES } from "../threeGenerators.ts";
import { synchronizeInstrumentalGroup, type InstrumentalSync } from "../instrumentalInterference.ts";
import { higherOrderElements } from "../higherOrderPermutations.ts";
import { distributivePower as distributivePowerOf, synchronizeToPower } from "../distributivePowers.ts";
import { interferenceGroupSizes, traceOrigin } from "../rhythmStyleEvolution.ts";
import { shiftBalance } from "../variableVelocity.ts";
import { subscript, underline, prime, formatRepeat } from "./format.ts";

export { GROWTH_SERIES };

const durationsOf = (resultant: { segments: readonly { duration: number }[] }) => resultant.segments.map((s) => s.duration);

// ---- Ch.1 -----------------------------------------------------------------

/** Monomial periodicity a·t1 + a·t2 + ... + a·tn: the monom a, n times (p.3). */
export function periodicity(a: number, n: number): number[] {
  return Array.from({ length: n }, () => a);
}

// ---- Ch.2 -----------------------------------------------------------------

/** "a ÷ b" -- the book's sign for interference (not division, not a ratio). */
export function formatInterference(...generators: number[]): string {
  return generators.join("÷");
}

/** c.p., the common product: a × b (× c ...) (p.4, 25). */
export function cp(...generators: number[]): number {
  return commonProduct(generators);
}

/** c.d., the common denominator: the single unit every generator is measured in. */
export const cd = 1;

/** The complementary factor of each generator: c.p. / generator (for a ÷ b: b and a). */
export function complementaryFactors(...generators: number[]): number[] {
  return complementaryFactorsOf(generators);
}

/** Each generator written as the book does over its c.p.: 3 ÷ 2 -> ["2(3)", "3(2)"] -- two 3's, three 2's. */
export function generatorGroups(...generators: number[]): string[] {
  return complementaryFactors(...generators).map((factor, i) => formatRepeat(factor, generators[i]));
}

/** r₍a÷b₎ (or r₍a÷b÷c₎): the resultant of the generators' interference, as durations. */
export function r(...generators: number[]): number[] {
  return durationsOf(generateResultant(generators));
}

/** "r₃÷₂" */
export function rLabel(...generators: number[]): string {
  return `r${subscript(formatInterference(...generators))}`;
}

/** T = r₍a÷1₎: "musical bar (T) is the resultant of a to one" (p.5). */
export function T(a: number): number[] {
  return r(a, 1);
}

// ---- Ch.3 -----------------------------------------------------------------

export interface BookGrouping {
  formula: string;
  /** How many T (bars). */
  T: number;
  /** Units t per T. */
  t: number;
}

/** The three fundamental groupings (p.12-13): ab/ab = T, ab/a = bT, ab/b = aT. */
export function groupings(a: number, b: number): BookGrouping[] {
  const formulas = ["ab/ab = T", "ab/a = bT", "ab/b = aT"];
  return computeGroupings(a, b).map((g, i) => ({ formula: formulas[i], T: g.bars, t: g.unitsPerBar }));
}

// ---- Ch.4 -----------------------------------------------------------------

/** r̲₍a÷b₎: the resultant with fractioning around the axis of symmetry (p.15). */
export function rFractioned(a: number, b: number): number[] {
  return durationsOf(generateFractionedResultant(a, b));
}

/** "r̲₃÷₂" */
export function rFractionedLabel(a: number, b: number): string {
  return `${underline("r")}${subscript(formatInterference(a, b))}`;
}

/** N_b = a − b + 1: how many b-groups (b₁, b₂, ...) fractioning uses (p.15). */
export function Nb(a: number, b: number): number {
  return a - b + 1;
}

export interface BookFractionedGrouping extends BookGrouping {
  /** Leftover units when a² doesn't divide evenly (grouping by b only). */
  remainder: number;
  /** How many runs of r̲ before r̲ and the bars close together -- the remainder's denominator (p.17). */
  runs: number;
}

/** a²/a² = T, a²/a = aT, a²/b = Q (p.16-17). */
export function fractionedGroupings(a: number, b: number): BookFractionedGrouping[] {
  const formulas = ["a²/a² = T", "a²/a = aT", "a²/b = Q"];
  return computeFractionedGroupings(a, b).map((g, i) => ({
    formula: formulas[i],
    T: g.bars,
    t: g.unitsPerBar,
    remainder: g.remainderUnits,
    runs: g.repeatsToClose,
  }));
}

// ---- Ch.5 -----------------------------------------------------------------

/** m in B₍a>mb₎: how many times r₍a÷b₎ "enters (as divisor) into a²" (p.22). */
export function m(a: number, b: number): number {
  return Math.floor(a / b);
}

/** Balance, B = r̲₍a÷b₎ + m·r₍a÷b₎ + (a² − mab) -- reduces to r̲ + r + a(a−b) when m = 1 (p.21-22). */
export function B(a: number, b: number): number[] {
  return durationsOf(buildBalance(a, b));
}

/** Expansion, E = r₍a÷b₎ + r̲₍a÷b₎ (p.22-23). */
export function E(a: number, b: number): number[] {
  return durationsOf(buildExpansion(a, b));
}

/** Contraction, C = r̲₍a÷b₎ + r₍a÷b₎ (p.23). */
export function C(a: number, b: number): number[] {
  return durationsOf(buildContraction(a, b));
}

// ---- Ch.6 -----------------------------------------------------------------

/** r′, the countertheme: the resultant of the complementary factors (p.25). */
export function rPrime(...generators: number[]): number[] {
  return durationsOf(buildCountertheme(generators));
}

/** "r′₂÷₃÷₅" */
export function rPrimeLabel(...generators: number[]): string {
  return `${prime("r")}${subscript(formatInterference(...generators))}`;
}

// ---- Ch.7 -----------------------------------------------------------------

/** A time group of `terms` attacks against an instrumental group of `places` (p.27). */
export function instrumentalSync(terms: number, places: number): InstrumentalSync {
  return synchronizeInstrumentalGroup(terms, places);
}

// ---- Ch.10 ----------------------------------------------------------------

/** The book's element names: elementLabel(0, 1) = "a₁", elementLabel(5, 2) = "f₂" (p.63-65). */
export function elementLabel(index: number, order: number): string {
  return `${String.fromCharCode(97 + index)}${subscript(String(order))}`;
}

/** The elements of `order` grown from the first-order elements a₁, b₁, ... (p.63-65). */
export function higherOrder(seeds: readonly (readonly number[])[], order: number): number[][] {
  return higherOrderElements(seeds, order);
}

// ---- Ch.12 ----------------------------------------------------------------

/** Distributive power: (a+b)² = a² + ab + ab + b², not the algebraic a² + 2ab + b² (p.70). */
export function distributivePower(terms: readonly number[], n: number): number[] {
  return distributivePowerOf(terms, n);
}

/** S: the group synchronized with its own distributive power n -- S = a(a+b) + b(a+b) for the square (p.75). */
export function S(terms: readonly number[], n = 2): number[] {
  return synchronizeToPower(terms, 1, n);
}

// ---- Ch.13 ----------------------------------------------------------------

/** iₙ = 2iₙ₋₁ − 1, with i₁ = 2 (p.84). */
export function i(n: number): number {
  return interferenceGroupSizes(n)[n - 1];
}

/** The determinant of a series: the major generator a whose resultant opens x + y (5 + 3 -> 8) (p.85). */
export function determinant(x: number, y: number): number {
  return traceOrigin(x, y).a;
}

// ---- Ch.14 ----------------------------------------------------------------

/** Rubato: τ units shifted from the second term to the first (Chopin's 2+2, τ = 1 -> 3+1) (p.93). */
export function rubato(x: number, y: number, tau: number): [number, number] {
  return shiftBalance(x, y, tau);
}
