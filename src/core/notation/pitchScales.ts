/**
 * Book II (Theory of Pitch-Scales) in Schillinger's own symbols.
 *
 *   import * as P from "./notation/pitchScales.ts";
 *   P.i([60, 62, 64, 67, 69])       // [2,2,3,2]   pitch-intervals of c-d-e-g-a
 *   P.tetrachordScale("M", "h")     // harmonic major, M + 2 + h
 *   P.d(1, [2, 2, 3, 2, 3])         // the displacement scale d₁
 *   P.E(1, [60, 62, 64, 67, 69])    // E₁, ascending: c-e-a-d-g
 *   P.formatSystem(12)              // "¹²√2"
 *
 * A vocabulary layer only: every function delegates to the module that
 * implements and tests the mechanic. Symbol table:
 *
 *   Ch.1  p (pitch-units), i (pitch-intervals), Groups One-Four   p, i, group
 *   Ch.2  scales from c: 1, 11, 55, 165 ... 462 ... 2048          scaleCount, FIRST_GROUP_TOTAL
 *         melodic forms a₂ ... f₂                                melodicForms
 *         tetrachords M, m₁, m₂, h; M + 2 + M ...                TETRACHORDS, tetrachordScale, SEVEN_UNIT_TABLE
 *   Ch.3  resultant of an interval's binomial splits (5 = 3+2)   resultantScale, interferenceChain
 *         displacement scales d₀, d₁, d₂ ...                     d, dLabel
 *   Ch.4  P.A. (primary axis), key-axis                          PA
 *         axis-relations U-U, U-P, P-U, P-P; N² of them          AXIS_RELATIONS, axisRelations
 *   Ch.5  E₀, E₁ ... Eₙ; N_E = N_p − 1                            E, ELabel, NE, translate
 *   Ch.6  S = ⁿ√2 (symmetric splitting of a ratio)               S, formatSystem
 *   Ch.7  tonic systems √2, ∛2, ∜2, ⁶√2, ¹²√2; sectional scales  tonics, gap, sectionalScaleCount, melodicFormCount
 *   Ch.8  Fourth Group: tonics over several octaves              fourthGroupTonics
 */

import { classifyScaleGroup, type ScaleGroupResult } from "../pitchClassification.ts";
import {
  firstGroupScaleCount,
  FIRST_GROUP_TOTAL,
  melodicForms,
  TETRACHORDS,
  tetrachordScale,
  SEVEN_UNIT_TABLE,
  type TetrachordName,
} from "../firstGroupScales.ts";
import { intervalInterferenceResultant, intervalInterferenceChain, intervalsToMidiNotes } from "../pitchScaleEvolution.ts";
import { circularPermutations } from "../permutations.ts";
import { findPrimaryAxis, axisRelationCount, type PrimaryAxisResult } from "../melodicModulation.ts";
import { expandedScale, translateMelodyToExpansion } from "../scalesInExpansion.ts";
import {
  symmetricTonics,
  gapSemitones,
  compositionCount,
  melodicFormCount as melodicFormCountOf,
  fourthGroupTonics as fourthGroupTonicsOf,
} from "../symmetricScales.ts";
import { subscript, formatRoot } from "./format.ts";

export { FIRST_GROUP_TOTAL, TETRACHORDS, SEVEN_UNIT_TABLE, melodicForms, tetrachordScale };
export type { TetrachordName };

// ---- Ch.1 -----------------------------------------------------------------

/** The pitch-units (p) of a scale given as intervals from a root (p.101). */
export function p(intervals: readonly number[], root = 60): number[] {
  return intervalsToMidiNotes(root, intervals);
}

/** The pitch-intervals (i) between consecutive pitch-units (p.101). */
export function i(pitchUnits: readonly number[]): number[] {
  return pitchUnits.slice(1).map((unit, k) => unit - pitchUnits[k]);
}

/** Which of the four groups a scale belongs to: one or more root-tones, range within or beyond 12 (p.101). */
export function group(pitchUnits: readonly number[]): ScaleGroupResult | null {
  return classifyScaleGroup(pitchUnits);
}

// ---- Ch.2 -----------------------------------------------------------------

/** How many N-unit First Group scales there are, built from c (p.103-111). */
export function scaleCount(units: number): number {
  return firstGroupScaleCount(units);
}

// ---- Ch.3 -----------------------------------------------------------------

/** The resultant scale of an interval split into a binomial and its converse: 5 = 3+2 / 2+3 -> 2+1+2 (p.115). */
export function resultantScale(a: number, b: number): number[] {
  return intervalInterferenceResultant(a, b);
}

/** The chain trinomial -> quintinomial -> nine terms ..., each stage's circular forms interfering (p.114-116). */
export function interferenceChain(start: readonly number[], stages: number): number[][] {
  return intervalInterferenceChain(start, stages);
}

/** The displacement scale dₖ: the interval sequence displaced by k units (d₀ is the original) (p.116-117). */
export function d(k: number, intervals: readonly number[]): number[] {
  return circularPermutations(intervals)[k];
}

/** "d₁" */
export function dLabel(k: number): string {
  return `d${subscript(String(k))}`;
}

// ---- Ch.4 -----------------------------------------------------------------

/** P.A., the primary axis: the pitch-unit with the greatest summed duration (p.125). */
export function PA(notes: readonly { midiNote: number; durationUnits: number }[]): PrimaryAxisResult | null {
  return findPrimaryAxis(notes);
}

/** The four forms of axis-relations (p.126-128). */
export const AXIS_RELATIONS = ["U-U", "U-P", "P-U", "P-P"] as const;

/** An N-unit scale offers N² axis-relations: 25 for five units, 49 for seven (p.125). */
export function axisRelations(units: number): number {
  return axisRelationCount(units);
}

// ---- Ch.5 -----------------------------------------------------------------

/** Eₖ: the k-th tonal expansion, written ascending as the book writes it (p.133-135). */
export function E(k: number, pitchUnits: readonly number[]): number[] {
  return expandedScale(pitchUnits, k);
}

/** "E₁" */
export function ELabel(k: number): string {
  return `E${subscript(String(k))}`;
}

/** N_E = N_p − 1: a scale of N_p units has that many tonal expansions, counting E₀ (p.134). */
export function NE(Np: number): number {
  return Np - 1;
}

/** Translates a melody from E₀ into Eₖ, unit number to unit number (p.134). */
export function translate(melody: readonly number[], pitchUnits: readonly number[], k: number): number[] {
  return translateMelodyToExpansion(melody, pitchUnits, k);
}

// ---- Ch.6 -----------------------------------------------------------------

/** S = ⁿ√ratio: one step of a symmetric splitting, as a frequency ratio -- ¹²√2 for equal temperament (p.145). */
export function S(n: number, ratio = 2): number {
  return ratio ** (1 / n);
}

/** "√2", "∛2", ..., "¹²√2" -- the book's name for a symmetric system of n tonics. */
export function formatSystem(n: number, ratio: number | string = 2): string {
  return formatRoot(n, ratio);
}

// ---- Ch.7 -----------------------------------------------------------------

/** The tonics of an n-tonic symmetric system within the octave (p.148-149). */
export function tonics(n: number, root = 60): number[] {
  return symmetricTonics(n, root);
}

/** The semitone gap between adjacent tonics. */
export function gap(n: number): number {
  return gapSemitones(n);
}

/** How many sectional scales of `units` units fill a gap (p.149-151). */
export function sectionalScaleCount(gapSize: number, units: number): number {
  return compositionCount(gapSize, units);
}

/** Melodic forms of a sectional scale across all n tonics: (units!)ⁿ (p.152-153). */
export function melodicFormCount(units: number, n: number): number {
  return melodicFormCountOf(units, n);
}

// ---- Ch.8 -----------------------------------------------------------------

/** Fourth Group: n tonics spread over n − 1 octaves (p.155-159). */
export function fourthGroupTonics(n: number, root = 60): number[] {
  return fourthGroupTonicsOf(n, root);
}
